'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Tabs, Textarea, type TabItem } from './ui';
import { Sparkles, Save } from 'lucide-react';

interface AIResults {
    soap: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    };
    icdCodes: Array<{ code: string; description: string }>;
    medicalAdvice?: string;
}

interface MedicalRecordReviewProps {
    sessionId: string;
    aiResults: AIResults;
    onSave: (data: MedicalRecordData, isFinal: boolean) => void;
    onComparison?: () => void;
}

export interface MedicalRecordData {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    icdCodes: string[];
}

export default function MedicalRecordReview({
    sessionId,
    aiResults,
    onSave,
    onComparison,
}: MedicalRecordReviewProps) {
    // Initialize form data from AI results
    const [formData, setFormData] = useState<MedicalRecordData>({
        subjective: aiResults.soap.subjective || '',
        objective: aiResults.soap.objective || '',
        assessment: aiResults.soap.assessment || '',
        plan: aiResults.soap.plan || '',
        icdCodes: aiResults.icdCodes?.map(item => item.code) || [],
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [selectedIcdCodes, setSelectedIcdCodes] = useState<string[]>(
        aiResults.icdCodes?.map(item => item.code) || []
    );

    // Update form data when field changes
    const handleFieldChange = (field: keyof MedicalRecordData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Toggle ICD code selection
    const toggleIcdCode = (code: string) => {
        setSelectedIcdCodes(prev => {
            const newCodes = prev.includes(code)
                ? prev.filter(c => c !== code)
                : [...prev, code];

            // Update form data
            setFormData(prevData => ({ ...prevData, icdCodes: newCodes }));
            return newCodes;
        });
    };

    // Magic Fill: Accept all AI suggestions
    const handleMagicFill = () => {
        setFormData({
            subjective: aiResults.soap.subjective || '',
            objective: aiResults.soap.objective || '',
            assessment: aiResults.soap.assessment || '',
            plan: aiResults.soap.plan || '',
            icdCodes: aiResults.icdCodes?.map(item => item.code) || [],
        });
        setSelectedIcdCodes(aiResults.icdCodes?.map(item => item.code) || []);
        setSaveMessage({ type: 'success', text: '✨ Đã áp dụng toàn bộ gợi ý AI!' });
    };

    // Keyboard shortcut: Ctrl+Enter to save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!isSaving && formData.assessment && formData.icdCodes.length > 0) {
                    handleFinalSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSaving, formData]);

    // Save draft
    const handleSaveDraft = async () => {
        setIsSaving(true);
        setSaveMessage(null);

        try {
            const response = await fetch('/api/medical-record/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    ...formData,
                    status: 'draft',
                }),
            });

            const result = await response.json();

            if (result.success) {
                setSaveMessage({ type: 'success', text: 'Bệnh án nháp đã được lưu' });
                onSave(formData, false);
            } else {
                setSaveMessage({ type: 'error', text: result.message || 'Không thể lưu bệnh án' });
            }
        } catch (error) {
            setSaveMessage({ type: 'error', text: 'Lỗi kết nối. Vui lòng thử lại.' });
            console.error('Error saving draft:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Final save
    const handleFinalSave = async () => {
        // Validation
        if (!formData.assessment || formData.icdCodes.length === 0) {
            setSaveMessage({
                type: 'error',
                text: 'Chẩn đoán và mã ICD-10 là bắt buộc khi lưu bệnh án chính thức'
            });
            return;
        }

        setIsSaving(true);
        setSaveMessage(null);

        try {
            // Save medical record
            const response = await fetch('/api/medical-record/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    ...formData,
                    status: 'final',
                }),
            });

            const result = await response.json();

            if (result.success) {
                setSaveMessage({
                    type: 'success',
                    text: 'Bệnh án đã được lưu và đồng bộ với HIS'
                });
                onSave(formData, true);

                // Trigger comparison after successful save
                if (onComparison) {
                    onComparison();
                }
            } else {
                setSaveMessage({ type: 'error', text: result.message || 'Không thể lưu bệnh án' });
            }
        } catch (error) {
            setSaveMessage({ type: 'error', text: 'Lỗi kết nối. Vui lòng thử lại.' });
            console.error('Error saving final record:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Tab configuration
    const tabs: TabItem[] = [
        {
            label: 'Khám bệnh',
            value: 'examination',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            content: (
                <div className="space-y-5">
                    <Textarea
                        label="Triệu chứng (Subjective)"
                        placeholder="Lời kể của bệnh nhân về triệu chứng..."
                        value={formData.subjective}
                        onChange={(e) => handleFieldChange('subjective', e.target.value)}
                        rows={5}
                        helperText="Ghi lại lời kể của bệnh nhân về các triệu chứng, cảm giác khó chịu"
                    />

                    <Textarea
                        label="Sinh hiệu & Khám lâm sàng (Objective)"
                        placeholder="Huyết áp, mạch, nhiệt độ, kết quả khám..."
                        value={formData.objective}
                        onChange={(e) => handleFieldChange('objective', e.target.value)}
                        rows={5}
                        helperText="Ghi nhận các sinh hiệu và kết quả khám lâm sàng khách quan"
                    />
                </div>
            ),
        },
        {
            label: 'Chẩn đoán',
            value: 'diagnosis',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
            content: (
                <div className="space-y-5">
                    <Textarea
                        label="Chẩn đoán (Assessment)"
                        placeholder="Kết luận chẩn đoán bệnh..."
                        value={formData.assessment}
                        onChange={(e) => handleFieldChange('assessment', e.target.value)}
                        rows={4}
                        helperText="Chẩn đoán chính xác dựa trên triệu chứng và khám lâm sàng"
                        error={!formData.assessment ? 'Chẩn đoán là bắt buộc' : undefined}
                    />

                    {/* ICD-10 Code Picker */}
                    <div>
                        <label className="block mb-3 text-sm font-semibold text-slate-700">
                            Mã ICD-10
                            {selectedIcdCodes.length === 0 && (
                                <span className="ml-2 text-red-600 text-xs">* Bắt buộc</span>
                            )}
                        </label>

                        <div className="space-y-2">
                            {aiResults.icdCodes && aiResults.icdCodes.length > 0 ? (
                                aiResults.icdCodes.map((item) => (
                                    <label
                                        key={item.code}
                                        className={`
                      flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer
                      transition-all duration-200
                      ${selectedIcdCodes.includes(item.code)
                                                ? 'border-sky-500 bg-sky-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                            }
                    `}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIcdCodes.includes(item.code)}
                                            onChange={() => toggleIcdCode(item.code)}
                                            className="mt-1 w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                                        />
                                        <div className="flex-1">
                                            <span className="font-mono font-semibold text-sky-600">
                                                {item.code}
                                            </span>
                                            <span className="ml-2 text-slate-700">
                                                {item.description}
                                            </span>
                                        </div>
                                    </label>
                                ))
                            ) : (
                                <p className="text-slate-500 text-sm">Không có mã ICD-10 được đề xuất</p>
                            )}
                        </div>

                        {selectedIcdCodes.length > 0 && (
                            <p className="mt-2 text-sm text-slate-600">
                                Đã chọn: <span className="font-semibold">{selectedIcdCodes.length}</span> mã
                            </p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            label: 'Điều trị',
            value: 'treatment',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            ),
            content: (
                <div className="space-y-5">
                    <Textarea
                        label="Kế hoạch điều trị (Plan)"
                        placeholder="Thuốc, liệu pháp, lời khuyên..."
                        value={formData.plan}
                        onChange={(e) => handleFieldChange('plan', e.target.value)}
                        rows={6}
                        helperText="Chi tiết về thuốc, liều dùng, tái khám và lời khuyên cho bệnh nhân"
                    />

                    {/* AI Medical Advice (Read-only) */}
                    {aiResults.medicalAdvice && (
                        <div className="p-4 bg-sky-50 border-l-4 border-sky-500 rounded">
                            <h4 className="text-sm font-semibold text-sky-900 mb-2">
                                💡 Gợi ý từ AI Medical Expert
                            </h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {aiResults.medicalAdvice}
                            </p>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    return (
        <Card className="mt-6">
            <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            Xét duyệt & Chỉnh sửa bệnh án
                        </h2>
                        <p className="text-slate-600">
                            Xem lại kết quả AI và chỉnh sửa nếu cần trước khi lưu bệnh án chính thức
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleMagicFill}
                        className="flex items-center gap-2 px-4 py-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Phê duyệt nhanh AI
                    </Button>
                </div>
            </div>

            {/* Tabs for SOAP sections */}
            <Tabs tabs={tabs} defaultTab="examination" />

            {/* Save Message */}
            {saveMessage && (
                <div className={`mx-6 mb-4 p-4 rounded-lg ${saveMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                    }`}>
                    <p className={`text-sm flex items-center gap-2 ${saveMessage.type === 'success' ? 'text-green-700' : 'text-red-700'
                        }`}>
                        {saveMessage.type === 'success' ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        )}
                        {saveMessage.text}
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center gap-4 px-6 pb-6">
                <Button
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="px-6 py-3"
                >
                    {isSaving ? 'Đang lưu...' : 'Lưu nháp'}
                </Button>

                <Button
                    variant="primary"
                    onClick={handleFinalSave}
                    disabled={isSaving || !formData.assessment || formData.icdCodes.length === 0}
                    className="px-8 py-3 text-lg font-semibold relative"
                >
                    {isSaving ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Đang lưu...
                        </span>
                    ) : (
                        <>
                            <Save className="w-5 h-5 inline mr-2" />
                            Lưu bệnh án (Final)
                            <span className="ml-3 text-xs bg-white/20 px-2 py-1 rounded font-mono">
                                Ctrl+Enter
                            </span>
                        </>
                    )}
                </Button>
            </div>
        </Card>
    );
}
