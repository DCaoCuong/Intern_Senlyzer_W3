'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ArrowLeft, Calendar, FileText, Stethoscope, User, Phone, Mail, MapPin } from 'lucide-react';

interface Patient {
    id: string;
    displayId: string;
    name: string;
    birthDate: string | null;
    gender: string | null;
    phoneNumber: string | null;
    email: string | null;
    address: string | null;
}

interface Session {
    id: string;
    visitNumber: number;
    chiefComplaint: string;
    status: 'active' | 'completed' | 'cancelled';
    createdAt: string;
    medicalRecord: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    } | null;
}

export default function PatientHistoryPage() {
    const router = useRouter();
    const params = useParams();
    const displayId = params.displayId as string;

    const [patient, setPatient] = useState<Patient | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (displayId) {
            fetchPatientData();
        }
    }, [displayId]);

    const fetchPatientData = async () => {
        try {
            setLoading(true);
            setError(null);

            // First, get patient by displayId
            const patientRes = await fetch(`/api/patients?q=${displayId}`);
            const patientData = await patientRes.json();

            if (!patientData.patients || patientData.patients.length === 0) {
                setError('Không tìm thấy bệnh nhân');
                setLoading(false);
                return;
            }

            const foundPatient = patientData.patients.find(
                (p: any) => p.displayId === displayId
            );

            if (!foundPatient) {
                setError('Không tìm thấy bệnh nhân');
                setLoading(false);
                return;
            }

            // Get full patient details
            const detailRes = await fetch(`/api/patient/${foundPatient.id}`);
            const detailData = await detailRes.json();

            if (detailData.success) {
                setPatient(detailData.patient);
            }

            // Get patient sessions
            const sessionsRes = await fetch(`/api/patient/${foundPatient.id}/sessions`);
            const sessionsData = await sessionsRes.json();

            if (sessionsData.success) {
                setSessions(sessionsData.sessions);
            }

        } catch (err) {
            console.error('Error fetching patient data:', err);
            setError('Lỗi khi tải dữ liệu bệnh nhân');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.push('/dashboard');
    };

    const handleNewExam = () => {
        if (patient) {
            router.push(`/examination?patientId=${patient.id}`);
        }
    };

    const handleViewSession = (sessionId: string) => {
        router.push(`/session/${sessionId}`);
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

    if (error || !patient) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 p-6">
                <div className="max-w-4xl mx-auto">
                    <Card variant="elevated" className="text-center py-12">
                        <div className="text-6xl mb-4 opacity-40">😞</div>
                        <p className="text-slate-600 text-lg mb-4">{error || 'Không tìm thấy bệnh nhân'}</p>
                        <Button variant="primary" onClick={handleBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Quay lại Dashboard
                        </Button>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="secondary" onClick={handleBack}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Hồ sơ bệnh nhân</h1>
                            <p className="text-slate-600 mt-1">Lịch sử khám bệnh chi tiết</p>
                        </div>
                    </div>
                    <Button variant="primary" onClick={handleNewExam} className="flex items-center gap-2">
                        <Stethoscope className="w-5 h-5" />
                        Khám mới
                    </Button>
                </div>

                {/* Patient Info Card */}
                <Card variant="elevated" className="bg-gradient-to-r from-sky-50 to-teal-50 border border-sky-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center">
                                    <User className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{patient.name}</h2>
                                    <p className="text-sky-600 font-mono font-bold">{patient.displayId}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-slate-500">Tuổi:</span>
                                    <p className="font-semibold text-slate-800">{calculateAge(patient.birthDate)}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Giới tính:</span>
                                    <p className="font-semibold text-slate-800">{patient.gender || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            {patient.phoneNumber && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-700">{patient.phoneNumber}</span>
                                </div>
                            )}
                            {patient.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-700">{patient.email}</span>
                                </div>
                            )}
                            {patient.address && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                    <span className="text-slate-700">{patient.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Sessions List */}
                <Card variant="elevated" padding="none">
                    <div className="p-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Lịch sử khám ({sessions.length} lần)
                        </h3>
                    </div>
                    <div className="p-6">
                        {sessions.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4 opacity-40">📋</div>
                                <p className="text-slate-400 font-medium">Chưa có lịch sử khám bệnh</p>
                                <Button variant="primary" onClick={handleNewExam} className="mt-4">
                                    Tạo phiên khám đầu tiên
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sessions.map((session) => (
                                    <Card
                                        key={session.id}
                                        variant="outlined"
                                        className="hover:shadow-md transition cursor-pointer"
                                        onClick={() => handleViewSession(session.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-bold text-sky-600">Lần {session.visitNumber}</span>
                                                    <StatusBadge status={session.status} />
                                                    <span className="text-sm text-slate-500">
                                                        {new Date(session.createdAt).toLocaleDateString('vi-VN', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="text-slate-700">
                                                    <span className="font-medium">Lý do khám:</span> {session.chiefComplaint}
                                                </div>
                                                {session.medicalRecord && (
                                                    <div className="mt-2 text-sm text-slate-600">
                                                        <span className="font-medium">Chẩn đoán:</span> {session.medicalRecord.assessment}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <FileText className="w-5 h-5 text-slate-400" />
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
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
