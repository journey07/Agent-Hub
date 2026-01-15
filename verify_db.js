import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'api/database.sqlite');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    db.get("SELECT id, name, model, account, api_key, base_url FROM agents WHERE id = 'agent-worldlocker-001'", (err, row) => {
        if (err) {
            console.error('Error querying agent:', err);
        } else {
            console.log('Agent Data:', row);
        }
        db.close();
    });
});
