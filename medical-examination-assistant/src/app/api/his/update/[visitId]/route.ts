import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock HIS System API - Update Visit Endpoint
 * POST /api/his/update/:visitId
 * 
 * Receives medical data to sync with external HIS/EMR system
 * This is a mock implementation for demo purposes
 */

interface UpdatePayload {
    visitId: string;
    subjective: string; // Triệu chứng
    objective: string; // Sinh hiệu, khám lâm sàng
    assessment: string; // Chẩn đoán
    plan: string; // Kế hoạch điều trị
    icdCodes: string[]; // Mã ICD-10
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ visitId: string }> }
) {
    try {
        const params = await context.params;
        const visitId = params.visitId;
        const payload: UpdatePayload = await request.json();

        // Validate required fields
        if (!payload.assessment || !payload.icdCodes || payload.icdCodes.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: assessment and icdCodes are required'
                },
                { status: 400 }
            );
        }

        // Mock delay to simulate API call to external system
        await new Promise(resolve => setTimeout(resolve, 500));

        // Simulate 90% success rate
        const isSuccess = Math.random() > 0.1;

        if (!isSuccess) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'HIS system temporarily unavailable',
                    message: 'Failed to sync data with external EMR system'
                },
                { status: 503 }
            );
        }

        // Success response
        return NextResponse.json({
            success: true,
            message: 'Medical record successfully synced to HIS system',
            data: {
                visitId: visitId,
                syncedAt: new Date().toISOString(),
                recordId: `EMR_${visitId}_${Date.now()}`,
                // Echo back the synced data
                synced: {
                    subjective: payload.subjective,
                    objective: payload.objective,
                    assessment: payload.assessment,
                    plan: payload.plan,
                    icdCodes: payload.icdCodes
                }
            }
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
