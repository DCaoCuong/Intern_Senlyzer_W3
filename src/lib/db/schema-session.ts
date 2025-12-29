import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { patients } from './schema-patient';

// Session Management Schema

export const examinationSessions = sqliteTable('examination_sessions', {
    // Primary Key
    id: text('id').primaryKey(), // Format: sess_<uuid>

    // Patient Link (Foreign Key)
    patientId: text('patient_id')
        .notNull()
        .references(() => patients.id), // Link to patients table

    // Visit Information
    visitNumber: integer('visit_number').notNull(), // Lần khám thứ mấy (1, 2, 3...)
    chiefComplaint: text('chief_complaint'), // Lý do khám lần này

    // HIS System Integration
    visitId: text('visit_id'), // ID from external HIS System (optional)

    // Session Status
    status: text('status', { enum: ['active', 'completed', 'cancelled'] })
        .notNull()
        .default('active'),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
});

/**
 * Medical Records Table
 * Stores SOAP notes and ICD codes for each examination
 */
export const medicalRecords = sqliteTable('medical_records', {
    // Primary Key
    id: text('id').primaryKey(), // Format: rec_<uuid>

    // Foreign Key
    sessionId: text('session_id')
        .notNull()
        .references(() => examinationSessions.id),

    // SOAP Note Components
    subjective: text('subjective'), // Triệu chứng, lời kể bệnh nhân
    objective: text('objective'),   // Sinh hiệu, khám lâm sàng
    assessment: text('assessment'), // Chẩn đoán
    plan: text('plan'),             // Kế hoạch điều trị

    // ICD-10 Codes
    icdCodes: text('icd_codes', { mode: 'json' }), // Array of ICD codes: ["K29.7", "I10"]

    // Record Status
    status: text('status', { enum: ['draft', 'final'] })
        .notNull()
        .default('draft'),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
});
