import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

// Import all schemas
import * as usersSchema from './schema-users';
import * as bookingSchema from './schema-booking';
import * as sessionSchema from './schema-session';
import * as comparisonSchema from './schema';

// Supabase client for authentication and storage features
export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// PostgreSQL connection for Drizzle ORM
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

// Create Drizzle ORM instance with PostgreSQL connection
export const db = drizzle(client, {
    schema: {
        ...usersSchema,
        ...bookingSchema,
        ...sessionSchema,
        ...comparisonSchema,
    }
});

// Export all schemas for type reference
export { usersSchema, bookingSchema, sessionSchema, comparisonSchema };

// Export specific tables for convenience
export { users } from './schema-users';
export { clinics, services, clinic_services } from './schema-booking';
export { examinationSessions, medicalRecords } from './schema-session';
export { comparisonRecords } from './schema';
