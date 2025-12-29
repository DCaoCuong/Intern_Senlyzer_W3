import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Patients Table - Master record for each patient
 * 1 patient = 1 record (permanent identity)
 */
export const patients = sqliteTable('patients', {
    // Primary Keys
    id: text('id').primaryKey(), // UUID: pat_<uuid>
    displayId: text('display_id').notNull().unique(), // Human-readable: BN-2024-000001

    // External System Integration
    externalPatientId: text('external_patient_id'), // HIS System ID (nullable)

    // Basic Information
    name: text('name').notNull(),
    birthDate: text('birth_date'), // YYYY-MM-DD format
    gender: text('gender'), // 'Nam' | 'Nữ' | 'Khác'

    // Contact Information
    phoneNumber: text('phone_number'),
    email: text('email'),
    address: text('address'),

    // Medical Information
    medicalHistory: text('medical_history'), // Tiền sử bệnh chung
    allergies: text('allergies'), // Dị ứng
    bloodType: text('blood_type'), // Nhóm máu

    // Metadata
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
});

/**
 * Patient Index for fast search
 * Composite index on commonly searched fields
 */
export const patientSearchIndex = {
    namePhoneIdx: sql`CREATE INDEX IF NOT EXISTS idx_patient_name_phone ON patients(name, phone_number)`,
    displayIdIdx: sql`CREATE INDEX IF NOT EXISTS idx_patient_display_id ON patients(display_id)`,
};
