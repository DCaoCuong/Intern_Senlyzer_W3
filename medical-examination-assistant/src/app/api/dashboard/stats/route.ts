import { NextResponse } from 'next/server';
import { getDashboardStats, getRecentSessions } from '@/lib/services/dashboardService';

export async function GET() {
    try {
        const stats = await getDashboardStats();
        const recentSessions = await getRecentSessions(5);

        return NextResponse.json({
            success: true,
            stats,
            recentSessions
        });

    } catch (error) {
        console.error('Error in dashboard stats API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
