type IndexButtonProps = {
  status: "not-indexed" | "indexing" | "indexed" | "error";
  progress: { indexed: number; total: number } | null;
  onIndex: () => void;
  error?: string | null;
};

export function IndexButton({
  status,
  progress,
  onIndex,
  error,
}: IndexButtonProps) {
  if (status === "indexed") {
    return (
      <div className="flex items-center justify-between py-3 px-4 border border-zinc-800 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm text-zinc-300">
            {progress?.total ?? 146} documents indexed
          </span>
        </div>
        <button
          onClick={onIndex}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Re-index
        </button>
      </div>
    );
  }

  if (status === "indexing" && progress) {
    const pct = Math.round((progress.indexed / progress.total) * 100);
    return (
      <div className="py-3 px-4 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-300">
            Indexing documents...
          </span>
          <span className="text-xs text-zinc-500 font-mono">
            {progress.indexed}/{progress.total}
          </span>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="py-3 px-4 border border-red-900/50 rounded-lg">
        <p className="text-sm text-red-400 mb-2">{error || "Indexing failed."}</p>
        <button
          onClick={onIndex}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  // not-indexed
  return (
    <button
      onClick={onIndex}
      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm
        font-medium rounded-lg transition-colors duration-200 cursor-pointer"
    >
      Index Documents
    </button>
  );
}
