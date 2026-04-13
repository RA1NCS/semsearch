"use client";

import { useState, useEffect, useCallback } from "react";

type SearchResult = { text: string; score: number; rank: number };
type SearchMeta = {
  queryTime: number;
  totalDocuments: number;
  threshold: number;
  mean: number;
  stddev: number;
};
type IndexStatus = "idle" | "running" | "done" | "error";

const BATCH_SIZE = 20;

const EXAMPLE_QUERIES = [
  "animals that survive extreme conditions",
  "planets with liquid water",
  "how does memory work in programming",
  "ancient engineering feats",
  "what gives food its flavor",
  "quantum physics breakthroughs",
  "deep sea creatures",
];

// ── shared state hook ─────────────────────────────────────────────────────────
function usePipeline() {
  const [indexed, setIndexed] = useState(false);
  const [indexStatus, setIndexStatus] = useState<IndexStatus>("idle");
  const [indexProgress, setIndexProgress] = useState({
    indexed: 0,
    total: 146,
  });
  const [currentBatch, setCurrentBatch] = useState(0);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.indexed) {
          setIndexed(true);
          setIndexStatus("done");
          setIndexProgress({
            indexed: d.embeddingCount,
            total: d.documentCount,
          });
        }
      })
      .catch(() => {});
  }, []);

  const startIndex = useCallback(async () => {
    setIndexStatus("running");
    setIndexProgress({ indexed: 0, total: 146 });
    setCurrentBatch(0);
    setIndexed(false);
    const res = await fetch("/api/index", { method: "POST" });
    if (!res.ok || !res.body) {
      setIndexStatus("error");
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const ev = JSON.parse(line);
        if (ev.status === "progress" || ev.status === "complete") {
          setIndexProgress({ indexed: ev.indexed, total: ev.total });
          setCurrentBatch(Math.ceil(ev.indexed / BATCH_SIZE));
        }
        if (ev.status === "complete") {
          setIndexed(true);
          setIndexStatus("done");
        }
        if (ev.status === "error") setIndexStatus("error");
      }
    }
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    setSearching(true);
    setHasSearched(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
    const data = await res.json();
    setResults(data.results || []);
    setMeta(data.meta || null);
    setSearching(false);
  }, []);

  return {
    indexed,
    indexStatus,
    indexProgress,
    currentBatch,
    query,
    setQuery,
    searching,
    results,
    meta,
    hasSearched,
    startIndex,
    doSearch,
  };
}

