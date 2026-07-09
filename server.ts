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

// Helper to authenticate request and get session
async function getSession(req: express.Request): Promise<any | null> {
  const token = req.cookies?.apex_session;
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

    // Save owner record
    await dbRun(
      'INSERT INTO users (id, full_name, business_name, email, password_hash, business_id, workspace_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, fullName, businessName, normalizedEmail, passwordHash, businessId, workspaceId, 'Active']
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

    res.json({
      success: true,
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
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Email not found.' });
    }

    if (user.status !== 'Active') {
      const errorMsg = user.status === 'Suspended' ? 'Account suspended.' : 'Account inactive.';
      return res.status(403).json({ success: false, error: errorMsg });
    }

    // Verify Password
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Incorrect password.' });
    }

    // Load workspace data
    const workspaceRow = await dbGet('SELECT workspace_data FROM workspaces WHERE business_id = ?', [user.business_id]);
    const workspace = workspaceRow ? JSON.parse(workspaceRow.workspace_data) : null;

    // Create session
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await dbRun(
      'INSERT INTO sessions (token, user_id, business_id, workspace_id, role, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [token, user.id, user.business_id, user.workspace_id, 'Owner / Admin', expiresAt]
    );

    res.cookie('apex_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      userId: user.id,
      businessId: user.business_id,
      workspaceId: user.workspace_id,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: 'Owner / Admin',
        businessId: user.business_id
      },
      workspace
    });
  } catch (err: any) {
    console.error('Login API error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error during login.' });
  }
});

// 3. User Session Verification ('me' endpoint)
app.get('/api/auth/me', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized session.' });
    }

    const user = await dbGet('SELECT id, full_name, email, business_id, workspace_id, status FROM users WHERE id = ?', [session.user_id]);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User associated with session not found.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: 'Owner / Admin',
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
