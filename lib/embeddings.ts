import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const CACHE_PATH = path.join(process.cwd(), 'data', 'embeddings.json');
const MODEL = 'gemini-embedding-001';

export type EmbeddingCache = {
    documents: Array<{
        text: string;
        embedding: number[];
    }>;
    indexedAt: string;
    model: string;
};

// create gemini client
function getClient(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

// embed a search query (RETRIEVAL_QUERY optimizes for matching against documents)
export async function embedText(text: string): Promise<number[]> {
    const ai = getClient();
    const result = await ai.models.embedContent({
        model: MODEL,
        contents: text,
        config: { taskType: 'RETRIEVAL_QUERY' },
    });
    return result.embeddings![0].values!;
}

// embed documents for indexing (RETRIEVAL_DOCUMENT optimizes for being matched against queries)
export async function embedBatch(texts: string[]): Promise<number[][]> {
    const ai = getClient();
    const embeddings: number[][] = [];

    for (const text of texts) {
        const result = await ai.models.embedContent({
            model: MODEL,
            contents: text,
            config: { taskType: 'RETRIEVAL_DOCUMENT' },
        });
        embeddings.push(result.embeddings![0].values!);
    }

    return embeddings;
}

// check if cache exists and is valid
export function cacheExists(): boolean {
    if (!fs.existsSync(CACHE_PATH)) return false;

    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const cache: EmbeddingCache = JSON.parse(raw);
    return cache.documents.length > 0;
}

// load cache from disk
export function loadCache(): EmbeddingCache | null {
    if (!fs.existsSync(CACHE_PATH)) return null;

    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    return JSON.parse(raw) as EmbeddingCache;
}

// save cache to disk
export function saveCache(cache: EmbeddingCache): void {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
}
