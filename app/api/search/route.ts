import { NextRequest, NextResponse } from "next/server";
import { loadCache, embedText } from "@/lib/embeddings";
import { cosineSimilarity, rankResults } from "@/lib/similarity";

// simple in-memory rate limiter: 10 req/min per IP
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  // rate limiting
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        error:
          "Rate limit exceeded. Please wait a minute before searching again.",
      },
      { status: 429 },
    );
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();

  // handle empty/missing query
  if (!query) {
    return NextResponse.json({
      results: [],
      message: "Please enter a search query.",
    });
  }

  // check if indexed
  const cache = loadCache();
  if (!cache) {
    return NextResponse.json(
      { error: "Documents not indexed yet. Please index first." },
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
