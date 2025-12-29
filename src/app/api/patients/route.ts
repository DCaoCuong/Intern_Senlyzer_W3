import { NextRequest, NextResponse } from 'next/server';
import { listPatients, searchPatients } from '@/lib/services/patientService';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const query = searchParams.get('q') || searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        // Search mode
        if (query) {
            const result = await searchPatients(query, { page, limit });
            return NextResponse.json(result);
        }

        // List mode (all patients with pagination)
        const result = await listPatients({ page, limit });
        return NextResponse.json(result);

    } catch (error) {
        console.error('Error in patients list API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
