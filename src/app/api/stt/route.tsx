import { NextRequest, NextResponse } from 'next/server';
import Groq from "groq-sdk";

const groqLocal = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface TranscriptSegment {
    start: number;
    end: number;
    text: string;
}

interface ProcessedSegment {
    start: number;
    end: number;
    role: string;
    raw_text: string;
    clean_text: string;
}

/**
 * Gọi Groq Whisper API để chuyển audio thành text
 */
async function transcribeWithGroq(audioBlob: Blob): Promise<{ text: string; segments: TranscriptSegment[] }> {
    const groqFormData = new FormData();
    groqFormData.append('file', audioBlob, 'recording.wav');
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('language', 'vi');
    groqFormData.append('response_format', 'verbose_json');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        body: groqFormData,
    });

    if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
        text: data.text || '',
        segments: data.segments || []
    };
}

/**
 * Chuyển transcription segments thành format chuẩn cho LLM role detection
 */
function prepareSegmentsForRoleDetection(
    transcription: { text: string; segments: TranscriptSegment[] }
): { role: string; raw_text: string; start: number; end: number }[] {

    if (transcription.segments.length > 0) {
        return transcription.segments.map(seg => ({
            role: 'Người nói', // Placeholder - LLM sẽ xác định role thực tế
            raw_text: seg.text,
            start: seg.start,
            end: seg.end
        }));
    }

    // Fallback nếu không có segments
    if (transcription.text) {
        return [{
            role: 'Người nói',
            raw_text: transcription.text,
            start: 0,
            end: 0
        }];
    }

    return [];
}

import { groq, GROQ_MODEL_STANDARD } from '@/lib/agents/models';

/**
 * Sử dụng LLM để phân tích nội dung và xác định vai trò người nói
 * Dựa vào ngữ cảnh của câu nói để đoán ai là Bác sĩ, ai là Bệnh nhân
 */
async function detectSpeakerRoleByContent(
    segments: { role: string; raw_text: string; start: number; end: number }[]
): Promise<{ role: string; raw_text: string; start: number; end: number }[]> {

    if (segments.length === 0) return segments;

    // Tạo prompt với tất cả segments
    const conversationText = segments
        .map((seg, i) => `[${i}] "${seg.raw_text.trim()}"`)
        .join('\n');

    const prompt = `Bạn là chuyên gia phân tích hội thoại y khoa tiếng Việt.
Dưới đây là transcript cuộc khám bệnh. Hãy xác định vai trò người nói cho từng đoạn.

QUY TẮC XÁC ĐỊNH VAI TRÒ:
- BÁC SĨ: Hỏi triệu chứng, hỏi bệnh sử, đưa ra chẩn đoán, kê đơn thuốc, hướng dẫn điều trị
- BỆNH NHÂN: Mô tả triệu chứng ("tôi bị...", "tôi thấy..."), xưng "chào bác sĩ", trả lời câu hỏi về bản thân

MANH MỐI QUAN TRỌNG:
- Ai nói "Chào bác sĩ" → BỆNH NHÂN
- Ai hỏi "bạn/anh/chị có triệu chứng gì?" → BÁC SĨ  
- Ai mô tả "tôi đau...", "tôi bị..." → BỆNH NHÂN
- Ai hỏi "có sốt không?", "uống thuốc gì chưa?" → BÁC SĨ

HỘI THOẠI:
${conversationText}

Trả về CHÍNH XÁC định dạng JSON array sau, KHÔNG có text khác:
[{"index": 0, "role": "Bác sĩ"}, {"index": 1, "role": "Bệnh nhân"}, ...]`;

    try {
        console.log(' Analyzing speaker roles with Groq...');

        // Groq API call
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: GROQ_MODEL_STANDARD,
            temperature: 0.1
        });

        const responseText = completion.choices[0]?.message?.content || '';
        console.log('LLM response:', responseText.substring(0, 200));

        // Start checking for JSON
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.warn('LLM did not return valid JSON, keeping original roles');
            return segments;
        }

        const roleAssignments: { index: number; role: string }[] = JSON.parse(jsonMatch[0]);

        // Update segments với role mới từ LLM
        const updatedSegments = segments.map((seg, i) => {
            const assignment = roleAssignments.find(r => r.index === i);
            if (assignment) {
                console.log(`   [${i}] ${seg.role} → ${assignment.role}`);
                return { ...seg, role: assignment.role };
            }
            return seg;
        });

        console.log('LLM role detection completed');
        return updatedSegments;

    } catch (error) {
        console.error('LLM role detection error:', error);
        // Fallback: keep original roles
        return segments;
    }
}

