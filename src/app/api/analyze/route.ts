import { NextRequest, NextResponse } from 'next/server';
import { medicalAgentGraph } from '@/lib/agents/graph';

export async function POST(req: NextRequest) {
    try {
        const { transcript } = await req.json();

        if (!transcript) {
            return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
        }

        console.log(" Starting Medical Agent Workflow...");

        // Invoke the LangGraph workflow
        const result = await medicalAgentGraph.invoke({
            transcript: transcript
        });

        console.log(" Workflow completed!");

        return NextResponse.json({
            success: true,
            data: {
                soap: result.soap,
                icdCodes: result.icdCodes,
                medicalAdvice: result.medicalAdvice,
                references: result.references
            }
        });

    } catch (error) {
        console.error(" Agent workflow error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: String(error) },
            { status: 500 }
        );
    }
}
