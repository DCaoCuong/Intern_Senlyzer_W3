import { NextRequest, NextResponse } from 'next/server';
import { createSession, type SessionInput } from '@/lib/services/sessionService';
import { createPatient, forceCreatePatient, type PatientInput } from '@/lib/services/patientService';

/**
 * POST /api/session/create
 * Create a new examination session
 * 
 * COMPATIBILITY MODE: Supports both old (patientName) and new (patientId) formats
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // NEW FORMAT: patientId provided - direct session creation
        if (body.patientId) {
            const sessionInput: SessionInput = {
                patientId: body.patientId,
                chiefComplaint: body.chiefComplaint,
                visitId: body.visitId,
            };

            const session = await createSession(sessionInput);

            return NextResponse.json({
                success: true,
                message: 'Phiên khám đã được tạo thành công',
                data: session
            });
        }

        // OLD FORMAT: patientName provided - auto-create patient first
        if (body.patientName) {
            // Step 1: Create patient from form data
            const patientData: PatientInput = {
                name: body.patientName,
                gender: body.patientInfo?.gender,
                address: body.patientInfo?.address,
                phoneNumber: body.patientInfo?.phoneNumber,
                medicalHistory: body.medicalHistory,
                // Calculate birthDate from age if provided
                birthDate: body.patientInfo?.age
                    ? calculateBirthDate(body.patientInfo.age)
                    : undefined,
            };

            // Force create patient (bypass duplicate check for old flow)
            const patient = await forceCreatePatient(patientData);

            // Step 2: Create session linked to patient
            const sessionInput: SessionInput = {
                patientId: patient.id,
                chiefComplaint: body.chiefComplaint || body.medicalHistory, // Use medical history as chief complaint if not provided
                visitId: body.visitId,
            };

            const session = await createSession(sessionInput);

            return NextResponse.json({
                success: true,
                message: 'Phiên khám đã được tạo thành công',
                data: {
                    ...session,
                    // Include patient info for backward compatibility
                    patientName: patient.name,
                    patientDisplayId: patient.displayId,
                    patient: patient
                }
            });
        }

        // No valid input
        return NextResponse.json(
            {
                success: false,
                error: 'Validation error',
                message: 'Tên bệnh nhân hoặc mã bệnh nhân là bắt buộc'
            },
            { status: 400 }
        );

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

/**
 * Helper: Calculate birth date from age
 */
function calculateBirthDate(age: number): string {
    const today = new Date();
    const birthYear = today.getFullYear() - age;
    return `${birthYear}-01-01`; // Default to Jan 1st of birth year
}