/**
 * Sử dụng Groq (OpenAI GPT-OSS-120B) để sửa lỗi thuật ngữ y khoa nhanh chóng
 * CHỈ sửa lỗi chính tả, KHÔNG thêm nội dung mới
 */
async function fixMedicalText(text: string): Promise<string> {
    if (!text || text.trim().length === 0) return text;

    try {
        // Groq API call with OpenAI model
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Bạn là chuyên gia hiệu chỉnh văn bản y khoa tiếng Việt.
NHIỆM VỤ: Chỉ sửa lỗi chính tả và phát âm sai trong đoạn văn được chuyển từ giọng nói.

QUY TẮC BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG thêm nội dung mới
2. TUYỆT ĐỐI KHÔNG xóa bớt nội dung
3. TUYỆT ĐỐI KHÔNG viết lại câu
4. Chỉ sửa lỗi phát âm thường gặp:
   - "đau thượng vịt" → "đau thượng vị"
   - "bị sụp" → "bị sốt"  
   - "ăn chích" → "ăn kiêng"
   - "tiêu chuẩn" → "triệu chứng"
5. Giữ nguyên số từ và ý nghĩa gốc
6. Trả về CHÍNH XÁC đoạn văn gốc với lỗi đã sửa, KHÔNG trả lời hay giải thích thêm.`
                },
                { role: "user", content: text }
            ],
            model: GROQ_MODEL_STANDARD,
            temperature: 0.05
        });

        // Add artificial delay to respect rate limits if calling in loop
        await new Promise(resolve => setTimeout(resolve, 200));

        return completion.choices[0]?.message?.content || text;
    } catch (error) {
        console.error('Medical fixer error:', error);
        return text;
    }
}

/**
 * Main API Handler - Xử lý audio và trả về transcript với speaker labels
 * Flow: Whisper STT → LLM Role Detection → Medical Text Fixer
 */
export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
        return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    try {
        console.log(` Received audio: ${file.size} bytes`);

        // Step 1: Whisper STT - Chuyển audio thành text
        console.log(' Running Whisper STT...');
        const transcription = await transcribeWithGroq(file);
        console.log(` Transcription: ${transcription.text.substring(0, 100)}...`);
        console.log(` Segments count: ${transcription.segments.length}`);

        // Nếu không có text, trả về empty
        if (!transcription.text || transcription.text.trim().length === 0) {
            return NextResponse.json({
                success: true,
                segments: [],
                raw_text: "",
                num_speakers: 0
            });
        }

        // Step 2: Prepare segments for role detection
        const preparedSegments = prepareSegmentsForRoleDetection(transcription);
        console.log(` Prepared segments: ${preparedSegments.length}`);

        // Step 3: LLM Role Detection - Phân tích nội dung để xác định Bác sĩ/Bệnh nhân
        const segmentsWithRoles = await detectSpeakerRoleByContent(preparedSegments);

        // Step 4: Medical Text Fixer - Sửa lỗi thuật ngữ y khoa
        console.log(' Running Medical Text Fixer...');
        const processedSegments: ProcessedSegment[] = [];
        for (const seg of segmentsWithRoles) {
            const clean_text = await fixMedicalText(seg.raw_text);
            processedSegments.push({
                ...seg,
                clean_text
            });
        }

        console.log('Processing complete!');

        return NextResponse.json({
            success: true,
            segments: processedSegments,
            raw_text: transcription.text,
            num_speakers: 2 // Assumed 2 speakers (Doctor + Patient)
        });

    } catch (error) {
        console.error(' Processing error:', error);
        return NextResponse.json(
            { error: "Lỗi xử lý hệ thống", details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * Health check endpoint
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        services: {
            groq_stt: process.env.GROQ_API_KEY ? 'configured' : 'missing_key',
            llm_role_detection: 'ready',
            medical_fixer: 'ready'
        },
        note: 'Using LLM Context Analysis for speaker role detection'
    });
}