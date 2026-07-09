import sqlite3 from 'sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'apex_ledger.db');

export const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    console.log('SQLite database successfully connected at:', DB_PATH);
  }
});

// Helper for running migrations or initialization statements
export function dbRun(sql: string, params: any[] = []): Promise<{ id: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Helper to get a single row
export function dbGet(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Helper to get multiple rows
export function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

// Initialize tables
export async function initDb() {
  try {
    // 1. Create users/owners table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        business_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        business_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'Active'
      )
    `);

    // 2. Create workspaces table to hold serialized configurations, inventory, sales, etc.
    await dbRun(`
      CREATE TABLE IF NOT EXISTS workspaces (
        business_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        workspace_data TEXT NOT NULL
      )
    `);

    // 3. Create persistent session table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        business_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        role TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);

    console.log('SQLite tables initialized successfully.');
  } catch (err) {
    console.error('Error initializing SQLite tables:', err);
  }
}
