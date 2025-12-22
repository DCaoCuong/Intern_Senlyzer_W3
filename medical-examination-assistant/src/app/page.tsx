'use client';
import { useState, useRef, useCallback } from 'react';

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

export default function STTPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'ready' | 'partial' | 'error'>('checking');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check service status on mount
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

  // Check on first render
  useState(() => {
    checkServiceStatus();
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      streamRef.current = stream;

      // Use webm for better compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

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
      console.error('Recording error:', err);
      alert("Vui lòng cấp quyền micro để sử dụng tính năng này.");
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

      if (data.success && data.segments.length > 0) {
        setTranscripts(prev => [...prev, ...data.segments]);
      } else if (data.success && data.raw_text) {
        // Fallback if no segments but has raw text
        setTranscripts(prev => [...prev, {
          start: 0,
          end: 0,
          speaker: 'SPEAKER_00',
          role: 'Người nói',
          raw_text: data.raw_text,
          clean_text: data.raw_text
        }]);
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối hệ thống!");
    } finally {
      setLoading(false);
    }
  };

  // Get speaker style based on LLM-detected role
  const getSpeakerStyle = (role: string) => {
    // Normalize role for comparison
    const normalizedRole = role.toLowerCase().trim();

    if (normalizedRole.includes('bác sĩ') || normalizedRole === 'doctor') {
      return {
        label: '👨‍⚕️ Bác sĩ',
        bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        borderColor: 'border-blue-500',
        textColor: 'text-blue-800',
        labelBg: 'bg-blue-100',
        icon: '🩺'
      };
    } else if (normalizedRole.includes('bệnh nhân') || normalizedRole === 'patient') {
      return {
        label: '🧑 Bệnh nhân',
        bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
        borderColor: 'border-green-500',
        textColor: 'text-green-800',
        labelBg: 'bg-green-100',
        icon: '💬'
      };
    }
    // Default for unknown roles
    return {
      label: '💬 ' + role,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-400',
      textColor: 'text-gray-700',
      labelBg: 'bg-gray-100',
      icon: '💬'
    };
  };

  const getStatusIndicator = () => {
    switch (serviceStatus) {
      case 'ready':
        return { color: 'bg-green-500', text: 'AI Services Ready (Whisper STT + LLM)' };
      case 'error':
        return { color: 'bg-red-500', text: 'Lỗi kết nối dịch vụ' };
      default:
        return { color: 'bg-gray-400', text: 'Đang kiểm tra...' };
    }
  };

  const status = getStatusIndicator();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-8 max-w-4xl mx-auto font-sans">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
              🏥
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">
                MEA - Medical Examination Assistant
              </h1>
              <p className="text-gray-500">
                Hệ thống trợ lý ghi chép và hỗ trợ chẩn đoán lâm sàng
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="mt-4 flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
            <span className={`w-3 h-3 rounded-full ${status.color} animate-pulse`}></span>
            <span className="text-sm text-gray-600">{status.text}</span>
            <button
              onClick={checkServiceStatus}
              className="ml-auto text-xs text-blue-600 hover:underline"
            >
              Kiểm tra lại
            </button>
          </div>
        </header>

        {/* Recording Controls */}
        <div className="flex gap-4 mb-8">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={loading}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-2xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-3 font-medium"
            >
              <span className="w-4 h-4 bg-white rounded-full animate-pulse"></span>
              Bắt đầu ghi âm cuộc hội thoại
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="bg-gradient-to-r from-gray-700 to-gray-900 text-white px-8 py-4 rounded-2xl hover:from-gray-800 hover:to-black transition-all shadow-lg hover:shadow-xl flex items-center gap-3 font-medium"
            >
              <span className="w-4 h-4 bg-red-500 rounded-sm"></span>
              Dừng & Phân tích (Groq AI)
            </button>
          )}

          {transcripts.length > 0 && (
            <button
              onClick={() => setTranscripts([])}
              className="bg-white text-gray-600 px-6 py-4 rounded-2xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm"
            >
              🗑️ Xóa lịch sử
            </button>
          )}
        </div>

        {/* Processing indicator */}
        {loading && (
          <div className="mb-8 p-6 bg-white rounded-2xl shadow-lg border border-blue-100">
            <div className="flex items-center gap-4">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              <div>
                <p className="font-medium text-blue-700">MEA đang xử lý...</p>
                <p className="text-sm text-gray-500">
                  Whisper STT → LLM Role Detection → Medical Fixer
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Display */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
              📝 Cuộc hội thoại
              <span className="text-sm font-normal text-gray-500">
                ({transcripts.length} đoạn)
              </span>
            </h2>
          </div>

          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
            {transcripts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🎤</div>
                <p className="text-gray-400 text-lg">
                  Bấm "Bắt đầu ghi âm" để bắt đầu ghi chép cuộc khám bệnh
                </p>
                <p className="text-gray-300 text-sm mt-2">
                  Hệ thống sẽ tự động phân biệt giọng bác sĩ và bệnh nhân
                </p>
              </div>
            ) : (
              transcripts.map((segment, idx) => {
                const style = getSpeakerStyle(segment.role);
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-xl border-l-4 ${style.borderColor} ${style.bgColor} transition-all hover:shadow-md`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className={`font-bold ${style.textColor} px-3 py-1 rounded-full ${style.labelBg} text-sm`}>
                        {style.label}
                      </span>
                      {segment.start > 0 && (
                        <span className="text-xs text-gray-400 font-mono">
                          {segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s
                        </span>
                      )}
                    </div>

                    {/* Clean text (main display) */}
                    <p className="text-lg text-gray-800 leading-relaxed">
                      {segment.clean_text}
                    </p>

                    {/* Raw text (if different from clean) */}
                    {segment.raw_text !== segment.clean_text && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-400 italic">
                          <span className="font-medium">Raw:</span> "{segment.raw_text}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-400">
          <p>Powered by Groq Whisper + Llama 3</p>
        </footer>
      </div>
    </div>
  );
}