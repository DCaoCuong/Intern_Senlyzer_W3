'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import MatchingEngine from '@/components/MatchingEngine';
import SessionInitForm from '@/components/SessionInitForm';
import MedicalRecordReview, { type MedicalRecordData } from '@/components/MedicalRecordReview';
import { Button, Card, Badge } from '@/components/ui';
import type { Session } from '@/lib/services/sessionService';
import { ChevronDown, Check, Loader2 } from 'lucide-react';

interface TranscriptSegment {
    start: number;
    end: number;
    role: string;
    raw_text: string;
    clean_text: string;
}

interface STTResponse {
    success: boolean;
    segments: TranscriptSegment[];
    raw_text: string;
    num_speakers: number;
}

interface AnalysisResult {
    soap: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    };
    icdCodes: string[];
    medicalAdvice: string;
    references: string[];
}

export default function ExaminationPage() {
    const searchParams = useSearchParams();
    const patientId = searchParams.get('patientId');

    // Session Management State  
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [medicalRecordSaved, setMedicalRecordSaved] = useState(false);
    const [isCreatingSession, setIsCreatingSession] = useState(false);

    // Workflow States
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
    const [fullText, setFullText] = useState("");
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [showMatchingEngine, setShowMatchingEngine] = useState(false);
    const [medicalRecordId, setMedicalRecordId] = useState<string | null>(null);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Auto-create session if patientId provided
    useEffect(() => {
        if (patientId && !currentSession && !isCreatingSession) {
            createSessionForPatient(patientId);
        }
    }, [patientId]);

    const createSessionForPatient = async (patientId: string) => {
        setIsCreatingSession(true);
        try {
            const response = await fetch('/api/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId, chiefComplaint: '' })
            });

            const result = await response.json();
            if (result.success) {
                setCurrentSession(result.data);
            } else {
                alert('Không thể tạo phiên khám: ' + result.message);
            }
        } catch (error) {
            console.error('Error creating session:', error);
            alert('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setIsCreatingSession(false);
        }
    };

    const handleSessionCreated = (session: Session) => {
        setCurrentSession(session);
    };

    // Recording functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                sendAudioToSTT(audioBlob);
            };
            setIsRecording(false);
        }
    };

    const sendAudioToSTT = async (audioBlob: Blob) => {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');

        try {
            const response = await fetch('/api/stt', {
                method: 'POST',
                body: formData,
            });

            const data: STTResponse = await response.json();

            if (data.success) {
                setTranscripts(data.segments);
                setFullText(data.raw_text);
                analyzeTranscript(data.raw_text);
            } else {
                alert('Lỗi xử lý âm thanh. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error sending audio to STT:', error);
            alert('Lỗi kết nối với server. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const analyzeTranscript = async (text: string) => {
        setAnalyzing(true);
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: text }),
            });

            const data = await response.json();

            if (data.success) {
                setAnalysisResult(data.data);
            } else {
                alert('Lỗi phân tích. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error analyzing transcript:', error);
            alert('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleMedicalRecordSave = async (data: MedicalRecordData, isFinal: boolean) => {
        if (!currentSession) return;

        try {
            const response = await fetch('/api/medical-record/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSession.id,
                    ...data,
                    status: isFinal ? 'final' : 'draft',
                }),
            });

            const result = await response.json();

            if (result.success) {
                setMedicalRecordId(result.data.id);
                setMedicalRecordSaved(true);

                if (isFinal) {
                    alert('Bệnh án đã được lưu và hoàn tất!');
                } else {
                    alert('Bản nháp đã được lưu!');
                }
            }
        } catch (error) {
            console.error('Error saving medical record:', error);
            alert('Lỗi lưu bệnh án. Vui lòng thử lại.');
        }
    };

    const handleShowComparison = () => {
        setShowMatchingEngine(true);
    };

    // Loading state for session creation
    if (isCreatingSession) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Đang khởi tạo phiên khám...</p>
                </div>
            </div>
        );
    }

    // Show session init form if no session
    if (!currentSession) {
        return <SessionInitForm onSessionCreated={handleSessionCreated} />;
    }

    // Main examination interface - Progressive Vertical Layout
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 pb-20">
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                        Phiên khám bệnh
                    </h1>
                    <p className="text-slate-600 text-lg">Session ID: {currentSession.id}</p>
                </header>

                {/* Step 1: Recording Section */}
                <StepCard
                    stepNumber={1}
                    title="Ghi âm hội thoại"
                    status={transcripts.length > 0 ? 'completed' : isRecording ? 'active' : 'pending'}
                    isExpanded={transcripts.length === 0}
                >
                    <div className="text-center py-8">
                        {!isRecording && transcripts.length === 0 && (
                            <Button
                                variant="primary"
                                onClick={startRecording}
                                className="px-8 py-4 text-lg"
                            >
                                🎙️ Bắt đầu ghi âm
                            </Button>
                        )}
                        {isRecording && (
                            <Button
                                variant="danger"
                                onClick={stopRecording}
                                className="px-8 py-4 text-lg animate-pulse"
                            >
                                ⏹️ Dừng ghi âm
                            </Button>
                        )}
                        {loading && (
                            <div className="flex items-center justify-center gap-2 text-slate-600">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Đang xử lý âm thanh...</span>
                            </div>
                        )}
                    </div>
                </StepCard>

                {/* Step 2: Transcripts */}
                {transcripts.length > 0 && (
                    <StepCard
                        stepNumber={2}
                        title="Hội thoại (Speech-to-Text)"
                        status={analysisResult ? 'completed' : analyzing ? 'active' : 'completed'}
                        isExpanded={!analysisResult}
                    >
                        {analyzing && (
                            <div className="flex items-center gap-2 text-sky-600 mb-4">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="font-medium">Đang phân tích bằng AI...</span>
                            </div>
                        )}
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {transcripts.map((seg, idx) => {
                                const style = seg.role === 'Bác sĩ'
                                    ? { bgColor: 'bg-sky-50', borderColor: 'border-sky-400', textColor: 'text-sky-700', label: '👨‍⚕️ Bác sĩ' }
                                    : { bgColor: 'bg-teal-50', borderColor: 'border-teal-400', textColor: 'text-teal-700', label: '🧑 Bệnh nhân' };

                                return (
                                    <div
                                        key={idx}
                                        className={`p-4 rounded-xl border-l-4 ${style.borderColor} ${style.bgColor} transition-all hover:shadow-md`}
                                    >
                                        <div className={`text-xs font-bold mb-2 ${style.textColor}`}>{style.label}</div>
                                        <div className="text-slate-800 leading-relaxed">{seg.clean_text}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </StepCard>
                )}

                {/* Step 3: AI Analysis & Medical Record Review */}
                {analysisResult && (
                    <StepCard
                        stepNumber={3}
                        title="Kết quả phân tích AI & Review"
                        status={medicalRecordSaved ? 'completed' : 'active'}
                        isExpanded={!showMatchingEngine}
                    >
                        <MedicalRecordReview
                            sessionId={currentSession.id}
                            aiResults={{
                                soap: analysisResult.soap,
                                icdCodes: analysisResult.icdCodes.map(code => {
                                    const [codeNum, ...descParts] = code.split(' - ');
                                    return { code: codeNum, description: descParts.join(' - ') || codeNum };
                                }),
                                medicalAdvice: analysisResult.medicalAdvice,
                            }}
                            onSave={handleMedicalRecordSave}
                            onComparison={handleShowComparison}
                        />
                    </StepCard>
                )}

                {/* Step 4: Comparison (AI vs Doctor) */}
                {showMatchingEngine && analysisResult && (
                    <StepCard
                        stepNumber={4}
                        title="So sánh AI vs Bác sĩ"
                        status="active"
                        isExpanded={true}
                    >
                        <MatchingEngine
                            sessionId={currentSession.id}
                            medicalRecordId={medicalRecordId || undefined}
                            aiSoap={analysisResult.soap}
                            aiIcd={analysisResult.icdCodes}
                            medicalAdvice={analysisResult.medicalAdvice}
                        />
                    </StepCard>
                )}
            </div>
        </div>
    );
}

// Step Card Component
function StepCard({
    stepNumber,
    title,
    status,
    isExpanded,
    children
}: {
    stepNumber: number;
    title: string;
    status: 'pending' | 'active' | 'completed';
    isExpanded: boolean;
    children: React.ReactNode;
}) {
    const [expanded, setExpanded] = useState(isExpanded);

    useEffect(() => {
        setExpanded(isExpanded);
    }, [isExpanded]);

    const statusConfig = {
        pending: { bg: 'bg-slate-100', border: 'border-slate-300', icon: '⏳', text: 'Chờ xử lý' },
        active: { bg: 'bg-sky-50', border: 'border-sky-400', icon: '🔄', text: 'Đang xử lý' },
        completed: { bg: 'bg-green-50', border: 'border-green-400', icon: '✅', text: 'Hoàn thành' },
    };

    const config = statusConfig[status];

    return (
        <Card variant="elevated" padding="none" className={`border-2 ${config.border} ${config.bg} transition-all`}>
            {/* Header */}
            <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/50 transition"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-slate-700">
                        {stepNumber}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                        <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                            <span>{config.icon}</span>
                            <span>{config.text}</span>
                        </p>
                    </div>
                </div>
                <ChevronDown className={`w-6 h-6 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>

            {/* Content */}
            {expanded && (
                <div className="p-6 pt-0 border-t border-slate-200 bg-white">
                    {children}
                </div>
            )}
        </Card>
    );
}
