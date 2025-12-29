const HIS_BASE_URL = process.env.HIS_API_URL || '/api/his';

interface HISCurrentSessionResponse {
    success: boolean;
    data?: {
        visitId: string;
        patientInfo: {
            patientId: string;
            name: string;
            age: number;
            gender: string;
            address: string;
            phoneNumber: string;
        };
        context?: {
            medicalHistory: string;
            allergies: string[];
            currentMedications: string[];
            lastVisit: string;
            vitalSigns: {
                bloodPressure: string;
                heartRate: string;
                temperature: string;
                weight: string;
                height: string;
            };
        };
    };
    error?: string;
}

interface MedicalPayload {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    icdCodes: string[];
}

interface HISUpdateResponse {
    success: boolean;
    message?: string;
    data?: {
        visitId: string;
        syncedAt: string;
        recordId: string;
    };
    error?: string;
}

/**
 * Get current session data from HIS system
 * @param includeContext - Whether to include medical history and context
 */
export async function getCurrentSession(
    includeContext: boolean = false
): Promise<HISCurrentSessionResponse> {
    try {
        const url = `${HIS_BASE_URL}/current-session?context=${includeContext}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('HIS Client Error (getCurrentSession):', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Update visit record in HIS system
 * @param visitId - The visit ID from HIS system
 * @param payload - Medical data to sync
 */
export async function updateVisit(
    visitId: string,
    payload: MedicalPayload
): Promise<HISUpdateResponse> {
    try {
        const url = `${HIS_BASE_URL}/update/${visitId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('HIS Client Error (updateVisit):', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// Export types for use in other modules
export type { HISCurrentSessionResponse, MedicalPayload, HISUpdateResponse };
