'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { SoapNote, ComparisonResult } from '@/lib/agents/comparison';
import { ArrowRight, Check, AlertTriangle, FileText, Activity, Calculator, Clipboard, PillBottle, Target } from 'lucide-react';
import clsx from 'clsx';

interface MatchingEngineProps {
    sessionId: string;
    medicalRecordId?: string;
    aiSoap: SoapNote;
    aiIcd: string[];
    medicalAdvice: string;
}

interface DoctorInputForm {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    icdCodes: string; // Comma separated for simpler input
    notes: string;
}

export default function MatchingEngine({ sessionId, medicalRecordId, aiSoap, aiIcd, medicalAdvice }: MatchingEngineProps) {
    const [mode, setMode] = useState<'input' | 'analyzing' | 'result'>('input');
    const [comparison, setComparison] = useState<ComparisonResult | null>(null);

    const { register, handleSubmit } = useForm<DoctorInputForm>({
        defaultValues: {
            subjective: aiSoap.subjective,
            objective: aiSoap.objective,
            assessment: aiSoap.assessment,
            plan: aiSoap.plan,
            icdCodes: aiIcd.join(', '),
            notes: ''
        }
    });

    const onSubmit = async (data: DoctorInputForm) => {
        setMode('analyzing');
        try {
            // Prepare payload
            const payload = {
                sessionId,
                medicalRecordId,
                aiResults: {
                    soap: aiSoap,
                    icdCodes: aiIcd,
                    medicalAdvice
                },
                doctorResults: {
                    soap: {
                        subjective: data.subjective,
                        objective: data.objective,
                        assessment: data.assessment,
                        plan: data.plan
                    },
                    icdCodes: data.icdCodes.split(',').map(c => c.trim()).filter(c => c),
                    treatment: { medications: [], tests: [], followUp: '' } // Simplified for MVP
                }
            };

            const res = await fetch('/api/comparison/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                setComparison(result.analysis);
                setMode('result');
            } else {
                alert('Lỗi phân tích: ' + result.error);
                setMode('input');
            }
        } catch (error) {
            console.error(error);
            alert('Không thể kết nối đến server');
            setMode('input');
        }
    };

    if (mode === 'input') {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-800 font-bold">
                        <Activity className="w-5 h-5" />
                        <span>👨‍⚕️ Matching Engine: Bác sĩ thẩm định</span>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-gray-500 mb-6 text-sm">
                        Vui lòng xem xét và chỉnh sửa kết quả từ AI để phản ánh đúng chẩn đoán chuyên môn của bạn.
                        Hệ thống sẽ so sánh để học hỏi và đánh giá độ chính xác.
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Subjective */}
                        <div className="space-y-2 border-l-4 border-l-blue-500 pl-4">
                            <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-600" />
                                Subjective (Bệnh sử)
                            </label>
                            <textarea
                                {...register('subjective')}
                                rows={8}
                                placeholder="Triệu chứng chủ quan mà bệnh nhân tự kể..."
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-blue-50/30 transition"
                            />
                        </div>

                        {/* Objective */}
                        <div className="space-y-2 border-l-4 border-l-green-500 pl-4">
                            <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <Clipboard className="w-4 h-4 text-green-600" />
                                Objective (Khám lâm sàng)
                            </label>
                            <textarea
                                {...register('objective')}
                                rows={8}
                                placeholder="Kết quả khám lâm sàng, các dấu hiệu khách quan..."
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm bg-green-50/30 transition"
                            />
                        </div>

                        {/* Assessment */}
                        <div className="space-y-2 border-l-4 border-l-amber-500 pl-4">
                            <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-amber-600" />
                                Assessment (Chẩn đoán)
                            </label>
                            <textarea
                                {...register('assessment')}
                                rows={6}
                                placeholder="Chẩn đoán bệnh, đánh giá tình trạng..."
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm bg-amber-50/30 transition font-medium"
                            />
                        </div>

                        {/* ICD Codes */}
                        <div className="space-y-2 border-l-4 border-l-teal-500 pl-4">
                            <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <Target className="w-4 h-4 text-teal-600" />
                                Mã ICD-10 (phân cách bằng dấu phẩy)
                            </label>
                            <input
                                {...register('icdCodes')}
                                placeholder="Ví dụ: K29.5, B98.2, J06.9"
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-mono bg-teal-50/30 transition"
                            />
                        </div>

                        {/* Plan */}
                        <div className="space-y-2 border-l-4 border-l-purple-500 pl-4">
                            <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <PillBottle className="w-4 h-4 text-purple-600" />
                                Plan (Điều trị)
                            </label>
                            <textarea
                                {...register('plan')}
                                rows={8}
                                placeholder="Kế hoạch điều trị, đơn thuốc, xét nghiệm..."
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm bg-purple-50/30 transition"
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button type="submit"
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg flex items-center gap-2 font-bold">
                                <Calculator className="w-5 h-5" />
                                So sánh & Phân tích
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (mode === 'analyzing') {
        return (
            <div className="mt-8 p-12 bg-white rounded-2xl shadow-sm border border-gray-200 text-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-lg font-bold text-gray-800">Matching Engine đang phân tích...</h3>
                <p className="text-gray-500">Đang so sánh ngữ nghĩa và tính toán độ chính xác</p>
            </div>
        );
    }

    // Result View
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mt-8 animate-fade-in">
            {/* Header Result */}
            <div className="bg-gray-900 text-white p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Activity className="w-6 h-6 text-green-400" />
                            Kết quả Đối chiếu (AI vs Doctor)
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Đánh giá độ chính xác của AI dựa trên quyết định của bác sĩ</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-green-400">{comparison?.matchScore}%</div>
                        <div className="text-xs uppercase tracking-wider font-bold text-gray-500">Match Score</div>
                    </div>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Detailed Scores */}
                <div className="space-y-6">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Chi tiết điểm số (SOAP Semantic)
                    </h3>

                    <div className="space-y-4">
                        <ScoreBar label="Subjective (Bệnh sử)" score={comparison?.soapMatch.subjective || 0} />
                        <ScoreBar label="Objective (Thực thể)" score={comparison?.soapMatch.objective || 0} />
                        <ScoreBar label="Assessment (Chẩn đoán)" score={comparison?.soapMatch.assessment || 0} />
                        <ScoreBar label="Plan (Điều trị)" score={comparison?.soapMatch.plan || 0} />
                    </div>
                </div>

                {/* Right: Insights & Differences */}
                <div className="space-y-6">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Phân tích sai lệch
                    </h3>

                    {comparison?.differences && comparison.differences.length > 0 ? (
                        <ul className="space-y-3">
                            {comparison.differences.map((diff, i) => (
                                <li key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg text-sm text-red-800 border border-red-100">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{diff}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            Tuyệt vời! AI đồng nhất cao với bác sĩ.
                        </div>
                    )}

                    <div className="mt-6">
                        <h4 className="font-bold text-gray-700 text-sm mb-2">ICD-10 Matching</h4>
                        <div className="flex flex-wrap gap-2">
                            {comparison?.icdMatch.exactMatches.map(code => (
                                <span key={code} className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded flex items-center gap-1">
                                    {code} <Check className="w-3 h-3" />
                                </span>
                            ))}
                            {comparison?.icdMatch.aiOnly.map(code => (
                                <span key={code} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded flex items-center gap-1">
                                    AI: {code}
                                </span>
                            ))}
                            {comparison?.icdMatch.doctorOnly.map(code => (
                                <span key={code} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded flex items-center gap-1">
                                    Dr: {code}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 p-4 text-center border-t border-gray-200">
                <button onClick={() => setMode('input')} className="text-indigo-600 font-bold hover:underline text-sm">
                    ← Chỉnh sửa & So sánh lại
                </button>
            </div>
        </div>
    );
}

function ScoreBar({ label, score }: { label: string, score: number }) {
    let color = 'bg-red-500';
    if (score >= 80) color = 'bg-green-500';
    else if (score >= 60) color = 'bg-yellow-500';

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="font-bold text-gray-800">{score}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${color} transition-all duration-1000`} style={{ width: `${score}%` }}></div>
            </div>
        </div>
    );
}
