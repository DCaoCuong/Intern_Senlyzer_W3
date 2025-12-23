import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import * as sessionSchema from './schema-session';
import * as patientSchema from './schema-patient';
import path from 'path';

// Create data directory path
const dataDir = path.join(process.cwd(), 'data', 'db');
const dbPath = path.join(dataDir, 'medical_assistant.db');

// Initialize SQLite database
const sqlite = new Database(dbPath);

// Create Drizzle ORM instance with all schemas
export const db = drizzle(sqlite, {
    schema: {
        ...schema,
        ...sessionSchema,
        ...patientSchema,
    }
});

// Export all schemas for type reference
export { schema, sessionSchema, patientSchema };

// Export specific tables for convenience
export { patients } from './schema-patient';
export { examinationSessions, medicalRecords } from './schema-session';
export { comparisonRecords } from './schema';
