import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Location for local SQLite file
// In Vercel production, this would be replaced by a Cloud DB connection string.
const DB_PATH = path.join(process.cwd(), 'api/database.sqlite');

// Ensure the directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

// Initialize schema
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT,
        model TEXT,
        client_name TEXT,
        client_id TEXT,
        status TEXT,
        created_at TEXT,
        last_active TEXT,
        total_api_calls INTEGER DEFAULT 0,
        today_api_calls INTEGER DEFAULT 0,
        total_tasks INTEGER DEFAULT 0,
        today_tasks INTEGER DEFAULT 0,
        error_rate REAL DEFAULT 0,
        avg_response_time REAL DEFAULT 0,
        total_response_time INTEGER DEFAULT 0,
        response_count INTEGER DEFAULT 0,
        api_status TEXT DEFAULT 'unknown',
        base_url TEXT,
        account TEXT,
        api_key TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS api_breakdown (
        agent_id TEXT,
        api_type TEXT,
        today_count INTEGER DEFAULT 0,
        total_count INTEGER DEFAULT 0,
        PRIMARY KEY (agent_id, api_type),
        FOREIGN KEY(agent_id) REFERENCES agents(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS daily_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT,
        date TEXT,
        tasks INTEGER DEFAULT 0,
        api_calls INTEGER DEFAULT 0,
        breakdown TEXT,
        FOREIGN KEY(agent_id) REFERENCES agents(id),
        UNIQUE(agent_id, date)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS hourly_stats (
        agent_id TEXT,
        hour TEXT,
        tasks INTEGER DEFAULT 0,
        api_calls INTEGER DEFAULT 0,
        updated_at TEXT,
        PRIMARY KEY (agent_id, hour),
        FOREIGN KEY(agent_id) REFERENCES agents(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT,
        action TEXT,
        type TEXT,
        status TEXT,
        timestamp TEXT,
        response_time INTEGER,
        FOREIGN KEY(agent_id) REFERENCES agents(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`, () => {
        // Seed default user
        const adminHash = '$2b$10$p3Okla.uPjfl0FF32np32eoxnYNI5hANdJBRLplE/VjfTFHCYupzu';
        db.run('INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)', ['steve', adminHash]);

        // Seed/Update WorldLocker agent with base_url
        db.run('UPDATE agents SET base_url = ? WHERE id = ?', ['http://localhost:3001', 'agent-worldlocker-001']);
    });
});

/**
 * Promise-based wrappers
 */
export const query = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

export const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

export const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});

export default db;
