import { db, patients } from '../db';
import { eq, like, or, and, desc, sql } from 'drizzle-orm';

// ============= Types =============

export interface PatientInput {
    name: string;
    birthDate?: string;
    gender?: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    medicalHistory?: string;
    allergies?: string;
    bloodType?: string;
    externalPatientId?: string; // From HIS if exists
}

export interface Patient {
    id: string;
    displayId: string;
    externalPatientId: string | null;
    name: string;
    birthDate: string | null;
    gender: string | null;
    phoneNumber: string | null;
    email: string | null;
    address: string | null;
    medicalHistory: string | null;
    allergies: string | null;
    bloodType: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PatientSearchResult {
    id: string;
    displayId: string;
    name: string;
    birthDate: string | null;
    phoneNumber: string | null;
    totalVisits: number;
    lastVisitDate: Date | null;
}

// ============= Display ID Generation =============

/**
 * Generate human-readable patient ID
 * Format: BN-YYYY-NNNNNN (e.g., BN-2024-000001)
 */
export async function generateDisplayId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BN-${year}-`;

    // Get the last patient of this year
    const lastPatient = await db
        .select({ displayId: patients.displayId })
        .from(patients)
        .where(like(patients.displayId, `${prefix}%`))
        .orderBy(desc(patients.displayId))
        .limit(1);

    let nextNumber = 1;
    if (lastPatient.length > 0) {
        // Extract number from BN-2024-000123 → 123
        const lastDisplayId = lastPatient[0].displayId;
        const parts = lastDisplayId.split('-');
        const lastNumber = parseInt(parts[2], 10);
        nextNumber = lastNumber + 1;
    }

    // Pad to 6 digits: 1 → 000001
    const paddedNumber = nextNumber.toString().padStart(6, '0');
    return `${prefix}${paddedNumber}`;
}

// ============= Duplicate Detection =============

/**
 * Find possible duplicate patients based on:
 * - Phone number (exact match)
 * - Name + Birth date (exact match)
 */
export async function findPossibleDuplicates(
    input: PatientInput
): Promise<Patient[]> {
    const results: Patient[] = [];

    // 1. Check by phone number (if provided)
    if (input.phoneNumber) {
        const byPhone = await db
            .select()
            .from(patients)
            .where(eq(patients.phoneNumber, input.phoneNumber));

        results.push(...(byPhone as Patient[]));
    }

    // 2. Check by name + birthDate (if both provided)
    if (input.name && input.birthDate) {
        const byNameAndDOB = await db
            .select()
            .from(patients)
            .where(
                and(
                    eq(patients.name, input.name),
                    eq(patients.birthDate, input.birthDate)
                )
            );

        results.push(...(byNameAndDOB as Patient[]));
    }

    // Remove duplicates (in case same patient matched both criteria)
    const uniqueResults = Array.from(
        new Map(results.map(p => [p.id, p])).values()
    );

    return uniqueResults;
}

// ============= Patient Management =============

/**
 * Create a new patient
 * Returns error if possible duplicates found
 */
export async function createPatient(
    input: PatientInput
): Promise<{ success: true; patient: Patient } | { success: false; error: string; duplicates?: Patient[] }> {
    try {
        // 1. Check for duplicates
        const duplicates = await findPossibleDuplicates(input);
        if (duplicates.length > 0) {
            return {
                success: false,
                error: 'POSSIBLE_DUPLICATE',
                duplicates
            };
        }

        // 2. Generate IDs
        const id = `pat_${crypto.randomUUID()}`;
        const displayId = await generateDisplayId();

        // 3. Create patient record
        const now = new Date();
        const patientData = {
            id,
            displayId,
            externalPatientId: input.externalPatientId || null,
            name: input.name,
            birthDate: input.birthDate || null,
            gender: input.gender || null,
            phoneNumber: input.phoneNumber || null,
            email: input.email || null,
            address: input.address || null,
            medicalHistory: input.medicalHistory || null,
            allergies: input.allergies || null,
            bloodType: input.bloodType || null,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(patients).values(patientData);

        return {
            success: true,
            patient: patientData as Patient
        };

    } catch (error) {
        console.error('Error creating patient:', error);
        return {
            success: false,
            error: 'DATABASE_ERROR'
        };
    }
}

/**
 * Force create patient (bypass duplicate check)
 * Used when doctor confirms it's a new patient despite similar info
 */
export async function forceCreatePatient(input: PatientInput): Promise<Patient> {
    const id = `pat_${crypto.randomUUID()}`;
    const displayId = await generateDisplayId();
    const now = new Date();

    const patientData = {
        id,
        displayId,
        externalPatientId: input.externalPatientId || null,
        name: input.name,
        birthDate: input.birthDate || null,
        gender: input.gender || null,
        phoneNumber: input.phoneNumber || null,
        email: input.email || null,
        address: input.address || null,
        medicalHistory: input.medicalHistory || null,
        allergies: input.allergies || null,
        bloodType: input.bloodType || null,
        createdAt: now,
        updatedAt: now,
    };

    await db.insert(patients).values(patientData);
    return patientData as Patient;
}

/**
 * Get patient by ID
 */
export async function getPatientById(patientId: string): Promise<Patient | null> {
    const result = await db
        .select()
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

    return result[0] ? (result[0] as Patient) : null;
}

/**
 * Get patient by displayId (human-readable ID)
 */
export async function getPatientByDisplayId(displayId: string): Promise<Patient | null> {
    const result = await db
        .select()
        .from(patients)
        .where(eq(patients.displayId, displayId))
        .limit(1);

    return result[0] ? (result[0] as Patient) : null;
}

/**
 * Search patients by name, phone, or displayId
 */
export async function searchPatients(
    query: string,
    options: { page?: number; limit?: number } = {}
): Promise<{ patients: PatientSearchResult[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    // Search in name, phoneNumber, or displayId
    const searchCondition = or(
        like(patients.name, `%${query}%`),
        like(patients.phoneNumber, `%${query}%`),
        like(patients.displayId, `%${query}%`)
    );

    // Get matching patients
    const results = await db
        .select({
            id: patients.id,
            displayId: patients.displayId,
            name: patients.name,
            birthDate: patients.birthDate,
            phoneNumber: patients.phoneNumber,
        })
        .from(patients)
        .where(searchCondition)
        .orderBy(desc(patients.createdAt))
        .limit(limit)
        .offset(offset);

    // Get total count
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(searchCondition);

    const total = countResult[0]?.count || 0;

    // TODO: Add totalVisits and lastVisitDate from examination_sessions
    // For now, return placeholder values
    const enrichedResults: PatientSearchResult[] = results.map(p => ({
        ...p,
        totalVisits: 0,
        lastVisitDate: null
    }));

    return {
        patients: enrichedResults,
        total
    };
}

/**
 * List all patients with pagination
 */
export async function listPatients(options: {
    page?: number;
    limit?: number;
} = {}): Promise<{ patients: PatientSearchResult[]; total: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    // Get patients
    const results = await db
        .select({
            id: patients.id,
            displayId: patients.displayId,
            name: patients.name,
            birthDate: patients.birthDate,
            phoneNumber: patients.phoneNumber,
        })
        .from(patients)
        .orderBy(desc(patients.createdAt))
        .limit(limit)
        .offset(offset);

    // Get total count
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(patients);

    const total = countResult[0]?.count || 0;
    const pages = Math.ceil(total / limit);

    // TODO: Add totalVisits and lastVisitDate
    const enrichedResults: PatientSearchResult[] = results.map(p => ({
        ...p,
        totalVisits: 0,
        lastVisitDate: null
    }));

    return {
        patients: enrichedResults,
        total,
        pages
    };
}

/**
 * Update patient information
 */
export async function updatePatient(
    patientId: string,
    updates: Partial<PatientInput>
): Promise<Patient | null> {
    const now = new Date();

    await db
        .update(patients)
        .set({
            ...updates,
            updatedAt: now
        })
        .where(eq(patients.id, patientId));

    return getPatientById(patientId);
}
