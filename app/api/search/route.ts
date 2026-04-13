import { NextRequest, NextResponse } from 'next/server';
import { loadCache, embedText } from '@/lib/embeddings';
import { cosineSimilarity, rankResults } from '@/lib/similarity';

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q')?.trim();

    // handle empty/missing query
    if (!query) {
        return NextResponse.json({
            results: [],
            message: 'Please enter a search query.',
        });
    }

    // check if indexed
    const cache = loadCache();
    if (!cache) {
        return NextResponse.json(
            { error: 'Documents not indexed yet. Please index first.' },
            { status: 400 },
        );
    }

    const start = performance.now();

    // embed query
    const queryEmbedding = await embedText(query);

    // compute similarity against all documents
    const scores = cache.documents.map((doc) => ({
        text: doc.text,
        score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // rank with dynamic threshold
    const { results, threshold } = rankResults(scores);

    const queryTime = Math.round(performance.now() - start);

    return NextResponse.json({
        results,
        meta: {
            queryTime,
            totalDocuments: cache.documents.length,
            threshold: threshold.cutoff,
            mean: threshold.mean,
            stddev: threshold.stddev,
        },
    });
}
