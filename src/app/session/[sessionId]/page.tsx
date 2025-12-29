'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
    ArrowLeft,
    Calendar,
    User,
    FileText,
    Activity,
    Clipboard,
    PillBottle,
    Stethoscope,
    Trash2,
    Bot,
    Target
} from 'lucide-react';

interface Session {
    id: string;
    patientId: string;
    visitNumber: number;
    chiefComplaint: string;
    status: 'active' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}

interface MedicalRecord {
    id: string;
    sessionId: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    createdAt: string;
}

interface Patient {
    id: string;
    displayId: string;
    name: string;
    birthDate: string | null;
    gender: string | null;
}

interface ComparisonData {
    id: string;
    sessionId: string;
    matchScore: number;
    aiResults: any;
    doctorResults: any;
    comparison: any;
}

export default function SessionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.sessionId as string;

    const [session, setSession] = useState<Session | null>(null);
    const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [comparison, setComparison] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (sessionId) {
            fetchSessionData();
        }
    }, [sessionId]);

    const fetchSessionData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get session and medical record
            const sessionRes = await fetch(`/api/session/${sessionId}`);
            const sessionData = await sessionRes.json();

            if (!sessionData.success) {
                setError(sessionData.message || 'Không thể tải thông tin phiên khám');
                setLoading(false);
                return;
            }

            setSession(sessionData.data.session);
            setMedicalRecord(sessionData.data.medicalRecord);

            // Get patient info
            if (sessionData.data.session.patientId) {
                const patientRes = await fetch(`/api/patient/${sessionData.data.session.patientId}`);
                const patientData = await patientRes.json();

                if (patientData.success) {
                    setPatient(patientData.patient);
                }
            }

            // Get comparison data if exists
            try {
                const compRes = await fetch(`/api/comparison/session/${sessionId}`);
                if (compRes.ok) {
                    const compData = await compRes.json();
                    if (compData.success && compData.comparison) {
                        setComparison(compData.comparison);
                    }
                }
            } catch (compError) {
                // Comparison is optional, don't fail if not found
                console.log('No comparison data found for this session');
            }

        } catch (err) {
            console.error('Error fetching session data:', err);
            setError('Lỗi khi tải dữ liệu phiên khám');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (patient) {
            router.push(`/patient/${patient.displayId}/history`);
        } else {
            router.push('/dashboard');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Bạn có chắc chắn muốn xóa phiên khám này? Hành động này không thể hoàn tác.')) {
            return;
        }

        setDeleting(true);
        try {
            const res = await fetch(`/api/session/${sessionId}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (data.success) {
                alert('Xóa phiên khám thành công!');
                handleBack();
            } else {
                alert('Lỗi: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setDeleting(false);
        }
    };

    const calculateAge = (birthDate: string | null): string => {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return `${age} tuổi`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 p-6">
                <div className="max-w-4xl mx-auto">
                    <Card variant="elevated" className="text-center py-12">
                        <div className="text-6xl mb-4 opacity-40">😞</div>
                        <p className="text-slate-600 text-lg mb-4">{error || 'Không tìm thấy phiên khám'}</p>
                        <Button variant="primary" onClick={handleBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Quay lại
                        </Button>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="secondary" onClick={handleBack}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Chi tiết phiên khám</h1>
                            <p className="text-slate-600 mt-1">Lần khám thứ {session.visitNumber}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="danger"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center gap-2"
                        >
                            {deleting ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            Xóa phiên khám
                        </Button>
                    </div>
                </div>

                {/* Patient & Session Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Patient Info */}
                    {patient && (
                        <Card variant="elevated" className="bg-gradient-to-r from-sky-50 to-sky-100 border border-sky-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-sky-600 rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{patient.name}</h3>
                                    <p className="text-sm text-sky-600 font-mono">{patient.displayId}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-slate-500">Tuổi:</span>
                                    <p className="font-semibold">{calculateAge(patient.birthDate)}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Giới tính:</span>
                                    <p className="font-semibold">{patient.gender || 'N/A'}</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Session Info */}
                    <Card variant="elevated" className="bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Thông tin khám</h3>
                                <StatusBadge status={session.status} />
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-slate-500">Ngày khám:</span>
                                <p className="font-semibold">
                                    {new Date(session.createdAt).toLocaleDateString('vi-VN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                            <div>
                                <span className="text-slate-500">Lần khám:</span>
                                <p className="font-semibold">Lần thứ {session.visitNumber}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Chief Complaint */}
                <Card variant="elevated">
                    <div className="flex items-center gap-3 mb-3">
                        <Stethoscope className="w-5 h-5 text-sky-600" />
                        <h3 className="font-bold text-slate-900">Lý do khám</h3>
                    </div>
                    <p className="text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        {session.chiefComplaint}
                    </p>
                </Card>

                {/* AI Comparison Score */}
                {comparison && (
                    <Card variant="elevated" className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <Target className="w-4 h-4" />
                                        Độ chính xác AI
                                    </h3>
                                    <p className="text-sm text-slate-600">So sánh với chẩn đoán của bác sĩ</p>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-indigo-600">
                                    {Math.round(comparison.matchScore)}%
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Match Score</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                    style={{ width: `${comparison.matchScore}%` }}
                                />
                            </div>
                        </div>
                        {comparison.matchScore >= 80 && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800">
                                    ✅ <span className="font-semibold">Độ chính xác cao!</span> AI suggestions khớp tốt với chẩn đoán của bác sĩ.
                                </p>
                            </div>
                        )}
                        {comparison.matchScore >= 50 && comparison.matchScore < 80 && (
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-800">
                                    ⚠️ <span className="font-semibold">Độ chính xác trung bình.</span> Có một số khác biệt với chẩn đoán của bác sĩ.
                                </p>
                            </div>
                        )}
                        {comparison.matchScore < 50 && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800">
                                    ❌ <span className="font-semibold">Độ chính xác thấp.</span> AI suggestions khác nhiều so với chẩn đoán của bác sĩ.
                                </p>
                            </div>
                        )}
                    </Card>
                )}

                {/* Medical Record - SOAP Notes */}
                {medicalRecord ? (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Bệnh án - SOAP Notes
                        </h2>

                        {/* Subjective */}
                        <Card variant="elevated" className="border-l-4 border-l-blue-500">
                            <div className="flex items-center gap-3 mb-3">
                                <Activity className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-slate-900">Subjective (Triệu chứng chủ quan)</h3>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <p className="text-slate-700 whitespace-pre-wrap bg-blue-50 p-4 rounded-lg">
                                    {medicalRecord.subjective || 'Chưa có thông tin'}
                                </p>
                            </div>
                        </Card>

                        {/* Objective */}
                        <Card variant="elevated" className="border-l-4 border-l-green-500">
                            <div className="flex items-center gap-3 mb-3">
                                <Clipboard className="w-5 h-5 text-green-600" />
                                <h3 className="font-bold text-slate-900">Objective (Triệu chứng khách quan)</h3>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <p className="text-slate-700 whitespace-pre-wrap bg-green-50 p-4 rounded-lg">
                                    {medicalRecord.objective || 'Chưa có thông tin'}
                                </p>
                            </div>
                        </Card>

                        {/* Assessment */}
                        <Card variant="elevated" className="border-l-4 border-l-amber-500">
                            <div className="flex items-center gap-3 mb-3">
                                <FileText className="w-5 h-5 text-amber-600" />
                                <h3 className="font-bold text-slate-900">Assessment (Chẩn đoán)</h3>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <p className="text-slate-700 whitespace-pre-wrap bg-amber-50 p-4 rounded-lg font-medium">
                                    {medicalRecord.assessment || 'Chưa có chẩn đoán'}
                                </p>
                            </div>
                        </Card>

                        {/* Plan */}
                        <Card variant="elevated" className="border-l-4 border-l-purple-500">
                            <div className="flex items-center gap-3 mb-3">
                                <PillBottle className="w-5 h-5 text-purple-600" />
                                <h3 className="font-bold text-slate-900">Plan (Kế hoạch điều trị)</h3>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <p className="text-slate-700 whitespace-pre-wrap bg-purple-50 p-4 rounded-lg">
                                    {medicalRecord.plan || 'Chưa có kế hoạch điều trị'}
                                </p>
                            </div>
                        </Card>

                        {/* Metadata */}
                        <Card variant="outlined" className="bg-slate-50">
                            <div className="text-xs text-slate-500 space-y-1">
                                <p><span className="font-semibold">Mã bệnh án:</span> {medicalRecord.id}</p>
                                <p><span className="font-semibold">Tạo lúc:</span> {new Date(medicalRecord.createdAt).toLocaleString('vi-VN')}</p>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <Card variant="elevated" className="text-center py-12">
                        <div className="text-6xl mb-4 opacity-40">📋</div>
                        <p className="text-slate-500 font-medium">Chưa có bệnh án cho phiên khám này</p>
                        <p className="text-sm text-slate-400 mt-2">Bệnh án sẽ được tạo sau khi hoàn thành khám bệnh</p>
                    </Card>
                )}
            </div>
        </div>
    );
}

// StatusBadge Component
function StatusBadge({ status }: { status: string }) {
    const statusConfig = {
        'completed': { label: 'Hoàn thành', variant: 'success' },
        'active': { label: 'Đang khám', variant: 'warning' },
        'cancelled': { label: 'Đã hủy', variant: 'danger' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'default' };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
}
