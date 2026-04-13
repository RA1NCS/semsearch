# Semantic Text Search

A web application that demonstrates semantic text search. Enter a search query and get the most relevant documents based on meaning, not keyword matching.

## Setup

### Prerequisites

- Node.js 22+
- pnpm
- Gemini API key ([get one here](https://aistudio.google.com/apikey))

### Install and run

```bash
pnpm install
```

Add your Gemini API key to `.env`:

```
GEMINI_API_KEY=your_key_here
```

```bash
pnpm dev
```

Open http://localhost:3000, click "Index Documents" to generate embeddings, then search.

### Docker

```bash
docker compose up --build
```

### Run tests

```bash
pnpm vitest run
```

## How it works

### Dataset

146 documents stored as individual text files in `data/documents/`, covering 15 topic categories: animals, programming, sports, food, science, history, geography, music, medicine, space, math, literature, architecture, marine life, and daily life.

### Indexing

When you click "Index Documents", the app:

1. Reads all 146 document files
2. Sends them to Gemini's embedding API in batches of 20, using the `RETRIEVAL_DOCUMENT` task type
3. Streams progress back to the UI in real time via Server-Sent Events
4. Saves all embeddings to `data/embeddings.json` as a file-based cache

The cache persists across server restarts. Re-indexing overwrites the cache.

### Search

When you submit a query:

1. The query is embedded using Gemini with the `RETRIEVAL_QUERY` task type (asymmetric embedding optimized for matching queries against documents)
2. Cosine similarity is computed between the query vector and all 146 document vectors
3. A dynamic threshold filters results: only documents scoring above `mean + 1 standard deviation` are returned
4. Results are capped at 15 and sorted by descending similarity

### Dynamic threshold

Instead of returning a fixed number of results, the threshold adapts to the score distribution:

- **Focused queries** ("animals that fly"): most documents score low, a few score high. The threshold captures the semantic cluster.
- **Broad queries** ("technology"): higher variance in scores means more results pass the threshold.
- **Nonsense queries** ("asdjkfh"): all scores cluster tightly with low standard deviation. The threshold sits near the max score, so few or zero results are returned.

## Stack

- **Next.js 16** with App Router
- **Tailwind CSS 4** for styling
- **Gemini API** (`gemini-embedding-001`) for text embeddings
- **Vitest** for unit tests
- **Docker** for containerized deployment
