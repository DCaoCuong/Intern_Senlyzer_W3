import { db, users } from './src/lib/db';
import { eq, isNull, and } from 'drizzle-orm';
import { generateDisplayId } from './src/lib/services/userService';

/**
 * Migration script to add displayId to existing patients
 * Run this once to fix existing patients without displayId
 */
async function updatePatientsWithDisplayId() {
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
        console.log('✅ All patients already have displayId!');
        return;
    }

    // Update each patient with a new displayId
    for (const patient of patientsWithoutDisplayId) {
        const displayId = await generateDisplayId();

        await db
            .update(users)
            .set({ displayId })
            .where(eq(users.id, patient.id));

        console.log(`✓ Updated patient ${patient.name} (${patient.email}) with displayId: ${displayId}`);
    }

    console.log(`\n✅ Successfully updated ${patientsWithoutDisplayId.length} patients!`);
    process.exit(0);
}

// Run the migration
updatePatientsWithDisplayId().catch((error) => {
    console.error('❌ Error updating patients:', error);
    process.exit(1);
});
