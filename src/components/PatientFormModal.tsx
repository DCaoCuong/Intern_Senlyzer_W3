'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import Button from './ui/Button';

interface PatientFormData {
    name: string;
    birthDate?: string;
    gender?: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    medicalHistory?: string;
    allergies?: string;
    bloodType?: string;
}

interface PatientFormModalProps {
    onClose: () => void;
    onPatientCreated: (patientId: string) => void;
}

export default function PatientFormModal({ onClose, onPatientCreated }: PatientFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [duplicates, setDuplicates] = useState<any[]>([]);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<PatientFormData>();

    const onSubmit = async (data: PatientFormData, force: boolean = false) => {
        setLoading(true);
        try {
            const res = await fetch('/api/patient/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientData: data,
                    force
                })
            });

            const result = await res.json();

            if (result.success) {
                console.log('Patient created:', result.patient);
                onPatientCreated(result.patient.id);
                reset();
                onClose();
            } else if (result.error === 'POSSIBLE_DUPLICATE') {
                // Show duplicate warning
                setDuplicates(result.duplicates || []);
                setShowDuplicateWarning(true);
            } else {
                alert('Lỗi: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating patient:', error);
            alert('Không thể tạo bệnh nhân. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleUseExisting = (patient: any) => {
        onPatientCreated(patient.id);
        setShowDuplicateWarning(false);
        reset();
        onClose();
    };

    const handleForceCreate = () => {
        setShowDuplicateWarning(false);
        handleSubmit((data) => onSubmit(data, true))();
    };

    // Duplicate Warning View
    if (showDuplicateWarning) {
        return (
            <>
                <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDuplicateWarning(false)} />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-scale-in">
                        <h2 className="text-2xl font-bold text-orange-600 mb-4">⚠️ Phát hiện bệnh nhân có thể trùng</h2>
                        <p className="text-slate-600 mb-6">
                            Các bệnh nhân sau có thông tin tương tự. Vui lòng kiểm tra trước khi tạo mới:
                        </p>

                        <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
                            {duplicates.map((patient) => (
                                <div key={patient.id} className="p-4 border-2 border-orange-200 rounded-xl bg-orange-50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-lg">{patient.displayId} - {patient.name}</div>
                                            <div className="text-sm text-slate-600 mt-1">
                                                SĐT: {patient.phoneNumber || 'N/A'} | Ngày sinh: {patient.birthDate || 'N/A'}
                                            </div>
                                        </div>
                                        <Button onClick={() => handleUseExisting(patient)}>
                                            Đây là bệnh nhân này
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setShowDuplicateWarning(false)} className="flex-1">
                                Hủy
                            </Button>
                            <Button onClick={handleForceCreate} className="flex-1">
                                Không, đây là bệnh nhân mới
                            </Button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Main Form View
    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-sky-50 to-teal-50">
                        <h2 className="text-2xl font-bold text-slate-800">🆕 Tạo bệnh nhân mới</h2>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Name - Required */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Họ và tên <span className="text-red-500">*</span>
                                </label>
                                <input
                                    {...register('name', { required: 'Tên bệnh nhân là bắt buộc' })}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                                    placeholder="Nguyễn Văn A"
                                />
                                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                            </div>

                            {/* Birth Date */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Ngày sinh</label>
                                <input
                                    {...register('birthDate')}
                                    type="date"
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                                />
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Giới tính</label>
                                <select
                                    {...register('gender')}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                                >
                                    <option value="">Chọn</option>
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Số điện thoại</label>
                                <input
                                    {...register('phoneNumber')}
                                    type="tel"
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                                    placeholder="0901234567"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                                <input
                                    {...register('email')}
                                    type="email"
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                                    placeholder="email@example.com"
                                />
                            </div>

                            {/* Address */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Địa chỉ</label>
                                <input
                                    {...register('address')}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                                    placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                                />
                            </div>

                            {/* Medical History */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Tiền sử bệnh</label>
                                <textarea
                                    {...register('medicalHistory')}
                                    rows={3}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                                    placeholder="Các bệnh lý trước đây..."
                                />
                            </div>

                            {/* Allergies */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Dị ứng</label>
                                <input
                                    {...register('allergies')}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                                    placeholder="Penicillin,..."
                                />
                            </div>

                            {/* Blood Type */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nhóm máu</label>
                                <select
                                    {...register('bloodType')}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                                >
                                    <option value="">Chọn</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="AB">AB</option>
                                    <option value="O">O</option>
                                </select>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 mt-8">
                            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                                Hủy
                            </Button>
                            <Button type="submit" disabled={loading} className="flex-1">
                                {loading ? 'Đang tạo...' : 'Tạo bệnh nhân'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
