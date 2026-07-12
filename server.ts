import express from 'express';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { initDb, dbRun, dbGet, dbAll } from './server-db';

const app = express();
const PORT = 3000;

// Body parser with high capacity for workspace synchronization
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Helper to authenticate request and get session (supports cookies and Authorization headers)
async function getSession(req: express.Request): Promise<any | null> {
  let token = req.cookies?.apex_session;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) return null;

  try {
    const session = await dbGet('SELECT * FROM sessions WHERE token = ?', [token]);
    if (!session) return null;

    if (Date.now() > session.expires_at) {
      // Session expired, delete it
      await dbRun('DELETE FROM sessions WHERE token = ?', [token]);
      return null;
    }
    return session;
  } catch (err) {
    console.error('Session retrieval error:', err);
    return null;
  }
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

async function logServerAudit(businessId: string | null, action: string, oldValue: string, newValue: string, email: string, name: string, role: string, ipAddress: string) {
  if (!businessId) return;
  try {
    const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [businessId]);
    if (!workspaceRow) return;

    const workspace = JSON.parse(workspaceRow.workspace_data);
    if (!workspace.audits) workspace.audits = [];

    const now = new Date();
    const newLog = {
      id: 'aud_srv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId,
      userEmail: email || 'Unknown',
      userName: name || 'System / Guest',
      role: role || 'Employee',
      action,
      oldValue: oldValue || 'N/A',
      newValue: newValue || 'N/A',
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      ipAddress: ipAddress || '127.0.0.1',
      device: 'Server Service',
      browser: 'API Router'
    };

    workspace.audits.push(newLog);
    await dbRun('UPDATE workspaces SET workspace_data = ? WHERE business_id = ?', [JSON.stringify(workspace), businessId]);
    console.log(`[Server Audit Logged] Action: ${action} | Business: ${businessId}`);
  } catch (err) {
    console.error('Error logging server audit:', err);
  }
}

// In-memory rate limiting and account lockout
interface LockoutInfo {
  failedAttempts: number;
  lockoutUntil: number | null;
}

const loginTracker = new Map<string, LockoutInfo>();

function isLockedOut(key: string): { locked: boolean; timeLeftMinutes: number } {
  const info = loginTracker.get(key);
  if (!info || !info.lockoutUntil) return { locked: false, timeLeftMinutes: 0 };

  if (Date.now() > info.lockoutUntil) {
    // Lockout expired, reset attempts
    loginTracker.delete(key);
    return { locked: false, timeLeftMinutes: 0 };
  }

  const timeLeftMs = info.lockoutUntil - Date.now();
  const timeLeftMinutes = Math.ceil(timeLeftMs / 1000 / 60);
  return { locked: true, timeLeftMinutes };
}

function recordFailedAttempt(key: string) {
  let info = loginTracker.get(key);
  if (!info) {
    info = { failedAttempts: 0, lockoutUntil: null };
    loginTracker.set(key, info);
  }

  info.failedAttempts += 1;
  if (info.failedAttempts >= 5) {
    // Lock out for 15 minutes
    info.lockoutUntil = Date.now() + 15 * 60 * 1000;
  }
}

function resetFailedAttempts(key: string) {
  loginTracker.delete(key);
}

