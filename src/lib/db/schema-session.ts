import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './schema-users';
import { clinic_services } from './schema-booking';

/**
 * Examination Sessions Table
 * Tracks patient visits and links to optional appointments from Booking system
 */
export const examinationSessions = pgTable('examination_sessions', {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Patient Link (Foreign Key to unified users table)
    patientId: uuid('patient_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),

    // Link to Booking appointment (optional)
    appointmentId: uuid('appointment_id')
        .references(() => clinic_services.id, { onDelete: 'set null' }),

    // Visit Information
    visitNumber: integer('visit_number').notNull(), // Lần khám thứ mấy (1, 2, 3...)
    chiefComplaint: text('chief_complaint'), // Lý do khám lần này

    // HIS System Integration
    visitId: varchar('visit_id', { length: 100 }), // ID from external HIS System (optional)

    // Session Status
    status: varchar('status', { length: 50 })
        .notNull()
        .default('active'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Medical Records Table
 * Stores SOAP notes and ICD codes for each examination
 * Unified schema combining MEA and Booking requirements
 */
export const medicalRecords = pgTable('medical_records', {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Key
    sessionId: uuid('session_id')
        .references(() => examinationSessions.id, { onDelete: 'cascade' })
        .notNull(),

    // SOAP Note Components (MEA primary use)
    subjective: text('subjective'), // Triệu chứng, lời kể bệnh nhân
    objective: text('objective'),   // Sinh hiệu, khám lâm sàng
    assessment: text('assessment'), // Chẩn đoán
    plan: text('plan'),             // Kế hoạch điều trị

    // ICD-10 Codes (MEA)
    icdCodes: jsonb('icd_codes'), // Array of ICD codes: ["K29.7", "I10"]

    // Additional fields from Booking (may overlap with SOAP)
    diagnosis: text('diagnosis'),     // May overlap with assessment
    prescription: text('prescription'), // May overlap with plan

    // Record Status
    status: varchar('status', { length: 50 })
        .notNull()
        .default('draft'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type ExaminationSession = typeof examinationSessions.$inferSelect;
export type NewExaminationSession = typeof examinationSessions.$inferInsert;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type NewMedicalRecord = typeof medicalRecords.$inferInsert;
