import { NextRequest, NextResponse } from 'next/server';
import { db, examinationSessions, medicalRecords } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(
    req: NextRequest,
    { params }: { params: { patientId: string } }
) {
    try {
        const { patientId } = params;

        // Get all sessions for this patient
        const sessions = await db
            .select()
            .from(examinationSessions)
            .where(eq(examinationSessions.patientId, patientId))
            .orderBy(desc(examinationSessions.createdAt));

        // For each session, get medical record if exists
        const sessionsWithRecords = await Promise.all(
            sessions.map(async (session) => {
                const records = await db
                    .select()
                    .from(medicalRecords)
                    .where(eq(medicalRecords.sessionId, session.id))
                    .limit(1);

                return {
                    ...session,
                    medicalRecord: records[0] || null
                };
            })
        );

        return NextResponse.json({
            success: true,
            sessions: sessionsWithRecords,
            total: sessions.length
        });

    } catch (error) {
        console.error('Error in patient sessions API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
