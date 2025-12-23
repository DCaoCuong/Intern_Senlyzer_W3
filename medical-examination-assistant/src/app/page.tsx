'use client';
import { useState, useRef, useCallback } from 'react';
import MatchingEngine from '@/components/MatchingEngine';
import SessionInitForm from '@/components/SessionInitForm';
import MedicalRecordReview, { type MedicalRecordData } from '@/components/MedicalRecordReview';
import { Button, Card, Badge } from '@/components/ui';
import type { Session } from '@/lib/services/sessionService';

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
  icdCodes: string[]; // API returns ["K29.7 - Viêm dạ dày", ...]
  medicalAdvice: string;
  references: string[];
}

export default function STTPage() {
  // Session Management State  
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [medicalRecordSaved, setMedicalRecordSaved] = useState(false);

  // Existing States
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false); // STT loading
  const [analyzing, setAnalyzing] = useState(false); // Agent loading
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [fullText, setFullText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'soap' | 'advice' | 'icd'>('soap');
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'ready' | 'error'>('checking');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check service status
  const checkServiceStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/stt');
      const data = await res.json();
      if (data.services?.groq_stt === 'configured') {
        setServiceStatus('ready');
      } else {
        setServiceStatus('error');
      }
    } catch {
      setServiceStatus('error');
    }
  }, []);

  useState(() => {
    checkServiceStatus();
  });

  // Session created handler
  const handleSessionCreated = (session: Session) => {
    setCurrentSession(session);
    // Reset previous examination data
    setTranscripts([]);
    setFullText("");
    setAnalysisResult(null);
    setMedicalRecordSaved(false);
  };

  const startRecording = async () => {
    setAnalysisResult(null); // Reset prev analysis
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
      });

      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        await sendToSTT(audioBlob);
        chunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert("Vui lòng cấp quyền micro!");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  };

  const sendToSTT = async (blob: Blob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', blob);

    try {
      const res = await fetch('/api/stt', { method: 'POST', body: formData });
      const data: STTResponse = await res.json();

      if (data.success) {
        setTranscripts(data.segments);
        setFullText(data.raw_text);
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi xử lý audio!");
    } finally {
      setLoading(false);
    }
  };

  const runDeepAnalysis = async () => {
    if (!fullText) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: fullText })
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.data);
      } else {
        alert("Lỗi phân tích: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Không thể kết nối tới Agent Orchestrator");
    } finally {
      setAnalyzing(false);
    }
  };

  // Medical record save handler
  const handleMedicalRecordSave = (data: MedicalRecordData, isFinal: boolean) => {
    if (isFinal) {
      setMedicalRecordSaved(true);
    }
  };

  // Helper: Transform ICD codes from string to object format
  // Input: ["K29.7 - Viêm dạ dày", "R10.1 - Đau thượng vị"]
  // Output: [{code: "K29.7", description: "Viêm dạ dày"}, ...]
  const transformIcdCodes = (codes: string[]): Array<{ code: string; description: string }> => {
    return codes.map(codeStr => {
      const parts = codeStr.split(' - ');
      return {
        code: parts[0]?.trim() || codeStr,
        description: parts[1]?.trim() || ''
      };
    });
  };

  // Helper for styles
  const getSpeakerStyle = (role: string) => {
    const normalizedRole = role.toLowerCase().trim();
    if (normalizedRole.includes('bác sĩ') || normalizedRole === 'doctor') {
      return { label: '👨‍⚕️ Bác sĩ', bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50', borderColor: 'border-blue-500', textColor: 'text-blue-800', labelBg: 'bg-blue-100' };
    } else if (normalizedRole.includes('bệnh nhân') || normalizedRole === 'patient') {
      return { label: '🧑 Bệnh nhân', bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50', borderColor: 'border-green-500', textColor: 'text-green-800', labelBg: 'bg-green-100' };
    }
    return { label: '💬 ' + role, bgColor: 'bg-gray-50', borderColor: 'border-gray-400', textColor: 'text-gray-700', labelBg: 'bg-gray-100' };
  };

  // ========== RENDER ==========

  // Phase 1: Session Initialization
  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 pb-20">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <header className="mb-10 text-center animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
              MEA - Medical Assistant
            </h1>
            <p className="text-slate-600 text-lg">Trợ lý y khoa thông minh • Multi-Agent System</p>
          </header>

          <SessionInitForm onSessionCreated={handleSessionCreated} />
        </div>
      </div>
    );
  }

  // Phase 2-4: Examination Flow
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 pb-20">
      <div className="p-6 md:p-8 max-w-7xl mx-auto">

        {/* Header */}
        <header className="mb-10 animate-fade-in">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                MEA - Medical Assistant
              </h1>
              <p className="text-slate-600 text-lg">Trợ lý y khoa thông minh • Multi-Agent System</p>
              {/* Session Info */}
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <span className="font-semibold">Bệnh nhân:</span>
                <span>{currentSession.patientName}</span>
                <Badge variant="info" size="sm">{currentSession.status}</Badge>
              </div>
            </div>
            <Badge
              variant={serviceStatus === 'ready' ? 'success' : 'error'}
              size="lg"
              dot
            >
              {serviceStatus === 'ready' ? 'System Ready' : 'Service Error'}
            </Badge>
          </div>
        </header>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-8 animate-slide-up">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={loading || analyzing || medicalRecordSaved}
              variant="primary"
              size="lg"
            >
              🎙️ Bắt đầu ghi âm
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="danger"
              size="lg"
            >
              ⏹️ Dừng & Gỡ băng
            </Button>
          )}

          {transcripts.length > 0 && !isRecording && (
            <Button
              onClick={runDeepAnalysis}
              disabled={analyzing}
              isLoading={analyzing}
              variant="secondary"
              size="lg"
            >
              {analyzing ? 'Agents đang làm việc...' : '🧠 Phân tích chuyên sâu (AI Agents)'}
            </Button>
          )}
        </div>

        {/* Loading States */}
        {loading && (
          <Card variant="elevated" className="mb-6 bg-sky-50 border-sky-200 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-semibold text-sky-800">📝 Đang chuyển đổi giọng nói thành văn bản...</span>
            </div>
          </Card>
        )}
        {analyzing && (
          <Card variant="elevated" className="mb-6 bg-teal-50 border-teal-200 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-bold text-teal-800 text-lg">Hệ thống Multi-Agent đang hoạt động</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-8">
              <div className="flex items-start gap-2">
                <span className="text-teal-600">•</span>
                <span className="text-sm text-teal-700">Scribe Agent đang tóm tắt bệnh án SOAP</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600">•</span>
                <span className="text-sm text-teal-700">Medical Expert đang tra cứu Knowledge Base (RAG)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600">•</span>
                <span className="text-sm text-teal-700">ICD-10 Agent đang gán mã bệnh lý</span>
              </div>
            </div>
          </Card>
        )}

        {/* MAIN LAYOUT: Vertical Stack - Full Width Blocks */}
        <div className="space-y-8">

          {/* Block 1: Transcript */}
          <Card variant="elevated" padding="none" className="animate-fade-in">
            <div className="p-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  📄 Chi tiết cuộc hội thoại
                </h3>
                <Badge variant="info" size="sm">{transcripts.length} segments</Badge>
              </div>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3 smooth-scroll"
            >
              {transcripts.length === 0 ? (
                <div className="text-center py-24">
                  <div className="text-6xl mb-4 opacity-40">💬</div>
                  <p className="text-slate-400 font-medium">Chưa có dữ liệu hội thoại</p>
                </div>
              ) : (
                transcripts.map((seg, idx) => {
                  const style = getSpeakerStyle(seg.role);
                  return (
                    <div key={idx} className={`p-4 rounded-xl border-l-4 ${style.borderColor} ${style.bgColor} transition-all hover:shadow-md animate-slide-up`} style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className={`text-xs font-bold mb-2 ${style.textColor}`}>{style.label}</div>
                      <div className="text-slate-800 leading-relaxed">{seg.clean_text}</div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Block 2: Analysis Results (SOAP, Advice, ICD) */}
          {!analysisResult ? (
            <Card variant="elevated" padding="lg" className="text-center animate-scale-in">
              <div className="text-7xl mb-6">🩺</div>
              <h3 className="text-2xl font-bold text-slate-700 mb-3">Chưa có kết quả phân tích</h3>
              <p className="text-slate-500">Nhấn nút "Phân tích chuyên sâu" để kích hoạt AI Agents.</p>
            </Card>
          ) : (
            <>
              <Card variant="elevated" padding="none" className="overflow-hidden animate-fade-in">
                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50">
                  <button onClick={() => setActiveTab('soap')}
                    className={`flex-1 py-4 px-4 font-bold text-sm transition-all ${activeTab === 'soap' ? 'text-sky-600 border-b-3 border-sky-600 bg-white -mb-px shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}>
                    📝 Bệnh án SOAP
                  </button>
                  <button onClick={() => setActiveTab('advice')}
                    className={`flex-1 py-4 px-4 font-bold text-sm transition-all ${activeTab === 'advice' ? 'text-teal-600 border-b-3 border-teal-600 bg-white -mb-px shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}>
                    💡 Gợi ý & RAG
                  </button>
                  <button onClick={() => setActiveTab('icd')}
                    className={`flex-1 py-4 px-4 font-bold text-sm transition-all ${activeTab === 'icd' ? 'text-orange-600 border-b-3 border-orange-600 bg-white -mb-px shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}>
                    🏷️ Mã ICD-10
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 min-h-[500px] bg-white">

                  {activeTab === 'soap' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-4 bg-sky-50 rounded-xl border-l-4 border-sky-500">
                        <span className="font-bold text-sky-700 block mb-2 text-sm uppercase tracking-wide">Subjective (Bệnh sử)</span>
                        <p className="text-slate-800 leading-relaxed">{analysisResult.soap.subjective}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-xl border-l-4 border-emerald-500">
                        <span className="font-bold text-emerald-700 block mb-2 text-sm uppercase tracking-wide">Objective (Thực thể)</span>
                        <p className="text-slate-800 leading-relaxed">{analysisResult.soap.objective}</p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-xl border-l-4 border-amber-500">
                        <span className="font-bold text-amber-700 block mb-2 text-sm uppercase tracking-wide">Assessment (Chẩn đoán)</span>
                        <p className="text-slate-800 leading-relaxed">{analysisResult.soap.assessment}</p>
                      </div>
                      <div className="p-4 bg-rose-50 rounded-xl border-l-4 border-rose-500">
                        <span className="font-bold text-rose-700 block mb-2 text-sm uppercase tracking-wide">Plan (Điều trị)</span>
                        <p className="text-slate-800 whitespace-pre-line leading-relaxed">{analysisResult.soap.plan}</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'advice' && (
                    <div className="animate-fade-in">
                      <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
                        {analysisResult.medicalAdvice}
                      </div>
                      {analysisResult.references.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-200">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wide">📚 Nguồn dữ liệu (RAG References)</p>
                          <div className="flex gap-2 flex-wrap">
                            {analysisResult.references.map((ref, i) => (
                              <Badge key={i} variant="secondary" size="sm">
                                {ref}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'icd' && (
                    <div className="animate-fade-in">
                      <h4 className="font-bold text-slate-700 mb-5 text-lg">Mã chẩn đoán đề xuất</h4>
                      <div className="space-y-3">
                        {analysisResult.icdCodes.map((codeStr, i) => {
                          const parts = codeStr.split(' - ');
                          const code = parts[0]?.trim() || codeStr;
                          const description = parts[1]?.trim() || '';
                          return (
                            <div key={i} className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl border-l-4 border-orange-500 hover:shadow-md transition-all hover:-translate-y-0.5">
                              <span className="text-3xl">🏷️</span>
                              <div>
                                <span className="font-mono font-bold text-orange-800 text-lg">{code}</span>
                                {description && <p className="text-slate-600 text-sm mt-1">{description}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-400 mt-10 italic text-center bg-slate-50 p-4 rounded-lg">
                        * Mã ICD-10 được gợi ý tự động bởi AI, vui lòng kiểm tra lại.
                      </p>
                    </div>
                  )}

                </div>
              </Card>

              {/* Medical Record Review Form */}
              <MedicalRecordReview
                sessionId={currentSession.id}
                aiResults={{
                  soap: analysisResult.soap,
                  icdCodes: transformIcdCodes(analysisResult.icdCodes as string[]),
                  medicalAdvice: analysisResult.medicalAdvice,
                }}
                onSave={handleMedicalRecordSave}
              />

              {/* Matching Engine - Only show after medical record is saved */}
              {medicalRecordSaved && (
                <MatchingEngine
                  sessionId={currentSession.id}
                  aiSoap={analysisResult.soap}
                  aiIcd={analysisResult.icdCodes.map(codeStr => codeStr.split(' - ')[0]?.trim() || codeStr)}
                  medicalAdvice={analysisResult.medicalAdvice}
                />
              )}
            </>
          )}

        </div>

      </div>

      <footer className="mt-16 pt-8 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-sm">
          Powered by <span className="font-semibold text-sky-600">LangGraph</span> + <span className="font-semibold text-teal-600">Groq Llama 3</span> + <span className="font-semibold text-cyan-600">Google Gemini Embeddings</span>
        </p>
      </footer>
    </div>
  );
}