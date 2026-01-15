import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'api/database.sqlite');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    console.log('Checking schema...');

    // Check if columns exist
    db.all("PRAGMA table_info(agents)", (err, rows) => {
        if (err) {
            console.error('Error getting table info:', err);
            db.close();
            return;
        }

        const columnNames = rows.map(r => r.name);
        console.log('Current columns:', columnNames);

        const missingColumns = [];
        if (!columnNames.includes('account')) missingColumns.push("ADD COLUMN account TEXT");
        if (!columnNames.includes('api_key')) missingColumns.push("ADD COLUMN api_key TEXT");
        if (!columnNames.includes('base_url')) missingColumns.push("ADD COLUMN base_url TEXT");
        if (!columnNames.includes('api_status')) missingColumns.push("ADD COLUMN api_status TEXT DEFAULT 'unknown'");

        if (missingColumns.length === 0) {
            console.log('Schema is up to date.');
            db.close();
            return;
        }

        let completed = 0;
        missingColumns.forEach(colSql => {
            console.log(`Running: ALTER TABLE agents ${colSql}`);
            db.run(`ALTER TABLE agents ${colSql}`, (err) => {
                if (err) console.error(`Error executing ${colSql}:`, err);
                else console.log(`Success: ${colSql}`);

                completed++;
                if (completed === missingColumns.length) {
                    console.log('All migrations done.');
                    db.close();
                }
            });
        });
    });
});
