import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";
import fs from "fs/promises";
import path from "path";


const VECTOR_STORE_PATH = path.join(process.cwd(), "data", "vector_store", "db.json");
const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "data", "knowledge_base", "protocols");

export class MedicalVectorStore {
    private store: MemoryVectorStore | null = null;
    public readonly embeddings: GoogleGenerativeAIEmbeddings;

    constructor() {
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error("Missing GOOGLE_API_KEY environment variable");
        }

        this.embeddings = new GoogleGenerativeAIEmbeddings({
            modelName: "text-embedding-004",
            apiKey: process.env.GOOGLE_API_KEY,
        });
    }

    // Load vector store from disk or create new one
    async initialize() {
        if (this.store) return;

        try {
            // Try loading from file
            const fileData = await fs.readFile(VECTOR_STORE_PATH, "utf-8");
            const json = JSON.parse(fileData);

            // Rehydrate MemoryVectorStore from JSON
            this.store = await MemoryVectorStore.fromTexts(
                json.texts,
                json.metadatas,
                this.embeddings
            );
            console.log(" Vector Store loaded from disk.");
        } catch (error) {
            console.log(" No existing vector store found. Creating new one...");
            // Empty store
            this.store = new MemoryVectorStore(this.embeddings);

            // Seed data immediately if empty
            await this.seed();
        }
    }

    // Read markdown files, embed, and save to disk
    async seed() {
        console.log(" Seeding database from knowledge base...");

        // Read all .md files
        // Note: glob usage without importing might fail if not installed types, 
        // trying simple fs.readdir for now to avoid extra deps
        const files = await fs.readdir(KNOWLEDGE_BASE_PATH);
        const docs: Document[] = [];

        for (const file of files) {
            if (!file.endsWith(".md")) continue;

            const filePath = path.join(KNOWLEDGE_BASE_PATH, file);
            const content = await fs.readFile(filePath, "utf-8");

            docs.push(new Document({
                pageContent: content,
                metadata: { source: file }
            }));
        }

        if (docs.length === 0) {
            console.warn(" No documents found in knowledge base.");
            return;
        }

        // Split text
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const splitDocs = await splitter.splitDocuments(docs);

        // Create store
        this.store = await MemoryVectorStore.fromDocuments(splitDocs, this.embeddings);

        // Save to disk (Custom serialization for MemoryVectorStore)
        // MemoryVectorStore stores docs in `memoryVectors` property but it's private.
        // Workaround: We can't easily serialize MemoryVectorStore without using its internal structure.
        // Better way for this demo: Just use fromDocuments every time on startup (Fast enough for small data)
        // OR: Use a simple compatible format.

        // For this demo (small data), we will RE-INDEX on startup if file doesn't exist.
        // This simplifies dependencies (no need for serialization logic)
        console.log(` Database seeded with ${splitDocs.length} chunks.`);
    }

    getRetriever() {
        if (!this.store) throw new Error("Vector Store not initialized");
        return this.store.asRetriever({ k: 3 }); // Retrieve top 3 relevant chunks
    }
}

// Singleton instance with lazy initialization
let medicalVectorStoreInstance: MedicalVectorStore | null = null;

export function getMedicalVectorStore(): MedicalVectorStore {
    if (!medicalVectorStoreInstance) {
        medicalVectorStoreInstance = new MedicalVectorStore();
    }
    return medicalVectorStoreInstance;
}