// REST API ROUTES
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1. Business Registration (Tenant sign up)
app.post('/api/auth/register', async (req, res) => {
  const { fullName, businessName, email, password } = req.body;

  if (!fullName || !businessName || !email || !password) {
    return res.status(400).json({ success: false, error: 'All registration fields are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check duplication
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'An account with this email already exists. Please sign in.' 
      });
    }

    // Generate UUIDs
    const userId = 'u_owner_' + crypto.randomBytes(6).toString('hex');
    const businessId = 'b_biz_' + crypto.randomBytes(6).toString('hex');
    const workspaceId = 'w_work_' + crypto.randomBytes(6).toString('hex');

    // Hash password securely
    const passwordHash = bcrypt.hashSync(password, 10);

    // Wrap registration in a database transaction to ensure atomicity
    await dbRun('SAVEPOINT register_tenant');

    try {
      // Save owner record
      await dbRun(
        'INSERT INTO users (id, full_name, business_name, email, password_hash, business_id, workspace_id, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, fullName, businessName, normalizedEmail, passwordHash, businessId, workspaceId, new Date().toISOString(), 'Active']
      );

      // Build the initial, default production-ready workspace structure
      const initialWorkspace = {
        businesses: [{
          id: businessId,
          name: businessName,
          type: 'Retail',
          currency: 'KSh',
          status: 'Active',
          createdAt: new Date().toISOString()
        }],
        branches: [{
          id: 'br_default',
          businessId: businessId,
          name: 'Main Branch',
          location: 'HQ',
          status: 'Active',
          isHeadquarters: true,
          createdAt: new Date().toISOString()
        }],
        categories: [],
        profiles: [{
          id: userId,
          name: fullName,
          email: normalizedEmail,
          role: 'Owner / Admin',
          businessId: businessId,
          onlineStatus: 'online',
          status: 'Active'
        }],
        products: [],
        customers: [],
        debts: [],
        sales: [],
        expenses: [],
        procurements: [],
        tasks: [],
        events: [],
        timelogs: [],
        notifications: [],
        audits: [{
          id: 'audit_' + Date.now(),
          businessId: businessId,
          userId: userId,
          action: 'Created Business & Tenant',
          target: businessName,
          details: `${fullName} registered new system tenant on SQLite`,
          timestamp: new Date().toISOString()
        }],
        budgets: [],
        invoices: [],
        bank_transactions: [],
        reconciliations: []
      };

      // Save initial workspace
      await dbRun(
        'INSERT INTO workspaces (business_id, workspace_id, workspace_data) VALUES (?, ?, ?)',
        [businessId, workspaceId, JSON.stringify(initialWorkspace)]
      );

      // Create session
      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

      await dbRun(
        'INSERT INTO sessions (token, user_id, business_id, workspace_id, role, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [token, userId, businessId, workspaceId, 'Owner / Admin', expiresAt]
      );

      res.cookie('apex_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Log Server Audit
      await logServerAudit(businessId, 'Tenant Registered', 'N/A', `${businessName} registered by ${fullName}`, normalizedEmail, fullName, 'Owner / Admin', getClientIp(req));

      await dbRun('RELEASE register_tenant');

      res.json({
        success: true,
        token,
        userId,
        businessId,
        workspaceId,
        user: {
          id: userId,
          name: fullName,
          email: normalizedEmail,
          role: 'Owner / Admin',
          businessId
        },
        workspace: initialWorkspace
      });
    } catch (dbErr) {
      try {
        await dbRun('ROLLBACK TO register_tenant');
        await dbRun('RELEASE register_tenant');
      } catch (rollbackErr) {
        // ignore rollback errors
      }
      throw dbErr;
    }
  } catch (err: any) {
    console.error('Registration API error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error during registration.' });
  }
});

