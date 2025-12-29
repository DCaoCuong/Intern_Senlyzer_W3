import Groq from "groq-sdk";

// === GROQ MODELS (OpenAI via Groq API) ===
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model assignments
export const GROQ_MODEL_STANDARD = "openai/gpt-oss-120b"; // For most tasks
export const GROQ_MODEL_EXPERT = "openai/gpt-oss-20b"; // For complex reasoning (Medical Expert)
