import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

const DB_PATH = path.join(process.cwd(), 'apex_ledger.db');

let db: sqlite3.Database;

// Forced SQLite exclusively as per user and prompt guidelines unless PostgreSQL/Supabase is configured in environment
const isPgConfigured = !!(process.env.DATABASE_URL || process.env.SQL_CONNECTION_STRING);

let pgPool: pg.Pool | null = null;

if (isPgConfigured) {
  console.log('PostgreSQL/Supabase configuration found. Instantiating pg Pool...');
  const connectionString = process.env.DATABASE_URL || process.env.SQL_CONNECTION_STRING;
  
  pgPool = new Pool({
    connectionString,
    host: connectionString ? undefined : process.env.SQL_HOST,
    user: connectionString ? undefined : process.env.SQL_USER,
    password: connectionString ? undefined : process.env.SQL_PASSWORD,
    database: connectionString ? undefined : process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
    // Supabase and most remote PostgreSQL services require SSL
    ssl: { rejectUnauthorized: false }
  });

  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle SQL pool client:', err);
  });
}

// Keep an explicit db object exported so we don't break any imports
export const dbWrapper = {
  close: () => {
    if (db) {
      db.close();
      console.log('Real SQLite database closed.');
    }
    if (pgPool) {
      pgPool.end();
      console.log('PostgreSQL pool closed.');
    }
  }
};
export { dbWrapper as db };

function translateQueryToPg(sql: string, params: any[]): { sql: string; params: any[] } {
  let translatedSql = sql;
  
  // Replace SQLite "INSERT OR IGNORE INTO" with PostgreSQL "INSERT INTO ... ON CONFLICT DO NOTHING"
  if (translatedSql.toLowerCase().includes('insert or ignore into')) {
    translatedSql = translatedSql.replace(/insert or ignore into/gi, 'INSERT INTO');
    if (!translatedSql.toLowerCase().includes('on conflict')) {
      translatedSql += ' ON CONFLICT DO NOTHING';
    }
  }

  // PostgreSQL savepoint releases require 'RELEASE SAVEPOINT <name>' instead of just 'RELEASE <name>'
  if (translatedSql.toLowerCase().includes('release sync_all_ws_tables')) {
    translatedSql = translatedSql.replace(/release sync_all_ws_tables/gi, 'RELEASE SAVEPOINT sync_all_ws_tables');
  }

  // Convert positional "?" placeholders to PostgreSQL "$1", "$2", "$3", etc.
  let index = 1;
  translatedSql = translatedSql.replace(/\?/g, () => `$${index++}`);

  return { sql: translatedSql, params };
}

function pgQuery(sql: string, params: any[] = []): Promise<any> {
  if (!pgPool) throw new Error('PostgreSQL pool is not initialized');
  const { sql: translatedSql, params: translatedParams } = translateQueryToPg(sql, params);
  return pgPool.query(translatedSql, translatedParams);
}