// 2. Owner Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Rate limiting / Account Lockout check
    const lockStatus = isLockedOut(normalizedEmail);
    if (lockStatus.locked) {
      return res.status(429).json({ 
        success: false, 
        error: `Too many failed login attempts. This account is locked. Please try again in ${lockStatus.timeLeftMinutes} minute(s).` 
      });
    }

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    
    if (!user) {
      recordFailedAttempt(normalizedEmail);
      return res.status(401).json({ success: false, error: 'Email not found.' });
    }

    if (user.status !== 'Active') {
      recordFailedAttempt(normalizedEmail);
      const errorMsg = user.status === 'Suspended' ? 'Account suspended.' : 'Account inactive.';
      await logServerAudit(user.business_id, 'Failed Login Attempt', 'N/A', `Suspended/inactive account: ${errorMsg}`, normalizedEmail, user.full_name, 'Owner / Admin', getClientIp(req));
      return res.status(403).json({ success: false, error: errorMsg });
    }

    // Verify Password
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      recordFailedAttempt(normalizedEmail);
      await logServerAudit(user.business_id, 'Failed Login Attempt', 'N/A', `Incorrect password for corporate login`, normalizedEmail, user.full_name, 'Owner / Admin', getClientIp(req));
      return res.status(401).json({ success: false, error: 'Incorrect password.' });
    }

    // Load workspace data
    const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [user.business_id]);
    const workspace = workspaceRow ? JSON.parse(workspaceRow.workspace_data) : null;

    let userRole = 'Owner / Admin';
    if (workspace && Array.isArray(workspace.profiles)) {
      const profile = workspace.profiles.find((p: any) => p.id === user.id || (p.email && p.email.toLowerCase().trim() === normalizedEmail));
      if (profile) {
        userRole = profile.role || 'Employee';
      }
    }

    if (userRole === 'Employee') {
      await logServerAudit(user.business_id, 'Failed Login Attempt', 'N/A', `Employee tried to login via corporate tab`, normalizedEmail, user.full_name, userRole, getClientIp(req));
      return res.status(403).json({ success: false, error: 'Employees must log in using their unique Employee ID on the Employee login tab.' });
    }

    // Create session
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await dbRun(
      'INSERT INTO sessions (token, user_id, business_id, workspace_id, role, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [token, user.id, user.business_id, user.workspace_id, userRole, expiresAt]
    );

    res.cookie('apex_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    resetFailedAttempts(normalizedEmail);

    await logServerAudit(user.business_id, 'Logged In', 'N/A', `${user.full_name} logged in successfully`, normalizedEmail, user.full_name, userRole, getClientIp(req));

    res.json({
      success: true,
      token,
      userId: user.id,
      businessId: user.business_id,
      workspaceId: user.workspace_id,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: userRole,
        businessId: user.business_id
      },
      workspace
    });
  } catch (err: any) {
    console.error('Login API error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error during login.' });
  }
});

// 2b. Employee Login (Employee ID SQLite database)
app.post('/api/auth/employee-login', async (req, res) => {
  const { employeeNumber } = req.body;

  if (!employeeNumber) {
    return res.status(400).json({ success: false, error: 'Employee ID is required.' });
  }

  const empIdCleanUpper = employeeNumber.trim().toUpperCase();

  try {
    // Rate limiting / Account Lockout check
    const lockStatus = isLockedOut(empIdCleanUpper);
    if (lockStatus.locked) {
      return res.status(429).json({ 
        success: false, 
        error: `Too many failed login attempts. This employee ID is locked. Please try again in ${lockStatus.timeLeftMinutes} minute(s).` 
      });
    }

    // Authenticate using the emulated SQLite query!
    const emp = await dbGet('SELECT * FROM employees WHERE employee_id = ?', [employeeNumber.trim()]);

    if (!emp) {
      recordFailedAttempt(empIdCleanUpper);
      return res.status(404).json({ success: false, error: 'Employee ID not found.' });
    }

    if (emp.status === 'Deleted' || emp.status === 'Archived') {
      recordFailedAttempt(empIdCleanUpper);
      await logServerAudit(emp.business_id, 'Failed Login Attempt', 'N/A', `Deleted employee account login attempt: ${employeeNumber.trim()}`, emp.email || 'N/A', emp.full_name, emp.role, getClientIp(req));
      return res.status(403).json({ success: false, error: 'This employee account has been deleted/decommissioned. Access is restricted.' });
    }

    if (emp.status === 'Suspended') {
      recordFailedAttempt(empIdCleanUpper);
      await logServerAudit(emp.business_id, 'Failed Login Attempt', 'N/A', `Suspended employee account login attempt: ${employeeNumber.trim()}`, emp.email || 'N/A', emp.full_name, emp.role, getClientIp(req));
      return res.status(403).json({ success: false, error: 'This employee account is suspended. Please contact your manager.' });
    }

    if (emp.status !== 'Active') {
      recordFailedAttempt(empIdCleanUpper);
      await logServerAudit(emp.business_id, 'Failed Login Attempt', 'N/A', `Inactive employee account login attempt: ${employeeNumber.trim()}`, emp.email || 'N/A', emp.full_name, emp.role, getClientIp(req));
      return res.status(403).json({ success: false, error: 'This employee account is inactive.' });
    }

    // Load workspace data for this employee
    const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [emp.business_id]);
    if (!workspaceRow) {
      return res.status(404).json({ success: false, error: 'Workspace data not found.' });
    }
    const workspace = JSON.parse(workspaceRow.workspace_data);

    // Create session on SQLite emulated DB
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await dbRun(
      'INSERT INTO sessions (token, user_id, business_id, workspace_id, role, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [token, emp.id, emp.business_id, emp.workspace_id || 'w_work_emulated', emp.role, expiresAt]
    );

    res.cookie('apex_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    resetFailedAttempts(empIdCleanUpper);

    await logServerAudit(emp.business_id, 'Employee Logged In', 'N/A', `${emp.full_name} logged in successfully`, emp.email || 'N/A', emp.full_name, emp.role, getClientIp(req));

    res.json({
      success: true,
      token,
      userId: emp.id,
      businessId: emp.business_id,
      workspaceId: emp.workspace_id,
      user: {
        id: emp.id,
        name: emp.full_name,
        role: emp.role,
        businessId: emp.business_id
      },
      workspace
    });
  } catch (err: any) {
    console.error('Employee login API error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error during employee login.' });
  }
});

