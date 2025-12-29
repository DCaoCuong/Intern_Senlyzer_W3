import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock HIS System API - Current Session Endpoint
 * GET /api/his/current-session?context=true
 * 
 * Returns patient information from external HIS/EMR system
 * This is a mock implementation for demo purposes
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const includeContext = searchParams.get('context') === 'true';

    try {
        // Mock delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));

        // Mock patient data from HIS system
        const mockSessionData = {
            success: true,
            data: {
                visitId: `VN${Date.now().toString().slice(-6)}`, // Generate unique visit ID
                patientInfo: {
                    patientId: 'P001234',
                    name: 'Nguyễn Văn A',
                    age: 45,
                    gender: 'Nam',
                    address: 'TP. Hồ Chí Minh',
                    phoneNumber: '0901234567',
                },
                // Only include context if requested
                ...(includeContext && {
                    context: {
                        medicalHistory: 'Tiền sử: Tăng huyết áp từ 5 năm nay, đang dùng thuốc hạ áp đều đặn. Gia đình có tiền sử tiểu đường.',
                        allergies: ['Penicillin'],
                        currentMedications: [
                            'Amlodipine 5mg - 1 viên/ngày',
                            'Atorvastatin 10mg - 1 viên/tối'
                        ],
                        lastVisit: '2024-11-15',
                        vitalSigns: {
                            bloodPressure: '135/85 mmHg',
                            heartRate: '78 bpm',
                            temperature: '36.8°C',
                            weight: '72 kg',
                            height: '170 cm'
                        }
                    }
                })
            }
        };

        return NextResponse.json(mockSessionData);
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch session data from HIS system',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
