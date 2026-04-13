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

type ResultsListProps = {
  results: SearchResult[];
  meta: SearchMeta;
};

export function ResultsList({ results, meta }: ResultsListProps) {
  return (
    <div>
      <div className="divide-y divide-zinc-800">
        {results.map((result, i) => (
          <div
            key={result.rank}
            className="animate-fade-in flex items-start gap-4 py-3"
            style={{ animationDelay: `${Math.min(i * 50, 750)}ms` }}
          >
            <span className="text-xs text-zinc-600 font-mono mt-0.5 w-5 shrink-0">
              {result.rank}
            </span>
            <p className="text-sm text-zinc-200 flex-1 leading-relaxed">
              {result.text}
            </p>
            <span className="text-xs text-zinc-500 font-mono mt-0.5 shrink-0">
              {(result.score * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* meta info */}
      <div className="mt-4 pt-4 border-t border-zinc-800/50">
        <p className="text-xs text-zinc-600">
          {results.length} result{results.length !== 1 ? "s" : ""} above threshold{" "}
          <span className="font-mono">{meta.threshold.toFixed(3)}</span>
          {" "}from {meta.totalDocuments} documents in{" "}
          <span className="font-mono">{meta.queryTime}ms</span>
        </p>
      </div>
    </div>
  );
}
