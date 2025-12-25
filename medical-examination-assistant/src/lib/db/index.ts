import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import * as sessionSchema from './schema-session';
import * as patientSchema from './schema-patient';

// Create Drizzle ORM instance with Turso connection
export const db = drizzle({
    connection: {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    },
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
