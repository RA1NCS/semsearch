type EmptyStateProps = {
  type: "initial" | "no-results" | "not-indexed";
  onQueryClick?: (query: string) => void;
};

const exampleQueries = [
  "animals that survive extreme conditions",
  "how does memory work in programming",
  "ancient engineering achievements",
  "cooking techniques from France",
  "planets with water",
];

export function EmptyState({ type, onQueryClick }: EmptyStateProps) {
  if (type === "not-indexed") {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400 text-sm">
          Documents need to be indexed before searching.
        </p>
        <p className="text-zinc-500 text-sm mt-1">
          Click the button above to get started.
        </p>
      </div>
    );
  }

  if (type === "no-results") {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400 text-sm">
          No results matched your query.
        </p>
        <p className="text-zinc-500 text-sm mt-1">
          Try a broader or different search term.
        </p>
      </div>
    );
  }

  // initial state with example queries
  return (
    <div className="text-center py-16">
      <p className="text-zinc-400 text-sm mb-6">
        Search across 146 documents by meaning, not keywords.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {exampleQueries.map((query) => (
          <button
            key={query}
            onClick={() => onQueryClick?.(query)}
            className="px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded-full
              hover:border-zinc-600 hover:text-zinc-300 transition-colors duration-200
              cursor-pointer"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