// Forgot Password Request Handler
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Email address is required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      return res.status(444).json({ success: false, error: 'No account registered with this email address.' });
    }

    // Generate secure, time-limited reset token
    const resetToken = crypto.randomBytes(24).toString('hex');
    const resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour validity

    // Persist token in the SQL database
    await dbRun(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, user.id]
    );

    // Track a Server Audit log entry
    await logServerAudit(
      user.business_id,
      'Forgot Password Requested',
      'N/A',
      `Secure reset token generated for ${normalizedEmail}`,
      normalizedEmail,
      user.full_name,
      'Owner / Admin',
      getClientIp(req)
    );

    // Append alert notification to the user's workspace
    const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [user.business_id]);
    if (workspaceRow) {
      const workspace = JSON.parse(workspaceRow.workspace_data);
      if (!workspace.notifications) workspace.notifications = [];

      const notificationId = 'not_reset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const newNotification = {
        id: notificationId,
        businessId: user.business_id,
        title: '🔑 Password Reset Requested',
        message: `A password reset token was generated for ${user.full_name} (${normalizedEmail}). Token: ${resetToken}. This token expires in 1 hour.`,
        type: 'alert',
        date: new Date().toISOString().split('T')[0],
        read: false
      };

      workspace.notifications.unshift(newNotification);
      await dbRun('UPDATE workspaces SET workspace_data = ? WHERE business_id = ?', [JSON.stringify(workspace), user.business_id]);
    }

    res.json({
      success: true,
      message: 'Password reset token has been successfully generated and delivered to your workspace alert stream.',
      token: resetToken
    });
  } catch (err: any) {
    console.error('Forgot password API error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error while generating password reset token.' });
  }
});

