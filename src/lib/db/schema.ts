import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Defining the schema for comparison records
export const comparisonRecords = sqliteTable('comparison_records', {
    id: text('id').primaryKey(), // Using UUID
    timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),

    // AI Results (Stored as JSON)
    // Contains: soap, icdCodes, medicalAdvice, references
    aiResults: text('ai_results', { mode: 'json' }).notNull(),

    // Doctor's Results (Stored as JSON)
    // Contains: soap, icdCodes, treatment
    doctorResults: text('doctor_results', { mode: 'json' }).notNull(),

    // Comparison Analysis (Stored as JSON)
    // Contains: soapMatch, icdMatch, differences
    comparison: text('comparison', { mode: 'json' }).notNull(),

    // Overall Match Score (0-100)
    matchScore: real('match_score').notNull(),

    // Optional: Patient ID or Case ID for future extension
    caseId: text('case_id'),

    // Session and Medical Record tracking
    sessionId: text('session_id'), // Links to examination_sessions
    medicalRecordId: text('medical_record_id'), // Links to medical_records
});
