import { NextRequest, NextResponse } from 'next/server';
import {
    createPatient,
    forceCreatePatient,
    type PatientInput
} from '@/lib/services/patientService';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { patientData, force } = body as {
            patientData: PatientInput;
            force?: boolean;
        };

        // Validate required fields
        if (!patientData.name) {
            return NextResponse.json(
                { error: 'Patient name is required' },
                { status: 400 }
            );
        }

        // Force create (bypass duplicate check)
        if (force) {
            const patient = await forceCreatePatient(patientData);
            return NextResponse.json({
                success: true,
                patient
            });
        }

        // Normal create with duplicate check
        const result = await createPatient(patientData);

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error,
                    duplicates: result.duplicates
                },
                { status: 409 } // Conflict
            );
        }

        return NextResponse.json({
            success: true,
            patient: result.patient
        });

    } catch (error) {
        console.error('Error in patient create API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