// ── connector arrow ────────────────────────────────────────────────────────────
function Arrow({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div className="flex items-center justify-center w-12 shrink-0">
      <div
        className="relative w-full h-px"
        style={{ background: done ? "#3B82F6" : "#E5E7EB" }}
      >
        {active && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full"
            style={{
              background: "#3B82F6",
              animation: "flowDot 1.2s linear infinite",
            }}
          />
        )}
        <svg
          className="absolute right-0 top-1/2 -translate-y-1/2"
          width="9"
          height="9"
          viewBox="0 0 8 8"
          fill="none"
        >
          <path
            d="M1 1L7 4L1 7"
            stroke={done ? "#3B82F6" : "#D1D5DB"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

// ── stage card ─────────────────────────────────────────────────────────────────
function Stage({
  label,
  sublabel,
  code,
  state,
  children,
}: {
  label: string;
  sublabel: string;
  code?: string;
  state: "idle" | "active" | "done";
  children?: React.ReactNode;
}) {
  return (
    <div
      className="w-56 shrink-0 rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300"
      style={{
        background: state === "active" ? "#FAFCFF" : "#fff",
        border:
          state === "active"
            ? "1.5px solid #3B82F6"
            : state === "done"
              ? "1.5px solid #93C5FD"
              : "1.5px solid #E8E8ED",
        boxShadow:
          state === "active"
            ? "0 2px 10px rgba(59,130,246,0.09)"
            : "0 1px 4px rgba(0,0,0,0.03)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[13px] font-medium"
          style={{ color: state === "idle" ? "#C4BFB7" : "#111827" }}
        >
          {label}
        </span>
        {state === "done" && (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            style={{ border: "1.5px solid #93C5FD" }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M1.5 4L3.5 6L6.5 2"
                stroke="#3B82F6"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
        {state === "active" && (
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: "#3B82F6",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        )}
      </div>
      <div className="flex-1 min-h-[110px]">{children}</div>
      <div className="space-y-1">
        {code && (
          <span
            className="text-[11px] font-mono px-2 py-0.5 rounded"
            style={{ background: "#F3F4F6", color: "#6B7280" }}
          >
            {code}
          </span>
        )}
        <p className="text-xs" style={{ color: "#9CA3AF" }}>
          {sublabel}
        </p>
      </div>
    </div>
  );
}

// ── file grid ──────────────────────────────────────────────────────────────────
function FileGrid({ count, active }: { count: number; active: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="h-5 rounded flex items-center justify-center transition-all duration-300"
          style={{ background: i < (count / 146) * 15 ? "#BFDBFE" : "#F2EFE8" }}
        >
          <div
            className="w-2 h-3 rounded-sm"
            style={{
              background: i < (count / 146) * 15 ? "#3B82F6" : "#E8E3DA",
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ── vector bars ────────────────────────────────────────────────────────────────
function VectorBars({ active }: { active: boolean }) {
  const heights = [40, 70, 25, 85, 50, 65, 30, 90, 45, 75, 55, 80];
  return (
    <div className="flex items-end gap-0.5 h-[80px]">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-700"
          style={{
            height: active ? `${h}%` : "8%",
            background: active ? "#3B82F6" : "#EDE8DF",
            transitionDelay: `${i * 35}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ── similarity bars ─────────────────────────────────────────────────────────────
function SimBars({
  results,
  active,
}: {
  results: SearchResult[];
  active: boolean;
}) {
  const fakeScores = [
    0.74, 0.66, 0.65, 0.64, 0.62, 0.61, 0.6, 0.58, 0.57, 0.55,
  ];
  const scores =
    results.length > 0 ? results.slice(0, 10).map((r) => r.score) : fakeScores;
  return (
    <div className="flex items-end gap-0.5 h-[80px]">
      {scores.map((s, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-500"
          style={{
            height: active ? `${s * 100}%` : "8%",
            background: i < 3 ? "#3B82F6" : "#BFDBFE",
            transitionDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ── threshold visualization ─────────────────────────────────────────────────────
function ThresholdViz({ meta }: { meta: SearchMeta | null }) {
  const cutoff = meta ? ((meta.threshold - 0.5) / 0.3) * 100 : 55;
  return (
    <div className="space-y-2">
      <div
        className="relative h-10 rounded-lg overflow-hidden"
        style={{ background: "#F3F4F6" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-lg"
          style={{
            width: `${Math.min(cutoff, 100)}%`,
            background: "linear-gradient(to right, #BFDBFE, #3B82F6)",
          }}
        />
        <div
          className="absolute inset-y-0 w-0.5"
          style={{ left: `${Math.min(cutoff, 100)}%`, background: "#1D4ED8" }}
        />
      </div>
      <p
        className="text-[10px] font-mono text-center"
        style={{ color: "#6B7280" }}
      >
        cutoff = μ + 1σ
      </p>
      {meta && (
        <p className="text-[10px] text-center" style={{ color: "#93C5FD" }}>
          {(meta.threshold * 100).toFixed(1)}% threshold
        </p>
      )}
    </div>
  );
}

// ── gemini spinner ──────────────────────────────────────────────────────────────
function GeminiSpinner({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div className="relative w-12 h-12">
        <div
          className="w-full h-full rounded-full"
          style={{
            background:
              "linear-gradient(135deg, #4285F4, #34A853, #FBBC04, #EA4335)",
          }}
        >
          <div className="absolute inset-1.5 rounded-full bg-white flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: "#4285F4" }}>
              G
            </span>
          </div>
        </div>
        {active && (
          <div
            className="absolute -inset-1 rounded-full border-2"
            style={{
              borderColor: "#3B82F6",
              borderTopColor: "transparent",
              animation: "spin 1s linear infinite",
            }}
          />
        )}
      </div>
      <span
        className="text-[11px]"
        style={{ color: active ? "#3B82F6" : "#9CA3AF" }}
      >
        {active ? "embedding..." : "ready"}
      </span>
    </div>
  );
}

// ── batch visualization ────────────────────────────────────────────────────────
function BatchViz({ currentBatch }: { currentBatch: number }) {
  const totalBatches = Math.ceil(146 / BATCH_SIZE);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-6 rounded flex items-center justify-center transition-all duration-300"
            style={{
              background:
                i < currentBatch
                  ? "#BFDBFE"
                  : i === currentBatch
                    ? "#EFF6FF"
                    : "#F5F2EC",
              border:
                i === currentBatch
                  ? "1px solid #3B82F6"
                  : "1px solid transparent",
            }}
          >
            <span
              className="text-[9px] font-mono"
              style={{ color: i < currentBatch ? "#3B82F6" : "#9CA3AF" }}
            >
              {i < currentBatch ? "✓" : `b${i + 1}`}
            </span>
          </div>
        ))}
      </div>
      {currentBatch > 0 && (
        <p className="text-[10px] font-mono" style={{ color: "#6B7280" }}>
          batch {Math.min(currentBatch, totalBatches)} / {totalBatches}
        </p>
      )}
    </div>
  );
}

// ── cache file visual ──────────────────────────────────────────────────────────
function CacheViz({ done, count }: { done: boolean; count: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <div
        className="w-14 h-[72px] rounded-xl flex flex-col overflow-hidden transition-all duration-500"
        style={{
          background: done ? "#EFF6FF" : "#F9FAFB",
          border: `1.5px solid ${done ? "#93C5FD" : "#E8E3DA"}`,
        }}
      >
        <div
          className="h-4 w-full flex items-center justify-end px-1.5"
          style={{ background: done ? "#3B82F6" : "#E8E3DA" }}
        >
          <span className="text-[8px] font-mono text-white">.json</span>
        </div>
        <div className="flex-1 p-1.5 space-y-1">
          {done
            ? [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[3px] rounded"
                  style={{ background: "#BFDBFE", width: `${100 - i * 8}%` }}
                />
              ))
            : [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[3px] rounded"
                  style={{ background: "#F3F4F6", width: `${100 - i * 8}%` }}
                />
              ))}
        </div>
      </div>
      {done && (
        <span className="text-[10px] font-mono" style={{ color: "#3B82F6" }}>
          {count}×3072
        </span>
      )}
    </div>
  );
}

// ── query input inside stage ───────────────────────────────────────────────────
function QueryInput({
  query,
  setQuery,
  doSearch,
  indexed,
}: {
  query: string;
  setQuery: (q: string) => void;
  doSearch: (q: string) => void;
  indexed: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 h-full justify-between">
      <div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
          placeholder={indexed ? "type query..." : "index first"}
          disabled={!indexed}
          className="w-full text-xs px-3 py-2 rounded-lg outline-none transition-all"
          style={{
            background: "#F9FAFB",
            border: "1px solid #E5E7EB",
            color: "#374151",
            cursor: indexed ? "text" : "not-allowed",
          }}
          onFocus={(e) => {
            if (indexed) e.currentTarget.style.borderColor = "#3B82F6";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#E8E3DA";
          }}
        />
        <p className="text-[10px] mt-1.5" style={{ color: "#9CA3AF" }}>
          press Enter to search
        </p>
      </div>
      {query && (
        <div
          className="text-[10px] px-2 py-1 rounded-lg truncate"
          style={{ background: "#EFF6FF", color: "#3B82F6" }}
        >
          &ldquo;{query.slice(0, 22)}
          {query.length > 22 ? "…" : ""}&rdquo;
        </div>
      )}
    </div>
  );
}

// ══ MAIN PAGE ════════════════════════════════════════════════════════════════
export default function DesignPrototype() {
  const pipe = usePipeline();
  const {
    indexed,
    indexStatus,
    indexProgress,
    currentBatch,
    query,
    setQuery,
    searching,
    results,
    meta,
    hasSearched,
    startIndex,
    doSearch,
  } = pipe;

  const isRunning = indexStatus === "running";
  const isDone = indexStatus === "done";
  const totalBatches = Math.ceil(146 / BATCH_SIZE);

  type StageState = "idle" | "active" | "done";

  // index stage state helper
  const iStage = (n: number): StageState => {
    if (!isRunning && !isDone) return "idle";
    if (isDone) return "done";
    const pct = indexProgress.indexed / indexProgress.total;
    if (n === 0) return pct > 0 ? "done" : "active";
    if (n === 1) return pct >= 1 ? "done" : "active";
    if (n === 2) return pct >= 0.8 ? "done" : pct > 0.1 ? "active" : "idle";
    if (n === 3) return pct >= 0.9 ? "done" : pct > 0.3 ? "active" : "idle";
    if (n === 4) return isDone ? "done" : pct >= 0.99 ? "active" : "idle";
    return "idle";
  };

  // search stage state helper
  const sStage = (n: number): StageState => {
    if (!hasSearched) return n === 0 && indexed ? "active" : "idle";
    if (searching) {
      if (n === 0) return "done";
      if (n === 1) return "active";
      return "idle";
    }
    return "done";
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
        * { font-family: 'DM Sans', system-ui, sans-serif; box-sizing: border-box; }
        @keyframes flowDot { 0% { left: 0; opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { left: calc(100% - 14px); opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeUp 0.35s ease-out forwards; opacity: 0; }
      `}</style>

      <div
        className="min-h-[100dvh]"
        style={{ background: "#FFFBF5", color: "#1a1a2e" }}
      >
        <div className="max-w-[1400px] mx-auto px-8 py-12">
          {/* header */}
          <div className="mb-12">
            <p
              className="text-[10px] font-mono tracking-[0.2em] uppercase mb-3"
              style={{ color: "#C4BFB7" }}
            >
              semantic search
            </p>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "#111827" }}
            >
              Document Retrieval
            </h1>
            <p className="text-sm mt-1.5" style={{ color: "#9B9590" }}>
              Gemini embeddings · cosine similarity · dynamic threshold
            </p>
          </div>

          {/* ── INDEXING PIPELINE ───────────────────────────────────────── */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span
                  className="text-[10px] font-mono tracking-wider uppercase"
                  style={{ color: "#C4BFB7" }}
                >
                  POST /api/index
                </span>
                <div className="w-px h-3.5" style={{ background: "#E8E3DA" }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: "#111827" }}
                >
                  Indexing Pipeline
                </span>
                <span className="text-sm" style={{ color: "#C4BFB7" }}>
                  {isDone
                    ? `${indexProgress.indexed} documents embedded`
                    : isRunning
                      ? `batch ${currentBatch} / ${totalBatches}`
                      : "not started"}
                </span>
              </div>

              {isDone && (
                <button
                  onClick={startIndex}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all"
                  style={{
                    background: "#fff",
                    border: "1.5px solid #E8E3DA",
                    color: "#8B8680",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3B82F6";
                    e.currentTarget.style.color = "#3B82F6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#E8E3DA";
                    e.currentTarget.style.color = "#8B8680";
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M12 7A5 5 0 1 1 7 2M7 2L10 5M7 2L4 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Re-index from scratch
                </button>
              )}
            </div>

            <div className="flex items-center overflow-x-auto pb-3">
              <Stage
                label="Documents"
                sublabel="146 × .txt files"
                code="loadDocuments()"
                state={isDone ? "done" : isRunning ? "done" : "idle"}
              >
                <FileGrid
                  count={indexProgress.indexed}
                  active={isRunning || isDone}
                />
              </Stage>
              <Arrow
                active={isRunning && iStage(1) === "active"}
                done={isDone}
              />

              <Stage
                label="Batching"
                sublabel={`${BATCH_SIZE} docs / batch`}
                code="embedBatch()"
                state={iStage(1)}
              >
                <BatchViz currentBatch={currentBatch} />
              </Stage>
              <Arrow
                active={isRunning && iStage(2) === "active"}
                done={isDone}
              />

              <Stage
                label="Gemini API"
                sublabel="RETRIEVAL_DOCUMENT"
                code="embedContent()"
                state={iStage(2)}
              >
                <GeminiSpinner active={isRunning && iStage(2) === "active"} />
              </Stage>
              <Arrow
                active={isRunning && iStage(3) === "active"}
                done={isDone}
              />

              <Stage
                label="Embeddings"
                sublabel="3072 dimensions"
                code="float32[]"
                state={iStage(3)}
              >
                <VectorBars active={isRunning || isDone} />
              </Stage>
              <Arrow
                active={isRunning && iStage(4) === "active"}
                done={isDone}
              />

              <Stage
                label="Cache"
                sublabel="embeddings.json"
                code="saveCache()"
                state={iStage(4)}
              >
                <CacheViz done={isDone} count={indexProgress.indexed} />
              </Stage>
            </div>

            {!isDone && !isRunning && (
              <button
                onClick={startIndex}
                className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
                style={{ background: "#3B82F6", color: "#fff" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#2563EB")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#3B82F6")
                }
              >
                Start Indexing
              </button>
            )}
            {isRunning && (
              <div className="mt-5 flex items-center gap-3 max-w-sm">
                <div
                  className="flex-1 h-1.5 rounded-full"
                  style={{ background: "#E5E7EB" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(indexProgress.indexed / indexProgress.total) * 100}%`,
                      background: "#3B82F6",
                    }}
                  />
                </div>
                <span
                  className="text-xs font-mono shrink-0"
                  style={{ color: "#6B7280" }}
                >
                  {indexProgress.indexed} / {indexProgress.total}
                </span>
              </div>
            )}
          </div>

          {/* divider */}
          <div className="relative mb-12">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px" style={{ background: "#E8E8ED" }} />
            </div>
            <div className="relative flex justify-start">
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  background: "#FFFBF5",
                  color: indexed ? "#3B82F6" : "#C4BFB7",
                  border: `1px solid ${indexed ? "#93C5FD" : "#E8E3DA"}`,
                }}
              >
                {indexed
                  ? "Cached embeddings ready"
                  : "Index first to unlock search"}
              </span>
            </div>
          </div>

          {/* ── SEARCH PIPELINE ─────────────────────────────────────────── */}
          <div
            style={{
              opacity: indexed ? 1 : 0.45,
              transition: "opacity 0.5s",
              pointerEvents: indexed ? "auto" : "none",
            }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <span
                className="text-[10px] font-mono tracking-wider uppercase"
                style={{ color: "#C4BFB7" }}
              >
                GET /api/search
              </span>
              <div className="w-px h-3.5" style={{ background: "#E8E3DA" }} />
              <span
                className="text-sm font-medium"
                style={{ color: "#111827" }}
              >
                Search Pipeline
              </span>
              {meta && (
                <span className="text-sm" style={{ color: "#9CA3AF" }}>
                  {results.length} results · {meta.queryTime}ms · threshold{" "}
                  {(meta.threshold * 100).toFixed(1)}%
                </span>
              )}
            </div>

            <div className="flex items-center overflow-x-auto pb-3">
              <Stage
                label="Query"
                sublabel="user input"
                code="embedText()"
                state={sStage(0)}
              >
                <QueryInput
                  query={query}
                  setQuery={setQuery}
                  doSearch={doSearch}
                  indexed={indexed}
                />
              </Stage>
              <Arrow active={searching} done={hasSearched && !searching} />

              <Stage
                label="Gemini API"
                sublabel="RETRIEVAL_QUERY"
                code="embedContent()"
                state={sStage(1)}
              >
                <GeminiSpinner active={searching} />
              </Stage>
              <Arrow active={searching} done={hasSearched && !searching} />

              <Stage
                label="Cosine Sim"
                sublabel="146 comparisons"
                code="cosineSimilarity()"
                state={sStage(2)}
              >
                <SimBars results={results} active={hasSearched && !searching} />
              </Stage>
              <Arrow active={searching} done={hasSearched && !searching} />

              <Stage
                label="Threshold"
                sublabel="dynamic cutoff"
                code="computeThreshold()"
                state={sStage(3)}
              >
                <ThresholdViz meta={hasSearched ? meta : null} />
              </Stage>
              <Arrow active={searching} done={hasSearched && !searching} />

              <Stage
                label="Results"
                sublabel={
                  results.length > 0
                    ? `${results.length} ranked matches`
                    : "ranked matches"
                }
                code="rankResults()"
                state={sStage(4)}
              >
                <div className="space-y-1.5">
                  {results.slice(0, 3).map((r, i) => (
                    <div
                      key={i}
                      className="text-[10px] leading-tight"
                      style={{ color: "#374151" }}
                    >
                      <span
                        className="font-mono text-[9px] mr-1"
                        style={{ color: "#93C5FD" }}
                      >
                        {(r.score * 100).toFixed(0)}%
                      </span>
                      {r.text.slice(0, 30)}…
                    </div>
                  ))}
                  {results.length === 0 && !hasSearched && (
                    <div className="space-y-1.5 pt-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-2.5 rounded"
                          style={{
                            background: "#F3F4F6",
                            width: `${95 - i * 12}%`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {searching && (
                    <div className="space-y-1.5 pt-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-2.5 rounded animate-pulse"
                          style={{
                            background: "#EFF6FF",
                            width: `${95 - i * 12}%`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </Stage>
            </div>

            {/* predefined chips — shown before first search */}
            {!hasSearched && indexed && (
              <div className="mt-6">
                <p className="text-xs mb-3" style={{ color: "#C4BFB7" }}>
                  Try a query
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_QUERIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => doSearch(q)}
                      className="text-xs px-3.5 py-2 rounded-full cursor-pointer transition-all"
                      style={{
                        background: "#fff",
                        border: "1.5px solid #E8E3DA",
                        color: "#8B8680",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#EFF6FF";
                        e.currentTarget.style.borderColor = "#93C5FD";
                        e.currentTarget.style.color = "#3B82F6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.borderColor = "#E8E3DA";
                        e.currentTarget.style.color = "#8B8680";
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* full results list */}
            {hasSearched && (
              <div className="mt-8 max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: "#1a1a2e" }}
                  >
                    {searching
                      ? "Searching..."
                      : results.length > 0
                        ? `${results.length} results for "${query}"`
                        : `No results for "${query}"`}
                  </h3>
                  {meta && !searching && (
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {meta.queryTime}ms
                    </span>
                  )}
                </div>

                {searching ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex gap-3 items-start py-1">
                        <div
                          className="w-6 h-6 rounded-lg animate-pulse shrink-0"
                          style={{ background: "#F2EFE8" }}
                        />
                        <div
                          className="flex-1 h-4 rounded-lg animate-pulse"
                          style={{
                            background: "#F2EFE8",
                            width: `${75 + i * 4}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  <div className="divide-y" style={{ borderColor: "#F0EEE9" }}>
                    {results.map((r, i) => (
                      <div
                        key={r.rank}
                        className="flex items-start gap-3 py-3.5 animate-fade-in"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0"
                          style={{ background: "#EFF6FF", color: "#3B82F6" }}
                        >
                          {r.rank}
                        </span>
                        <p
                          className="text-sm flex-1 leading-relaxed"
                          style={{ color: "#374151" }}
                        >
                          {r.text}
                        </p>
                        <span
                          className="text-xs font-mono shrink-0 px-2 py-0.5 rounded-full"
                          style={{ background: "#F5F1EB", color: "#9B9590" }}
                        >
                          {(r.score * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm" style={{ color: "#9CA3AF" }}>
                      No results above threshold. Try a more specific query.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {EXAMPLE_QUERIES.slice(0, 4).map((q) => (
                        <button
                          key={q}
                          onClick={() => doSearch(q)}
                          className="text-xs px-3 py-1.5 rounded-full cursor-pointer transition-all"
                          style={{
                            background: "#fff",
                            border: "1.5px solid #E8E3DA",
                            color: "#8B8680",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#EFF6FF";
                            e.currentTarget.style.borderColor = "#93C5FD";
                            e.currentTarget.style.color = "#3B82F6";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#fff";
                            e.currentTarget.style.borderColor = "#E8E3DA";
                            e.currentTarget.style.color = "#8B8680";
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
