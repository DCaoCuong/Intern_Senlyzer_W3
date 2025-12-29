'use client';

import React, { useState } from 'react';
import { Card, Input, Button } from './ui';
import type { Session } from '@/lib/services/sessionService';

interface SessionInitFormProps {
    onSessionCreated: (session: Session) => void;
}

export default function SessionInitForm({ onSessionCreated }: SessionInitFormProps) {
    const [formData, setFormData] = useState({
        patientName: '',
        age: '',
        gender: 'Nam',
        address: '',
        medicalHistory: '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user types
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.patientName.trim()) {
            setError('Tên bệnh nhân là bắt buộc');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/session/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientName: formData.patientName,
                    patientInfo: {
                        age: formData.age ? parseInt(formData.age) : undefined,
                        gender: formData.gender,
                        address: formData.address || undefined,
                    },
                    medicalHistory: formData.medicalHistory || undefined,
                }),
            });

            const result = await response.json();

            if (result.success) {
                onSessionCreated(result.data);
            } else {
                setError(result.message || 'Không thể tạo phiên khám');
            }
        } catch (err) {
            setError('Lỗi kết nối. Vui lòng thử lại.');
            console.error('Error creating session:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Card className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Khởi tạo phiên khám
                    </h2>
                    <p className="text-slate-600">
                        Nhập thông tin bệnh nhân để bắt đầu ca khám bệnh mới
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Patient Name - Required */}
                    <Input
                        label="Họ và tên bệnh nhân"
                        placeholder="Nhập họ tên đầy đủ"
                        value={formData.patientName}
                        onChange={(e) => handleChange('patientName', e.target.value)}
                        required
                        error={error && !formData.patientName ? error : undefined}
                        icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        }
                    />

                    {/* Age and Gender */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Tuổi"
                            type="number"
                            placeholder="VD: 45"
                            value={formData.age}
                            onChange={(e) => handleChange('age', e.target.value)}
                            min="0"
                            max="150"
                        />

                        <div>
                            <label className="block mb-2 text-sm font-semibold text-slate-700">
                                Giới tính
                            </label>
                            <select
                                value={formData.gender}
                                onChange={(e) => handleChange('gender', e.target.value)}
                                className="w-full px-4 py-3 text-slate-900 bg-white border border-slate-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 focus:border-sky-500"
                            >
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                                <option value="Khác">Khác</option>
                            </select>
                        </div>
                    </div>

                    {/* Address */}
                    <Input
                        label="Địa chỉ"
                        placeholder="VD: Quận 1, TP.HCM"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        }
                    />

                    {/* Medical History */}
                    <div>
                        <label className="block mb-2 text-sm font-semibold text-slate-700">
                            Tiền sử bệnh (Optional)
                        </label>
                        <textarea
                            placeholder="VD: Tăng huyết áp từ 5 năm nay, đang dùng thuốc..."
                            value={formData.medicalHistory}
                            onChange={(e) => handleChange('medicalHistory', e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 text-slate-900 bg-white border border-slate-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 focus:border-sky-500 resize-none"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full py-4 text-lg font-semibold"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Đang tạo phiên khám...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                🩺 Bắt đầu khám
                            </span>
                        )}
                    </Button>
                </form>

                {/* Footer */}
                <p className="mt-6 text-center text-sm text-slate-500">
                    Thông tin bệnh nhân sẽ được lưu trữ an toàn trong hệ thống
                </p>
            </Card>
        </div>
    );
}
