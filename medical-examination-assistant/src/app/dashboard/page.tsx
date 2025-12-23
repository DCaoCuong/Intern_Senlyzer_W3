'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PatientSearchModal from '@/components/PatientSearchModal';
import PatientFormModal from '@/components/PatientFormModal';
import { Search, UserPlus, TrendingUp, Users, Calendar, Activity } from 'lucide-react';

interface DashboardStats {
    today: {
        totalSessions: number;
        completedSessions: number;
        activeSessions: number;
    };
    thisWeek: {
        totalSessions: number;
        newPatients: number;
    };
    thisMonth: {
        totalSessions: number;
        newPatients: number;
    };
    total: {
        patients: number;
        sessions: number;
    };
}

interface RecentSession {
    id: string;
    patientName: string;
    patientDisplayId: string;
    visitNumber: number;
    chiefComplaint: string | null;
    diagnosis?: string;
    status: string;
    createdAt: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPatientSearch, setShowPatientSearch] = useState(false);
    const [showPatientForm, setShowPatientForm] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/dashboard/stats');
            const data = await res.json();

            if (data.success) {
                setStats(data.stats);
                setRecentSessions(data.recentSessions);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewPatient = () => {
        setShowPatientForm(true);
    };

    const handleSearch = () => {
        setShowPatientSearch(true);
    };

    const handlePatientCreated = (patientId: string) => {
        // Navigate to examination page with patientId
        router.push(`/examination?patientId=${patientId}`);
    };

    const handleSelectPatient = (patientId: string) => {
        router.push(`/patient/${patientId}/history`);
    };

    const handleCreateFollowUp = (patientId: string) => {
        // Navigate to examination page for follow-up visit
        router.push(`/examination?patientId=${patientId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Đang tải dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 pb-20">
            <div className="p-6 md:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-10 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                        Dashboard - MEA
                    </h1>
                    <p className="text-slate-600 text-lg">Chào bác sĩ! Quản lý bệnh nhân và lịch sử khám bệnh</p>
                </header>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-slide-up">
                    <Button
                        variant="primary"
                        onClick={handleNewPatient}
                        className="flex items-center justify-center gap-2 py-4 text-lg"
                    >
                        <UserPlus className="w-6 h-6" />
                        Bệnh nhân mới
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleSearch}
                        className="flex items-center justify-center gap-2 py-4 text-lg"
                    >
                        <Search className="w-6 h-6" />
                        Tìm kiếm bệnh nhân
                    </Button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        <StatCard
                            icon={<Calendar className="w-8 h-8 text-sky-600" />}
                            label="Hôm nay"
                            value={stats.today.totalSessions}
                            subtext={`${stats.today.completedSessions} hoàn thành`}
                            color="sky"
                        />
                        <StatCard
                            icon={<Activity className="w-8 h-8 text-teal-600" />}
                            label="Tuần này"
                            value={stats.thisWeek.totalSessions}
                            subtext={`${stats.thisWeek.newPatients} BN mới`}
                            color="teal"
                        />
                        <StatCard
                            icon={<TrendingUp className="w-8 h-8 text-cyan-600" />}
                            label="Tháng này"
                            value={stats.thisMonth.totalSessions}
                            subtext={`${stats.thisMonth.newPatients} BN mới`}
                            color="cyan"
                        />
                        <StatCard
                            icon={<Users className="w-8 h-8 text-indigo-600" />}
                            label="Tổng bệnh nhân"
                            value={stats.total.patients}
                            subtext={`${stats.total.sessions} lần khám`}
                            color="indigo"
                        />
                    </div>
                )}

                {/* Recent Sessions */}
                <Card variant="elevated" padding="none" className="animate-fade-in">
                    <div className="p-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            📋 Phiên khám gần đây
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        {recentSessions.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4 opacity-40">📭</div>
                                <p className="text-slate-400 font-medium">Chưa có phiên khám nào</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-sm font-bold text-slate-700">Mã BN</th>
                                        <th className="text-left px-6 py-3 text-sm font-bold text-slate-700">Tên bệnh nhân</th>
                                        <th className="text-left px-6 py-3 text-sm font-bold text-slate-700">Lý do khám</th>
                                        <th className="text-left px-6 py-3 text-sm font-bold text-slate-700">Chẩn đoán</th>
                                        <th className="text-left px-6 py-3 text-sm font-bold text-slate-700">Trạng thái</th>
                                        <th className="text-left px-6 py-3 text-sm font-bold text-slate-700">Ngày</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentSessions.map((session, idx) => (
                                        <tr
                                            key={session.id}
                                            className="border-b border-slate-100 hover:bg-sky-50/50 transition cursor-pointer"
                                            onClick={() => router.push(`/patient/${session.patientDisplayId}/history`)}
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                        >
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm font-bold text-sky-600">
                                                    {session.patientDisplayId}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">{session.patientName}</div>
                                                <div className="text-xs text-slate-500">Lần {session.visitNumber}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {session.chiefComplaint || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {session.diagnosis || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={session.status} />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {new Date(session.createdAt).toLocaleDateString('vi-VN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>

                {/* Modals */}
                <PatientSearchModal
                    isOpen={showPatientSearch}
                    onClose={() => setShowPatientSearch(false)}
                    onSelectPatient={handleSelectPatient}
                    onCreateFollowUp={handleCreateFollowUp}
                />

                <PatientFormModal
                    isOpen={showPatientForm}
                    onClose={() => setShowPatientForm(false)}
                    onSuccess={handlePatientCreated}
                />
            </div>
        </div>
    );
}

// Stats Card Component
function StatCard({ icon, label, value, subtext, color }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    subtext: string;
    color: string;
}) {
    const colorClasses = {
        sky: 'from-sky-50 to-sky-100 border-sky-200',
        teal: 'from-teal-50 to-teal-100 border-teal-200',
        cyan: 'from-cyan-50 to-cyan-100 border-cyan-200',
        indigo: 'from-indigo-50 to-indigo-100 border-indigo-200',
    }[color] || 'from-slate-50 to-slate-100 border-slate-200';

    return (
        <Card variant="elevated" className={`bg-gradient-to-br ${colorClasses} animate-scale-in`}>
            <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                    {icon}
                </div>
            </div>
            <div className="text-3xl font-black text-slate-800 mb-1">{value}</div>
            <div className="text-sm font-bold text-slate-600 mb-1">{label}</div>
            <div className="text-xs text-slate-500">{subtext}</div>
        </Card>
    );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
    const variants = {
        active: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        completed: 'bg-green-100 text-green-800 border-green-200',
        cancelled: 'bg-red-100 text-red-800 border-red-200',
    };

    const labels = {
        active: 'Đang khám',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy',
    };

    const variant = variants[status as keyof typeof variants] || variants.active;
    const label = labels[status as keyof typeof labels] || status;

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${variant}`}>
            {label}
        </span>
    );
}
