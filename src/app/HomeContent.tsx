'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function HomeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const patientId = searchParams.get('patientId');

    useEffect(() => {
        // If patientId is provided, go to examination with that patient
        if (patientId) {
            router.push(`/examination?patientId=${patientId}`);
        } else {
            // Otherwise redirect to dashboard
            router.push('/dashboard');
        }
    }, [router, patientId]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Đang chuyển hướng...</p>
            </div>
        </div>
    );
}
