import { NextResponse } from 'next/server';
import { getDashboardStats, getPatientsList } from '@/lib/services/dashboardService';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        const stats = await getDashboardStats();
        const patients = await getPatientsList(limit, page);

        return NextResponse.json({
            success: true,
            stats,
            patients,
            pagination: {
                page,
                limit
            }
        });

    } catch (error) {
        console.error('Error in dashboard stats API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
