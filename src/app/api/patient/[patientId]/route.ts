import { NextRequest, NextResponse } from 'next/server';
import { getUserById, deleteUser } from '@/lib/services/userService';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ patientId: string }> }
) {
    try {
        const { patientId } = await context.params;

        const patient = await getUserById(patientId);

        if (!patient) {
            return NextResponse.json(
                { error: 'Patient not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            patient  // Return as "patient" for backwards compatibility
        });

    } catch (error) {
        console.error('Error in patient get API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ patientId: string }> }
) {
    try {
        const { patientId } = await context.params;

        // Check if patient exists
        const patient = await getUserById(patientId);
        if (!patient) {
            return NextResponse.json(
                { success: false, message: 'Bệnh nhân không tồn tại' },
                { status: 404 }
            );
        }

        // Delete patient and all associated records
        const result = await deleteUser(patientId);

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: result.error || 'Lỗi khi xóa bệnh nhân' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Đã xóa bệnh nhân ${patient.displayId} và tất cả hồ sơ liên quan`
        });

    } catch (error) {
        console.error('Error in patient delete API:', error);
        return NextResponse.json(
            { success: false, message: 'Lỗi kết nối. Vui lòng thử lại.' },
            { status: 500 }
        );
    }
}

