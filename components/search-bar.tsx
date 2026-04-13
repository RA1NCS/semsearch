import { useRef } from "react";

type SearchBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  disabled: boolean;
};

export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  isSearching,
  disabled,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // submit on enter
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !disabled && query.trim()) {
      onSearch();
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search by meaning..."
        disabled={disabled}
        className="w-full py-3 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm
          text-zinc-100 placeholder:text-zinc-500
          focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200"
      />
      {isSearching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
