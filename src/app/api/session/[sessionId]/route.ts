import { NextRequest, NextResponse } from 'next/server';
import { getSession, getMedicalRecordBySession } from '@/lib/services/sessionService';
import { db, examinationSessions, medicalRecords } from '@/lib/db';
import { eq } from 'drizzle-orm';

/** * GET /api/session/:sessionId * Get examination session details by ID */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ sessionId: string }> }
) {
    try {
        const params = await context.params;
        const sessionId = params.sessionId;
        if (!sessionId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Session ID is required'
                }, { status: 400 });
        }
        // Get session
        const session = await getSession(sessionId);
        if (!session) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Session not found',
                    message: 'Phiên khám không tồn tại'

                }, { status: 404 });
        }
        // Get associated medical record
        const medicalRecord = await getMedicalRecordBySession(sessionId);

        return NextResponse.json({
            success: true,
            data: {
                session,
                medicalRecord: medicalRecord || null
            }
        });
    } catch (error) { console.error('Error fetching session:', error); return NextResponse.json({ success: false, error: 'Internal server error', message: 'Không thể lấy thông tin phiên khám', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 }); }
}

/** * DELETE /api/session/:sessionId * Delete examination session and related records */
export async function DELETE(request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {

    try {
        const params = await context.params; const sessionId = params.sessionId;
        if (!sessionId) {
            return NextResponse.json({
                success: false, error: 'Session ID is required'
            },
                { status: 400 });
        }
        // Check if session exists        
        const session = await getSession(sessionId);
        if (!session) { return NextResponse.json({ success: false, error: 'Session not found', message: 'Phiên khám không tồn tại' }, { status: 404 }); }

        // Delete medical records first (foreign key constraint)        
        await db.delete(medicalRecords).where(eq(medicalRecords.sessionId, sessionId));
        // Delete session        
        await db.delete(examinationSessions).where(eq(examinationSessions.id, sessionId)); return NextResponse.json({ success: true, message: 'Xóa phiên khám thành công' });
    } catch (error) { console.error('Error deleting session:', error); return NextResponse.json({ success: false, error: 'Internal server error', message: 'Không thể xóa phiên khám', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 }); }
}
