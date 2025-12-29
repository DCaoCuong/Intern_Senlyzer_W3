import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparisonRecords } from "@/lib/db/schema";
import { compareMedicalResults, SoapNote } from "@/lib/agents/comparison";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sessionId, medicalRecordId, aiResults, doctorResults } = body;

        if (!aiResults || !doctorResults) {
            return NextResponse.json(
                { error: "Missing aiResults or doctorResults" },
                { status: 400 }
            );
        }

        // Run Comparison Analysis
        const analysis = await compareMedicalResults(
            aiResults.soap as SoapNote,
            doctorResults.soap as SoapNote,
            aiResults.icdCodes as string[],
            doctorResults.icdCodes as string[]
        );

        // Save to Database
        const id = crypto.randomUUID();
        await db.insert(comparisonRecords).values({
            id,
            timestamp: new Date(),
            sessionId: sessionId || null,
            medicalRecordId: medicalRecordId || null,
            aiResults: JSON.stringify(aiResults),
            doctorResults: JSON.stringify(doctorResults),
            comparison: JSON.stringify(analysis),
            matchScore: analysis.matchScore,
        });

        // Return result
        return NextResponse.json({
            success: true,
            comparisonId: id,
            matchScore: analysis.matchScore,
            analysis
        });

    } catch (error) {
        console.error("Comparison API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: String(error) },
            { status: 500 }
        );
    }
}
