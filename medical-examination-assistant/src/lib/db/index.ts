import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import * as schema from './schema';
import fs from 'fs';

// Database file path
const DB_DIR = path.join(process.cwd(), 'data', 'db');
const DB_PATH = path.join(DB_DIR, 'medical_assistant.db');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Lazy initialization function
const createDb = () => {
    try {
        const Database = require('better-sqlite3');
        const sqlite = new Database(DB_PATH);
        const dbInstance = drizzle(sqlite, { schema });

        // Auto-create tables if they don't exist (for fresh Vercel deployments)
        // This replaces the need for drizzle-kit push
        sqlite.exec(`
            CREATE TABLE IF NOT EXISTS comparison_records (
                id TEXT PRIMARY KEY,
                timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                ai_results TEXT NOT NULL,
                doctor_results TEXT NOT NULL,
                comparison TEXT NOT NULL,
                match_score REAL NOT NULL,
                case_id TEXT
            )
        `);

        console.log('✅ Database initialized successfully');
        return dbInstance;
    } catch (error) {
        console.error("Failed to initialize database:", error);
        throw error;
    }
};

// Singleton instance
export const db = createDb();

// Export everything from schema for convenience
export * from './schema';
