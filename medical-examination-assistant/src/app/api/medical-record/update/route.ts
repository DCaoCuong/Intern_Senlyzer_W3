import { NextRequest, NextResponse } from 'next/server';
import { getMedicalRecordBySession, saveMedicalRecord } from '@/lib/services/sessionService';

/**
 * PATCH /api/medical-record/update
 * Update specific fields in a medical record
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { medicalRecordId, sessionId, updates } = body;

        // Validate required fields
        if (!sessionId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'Session ID hoặc Medical Record ID là bắt buộc'
                },
                { status: 400 }
            );
        }

        if (!updates || typeof updates !== 'object') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'Updates object là bắt buộc'
                },
                { status: 400 }
            );
        }

        // Get existing record
        const existingRecord = await getMedicalRecordBySession(sessionId);

        if (!existingRecord) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Not found',
                    message: 'Bệnh án không tồn tại'
                },
                { status: 404 }
            );
        }

        // Merge updates with existing data
        const updatedData = {
            sessionId: existingRecord.sessionId,
            subjective: updates.subjective ?? existingRecord.subjective ?? undefined,
            objective: updates.objective ?? existingRecord.objective ?? undefined,
            assessment: updates.assessment ?? existingRecord.assessment ?? undefined,
            plan: updates.plan ?? existingRecord.plan ?? undefined,
            icdCodes: updates.icdCodes ?? (existingRecord.icdCodes as string[]) ?? undefined,
            status: updates.status ?? existingRecord.status,
        };

        // Save updated record
        const record = await saveMedicalRecord(updatedData);

        return NextResponse.json({
            success: true,
            message: 'Bệnh án đã được cập nhật',
            data: record
        });
    } catch (error) {
        console.error('Error updating medical record:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Không thể cập nhật bệnh án',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
