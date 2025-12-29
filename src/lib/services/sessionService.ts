import { db } from '../db';
import { examinationSessions, medicalRecords } from '../db/schema-session';
import { patients } from '../db/schema-patient';
import { eq, desc } from 'drizzle-orm';
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
    // Generate unique session ID
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get visit number for this patient
    const existingSessions = await db
        .select()
        .from(examinationSessions)
        .where(eq(examinationSessions.patientId, input.patientId));

    const visitNumber = existingSessions.length + 1;

    const now = new Date();

    // Prepare session data
    const sessionData = {
        id: sessionId,
        patientId: input.patientId,
        visitNumber,
        chiefComplaint: input.chiefComplaint || null,
        visitId: input.visitId || null,
        status: 'active' as const,
        createdAt: now,
        updatedAt: now,
    };

    // Insert into database
    await db.insert(examinationSessions).values(sessionData);

    return sessionData;
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

    return results[0] || null;
}

/**
 * Get session with patient info
 */
export async function getSessionWithPatient(sessionId: string): Promise<SessionWithPatient | null> {
    const results = await db
        .select({
            session: examinationSessions,
            patient: patients
        })
        .from(examinationSessions)
        .leftJoin(patients, eq(examinationSessions.patientId, patients.id))
        .where(eq(examinationSessions.id, sessionId))
        .limit(1);

    if (!results[0]) return null;

    const { session, patient } = results[0];

    return {
        ...session,
        patient: patient ? {
            id: patient.id,
            displayId: patient.displayId,
            name: patient.name,
            birthDate: patient.birthDate,
            gender: patient.gender,
            phoneNumber: patient.phoneNumber,
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
        // Create new record
        const recordId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const recordData = {
            id: recordId,
            sessionId: input.sessionId,
            subjective: input.subjective || null,
            objective: input.objective || null,
            assessment: input.assessment || null,
            plan: input.plan || null,
            icdCodes: input.icdCodes || [],
            status: input.status,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(medicalRecords).values(recordData);

        const record = recordData as MedicalRecord;

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
