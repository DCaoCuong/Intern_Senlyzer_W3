import { pgTable, uuid, varchar, text, date, timestamp } from 'drizzle-orm/pg-core';

/**
 * Unified Users Table
 * Merges MEA patients table + Booking users table
 * Supports multiple user roles: patient, doctor, staff, admin
 */
export const users = pgTable('users', {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Authentication & Role (from Booking)
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }), // Hashed, nullable for OAuth
    role: varchar('role', { length: 50 }).notNull().default('patient'),

    // Basic Information (from both systems)
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    avatarUrl: text('avatar_url'),

    // Patient-specific fields (from MEA)
    displayId: text('display_id').unique(), // BN-2024-000001
    birthDate: date('birth_date'),
    gender: varchar('gender', { length: 20 }),
    address: text('address'),

    // Medical Information (from MEA)
    medicalHistory: text('medical_history'),
    allergies: text('allergies'),
    bloodType: varchar('blood_type', { length: 10 }),

    // External Integration (from MEA)
    externalPatientId: varchar('external_patient_id', { length: 100 }),

    // Metadata
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
