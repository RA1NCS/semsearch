# Semantic Text Search

Semantic search over 146 documents using Gemini embeddings. Queries match by meaning, not keywords. All ranking logic runs in code — the LLM only produces vectors.

## Setup

**Prerequisites:** Node.js 22+, pnpm, [Gemini API key](https://aistudio.google.com/apikey)

```bash
pnpm install
```

```
# .env
GEMINI_API_KEY=your_key_here
```

```bash
pnpm dev          # http://localhost:3000
make docker       # docker compose up --build
make test         # vitest run
```

## How it works

### Dataset

146 single-sentence documents in `data/documents/` (one `.txt` per doc), spanning 15 categories: animals, programming, sports, food, science, history, geography, music, medicine, space, math, literature, architecture, marine life, daily life.

### Indexing

Triggered by the "Start Indexing" button. Reads all 146 files → embeds in batches of 20 using `RETRIEVAL_DOCUMENT` task type → streams progress to the UI via SSE → writes vectors to `data/embeddings.json`. Cache survives restarts; re-indexing overwrites it.

### Search

Query is embedded with `RETRIEVAL_QUERY` task type → cosine similarity against all 146 cached vectors → dynamic threshold filters results → up to 15 ranked results returned.

**Asymmetric task types are required.** Using `RETRIEVAL_DOCUMENT` for docs and `RETRIEVAL_QUERY` for queries is what makes Gemini embeddings work for retrieval. Without it, scores collapse to 0.03–0.05 (effectively random). With it: 0.60–0.75.

### Dynamic threshold

`cutoff = mean(scores) + 1 × stddev(scores)`

Adapts to the score distribution without a fixed top-K:

- Focused query → scores bimodal → threshold sits between clusters → tight result set
- Broad query → high variance → more results pass
- Nonsense query → all scores near-uniform, near-zero stddev → cutoff ≈ max → zero results

### API

| Route            | Method | Description                                                                  |
| ---------------- | ------ | ---------------------------------------------------------------------------- |
| `/api/status`    | GET    | Returns `{ indexed, documentCount, embeddingCount }`                         |
| `/api/index`     | POST   | Streams SSE progress events, writes cache on completion                      |
| `/api/search?q=` | GET    | Returns ranked results + threshold metadata. Rate-limited: 10 req/min per IP |

### Core library

| File                | Exports                                                                        |
| ------------------- | ------------------------------------------------------------------------------ |
| `lib/similarity.ts` | `cosineSimilarity`, `computeThreshold`, `rankResults` — pure functions, no LLM |
| `lib/embeddings.ts` | `embedText`, `embedBatch`, `loadCache`, `saveCache`, `cacheExists`             |
| `lib/documents.ts`  | `loadDocuments` — reads and sorts `.txt` files from `data/documents/`          |

## Stack

- **Next.js 16** (App Router) + **Tailwind CSS 4**
- **Gemini API** — `gemini-embedding-001`, 3072-dim vectors
- **Vitest** — unit tests for cosine similarity and threshold logic
- **Docker** — multi-stage build, non-root user, healthcheck on `/api/status`
- **GitHub Actions** — lint + typecheck + tests on every push
- **husky + lint-staged** — ESLint + Prettier on pre-commit
