import { NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq, isNull, and } from 'drizzle-orm';
import { generateDisplayId } from '@/lib/services/userService';

/**
 * API endpoint to update existing patients with displayId
 * GET /api/admin/update-display-ids
 */
export async function GET() {
    try {
        console.log('🔍 Finding patients without displayId...');

        // Get all patients without displayId
        const patientsWithoutDisplayId = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.role, 'patient'),
                    isNull(users.displayId)
                )
            );

        console.log(`📋 Found ${patientsWithoutDisplayId.length} patients without displayId`);

        if (patientsWithoutDisplayId.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All patients already have displayId',
                updated: 0
            });
        }

        const updatedPatients = [];

        // Update each patient with a new displayId
        for (const patient of patientsWithoutDisplayId) {
            const displayId = await generateDisplayId();

            await db
                .update(users)
                .set({ displayId })
                .where(eq(users.id, patient.id));

            updatedPatients.push({
                id: patient.id,
                name: patient.name,
                email: patient.email,
                displayId
            });

            console.log(`✓ Updated patient ${patient.name} (${patient.email}) with displayId: ${displayId}`);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully updated ${updatedPatients.length} patients`,
            updated: updatedPatients.length,
            patients: updatedPatients
        });

    } catch (error) {
        console.error('❌ Error updating patients:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to update patients',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