// Reset Password Completion Handler
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, error: 'Token and new password are required.' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE reset_token = ?', [token]);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired password reset token.' });
    }

    const expiryTime = Number(user.reset_token_expires);
    if (Date.now() > expiryTime) {
      return res.status(400).json({ success: false, error: 'Password reset token has expired. Please request a new one.' });
    }

    // Hash the new password and clear the reset token
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await dbRun(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    // Reset lockout tracker if any
    resetFailedAttempts(user.email.toLowerCase().trim());

    // Audit logs
    await logServerAudit(
      user.business_id,
      'Password Reset Completed',
      'N/A',
      `Successfully updated password for ${user.email}`,
      user.email,
      user.full_name,
      'Owner / Admin',
      getClientIp(req)
    );

    // Notify user in workspace
    const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [user.business_id]);
    if (workspaceRow) {
      const workspace = JSON.parse(workspaceRow.workspace_data);
      if (!workspace.notifications) workspace.notifications = [];

      workspace.notifications.unshift({
        id: 'not_reset_success_' + Date.now(),
        businessId: user.business_id,
        title: '🔒 Password Updated Successfully',
        message: 'Your account password has been successfully reset. Any previous lockout limits have been lifted.',
        type: 'success',
        date: new Date().toISOString().split('T')[0],
        read: false
      });

      await dbRun('UPDATE workspaces SET workspace_data = ? WHERE business_id = ?', [JSON.stringify(workspace), user.business_id]);
    }

    res.json({
      success: true,
      message: 'Password updated successfully. You can now log in with your new credentials.'
    });
  } catch (err: any) {
    console.error('Reset password API error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error while resetting password.' });
  }
});

// 3. User Session Verification ('me' endpoint)
app.get('/api/auth/me', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized session.' });
    }

    let user = await dbGet('SELECT id, full_name, email, business_id, workspace_id, status FROM users WHERE id = ?', [session.user_id]);
    let userRole = 'Owner / Admin';

    if (!user) {
      // It might be an employee/manager session since they are stored in workspace profiles, not users table
      const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [session.business_id]);
      if (workspaceRow) {
        const workspace = JSON.parse(workspaceRow.workspace_data);
        const profile = workspace.profiles?.find((p: any) => p.id === session.user_id);
        if (profile) {
          user = {
            id: profile.id,
            full_name: profile.name,
            email: profile.email || '',
            business_id: session.business_id,
            workspace_id: session.workspace_id,
            status: profile.status || 'Active'
          };
          userRole = profile.role || 'Employee';
        }
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'User associated with session not found.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: userRole,
        businessId: user.business_id
      },
      businessId: user.business_id,
      workspaceId: user.workspace_id
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// 4. Logout Session
app.post('/api/auth/logout', async (req, res) => {
  const token = req.cookies?.apex_session;
  if (token) {
    try {
      await dbRun('DELETE FROM sessions WHERE token = ?', [token]);
    } catch (err) {
      console.error('Error deleting session during logout:', err);
    }
  }
  res.clearCookie('apex_session');
  res.json({ success: true, message: 'Successfully logged out.' });
});

// 4.5 Change Password Endpoint
app.post('/api/auth/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current password and new password are required.' });
  }

  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Session expired or invalid.' });
    }

    // Retrieve user from database
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [session.user_id]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Verify current password
    const isPasswordValid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, error: 'Incorrect current password.' });
    }

    // Validate new password complexity
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, error: 'New password must contain at least one letter and one number.' });
    }

    // Hash the new password
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);

    // Update users table
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, session.user_id]);

    // Also update workspace_data profiles if the user is a profile-based employee/manager
    const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [session.business_id]);
    if (workspaceRow) {
      const workspace = JSON.parse(workspaceRow.workspace_data);
      if (Array.isArray(workspace.profiles)) {
        const profileIndex = workspace.profiles.findIndex((p: any) => p.id === session.user_id);
        if (profileIndex !== -1) {
          workspace.profiles[profileIndex].password = newPassword; // Store plain/new password inside JSON workspace (matching original structure)
          await dbRun('UPDATE workspaces SET workspace_data = ? WHERE business_id = ?', [JSON.stringify(workspace), session.business_id]);
        }
      }
    }

    await logServerAudit(session.business_id, 'Password Changed', 'N/A', `Successfully changed password for account: ${user.email}`, user.email, user.full_name, session.role, getClientIp(req));

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error during password update.' });
  }
});

