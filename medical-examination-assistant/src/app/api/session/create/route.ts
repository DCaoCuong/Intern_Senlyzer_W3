import { NextRequest, NextResponse } from 'next/server';
import { createSession, type SessionInput } from '@/lib/services/sessionService';

/**
 * POST /api/session/create
 * Create a new examination session
 */
export async function POST(request: NextRequest) {
    try {
        const body: SessionInput = await request.json();

        // Validate required fields
        if (!body.patientName || body.patientName.trim() === '') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'Tên bệnh nhân là bắt buộc'
                },
                { status: 400 }
            );
        }

        // Create session using service
        const session = await createSession(body);

        return NextResponse.json({
            success: true,
            message: 'Phiên khám đã được tạo thành công',
            data: session
        });
    } catch (error) {
        console.error('Error creating session:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Không thể tạo phiên khám',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
