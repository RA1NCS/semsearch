import { NextResponse } from 'next/server';
import { loadDocuments } from '@/lib/documents';
import { cacheExists, loadCache } from '@/lib/embeddings';

export async function GET() {
    const documents = loadDocuments();
    const hasCache = cacheExists();

    let embeddingCount = 0;
    if (hasCache) {
        const cache = loadCache();
        embeddingCount = cache?.documents.length ?? 0;
    }

    return NextResponse.json({
        indexed: hasCache && embeddingCount === documents.length,
        documentCount: documents.length,
        embeddingCount,
    });
}
