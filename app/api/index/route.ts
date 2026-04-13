import { loadDocuments } from "@/lib/documents";
import { embedBatch, saveCache } from "@/lib/embeddings";
import type { EmbeddingCache } from "@/lib/embeddings";

const MODEL = "gemini-embedding-2-preview";

const BATCH_SIZE = 20;

export async function POST() {
  const documents = loadDocuments();
  const total = documents.length;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const allEmbeddings: number[][] = [];

      // process in batches
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);

        const embeddings = await embedBatch(batch);
        allEmbeddings.push(...embeddings);

        const indexed = Math.min(i + BATCH_SIZE, total);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ indexed, total, status: "progress" }) + "\n",
          ),
        );

        // small delay between batches to avoid rate limits
        if (i + BATCH_SIZE < total) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // build and save cache
      const cache: EmbeddingCache = {
        documents: documents.map((text, i) => ({
          text,
          embedding: allEmbeddings[i],
        })),
        indexedAt: new Date().toISOString(),
        model: MODEL,
      };
      saveCache(cache);

      controller.enqueue(
        encoder.encode(
          JSON.stringify({ indexed: total, total, status: "complete" }) + "\n",
        ),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
