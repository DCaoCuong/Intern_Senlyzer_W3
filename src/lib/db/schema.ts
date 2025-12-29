import { pgTable, uuid, timestamp, jsonb, real, text } from 'drizzle-orm/pg-core';
import { examinationSessions, medicalRecords } from './schema-session';

/**
 * Comparison Records Table
 * Stores AI vs Doctor comparison analysis for quality assurance
 */
export const comparisonRecords = pgTable('comparison_records', {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),

    // AI Results (Stored as JSONB)
    // Contains: soap, icdCodes, medicalAdvice, references
    aiResults: jsonb('ai_results').notNull(),

    // Doctor's Results (Stored as JSONB)
    // Contains: soap, icdCodes, treatment
    doctorResults: jsonb('doctor_results').notNull(),

    // Comparison Analysis (Stored as JSONB)
    // Contains: soapMatch, icdMatch, differences
    comparison: jsonb('comparison').notNull(),

    // Overall Match Score (0-100)
    matchScore: real('match_score').notNull(),

    // Optional: Patient ID or Case ID for future extension
    caseId: text('case_id'),

    // Session and Medical Record tracking
    sessionId: uuid('session_id').references(() => examinationSessions.id, { onDelete: 'cascade' }),
    medicalRecordId: uuid('medical_record_id').references(() => medicalRecords.id, { onDelete: 'cascade' }),

    // Metadata
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Type exports
export type ComparisonRecord = typeof comparisonRecords.$inferSelect;
export type NewComparisonRecord = typeof comparisonRecords.$inferInsert;
