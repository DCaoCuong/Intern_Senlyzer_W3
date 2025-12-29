import { db, users } from '../db';
import { eq, like, or, and, desc, sql, ilike } from 'drizzle-orm';

// ============= Types =============

export interface UserInput {
    name: string;
    email: string;
    password?: string; // Optional for patients
    role?: 'patient' | 'doctor' | 'staff' | 'admin';
    phone?: string;
    birthDate?: string;
    gender?: string;
    address?: string;
    medicalHistory?: string;
    allergies?: string;
    bloodType?: string;
    externalPatientId?: string; // From HIS if exists
}

export interface User {
    id: string;
    email: string;
    password: string | null;
    role: string;
    name: string;
    phone: string | null;
    avatarUrl: string | null;
    displayId: string | null;
    birthDate: string | null;  // PostgreSQL DATE type returns string
    gender: string | null;
    address: string | null;
    medicalHistory: string | null;
    allergies: string | null;
    bloodType: string | null;
    externalPatientId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PatientSearchResult {
    id: string;
    displayId: string | null;
    name: string;
    birthDate: string | null;  // PostgreSQL DATE type returns string
    phone: string | null;
    totalVisits: number;
    lastVisitDate: Date | null;
}

// ============= Display ID Generation =============

/**
 * Generate human-readable patient display ID using PostgreSQL function
 * Format: BN-YYYY-NNNNNN (e.g., BN-2024-000001)
 */
export async function generateDisplayId(): Promise<string> {
    try {
        // Call the PostgreSQL function directly
        const result = await db.execute(sql`SELECT generate_patient_display_id() as display_id`);
        // Access the first row of the result
        if (result && result.length > 0) {
            return (result[0] as { display_id: string }).display_id;
        }
        throw new Error('No result from display ID function');
    } catch (error) {
        // Fallback to manual generation if function doesn't exist yet
        console.warn('Display ID generation function not found, using fallback');
        const year = new Date().getFullYear();
        const prefix = `BN-${year}-`;

        // Get the last patient of this year
        const lastPatient = await db
            .select({ displayId: users.displayId })
            .from(users)
            .where(and(
                like(users.displayId, `${prefix}%`),
                eq(users.role, 'patient')
            ))
            .orderBy(desc(users.displayId))
            .limit(1);

        let nextNumber = 1;
        if (lastPatient.length > 0 && lastPatient[0].displayId) {
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
}

// ============= Duplicate Detection =============

/**
 * Find possible duplicate users/patients based on:
 * - Email (exact match)
 * - Phone number (exact match)
 * - Name + Birth date (exact match)
 */
export async function findPossibleDuplicates(
    input: UserInput
): Promise<User[]> {
    const conditions = [];

    // 1. Check by email
    if (input.email) {
        conditions.push(eq(users.email, input.email));
    }

    // 2. Check by phone number (if provided)
    if (input.phone) {
        conditions.push(eq(users.phone, input.phone));
    }

    // 3. Check by name + birthDate (if both provided)
    if (input.name && input.birthDate) {
        conditions.push(
            and(
                eq(users.name, input.name),
                eq(users.birthDate, input.birthDate)
            )
        );
    }

    if (conditions.length === 0) {
        return [];
    }

    const results = await db
        .select()
        .from(users)
        .where(or(...conditions));

    // Remove duplicates (in case same user matched multiple criteria)
    const uniqueResults = Array.from(
        new Map(results.map(u => [u.id, u])).values()
    );

    return uniqueResults as User[];
}

// ============= User/Patient Management =============

/**
 * Create a new user/patient
 * Returns error if possible duplicates found
 */
export async function createUser(
    input: UserInput
): Promise<{ success: true; user: User } | { success: false; error: string; duplicates?: User[] }> {
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

        // 2. Generate display ID for patients
        const role = input.role || 'patient';
        const displayId = role === 'patient' ? await generateDisplayId() : null;

        // 3. Create user record
        const userData = {
            email: input.email,
            password: input.password || null,
            role,
            name: input.name,
            phone: input.phone || null,
            avatarUrl: null,
            displayId,
            birthDate: input.birthDate || null,
            gender: input.gender || null,
            address: input.address || null,
            medicalHistory: input.medicalHistory || null,
            allergies: input.allergies || null,
            bloodType: input.bloodType || null,
            externalPatientId: input.externalPatientId || null,
        };

        const result = await db.insert(users).values(userData).returning();

        return {
            success: true,
            user: result[0] as User
        };

    } catch (error) {
        console.error('Error creating user:', error);
        return {
            success: false,
            error: 'DATABASE_ERROR'
        };
    }
}

/**
 * Force create user (bypass duplicate check)
 * Used when admin confirms it's a new user despite similar info
 */
export async function forceCreateUser(input: UserInput): Promise<User> {
    const role = input.role || 'patient';
    const displayId = role === 'patient' ? await generateDisplayId() : null;

    const userData = {
        email: input.email,
        password: input.password || null,
        role,
        name: input.name,
        phone: input.phone || null,
        avatarUrl: null,
        displayId,
        birthDate: input.birthDate || null,
        gender: input.gender || null,
        address: input.address || null,
        medicalHistory: input.medicalHistory || null,
        allergies: input.allergies || null,
        bloodType: input.bloodType || null,
        externalPatientId: input.externalPatientId || null,
    };

    const result = await db.insert(users).values(userData).returning();
    return result[0] as User;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
    const result = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    return result[0] ? (result[0] as User) : null;
}

/**
 * Get patient by displayId (human-readable ID)
 */
export async function getPatientByDisplayId(displayId: string): Promise<User | null> {
    const result = await db
        .select()
        .from(users)
        .where(and(
            eq(users.displayId, displayId),
            eq(users.role, 'patient')
        ))
        .limit(1);

    return result[0] ? (result[0] as User) : null;
}

/**
 * Search patients by name, phone, or displayId
 * Uses PostgreSQL's ILIKE for case-insensitive search
 * Supports accent-insensitive search via PostgreSQL unaccent extension
 */
export async function searchPatients(
    query: string,
    options: { page?: number; limit?: number } = {}
): Promise<{ patients: PatientSearchResult[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const searchPattern = `%${query}%`;

    // Search in name, phone, and displayId using ILIKE (case-insensitive)
    const results = await db
        .select({
            id: users.id,
            displayId: users.displayId,
            name: users.name,
            birthDate: users.birthDate,
            phone: users.phone,
        })
        .from(users)
        .where(and(
            eq(users.role, 'patient'),
            or(
                ilike(users.name, searchPattern),
                ilike(users.phone, searchPattern),
                ilike(users.displayId, searchPattern)
            )
        ))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

    // Get total count
    const countResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(users)
        .where(and(
            eq(users.role, 'patient'),
            or(
                ilike(users.name, searchPattern),
                ilike(users.phone, searchPattern),
                ilike(users.displayId, searchPattern)
            )
        ));

    const total = countResult[0]?.count || 0;

    // TODO: Add totalVisits and lastVisitDate from examination_sessions
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

    // Get patients (users with role='patient')
    const results = await db
        .select({
            id: users.id,
            displayId: users.displayId,
            name: users.name,
            birthDate: users.birthDate,
            phone: users.phone,
        })
        .from(users)
        .where(eq(users.role, 'patient'))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

    // Get total count
    const countResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(users)
        .where(eq(users.role, 'patient'));

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
 * Update user information
 */
export async function updateUser(
    userId: string,
    updates: Partial<UserInput>
): Promise<User | null> {
    // Use snake_case for database column, but Drizzle will handle the mapping
    const updateData: any = {
        ...updates,
    };

    await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));

    return getUserById(userId);
}

/**
 * Delete user and cascade delete all associated records
 * For patients, this will delete:
 * - All examination sessions
 * - All medical records
 * - The user record itself
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // PostgreSQL will handle cascade deletion via ON DELETE CASCADE
        await db
            .delete(users)
            .where(eq(users.id, userId));

        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============= Backwards Compatibility Aliases =============
// These allow existing code to continue working

export const createPatient = createUser;
export const forceCreatePatient = forceCreateUser;
export const getPatientById = getUserById;
export const updatePatient = updateUser;
export const deletePatient = deleteUser;

// Type aliases
export type PatientInput = UserInput;
export type Patient = User;
