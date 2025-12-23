import { NextRequest, NextResponse } from 'next/server';
import { getPatientById } from '@/lib/services/patientService';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ patientId: string }> }
) {
    try {
        const { patientId } = await context.params;

        const patient = await getPatientById(patientId);

        if (!patient) {
            return NextResponse.json(
                { error: 'Patient not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            patient
        });

    } catch (error) {
        console.error('Error in patient get API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