async function initPgDb(): Promise<void> {
  console.log('Initializing PostgreSQL database schema...');
  const tables = [
    `CREATE TABLE IF NOT EXISTS system_errors (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      error_message TEXT NOT NULL,
      error_stack TEXT,
      sql_statement TEXT,
      sql_params TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      business_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      business_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      phone_number TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS workspaces (
      business_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      workspace_data TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      role TEXT NOT NULL,
      expires_at BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      role TEXT NOT NULL,
      business_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      registration_date TEXT NOT NULL,
      created_by TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS timelogs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL,
      clock_in TEXT NOT NULL,
      clock_out TEXT,
      work_hours REAL,
      date TEXT NOT NULL,
      status TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      business_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      discount REAL NOT NULL,
      tax REAL NOT NULL,
      net_amount REAL NOT NULL,
      customer_name TEXT NOT NULL,
      customer_id TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      cashier_role TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      items_json TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      title TEXT NOT NULL,
      assigned_to TEXT NOT NULL,
      assigned_to_id TEXT,
      status TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      recorded_by TEXT NOT NULL
    )`
  ];

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`,
    `CREATE INDEX IF NOT EXISTS idx_employees_id ON employees(employee_id)`,
    `CREATE INDEX IF NOT EXISTS idx_employees_business ON employees(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_timelogs_business ON timelogs(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_timelogs_user ON timelogs(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_timelogs_date ON timelogs(date)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_name)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_business ON tasks(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_business ON expenses(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`
  ];

  for (const q of tables) {
    await pgQuery(q);
  }
  for (const q of indexes) {
    await pgQuery(q);
  }

  try {
    await pgQuery('ALTER TABLE users ADD COLUMN phone_number TEXT');
  } catch (err) {
    // Safe column migration fallback
  }

  try {
    await pgQuery('ALTER TABLE users ADD COLUMN reset_token TEXT');
  } catch (err) {
    // Safe column migration fallback
  }

  try {
    await pgQuery('ALTER TABLE users ADD COLUMN reset_token_expires BIGINT');
  } catch (err) {
    // Safe column migration fallback
  }

  console.log('PostgreSQL database schema initialized successfully.');
  await runSeedAndMigration();
}

export async function initDb(): Promise<void> {
  if (pgPool) {
    try {
      await initPgDb();
      return;
    } catch (err) {
      console.error('CRITICAL: Failed to initialize PostgreSQL database (e.g. auth failure). Falling back to SQLite:', err);
      try {
        await pgPool.end();
      } catch (e) {}
      pgPool = null;
    }
  }

  return new Promise((resolve, reject) => {
    // Open SQLite database
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err);
        return reject(err);
      }
      
      // Enable foreign keys and optimize performance
      db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON;');
        db.run('PRAGMA journal_mode = WAL;');
        db.run('PRAGMA synchronous = NORMAL;');
        db.run('PRAGMA temp_store = MEMORY;');
        
        // Create tables
          db.run(`
            CREATE TABLE IF NOT EXISTS system_errors (
              id TEXT PRIMARY KEY,
              timestamp TEXT NOT NULL,
              error_message TEXT NOT NULL,
              error_stack TEXT,
              sql_statement TEXT,
              sql_params TEXT
            )
          `);

          db.run(`
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              full_name TEXT NOT NULL,
              business_name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              business_id TEXT NOT NULL,
              workspace_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'Active',
              phone_number TEXT
            )
          `);

          db.run('ALTER TABLE users ADD COLUMN phone_number TEXT', (err) => {
            // Safe column migration fallback
          });

          db.run('ALTER TABLE users ADD COLUMN reset_token TEXT', (err) => {
            // Safe column migration fallback
          });

          db.run('ALTER TABLE users ADD COLUMN reset_token_expires INTEGER', (err) => {
            // Safe column migration fallback
          });

          db.run(`
            CREATE TABLE IF NOT EXISTS workspaces (
              business_id TEXT PRIMARY KEY,
              workspace_id TEXT NOT NULL,
              workspace_data TEXT NOT NULL
            )
          `);

          db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              business_id TEXT NOT NULL,
              workspace_id TEXT NOT NULL,
              role TEXT NOT NULL,
              expires_at INTEGER NOT NULL
            )
          `);

          db.run(`
            CREATE TABLE IF NOT EXISTS employees (
              id TEXT PRIMARY KEY,
              full_name TEXT NOT NULL,
              email TEXT NOT NULL,
              employee_id TEXT NOT NULL,
              role TEXT NOT NULL,
              business_id TEXT NOT NULL,
              workspace_id TEXT NOT NULL,
              branch_id TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'Active',
              registration_date TEXT NOT NULL,
              created_by TEXT NOT NULL
            )
          `);

          db.run(`
            CREATE TABLE IF NOT EXISTS timelogs (
              id TEXT PRIMARY KEY,
              business_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              user_name TEXT NOT NULL,
              role TEXT NOT NULL,
              clock_in TEXT NOT NULL,
              clock_out TEXT,
              work_hours REAL,
              date TEXT NOT NULL,
              status TEXT NOT NULL
            )
          `);

          db.run(`
            CREATE TABLE IF NOT EXISTS sales (
              id TEXT PRIMARY KEY,
              invoice_number TEXT NOT NULL,
              business_id TEXT NOT NULL,
              total_amount REAL NOT NULL,
              discount REAL NOT NULL,
              tax REAL NOT NULL,
              net_amount REAL NOT NULL,
              customer_name TEXT NOT NULL,
              customer_id TEXT,
              date TEXT NOT NULL,
              time TEXT NOT NULL,
              cashier_name TEXT NOT NULL,
              cashier_role TEXT NOT NULL,
              payment_method TEXT NOT NULL,
              items_json TEXT NOT NULL
            )
          `);

          db.run(`
            CREATE TABLE IF NOT EXISTS tasks (
              id TEXT PRIMARY KEY,
              business_id TEXT NOT NULL,
              title TEXT NOT NULL,
              assigned_to TEXT NOT NULL,
              assigned_to_id TEXT,
              status TEXT NOT NULL
            )
          `);

          db.run(`
            CREATE TABLE IF NOT EXISTS expenses (
              id TEXT PRIMARY KEY,
              business_id TEXT NOT NULL,
              amount REAL NOT NULL,
              category TEXT NOT NULL,
              date TEXT NOT NULL,
              description TEXT,
              recorded_by TEXT NOT NULL
            )
          `);

          db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_employees_id ON employees(employee_id)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_employees_business ON employees(business_id)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_timelogs_business ON timelogs(business_id)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_timelogs_user ON timelogs(user_id)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_timelogs_date ON timelogs(date)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_name)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_business ON tasks(business_id)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_business ON expenses(business_id)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`);

          // Once tables are set up, perform migrations and auto-seeding
          runSeedAndMigration()
            .then(resolve)
            .catch(reject);
        });
      });
    });
  }

async function runSeedAndMigration(): Promise<void> {
  try {
    // Check if we already have users in the database
    const userCountRow = await dbGet('SELECT COUNT(*) as count FROM users');
    if (userCountRow && Number(userCountRow.count) > 0) {
      console.log('Users exist in database. Skipping migration/seeding.');
      return;
    }

    // Check if old JSON DB exists
    const JSON_DB_PATH = path.join(process.cwd(), 'apex_ledger.json');
    if (fs.existsSync(JSON_DB_PATH)) {
      console.log('Found existing JSON database, migrating data to real SQLite DB...');
      const content = fs.readFileSync(JSON_DB_PATH, 'utf-8');
      const dbData = JSON.parse(content);

      if (Array.isArray(dbData.users)) {
        for (const u of dbData.users) {
          await dbRun(
            'INSERT OR IGNORE INTO users (id, full_name, business_name, email, password_hash, business_id, workspace_id, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [u.id, u.full_name, u.business_name, u.email.toLowerCase().trim(), u.password_hash, u.business_id, u.workspace_id, u.created_at || new Date().toISOString(), u.status || 'Active']
          );
        }
      }

      if (Array.isArray(dbData.workspaces)) {
        for (const w of dbData.workspaces) {
          await dbRun(
            'INSERT OR IGNORE INTO workspaces (business_id, workspace_id, workspace_data) VALUES (?, ?, ?)',
            [w.business_id, w.workspace_id, w.workspace_data]
          );
        }
      }

      if (Array.isArray(dbData.sessions)) {
        for (const s of dbData.sessions) {
          await dbRun(
            'INSERT OR IGNORE INTO sessions (token, user_id, business_id, workspace_id, role, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
            [s.token, s.user_id, s.business_id, s.workspace_id, s.role, s.expires_at]
          );
        }
      }

      if (Array.isArray(dbData.employees)) {
        for (const e of dbData.employees) {
          await dbRun(
            'INSERT OR IGNORE INTO employees (id, full_name, email, employee_id, role, business_id, workspace_id, branch_id, status, registration_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [e.id, e.full_name, e.email, e.employee_id, e.role, e.business_id, e.workspace_id, e.branch_id, e.status, e.registration_date, e.created_by]
          );
        }
      }

      console.log('Data migration to real SQLite completed successfully!');
      return;
    }

    // Seed default demo account if no migration occurred
    console.log('No migration data found. Creating default demo seed (demo@company.com / password)...');
    const demoEmail = 'demo@company.com';
    const demoUserId = 'u_owner_demo';
    const demoBusinessId = 'b_biz_demo';
    const demoWorkspaceId = 'w_work_demo';
    const passwordHash = bcrypt.hashSync('password', 10);

    await dbRun(
      'INSERT INTO users (id, full_name, business_name, email, password_hash, business_id, workspace_id, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [demoUserId, 'Demo Admin', 'Demo Enterprise', demoEmail, passwordHash, demoBusinessId, demoWorkspaceId, new Date().toISOString(), 'Active']
    );

    const demoWorkspace = {
      businesses: [{
        id: demoBusinessId,
        name: 'Demo Enterprise',
        type: 'Retail',
        currency: 'KSh',
        status: 'Active',
        createdAt: new Date().toISOString()
      }],
      branches: [{
        id: 'br_default',
        businessId: demoBusinessId,
        name: 'Main Branch',
        location: 'HQ',
        status: 'Active',
        isHeadquarters: true,
        createdAt: new Date().toISOString()
      }],
      categories: [],
      profiles: [{
        id: demoUserId,
        name: 'Demo Admin',
        email: demoEmail,
        role: 'Owner / Admin',
        businessId: demoBusinessId,
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
        id: 'audit_demo',
        businessId: demoBusinessId,
        userId: demoUserId,
        action: 'Created Business & Tenant',
        target: 'Demo Enterprise',
        details: 'Demo workspace auto-seeded on startup',
        timestamp: new Date().toISOString()
      }],
      budgets: [],
      invoices: [],
      bank_transactions: [],
      reconciliations: []
    };

    await dbRun(
      'INSERT INTO workspaces (business_id, workspace_id, workspace_data) VALUES (?, ?, ?)',
      [demoBusinessId, demoWorkspaceId, JSON.stringify(demoWorkspace)]
    );

    // Sync all SQLite index tables
    await syncAllWorkspaceTables(demoBusinessId, JSON.stringify(demoWorkspace));
  } catch (err) {
    console.error('Error seeding real SQLite database:', err);
  }
}

export async function syncAllWorkspaceTables(businessId: string, workspaceDataJson: string): Promise<void> {
  try {
    const ws = JSON.parse(workspaceDataJson);
    if (!ws) return;

    // Use a Savepoint (nested-friendly transaction) to speed up batch writes 100x and ensure atomicity
    await dbRun('SAVEPOINT sync_all_ws_tables');

    try {
      // 1. Sync employees
      await syncEmployeesFromWorkspace(businessId, workspaceDataJson);

      // 2. Sync timelogs
      if (Array.isArray(ws.timelogs)) {
        await dbRun('DELETE FROM timelogs WHERE business_id = ?', [businessId]);
        for (const log of ws.timelogs) {
          await dbRun(`
            INSERT OR IGNORE INTO timelogs (id, business_id, user_id, user_name, role, clock_in, clock_out, work_hours, date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            log.id,
            log.businessId || businessId,
            log.userId || '',
            log.userName || '',
            log.role || '',
            log.clockIn || '',
            log.clockOut || null,
            log.workHours !== undefined ? log.workHours : null,
            log.date || '',
            log.status || ''
          ]);
        }
      }

      // 3. Sync sales
      if (Array.isArray(ws.sales)) {
        await dbRun('DELETE FROM sales WHERE business_id = ?', [businessId]);
        for (const sale of ws.sales) {
          await dbRun(`
            INSERT OR IGNORE INTO sales (id, invoice_number, business_id, total_amount, discount, tax, net_amount, customer_name, customer_id, date, time, cashier_name, cashier_role, payment_method, items_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            sale.id,
            sale.invoiceNumber || '',
            sale.businessId || businessId,
            sale.totalAmount || 0,
            sale.discount || 0,
            sale.tax || 0,
            sale.netAmount || 0,
            sale.customerName || 'Walk-in Customer',
            sale.customerId || null,
            sale.date || '',
            sale.time || '',
            sale.cashierName || '',
            sale.cashierRole || 'Employee',
            sale.paymentMethod || 'Cash',
            JSON.stringify(sale.items || [])
          ]);
        }
      }

      // 4. Sync tasks
      if (Array.isArray(ws.tasks)) {
        await dbRun('DELETE FROM tasks WHERE business_id = ?', [businessId]);
        for (const task of ws.tasks) {
          await dbRun(`
            INSERT OR IGNORE INTO tasks (id, business_id, title, assigned_to, assigned_to_id, status)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            task.id,
            task.businessId || businessId,
            task.title || '',
            task.assignedTo || task.assignedEmployeeName || '',
            task.assignedToId || task.assignedEmployeeId || null,
            task.status || 'Pending'
          ]);
        }
      }

      // 5. Sync expenses
      if (Array.isArray(ws.expenses)) {
        await dbRun('DELETE FROM expenses WHERE business_id = ?', [businessId]);
        for (const exp of ws.expenses) {
          await dbRun(`
            INSERT OR IGNORE INTO expenses (id, business_id, amount, category, date, description, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            exp.id,
            exp.businessId || businessId,
            exp.amount || 0,
            exp.category || '',
            exp.date || '',
            exp.description || '',
            exp.recordedBy || ''
          ]);
        }
      }

      await dbRun('RELEASE sync_all_ws_tables');
      console.log(`Successfully synchronized SQLite index tables for business: ${businessId}`);
    } catch (innerErr) {
      await dbRun('ROLLBACK TO sync_all_ws_tables');
      await dbRun('RELEASE sync_all_ws_tables');
      throw innerErr;
    }
  } catch (err) {
    console.error('Error synchronizing index tables from workspace JSON:', err);
  }
}

export async function syncEmployeesFromWorkspace(businessId: string, workspaceDataJson: string): Promise<void> {
  try {
    const ws = JSON.parse(workspaceDataJson);
    if (!ws || !Array.isArray(ws.profiles)) return;
    
    // First remove existing employees for this business
    await dbRun('DELETE FROM employees WHERE business_id = ?', [businessId]);
    
    // Get business name for corporate user registration
    let businessName = 'Apex Business';
    if (ws.businesses && ws.businesses[0] && ws.businesses[0].name) {
      businessName = ws.businesses[0].name;
    }
    
    for (const p of ws.profiles) {
      const employee_id = (p.badgeNumber || p.employeeNumber || p.employee_id || '').trim();
      if (!employee_id) continue;
      
      await dbRun(`
        INSERT INTO employees (id, full_name, email, employee_id, role, business_id, workspace_id, branch_id, status, registration_date, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        p.id,
        p.name,
        p.email || '',
        employee_id,
        p.role,
        p.businessId || businessId,
        ws.id || 'w_work_emulated',
        p.branch || 'Main HQ',
        p.status || 'Active',
        p.registrationDate || p.dateJoined || new Date().toISOString(),
        p.createdBy || 'Owner'
      ]);

      // If they are a Manager or Admin, they should also be able to log in using Corporate email and password
      if (p.role === 'Manager' || p.role === 'Owner / Admin' || p.role === 'Admin') {
        const normalizedEmail = (p.email || '').toLowerCase().trim();
        if (normalizedEmail) {
          const existingUser = await dbGet('SELECT * FROM users WHERE email = ? OR id = ?', [normalizedEmail, p.id]);
          
          if (!existingUser) {
            // Seed a default password (such as the employee_id/badgeNumber) if no password on the profile object
            const plainPassword = p.password || employee_id || 'password';
            const passwordHash = bcrypt.hashSync(plainPassword, 10);
            
            await dbRun(`
              INSERT INTO users (id, full_name, business_name, email, password_hash, business_id, workspace_id, created_at, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              p.id,
              p.name,
              businessName,
              normalizedEmail,
              passwordHash,
              p.businessId || businessId,
              ws.id || 'w_work_emulated',
              new Date().toISOString(),
              p.status || 'Active'
            ]);
          } else {
            // Update existing user info
            if (p.password) {
              const newHash = bcrypt.hashSync(p.password, 10);
              await dbRun(`
                UPDATE users 
                SET full_name = ?, email = ?, password_hash = ?, status = ?
                WHERE id = ?
              `, [p.name, normalizedEmail, newHash, p.status || 'Active', existingUser.id]);
            } else {
              await dbRun(`
                UPDATE users 
                SET full_name = ?, email = ?, status = ?
                WHERE id = ?
              `, [p.name, normalizedEmail, p.status || 'Active', existingUser.id]);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error syncing employees from workspace:', err);
  }
}

// Centralized SQLite/Postgres Exception Logger and Translator
export async function logSystemError(errorMessage: string, errorStack?: string, sqlStatement?: string, sqlParams?: any[]): Promise<void> {
  const id = 'err_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const timestamp = new Date().toISOString();
  const paramsStr = sqlParams ? JSON.stringify(sqlParams) : null;
  
  if (pgPool) {
    try {
      await pgPool.query(
        'INSERT INTO system_errors (id, timestamp, error_message, error_stack, sql_statement, sql_params) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, timestamp, errorMessage, errorStack || null, sqlStatement || null, paramsStr]
      );
    } catch (err) {
      console.error('Failed to write to system_errors table in PG:', err);
    }
    return;
  }

  if (db) {
    db.run(
      'INSERT INTO system_errors (id, timestamp, error_message, error_stack, sql_statement, sql_params) VALUES (?, ?, ?, ?, ?, ?)',
      [id, timestamp, errorMessage, errorStack || null, sqlStatement || null, paramsStr],
      (err) => {
        if (err) {
          console.error('Failed to write to system_errors table in SQLite:', err);
        }
      }
    );
  }
}

export function translateToUserFriendlyError(err: any): Error {
  if (!err) return new Error('An unexpected database error occurred. Please try again.');
  
  const originalMessage = String(err.message || err);
  let friendlyMessage = 'An error occurred while processing your database request. The system administrator has been notified.';
  
  if (originalMessage.includes('UNIQUE constraint failed')) {
    if (originalMessage.includes('users.email') || originalMessage.includes('employees.email')) {
      friendlyMessage = 'This email address is already registered. Please use a different email.';
    } else if (originalMessage.includes('employees.employee_id')) {
      friendlyMessage = 'This Employee ID is already assigned. Please use a unique Employee ID.';
    } else {
      friendlyMessage = 'A record with this unique identifier already exists.';
    }
  } else if (originalMessage.includes('FOREIGN KEY constraint failed')) {
    friendlyMessage = 'A relationship validation failed. Please ensure all linked records exist.';
  } else if (originalMessage.includes('NOT NULL constraint failed')) {
    friendlyMessage = 'Some required fields are missing. Please fill out all required information.';
  } else if (originalMessage.includes('locked') || originalMessage.includes('busy')) {
    friendlyMessage = 'The database is currently busy. Please try your request again in a moment.';
  } else if (originalMessage.includes('no such table')) {
    friendlyMessage = 'A requested database table was not found. Please contact support.';
  } else if (originalMessage.includes('no such column')) {
    friendlyMessage = 'A requested database column was not found. Please contact support.';
  }
  
  const friendlyErr = new Error(friendlyMessage);
  (friendlyErr as any).originalError = err;
  return friendlyErr;
}

// Promisified query wrappers
export function dbGet(sql: string, params: any[] = []): Promise<any> {
  if (pgPool) {
    return pgQuery(sql, params).then(res => res.rows[0] || null).catch(async (err) => {
      console.error('PostgreSQL dbGet error:', err, 'SQL:', sql);
      await logSystemError(err.message, err.stack, sql, params);
      throw translateToUserFriendlyError(err);
    });
  }
  return new Promise((resolve, reject) => {
    db.get(sql, params, async (err, row) => {
      if (err) {
        console.error('SQLite dbGet error:', err, 'SQL:', sql);
        await logSystemError(err.message, err.stack, sql, params);
        reject(translateToUserFriendlyError(err));
      } else {
        resolve(row || null);
      }
    });
  });
}

export function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  if (pgPool) {
    return pgQuery(sql, params).then(res => res.rows || []).catch(async (err) => {
      console.error('PostgreSQL dbAll error:', err, 'SQL:', sql);
      await logSystemError(err.message, err.stack, sql, params);
      throw translateToUserFriendlyError(err);
    });
  }
  return new Promise((resolve, reject) => {
    db.all(sql, params, async (err, rows) => {
      if (err) {
        console.error('SQLite dbAll error:', err, 'SQL:', sql);
        await logSystemError(err.message, err.stack, sql, params);
        reject(translateToUserFriendlyError(err));
      } else {
        resolve(rows || []);
      }
    });
  });
}

export async function dbRun(sql: string, params: any[] = []): Promise<{ id: number; changes: number }> {
  if (pgPool) {
    try {
      const res = await pgQuery(sql, params);
      const cleanSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
      const isWorkspaceWrite = cleanSql.includes('workspaces') && (cleanSql.includes('insert') || cleanSql.includes('update'));
      
      if (isWorkspaceWrite) {
        let businessId = '';
        let workspaceData = '';
        
        if (cleanSql.includes('update')) {
          workspaceData = params[0];
          businessId = params[1];
        } else {
          businessId = params[0];
          workspaceData = params[2];
        }

        if (businessId && workspaceData) {
          try {
            await syncAllWorkspaceTables(businessId, workspaceData);
          } catch (syncErr) {
            console.error('Auto-sync workspace tables error in PostgreSQL:', syncErr);
          }
        }
      }
      return { id: 0, changes: res.rowCount || 0 };
    } catch (err: any) {
      console.error('PostgreSQL dbRun error:', err, 'SQL:', sql);
      await logSystemError(err.message, err.stack, sql, params);
      throw translateToUserFriendlyError(err);
    }
  }

  return new Promise((resolve, reject) => {
    db.run(sql, params, async function (err) {
      if (err) {
        console.error('SQLite dbRun error:', err, 'SQL:', sql);
        await logSystemError(err.message, err.stack, sql, params);
        reject(translateToUserFriendlyError(err));
      } else {
        const cleanSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
        const isWorkspaceWrite = cleanSql.includes('workspaces') && (cleanSql.includes('insert') || cleanSql.includes('update'));
        
        if (isWorkspaceWrite) {
          let businessId = '';
          let workspaceData = '';
          
          if (cleanSql.includes('update')) {
            // UPDATE workspaces SET workspace_data = ? WHERE business_id = ?
            workspaceData = params[0];
            businessId = params[1];
          } else {
            // INSERT INTO workspaces (business_id, workspace_id, workspace_data) VALUES (?, ?, ?)
            businessId = params[0];
            workspaceData = params[2];
          }

          if (businessId && workspaceData) {
            try {
              await syncAllWorkspaceTables(businessId, workspaceData);
            } catch (syncErr: any) {
              console.error('Auto-sync workspace tables error:', syncErr);
              await logSystemError(syncErr.message, syncErr.stack, 'syncAllWorkspaceTables', [businessId]);
            }
            resolve({ id: this.lastID, changes: this.changes });
            return;
          }
        }
        
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}
