import { db, examinationSessions, medicalRecords } from '../db';
import { users } from '../db/schema-users';
import { eq, gte, desc, sql, and } from 'drizzle-orm';

export interface DashboardStats {
    today: {
        totalSessions: number;
        completedSessions: number;
        activeSessions: number;
    };
    thisWeek: {
        totalSessions: number;
        newPatients: number;
    };
    thisMonth: {
        totalSessions: number;
        newPatients: number;
    };
    total: {
        patients: number;
        sessions: number;
    };
}

export interface RecentSession {
    id: string;
    patientId: string;
    patientName: string;
    patientDisplayId: string;
    visitNumber: number;
    chiefComplaint: string | null;
    status: string;
    createdAt: Date;
    diagnosis?: string;
}

export interface PatientSummary {
    id: string;
    displayId: string | null;  // Can be null for users without patient role
    name: string;
    age: number | null;
    gender: string | null;
    totalVisits: number;
    lastVisitDate: Date;
    lastVisitStatus: string;
    lastVisitId: string;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();

    // Calculate date boundaries
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's sessions
    const todaySessions = await db
        .select()
        .from(examinationSessions)
        .where(gte(examinationSessions.createdAt, todayStart));

    const todayCompleted = todaySessions.filter(s => s.status === 'completed').length;
    const todayActive = todaySessions.filter(s => s.status === 'active').length;

    // This week's sessions
    const weekSessions = await db
        .select()
        .from(examinationSessions)
        .where(gte(examinationSessions.createdAt, weekStart));

    // This week's new patients
    const weekNewPatients = await db
        .select()
        .from(users)
        .where(and(gte(users.createdAt, weekStart), eq(users.role, 'patient')));

    // This month's sessions
    const monthSessions = await db
        .select()
        .from(examinationSessions)
        .where(gte(examinationSessions.createdAt, monthStart));

    // This month's new patients
    const monthNewPatients = await db
        .select()
        .from(users)
        .where(and(gte(users.createdAt, monthStart), eq(users.role, 'patient')));

    // Total counts
    const totalPatientsResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(users)
        .where(eq(users.role, 'patient'));

    const totalSessionsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(examinationSessions);

    return {
        today: {
            totalSessions: todaySessions.length,
            completedSessions: todayCompleted,
            activeSessions: todayActive
        },
        thisWeek: {
            totalSessions: weekSessions.length,
            newPatients: weekNewPatients.length
        },
        thisMonth: {
            totalSessions: monthSessions.length,
            newPatients: monthNewPatients.length
        },
        total: {
            patients: totalPatientsResult[0]?.count || 0,
            sessions: totalSessionsResult[0]?.count || 0
        }
    };
}

/**
 * Get sessions with patient info (with pagination)
 */
export async function getRecentSessions(limit: number = 50, page: number = 1): Promise<RecentSession[]> {
    const offset = (page - 1) * limit;

    const sessions = await db
        .select({
            sessionId: examinationSessions.id,
            patientId: examinationSessions.patientId,
            visitNumber: examinationSessions.visitNumber,
            chiefComplaint: examinationSessions.chiefComplaint,
            status: examinationSessions.status,
            createdAt: examinationSessions.createdAt,
            patientName: users.name,
            patientDisplayId: users.displayId,
        })
        .from(examinationSessions)
        .leftJoin(users, eq(examinationSessions.patientId, users.id))
        .orderBy(desc(examinationSessions.createdAt))
        .limit(limit)
        .offset(offset);

    // For each session, get diagnosis from medical record
    const sessionsWithDiagnosis = await Promise.all(
        sessions.map(async (session) => {
            const records = await db
                .select({ assessment: medicalRecords.assessment })
                .from(medicalRecords)
                .where(eq(medicalRecords.sessionId, session.sessionId))
                .limit(1);

            return {
                id: session.sessionId,
                patientId: session.patientId,
                patientName: session.patientName || 'Unknown',
                patientDisplayId: session.patientDisplayId || 'N/A',
                visitNumber: session.visitNumber,
                chiefComplaint: session.chiefComplaint,
                status: session.status,
                createdAt: session.createdAt,
                diagnosis: records[0]?.assessment || undefined
            };
        })
    );

    return sessionsWithDiagnosis;
}

/**
 * Get list of patients with summary info
 */
export async function getPatientsList(limit: number = 50, page: number = 1): Promise<PatientSummary[]> {
    const offset = (page - 1) * limit;

    // Get all patients with pagination
    const patientsList = await db
        .select()
        .from(users)
        .where(eq(users.role, 'patient'))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

    // For each patient, get summary info
    const patientsWithSummary = await Promise.all(
        patientsList.map(async (patient) => {
            // Count total visits
            const visitsCount = await db
                .select({ count: sql<number>`count(*)` })
                .from(examinationSessions)
                .where(eq(examinationSessions.patientId, patient.id));

            // Get latest visit
            const latestVisit = await db
                .select({
                    id: examinationSessions.id,
                    status: examinationSessions.status,
                    createdAt: examinationSessions.createdAt
                })
                .from(examinationSessions)
                .where(eq(examinationSessions.patientId, patient.id))
                .orderBy(desc(examinationSessions.createdAt))
                .limit(1);

            // Calculate age from birthDate
            let age: number | null = null;
            if (patient.birthDate) {
                const birthDate = new Date(patient.birthDate);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
            }

            return {
                id: patient.id,
                displayId: patient.displayId,
                name: patient.name,
                age: age,
                gender: patient.gender,
                totalVisits: visitsCount[0]?.count || 0,
                lastVisitDate: latestVisit[0]?.createdAt || patient.createdAt,
                lastVisitStatus: latestVisit[0]?.status || 'never_visited',
                lastVisitId: latestVisit[0]?.id || ''
            };
        })
    );

    return patientsWithSummary;
}

