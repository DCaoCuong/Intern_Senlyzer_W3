import { NextRequest, NextResponse } from 'next/server';
import { saveMedicalRecord, type MedicalRecordInput } from '@/lib/services/sessionService';

/**
 * POST /api/medical-record/save
 * Save or update medical record (draft or final)
 */
export async function POST(request: NextRequest) {
    try {
        const body: MedicalRecordInput = await request.json();

        // Validate required fields
        if (!body.sessionId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'Session ID là bắt buộc'
                },
                { status: 400 }
            );
        }

        if (!body.status || !['draft', 'final'].includes(body.status)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'Status phải là "draft" hoặc "final"'
                },
                { status: 400 }
            );
        }

        // For final records, ensure critical fields are present
        if (body.status === 'final') {
            if (!body.assessment || !body.icdCodes || body.icdCodes.length === 0) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Validation error',
                        message: 'Chẩn đoán và mã ICD-10 là bắt buộc khi lưu bệnh án chính thức'
                    },
                    { status: 400 }
                );
            }
        }

        // Save record using service
        const record = await saveMedicalRecord(body);

        return NextResponse.json({
            success: true,
            message: body.status === 'final'
                ? 'Bệnh án đã được lưu và đồng bộ với HIS'
                : 'Bệnh án nháp đã được lưu',
            data: record
        });
    } catch (error) {
        console.error('Error saving medical record:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Không thể lưu bệnh án',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