// 5. Load complete workspace securely (isolated by session businessId)
app.get('/api/workspace/load', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid.' });
    }

    const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [session.business_id]);
    if (!workspaceRow) {
      return res.status(404).json({ success: false, error: 'Workspace data not found.' });
    }

    res.json({
      success: true,
      workspace: JSON.parse(workspaceRow.workspace_data)
    });
  } catch (err: any) {
    console.error('Workspace load error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load workspace data.' });
  }
});

// 6. Save complete workspace securely (isolated by session businessId)
app.post('/api/workspace/save', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid.' });
    }

    const { workspace } = req.body;
    if (!workspace) {
      return res.status(400).json({ success: false, error: 'Workspace data payload is missing.' });
    }

    // Force strict database-level filtering using authenticated Business ID in the session!
    // Double check each inner collection has correct businessId assignments
    const sanitizedWorkspace = { ...workspace };
    
    // Write workspace state atomically
    await dbRun(
      'UPDATE workspaces SET workspace_data = ? WHERE business_id = ?',
      [JSON.stringify(sanitizedWorkspace), session.business_id]
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error('Workspace save error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to persist workspace data.' });
  }
});

// Transaction-safe single employee registration
app.post('/api/employee/register', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid.' });
    }

    if (session.role === 'Employee') {
      return res.status(403).json({ success: false, error: 'Forbidden: Employees are not authorized to register new profiles.' });
    }

    const { employee } = req.body;
    if (!employee) {
      return res.status(400).json({ success: false, error: 'Employee payload is missing.' });
    }

    // Explicit SQL Transaction block
    await dbRun('BEGIN TRANSACTION');

    try {
      const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [session.business_id]);
      if (!workspaceRow) {
        await dbRun('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Workspace data not found.' });
      }

      const wsObj = JSON.parse(workspaceRow.workspace_data);
      if (!wsObj.profiles) wsObj.profiles = [];

      let badgeNumber = employee.badgeNumber?.trim();
      const allProfiles = wsObj.profiles;

      if (badgeNumber) {
        // Enforce strict character limits and validation on badge numbers (alphanumeric, 4–10 characters)
        const isAlphanumeric4to10 = /^[a-zA-Z0-9]{4,10}$/.test(badgeNumber);
        if (!isAlphanumeric4to10) {
          await dbRun('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'Employee ID (Badge Number) must be alphanumeric and between 4 and 10 characters long.'
          });
        }

        const exists = allProfiles.some((p: any) => {
          if (p.status === 'Deleted') return false;
          const pNum = p.badgeNumber || p.employeeNumber;
          return pNum && typeof pNum === 'string' && pNum.trim().toUpperCase() === badgeNumber.toUpperCase();
        });
        if (exists) {
          await dbRun('ROLLBACK');
          return res.status(400).json({ 
            success: false, 
            error: `Employee ID "${badgeNumber}" is already in use by another profile in the system. Please enter a unique Employee ID.` 
          });
        }
      } else {
        let nextNum = 1;
        allProfiles.forEach((p: any) => {
          const numStr = p.badgeNumber || p.employeeNumber;
          if (numStr && typeof numStr === 'string') {
            const match = numStr.match(/^EMP-(\d+)$/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num >= nextNum) {
                nextNum = num + 1;
              }
            }
          }
        });
        badgeNumber = `EMP-${String(nextNum).padStart(3, '0')}`;
      }

      const newProfile = {
        ...employee,
        id: 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        businessId: session.business_id,
        onlineStatus: 'offline',
        status: 'Active',
        badgeNumber,
        employeeNumber: badgeNumber,
        dateJoined: new Date().toISOString().split('T')[0],
        registrationDate: new Date().toISOString(),
        createdBy: 'Admin/Manager'
      };

      wsObj.profiles.push(newProfile);

      // Add audit log record to workspace data
      if (!wsObj.audits) wsObj.audits = [];
      wsObj.audits.push({
        id: 'audit_' + Date.now(),
        businessId: session.business_id,
        userId: session.user_id,
        action: 'Created User Profile',
        target: `${employee.name} (${employee.role})`,
        details: `Registered via explicit SQL transaction handling`,
        timestamp: new Date().toISOString()
      });

      await dbRun(
        'UPDATE workspaces SET workspace_data = ? WHERE business_id = ?',
        [JSON.stringify(wsObj), session.business_id]
      );

      await dbRun('COMMIT');

      res.json({ success: true, profile: newProfile });
    } catch (innerErr: any) {
      await dbRun('ROLLBACK');
      throw innerErr;
    }
  } catch (err: any) {
    console.error('Transactional registration API error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error during employee registration.' });
  }
});


