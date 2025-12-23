'use client';

import { useState, useEffect } from 'react';
import { X, Search, User, Phone, Calendar } from 'lucide-react';
import Button from './ui/Button';

interface Patient {
    id: string;
    displayId: string;
    name: string;
    birthDate: string | null;
    phoneNumber: string | null;
    totalVisits: number;
    lastVisitDate: string | null;
}

interface PatientSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPatient?: (patientId: string) => void;
    onCreateFollowUp?: (patientId: string) => void;
}

export default function PatientSearchModal({
    isOpen,
    onClose,
    onSelectPatient,
    onCreateFollowUp
}: PatientSearchModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Search patients
    useEffect(() => {
        if (debouncedQuery.trim().length >= 2) {
            searchPatients(debouncedQuery);
        } else {
            setPatients([]);
        }
    }, [debouncedQuery]);

    const searchPatients = async (query: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (data.patients) {
                setPatients(data.patients);
            }
        } catch (error) {
            console.error('Error searching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPatient = (patientId: string) => {
        if (onSelectPatient) {
            onSelectPatient(patientId);
        }
        onClose();
    };

    const handleFollowUp = (patientId: string) => {
        if (onCreateFollowUp) {
            onCreateFollowUp(patientId);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden animate-scale-in">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-sky-50 to-teal-50">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Search className="w-6 h-6 text-sky-600" />
                            Tìm kiếm bệnh nhân
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white rounded-lg transition"
                        >
                            <X className="w-6 h-6 text-slate-600" />
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="p-6 border-b border-slate-200">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Nhập tên, số điện thoại, hoặc mã bệnh nhân..."
                                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none text-lg"
                                autoFocus
                            />
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                            Nhập ít nhất 2 ký tự để tìm kiếm
                        </p>
                    </div>

                    {/* Results */}
                    <div className="p-6 overflow-y-auto max-h-[50vh]">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-slate-600">Đang tìm kiếm...</p>
                            </div>
                        ) : patients.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4 opacity-40">🔍</div>
                                <p className="text-slate-400 font-medium">
                                    {searchQuery.length >= 2
                                        ? 'Không tìm thấy bệnh nhân'
                                        : 'Nhập từ khóa để tìm kiếm'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {patients.map((patient, idx) => (
                                    <PatientCard
                                        key={patient.id}
                                        patient={patient}
                                        onSelect={() => handleSelectPatient(patient.id)}
                                        onFollowUp={() => handleFollowUp(patient.id)}
                                        index={idx}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// Patient Card Component
function PatientCard({
    patient,
    onSelect,
    onFollowUp,
    index
}: {
    patient: Patient;
    onSelect: () => void;
    onFollowUp: () => void;
    index: number;
}) {
    const age = patient.birthDate
        ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear()
        : null;

    return (
        <div
            className="p-5 rounded-xl border-2 border-slate-200 hover:border-sky-400 hover:shadow-lg transition-all bg-white animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    {/* Patient Info */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white font-bold text-lg">
                            {patient.name.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-800">{patient.name}</h3>
                                <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-bold rounded">
                                    {patient.displayId}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                                {patient.phoneNumber && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5" />
                                        {patient.phoneNumber}
                                    </span>
                                )}
                                {age && (
                                    <span className="flex items-center gap-1">
                                        <User className="w-3.5 h-3.5" />
                                        {age} tuổi
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Visit Info */}
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Lần khám: <strong>{patient.totalVisits}</strong>
                        </span>
                        {patient.lastVisitDate && (
                            <span>
                                Khám lần cuối: {new Date(patient.lastVisitDate).toLocaleDateString('vi-VN')}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Button
                    variant="primary"
                    onClick={onFollowUp}
                    className="flex-1 flex items-center justify-center gap-2"
                >
                    🔄 Tái khám
                </Button>
                <Button
                    variant="secondary"
                    onClick={onSelect}
                    className="flex-1 flex items-center justify-center gap-2"
                >
                    📂 Xem hồ sơ
                </Button>
            </div>
        </div>
    );
}
