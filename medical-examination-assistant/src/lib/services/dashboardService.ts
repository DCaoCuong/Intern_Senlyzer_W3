import { db, examinationSessions, medicalRecords, patients } from '../db';
import { eq, gte, desc, sql } from 'drizzle-orm';

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
        .from(patients)
        .where(gte(patients.createdAt, weekStart));

    // This month's sessions
    const monthSessions = await db
        .select()
        .from(examinationSessions)
        .where(gte(examinationSessions.createdAt, monthStart));

    // This month's new patients
    const monthNewPatients = await db
        .select()
        .from(patients)
        .where(gte(patients.createdAt, monthStart));

    // Total counts
    const totalPatientsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(patients);

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
 * Get recent sessions with patient info
 */
export async function getRecentSessions(limit: number = 10): Promise<RecentSession[]> {
    const sessions = await db
        .select({
            sessionId: examinationSessions.id,
            patientId: examinationSessions.patientId,
            visitNumber: examinationSessions.visitNumber,
            chiefComplaint: examinationSessions.chiefComplaint,
            status: examinationSessions.status,
            createdAt: examinationSessions.createdAt,
            patientName: patients.name,
            patientDisplayId: patients.displayId,
        })
        .from(examinationSessions)
        .leftJoin(patients, eq(examinationSessions.patientId, patients.id))
        .orderBy(desc(examinationSessions.createdAt))
        .limit(limit);

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