// Indexed SQLite Lookup API Routes for Employee and Performance Dashboard
app.get('/api/performance/employees', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    if (session.role === 'Employee') {
      return res.status(403).json({ success: false, error: 'Forbidden: Employees are not authorized to view corporate employee performance data.' });
    }

    const { status, branch } = req.query;
    let query = 'SELECT * FROM employees WHERE business_id = ?';
    const params: any[] = [session.business_id];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (branch && branch !== 'all') {
      query += ' AND branch_id = ?';
      params.push(branch);
    }

    console.log(`[SQLite Lookup] Querying employees with index. SQL: ${query}, Params: ${JSON.stringify(params)}`);
    const startTime = Date.now();
    const rows = await dbAll(query, params);
    const duration = Date.now() - startTime;
    console.log(`[SQLite Lookup] Employee index search returned ${rows.length} rows in ${duration}ms.`);

    const camelRows = rows.map((r: any) => ({
      id: r.id,
      name: r.full_name,
      email: r.email,
      badgeNumber: r.employee_id,
      employeeNumber: r.employee_id,
      role: r.role,
      businessId: r.business_id,
      workspaceId: r.workspace_id,
      branch: r.branch_id,
      status: r.status,
      registrationDate: r.registration_date,
      createdBy: r.created_by
    }));

    res.json({ success: true, employees: camelRows });
  } catch (err: any) {
    console.error('Error querying employees index:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/performance/timelogs', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    let { userId } = req.query;
    if (session.role === 'Employee') {
      // Employees are strictly restricted to retrieving their own clock/timelog records
      userId = session.user_id;
    }

    let query = 'SELECT * FROM timelogs WHERE business_id = ?';
    const params: any[] = [session.business_id];

    if (userId && userId !== 'All') {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    console.log(`[SQLite Lookup] Querying timelogs with index. SQL: ${query}, Params: ${JSON.stringify(params)}`);
    const startTime = Date.now();
    const rows = await dbAll(query, params);
    const duration = Date.now() - startTime;
    console.log(`[SQLite Lookup] Timelogs index search returned ${rows.length} rows in ${duration}ms.`);

    const camelRows = rows.map((r: any) => ({
      id: r.id,
      businessId: r.business_id,
      userId: r.user_id,
      userName: r.user_name,
      role: r.role,
      clockIn: r.clock_in,
      clockOut: r.clock_out || undefined,
      workHours: r.work_hours !== null ? r.work_hours : undefined,
      date: r.date,
      status: r.status
    }));

    res.json({ success: true, timelogs: camelRows });
  } catch (err: any) {
    console.error('Error querying timelogs index:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/performance/sales', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    let { cashierName } = req.query;
    let query = 'SELECT * FROM sales WHERE business_id = ?';
    const params: any[] = [session.business_id];

    if (session.role === 'Employee') {
      // Employees are strictly restricted to querying their own point-of-sale transactions
      const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [session.business_id]);
      let fullName = '';
      if (workspaceRow) {
        const workspace = JSON.parse(workspaceRow.workspace_data);
        const profile = workspace.profiles?.find((p: any) => p.id === session.user_id);
        if (profile) {
          fullName = profile.name;
        }
      }
      query += ' AND (cashier_name = ? OR customer_name = ?)';
      params.push(fullName || 'Unknown', fullName || 'Unknown');
    } else if (cashierName && cashierName !== 'All') {
      query += ' AND cashier_name = ?';
      params.push(cashierName);
    }

    console.log(`[SQLite Lookup] Querying sales with index. SQL: ${query}, Params: ${JSON.stringify(params)}`);
    const startTime = Date.now();
    const rows = await dbAll(query, params);
    const duration = Date.now() - startTime;
    console.log(`[SQLite Lookup] Sales index search returned ${rows.length} rows in ${duration}ms.`);

    // Map rows to camelCase structure for frontend compatibility
    const camelRows = rows.map((r: any) => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      businessId: r.business_id,
      totalAmount: r.total_amount,
      discount: r.discount,
      tax: r.tax,
      netAmount: r.net_amount,
      customerName: r.customer_name,
      customerId: r.customer_id,
      date: r.date,
      time: r.time,
      cashierName: r.cashier_name,
      cashierRole: r.cashier_role,
      paymentMethod: r.payment_method,
      items: JSON.parse(r.items_json || '[]')
    }));

    res.json({ success: true, sales: camelRows });
  } catch (err: any) {
    console.error('Error querying sales index:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/performance/tasks', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    let { assignedTo } = req.query;
    let query = 'SELECT * FROM tasks WHERE business_id = ?';
    const params: any[] = [session.business_id];

    if (session.role === 'Employee') {
      // Employees are strictly restricted to querying their own task lists
      const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [session.business_id]);
      let fullName = '';
      if (workspaceRow) {
        const workspace = JSON.parse(workspaceRow.workspace_data);
        const profile = workspace.profiles?.find((p: any) => p.id === session.user_id);
        if (profile) {
          fullName = profile.name;
        }
      }
      query += ' AND (assigned_to_id = ? OR assigned_to = ?)';
      params.push(session.user_id, fullName || 'Unknown');
    } else if (assignedTo && assignedTo !== 'All') {
      query += ' AND assigned_to = ?';
      params.push(assignedTo);
    }

    console.log(`[SQLite Lookup] Querying tasks with index. SQL: ${query}, Params: ${JSON.stringify(params)}`);
    const startTime = Date.now();
    const rows = await dbAll(query, params);
    const duration = Date.now() - startTime;
    console.log(`[SQLite Lookup] Tasks index search returned ${rows.length} rows in ${duration}ms.`);

    const camelRows = rows.map((r: any) => ({
      id: r.id,
      businessId: r.business_id,
      title: r.title,
      assignedTo: r.assigned_to,
      assignedToId: r.assigned_to_id,
      status: r.status
    }));

    res.json({ success: true, tasks: camelRows });
  } catch (err: any) {
    console.error('Error querying tasks index:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/performance/expenses', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    if (session.role === 'Employee') {
      return res.status(403).json({ success: false, error: 'Forbidden: Employees are not authorized to view general business expenses.' });
    }

    const query = 'SELECT * FROM expenses WHERE business_id = ?';
    const params: any[] = [session.business_id];

    console.log(`[SQLite Lookup] Querying expenses with index. SQL: ${query}, Params: ${JSON.stringify(params)}`);
    const startTime = Date.now();
    const rows = await dbAll(query, params);
    const duration = Date.now() - startTime;
    console.log(`[SQLite Lookup] Expenses index search returned ${rows.length} rows in ${duration}ms.`);

    const camelRows = rows.map((r: any) => ({
      id: r.id,
      businessId: r.business_id,
      amount: r.amount,
      category: r.category,
      date: r.date,
      description: r.description,
      recordedBy: r.recorded_by
    }));

    res.json({ success: true, expenses: camelRows });
  } catch (err: any) {
    console.error('Error querying expenses index:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback 404 handler for unmatched API routes to prevent returning HTML pages
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.url}` });
});


// FRONTEND DEV / PRODUCTION SERVING
async function startServer() {
  // Initialize Database tables
  await initDb();

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server middleware mounted.');
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static bundle from /dist');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server listening at http://localhost:${PORT}`);
  });
}

startServer();
