"use client";

import { useState, useEffect, useCallback } from "react";
import { IndexButton } from "@/components/index-button";
import { SearchBar } from "@/components/search-bar";
import { ResultsList } from "@/components/results-list";
import { EmptyState } from "@/components/empty-state";

type SearchResult = {
  text: string;
  score: number;
  rank: number;
};

type SearchMeta = {
  queryTime: number;
  totalDocuments: number;
  threshold: number;
  mean: number;
  stddev: number;
};

type IndexStatus = "loading" | "not-indexed" | "indexing" | "indexed" | "error";

export default function Home() {
  const [indexStatus, setIndexStatus] = useState<IndexStatus>("loading");
  const [indexProgress, setIndexProgress] = useState<{
    indexed: number;
    total: number;
  } | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // check index status on mount
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => {
        setIndexStatus(data.indexed ? "indexed" : "not-indexed");
        if (data.indexed) {
          setIndexProgress({
            indexed: data.embeddingCount,
            total: data.documentCount,
          });
        }
      })
      .catch(() => setIndexStatus("not-indexed"));
  }, []);

  // start indexing with streaming progress
  const handleIndex = useCallback(async () => {
    setIndexStatus("indexing");
    setIndexError(null);
    setIndexProgress({ indexed: 0, total: 146 });

    const response = await fetch("/api/index", { method: "POST" });

    if (!response.ok || !response.body) {
      setIndexStatus("error");
      setIndexError("Failed to start indexing.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // keep last incomplete line in buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);

        if (event.status === "progress" || event.status === "complete") {
          setIndexProgress({ indexed: event.indexed, total: event.total });
        }

        if (event.status === "complete") {
          setIndexStatus("indexed");
        }

        if (event.status === "error") {
          setIndexStatus("error");
          setIndexError(event.message || "Indexing failed.");
        }
      }
    }
  }, []);

  // search
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    const response = await fetch(
      `/api/search?q=${encodeURIComponent(query.trim())}`
    );
    const data = await response.json();

    setResults(data.results || []);
    setMeta(data.meta || null);
    setIsSearching(false);
  }, [query]);

  // click example query chip
  const handleQueryClick = useCallback(
    (q: string) => {
      setQuery(q);
      setTimeout(() => {
        setIsSearching(true);
        setHasSearched(true);
        fetch(`/api/search?q=${encodeURIComponent(q)}`)
          .then((r) => r.json())
          .then((data) => {
            setResults(data.results || []);
            setMeta(data.meta || null);
            setIsSearching(false);
          });
      }, 0);
    },
    []
  );

  // skeleton loader for search
  function SearchSkeleton() {
    return (
      <div className="divide-y divide-zinc-800">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-4 py-3">
            <div className="w-5 h-4 bg-zinc-800 rounded animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div
                className="h-4 bg-zinc-800 rounded animate-pulse"
                style={{ width: `${70 + Math.random() * 25}%` }}
              />
            </div>
            <div className="w-12 h-4 bg-zinc-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const isIndexed = indexStatus === "indexed";

  return (
    <main className="min-h-[100dvh]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* header */}
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Semantic Search
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Find documents by meaning, not keywords
          </p>
        </header>

        {/* index section */}
        {indexStatus !== "loading" && (
          <div className="mb-8">
            <IndexButton
              status={indexStatus}
              progress={indexProgress}
              onIndex={handleIndex}
              error={indexError}
            />
          </div>
        )}

        {/* loading skeleton for initial status check */}
        {indexStatus === "loading" && (
          <div className="mb-8 py-3 px-4 border border-zinc-800 rounded-lg">
            <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse" />
          </div>
        )}

        {/* search section */}
        <div className="mb-8">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            isSearching={isSearching}
            disabled={!isIndexed}
          />
        </div>

        {/* results */}
        {isSearching && <SearchSkeleton />}

        {!isSearching && hasSearched && results.length > 0 && meta && (
          <ResultsList results={results} meta={meta} />
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <EmptyState type="no-results" />
        )}

        {!hasSearched && isIndexed && (
          <EmptyState type="initial" onQueryClick={handleQueryClick} />
        )}

        {!hasSearched && indexStatus === "not-indexed" && (
          <EmptyState type="not-indexed" />
        )}

        {!hasSearched && indexStatus === "error" && (
          <EmptyState type="not-indexed" />
        )}
      </div>
    </main>
  );
}
