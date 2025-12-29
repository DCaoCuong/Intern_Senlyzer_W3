import { db } from '../db';
import { examinationSessions, medicalRecords } from '../db/schema-session';
import { users } from '../db/schema-users';
import { eq, desc, sql, and } from 'drizzle-orm';
import { updateVisit, type MedicalPayload } from '../integrations/hisClient';

// ============= Types =============

export interface SessionInput {
    patientId: string; // Required - link to patient
    chiefComplaint?: string; // Reason for this visit
    visitId?: string; // Optional, from HIS system
}

export interface Session {
    id: string;
    patientId: string;
    visitNumber: number;
    chiefComplaint: string | null;
    visitId: string | null;
    status: 'active' | 'completed' | 'cancelled';
    createdAt: Date;
    updatedAt: Date;
}

export interface SessionWithPatient extends Session {
    patient: {
        id: string;
        displayId: string;
        name: string;
        birthDate: string | null;
        gender: string | null;
        phoneNumber: string | null;
        medicalHistory: string | null;
    };
}

export interface MedicalRecordInput {
    sessionId: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    icdCodes?: string[];
    status: 'draft' | 'final';
}

export interface MedicalRecord {
    id: string;
    sessionId: string;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
    icdCodes: unknown;
    status: 'draft' | 'final';
    createdAt: Date;
    updatedAt: Date;
}

// ============= Session Management =============

/**
 * Create a new examination session for an existing patient
 */
export async function createSession(input: SessionInput): Promise<Session> {
    // PostgreSQL will auto-generate UUID

    // Get visit number for this patient using count
    const countResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(examinationSessions)
        .where(eq(examinationSessions.patientId, input.patientId));

    const visitNumber = (countResult[0]?.count || 0) + 1;

    // Prepare session data (PostgreSQL will handle timestamps)
    const sessionData = {
        patientId: input.patientId,
        visitNumber,
        chiefComplaint: input.chiefComplaint || null,
        visitId: input.visitId || null,
        status: 'active' as const,
        appointmentId: null, // Can be set later if linking to appointment
    };

    // Insert into database and return
    const result = await db.insert(examinationSessions).values(sessionData).returning();

    const session = result[0];
    return {
        ...session,
        status: session.status as 'active' | 'completed' | 'cancelled'
    } as Session;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
    const results = await db
        .select()
        .from(examinationSessions)
        .where(eq(examinationSessions.id, sessionId))
        .limit(1);

    const session = results[0];
    if (!session) return null;

    return {
        ...session,
        status: session.status as 'active' | 'completed' | 'cancelled'
    } as Session;
}

/**
 * Get session with patient info
 */
export async function getSessionWithPatient(sessionId: string): Promise<SessionWithPatient | null> {
    const results = await db
        .select({
            session: examinationSessions,
            patient: users
        })
        .from(examinationSessions)
        .leftJoin(users, and(
            eq(examinationSessions.patientId, users.id),
            eq(users.role, 'patient')
        ))
        .where(eq(examinationSessions.id, sessionId))
        .limit(1);

    if (!results[0]) return null;

    const { session, patient } = results[0];

    return {
        ...session,
        status: session.status as 'active' | 'completed' | 'cancelled',  // Type assertion for status
        patient: patient ? {
            id: patient.id,
            displayId: patient.displayId || 'N/A',
            name: patient.name,
            birthDate: patient.birthDate || null,  // Already a string (YYYY-MM-DD) from PostgreSQL DATE
            gender: patient.gender,
            phoneNumber: patient.phone,
            medicalHistory: patient.medicalHistory
        } : {
            id: '',
            displayId: 'N/A',
            name: 'Unknown',
            birthDate: null,
            gender: null,
            phoneNumber: null,
            medicalHistory: null
        }
    };
}

/**
 * Update session status
 */
export async function updateSessionStatus(
    sessionId: string,
    status: 'active' | 'completed' | 'cancelled'
): Promise<void> {
    await db
        .update(examinationSessions)
        .set({
            status,
            updatedAt: new Date(),
        })
        .where(eq(examinationSessions.id, sessionId));
}

// ============= Medical Record Management =============

/**
 * Save or update medical record
 */
export async function saveMedicalRecord(input: MedicalRecordInput): Promise<MedicalRecord> {
    // Check if record already exists for this session
    const existingRecords = await db
        .select()
        .from(medicalRecords)
        .where(eq(medicalRecords.sessionId, input.sessionId))
        .limit(1);

    const now = new Date();

    if (existingRecords.length > 0) {
        // Update existing record
        const recordId = existingRecords[0].id;
        await db
            .update(medicalRecords)
            .set({
                subjective: input.subjective,
                objective: input.objective,
                assessment: input.assessment,
                plan: input.plan,
                icdCodes: input.icdCodes || [],
                status: input.status,
                updatedAt: now,
            })
            .where(eq(medicalRecords.id, recordId));

        // Fetch updated record
        const updated = await db
            .select()
            .from(medicalRecords)
            .where(eq(medicalRecords.id, recordId))
            .limit(1);

        const record = updated[0] as MedicalRecord;

        // If status is final, sync to HIS and update session
        if (input.status === 'final') {
            await finalizeRecord(input.sessionId, record);
        }

        return record;
    } else {
        // Create new record (PostgreSQL will auto-generate UUID)

        const recordData = {
            sessionId: input.sessionId,
            subjective: input.subjective || null,
            objective: input.objective || null,
            assessment: input.assessment || null,
            plan: input.plan || null,
            icdCodes: input.icdCodes || [],
            diagnosis: input.assessment || null, // Duplicate for Booking compatibility
            prescription: input.plan || null, // Duplicate for Booking compatibility
            status: input.status,
        };

        const result = await db.insert(medicalRecords).values(recordData).returning();

        const record = result[0] as MedicalRecord;

        // If status is final, sync to HIS and update session
        if (input.status === 'final') {
            await finalizeRecord(input.sessionId, record);
        }

        return record;
    }
}

/**
 * Get medical record by session ID
 */
export async function getMedicalRecordBySession(
    sessionId: string
): Promise<MedicalRecord | null> {
    const results = await db
        .select()
        .from(medicalRecords)
        .where(eq(medicalRecords.sessionId, sessionId))
        .limit(1);

    return results[0] ? (results[0] as MedicalRecord) : null;
}

// ============= Internal Helpers =============

/**
 * Finalize medical record - sync to HIS and update session status
 */
async function finalizeRecord(sessionId: string, record: MedicalRecord): Promise<void> {
    // Get session with patient info
    const sessionWithPatient = await getSessionWithPatient(sessionId);

    if (sessionWithPatient && sessionWithPatient.visitId) {
        // Prepare payload for HIS system
        const payload: MedicalPayload = {
            subjective: record.subjective || '',
            objective: record.objective || '',
            assessment: record.assessment || '',
            plan: record.plan || '',
            icdCodes: (record.icdCodes as string[]) || [],
        };

        // Sync to HIS system
        const hisResponse = await updateVisit(sessionWithPatient.visitId, payload);

        if (hisResponse.success) {
            console.log('Medical record synced to HIS successfully:', hisResponse.data);
        } else {
            console.error('Failed to sync to HIS:', hisResponse.error);
            // Note: We still save locally even if HIS sync fails
        }
    }

    // Update session status to completed
    await updateSessionStatus(sessionId, 'completed');
}
