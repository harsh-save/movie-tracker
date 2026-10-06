"use client";

import { useEffect, useState } from "react";

type SearchResult = {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<number | null>(null);
  const [added, setAdded] = useState<number[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Search failed");
        }

        setResults(data.results || []);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  async function addToLibrary(item: SearchResult) {
    setAdding(item.id);
    setError("");

    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tmdb_id: item.id,
          type: item.media_type,
          title: item.title || item.name || "Unknown",
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          overview: item.overview,
          release_date:
            item.release_date ||
            item.first_air_date ||
            null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add");
      }

      if (data.success) {
        setAdded((current) => [...current, item.id]);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setAdding(null);
    }
  }

  const filteredResults = results.filter(
    (item) =>
      item.media_type === "movie" ||
      item.media_type === "tv"
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold">
            My Media Tracker
          </h1>

          <p className="mt-2 text-gray-400">
            Track your movies and TV shows.
          </p>
        </header>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies & TV shows..."
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-gray-400"
          />

          {loading && (
            <span className="absolute right-4 top-3 text-sm text-gray-500">
              Searching...
            </span>
          )}

          {query && filteredResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-[500px] overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 shadow-2xl">
              {filteredResults.map((item) => {
                const title =
                  item.title || item.name || "Unknown";

                const date =
                  item.release_date ||
                  item.first_air_date;

                const isAdding = adding === item.id;
                const isAdded = added.includes(item.id);

                return (
                  <article
                    key={`${item.media_type}-${item.id}`}
                    className="flex gap-4 border-b border-gray-800 p-3 last:border-b-0 hover:bg-gray-800"
                  >
                    {item.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                        alt={title}
                        className="h-24 w-16 flex-shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-16 flex-shrink-0 items-center justify-center rounded bg-gray-800 text-xs text-gray-500">
                        No poster
                      </div>
                    )}

                    <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">
                          {title}
                        </h3>

                        <p className="mt-1 text-sm text-gray-400">
                          {date?.slice(0, 4) || "Unknown"} ·{" "}
                          {item.media_type === "movie"
                            ? "Movie"
                            : "TV"}
                        </p>
                      </div>

                      <button
                        onClick={() => addToLibrary(item)}
                        disabled={isAdding || isAdded}
                        className="flex-shrink-0 rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-200 disabled:cursor-default disabled:opacity-60"
                      >
                        {isAdding
                          ? "Adding..."
                          : isAdded
                          ? "✓ Added"
                          : "+ Add"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-red-400">
            {error}
          </p>
        )}

        {!loading &&
          query &&
          filteredResults.length === 0 &&
          !error && (
            <p className="mt-4 text-gray-400">
              No results found.
            </p>
          )}
      </div>
    </main>
  );
}
