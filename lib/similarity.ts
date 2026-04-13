// cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 0;
    return dot / denom;
}

// dynamic threshold from score distribution
export function computeThreshold(scores: number[]): {
    mean: number;
    stddev: number;
    cutoff: number;
} {
    if (scores.length === 0) return { mean: 0, stddev: 0, cutoff: 0 };

    const n = scores.length;
    const mean = scores.reduce((sum, s) => sum + s, 0) / n;
    const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / n;
    const stddev = Math.sqrt(variance);

    // mean + 1 stddev captures the top tail of the distribution
    const cutoff = mean + stddev;

    return { mean, stddev, cutoff };
}

export type ScoredDocument = {
    text: string;
    score: number;
};

export type RankedResult = {
    text: string;
    score: number;
    rank: number;
};

export type ThresholdMeta = {
    mean: number;
    stddev: number;
    cutoff: number;
};

// rank and filter results using dynamic threshold
export function rankResults(
    scores: ScoredDocument[],
    maxResults: number = 15,
): {
    results: RankedResult[];
    threshold: ThresholdMeta;
} {
    const allScores = scores.map((s) => s.score);
    const threshold = computeThreshold(allScores);

    const results = scores
        .filter((s) => s.score > threshold.cutoff)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
        .map((s, i) => ({ text: s.text, score: s.score, rank: i + 1 }));

    return { results, threshold };
}
