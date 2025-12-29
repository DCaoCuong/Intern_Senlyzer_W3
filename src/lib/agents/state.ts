export interface SoapNote {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}

export interface AgentState {
    // Input
    transcript: string;

    // Intermediate State
    soap: SoapNote;

    // Outputs
    icdCodes: string[];
    medicalAdvice: string;
    references: string[];
}
