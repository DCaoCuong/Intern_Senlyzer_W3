import { NextRequest, NextResponse } from 'next/server';
import { db, comparisonRecords } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ sessionId: string }> }
) {
    try {
        const { sessionId } = await context.params;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: 'Session ID is required' },
                { status: 400 }
            );
        }

        // Find comparison record for this session
        const result = await db
            .select()
            .from(comparisonRecords)
            .where(eq(comparisonRecords.sessionId, sessionId))
            .limit(1);

        if (result.length === 0) {
            return NextResponse.json(
                { success: true, comparison: null },
                { status: 200 }
            );
        }

        return NextResponse.json({
            success: true,
            comparison: result[0]
        });

    } catch (error) {
        console.error('Error fetching comparison:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
