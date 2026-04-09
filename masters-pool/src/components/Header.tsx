"use client";

interface HeaderProps {
  lastFetch: Date | null;
  isRefreshing: boolean;
  source?: string;
}

export default function Header({ lastFetch, isRefreshing, source }: HeaderProps) {
  return (
    <header className="bg-masters-green border-b-2 border-masters-yellow px-4 py-4 sm:py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-masters-yellow tracking-wide">
              The Masters Pool
            </h1>
            <p className="text-white/80 text-sm sm:text-base mt-1 font-serif italic">
              Augusta National &middot; 2026 &middot; $20 Winner Takes All
            </p>
          </div>
          <div className="text-right text-xs sm:text-sm text-white/70">
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 text-masters-yellow mb-1">
                <span className="w-2 h-2 rounded-full bg-masters-yellow animate-pulse-live" />
                Updating...
              </span>
            )}
            {lastFetch && (
              <div>
                Last updated:{" "}
                {lastFetch.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </div>
            )}
            {source && source !== "manual" && (
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-live" />
                <span className="text-green-400">Live</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
