"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type LibraryItem = {
  id: number;
  status:
    | "watchlist"
    | "watching"
    | "completed"
    | "dropped";
  created_at: string;
  media: {
    id: number;
    tmdb_id: number;
    title: string;
    type: "movie" | "tv";
    poster_path: string | null;
    release_date: string | null;
    tmdb_rating: number | null;
    runtime: number | null;
    overview: string | null;
    media_genres: {
      genres: {
        id: number;
        name: string;
      } | null;
    }[];
  };
};

type Filter =
  | "all"
  | "movies"
  | "tv"
  | "rewatched-movies"
  | "rewatched-tv";

type ExportFormat = "csv" | "xlsx" | "json";

type SearchResult = {
  tmdb_id: number;
  title: string;
  type: "movie" | "tv";
  poster_path: string | null;
  year: string | null;
};

export default function LibraryPage() {
  const [isOwner, setIsOwner] = useState(false);
  const [items, setItems] = useState<LibraryItem[]>([]);

  const [watchCounts, setWatchCounts] = useState<
    Record<number, number>
  >({});

  const [filter, setFilter] =
    useState<Filter>("all");

  const [query, setQuery] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [exporting, setExporting] =
    useState<ExportFormat | null>(null);

  // Add modal state
  const [showAddModal, setShowAddModal] =
    useState(false);

  const [addQuery, setAddQuery] =
    useState("");

  const [addResults, setAddResults] =
    useState<SearchResult[]>([]);

  const [searching, setSearching] =
    useState(false);

  const [addingId, setAddingId] =
    useState<number | null>(null);

  const [addError, setAddError] =
    useState("");

  async function loadLibrary() {
    try {
      const response = await fetch(
        "/api/library"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load library"
        );
      }

      setItems(data.items || []);
      setWatchCounts(
        data.watchCounts || {}
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load library"
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
  let active = true;

  async function checkOwner() {
    try {
      const response = await fetch("/api/auth/owner", {
        cache: "no-store",
      });

      const data = await response.json();

      if (active) {
        setIsOwner(response.ok && data.isOwner === true);
      }
    } catch {
      if (active) {
        setIsOwner(false);
      }
    }
  }

  checkOwner();

  return () => {
    active = false;
  };
}, []);

  useEffect(() => {
    loadLibrary();
  }, []);

  /*
   * Search TMDB from the Add modal.
   */
  useEffect(() => {
    if (!showAddModal) {
      return;
    }

    const search = addQuery.trim();

    if (!search) {
      setAddResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    const timeout = setTimeout(
      async () => {
        try {
          const response = await fetch(
            `/api/search?q=${encodeURIComponent(
              search
            )}`
          );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Search failed"
            );
          }

          setAddResults(
            data.results || []
          );
        } catch {
          setAddResults([]);
        } finally {
          setSearching(false);
        }
      },
      400
    );

    return () =>
      clearTimeout(timeout);
  }, [addQuery, showAddModal]);

  const movieCount = items.filter(
    (item) =>
      item.media.type === "movie"
  ).length;

  const tvCount = items.filter(
    (item) =>
      item.media.type === "tv"
  ).length;

  const filteredItems = useMemo(() => {
    const search =
      query.trim().toLowerCase();

    return items.filter((item) => {
      const type = item.media.type;

      const watchCount =
        watchCounts[item.media.id] ||
        0;

      const matchesFilter =
        filter === "all" ||
        (filter === "movies" &&
          type === "movie") ||
        (filter === "tv" &&
          type === "tv") ||
        (filter ===
          "rewatched-movies" &&
          type === "movie" &&
          watchCount > 1) ||
        (filter === "rewatched-tv" &&
          type === "tv" &&
          watchCount > 1);

      const matchesSearch =
        !search ||
        item.media.title
          .toLowerCase()
          .includes(search);

      return (
        matchesFilter &&
        matchesSearch
      );
    });
  }, [
    items,
    watchCounts,
    filter,
    query,
  ]);

  async function exportLibrary(
    format: ExportFormat
  ) {
    setExporting(format);
    setError("");

    try {
      const response = await fetch(
        `/api/library/export?format=${format}`
      );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          data?.error ||
            "Export failed"
        );
      }

      const blob =
        await response.blob();

      const contentDisposition =
        response.headers.get(
          "Content-Disposition"
        );

      let filename =
        format === "csv"
          ? "my-library.csv"
          : format === "xlsx"
          ? "my-library.xlsx"
          : "my-library.json";

      const filenameMatch =
        contentDisposition?.match(
          /filename="?([^"]+)"?/
        );

      if (filenameMatch?.[1]) {
        filename =
          filenameMatch[1];
      }

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      link.href = url;
      link.download = filename;

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Export failed"
      );
    } finally {
      setExporting(null);
    }
  }

  /*
   * Add a movie or TV show.
   *
   * IMPORTANT:
   * /api/library requires:
   * tmdb_id
   * type
   * title
   */
  async function addToLibrary(
    result: SearchResult
  ) {
    setAddingId(result.tmdb_id);
    setAddError("");

    try {
      const response = await fetch(
        "/api/library",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            tmdb_id:
              Number(result.tmdb_id),
            type: result.type,
            title: result.title,
            poster_path:
              result.poster_path,
            release_date:
              result.year
                ? `${result.year}-01-01`
                : null,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to add title"
        );
      }

      /*
       * If it was already in the
       * library, tell the user instead
       * of treating it as a new add.
       */
      if (data.success === false) {
        setAddError(
          data.message ||
            "This title is already in your library."
        );

        return;
      }

      /*
       * Refresh the library so the
       * new title appears immediately.
       */
      await loadLibrary();

      /*
       * Remove the added result from
       * the search results.
       */
      setAddResults((current) =>
        current.filter(
          (item) =>
            !(
              item.tmdb_id ===
                result.tmdb_id &&
              item.type ===
                result.type
            )
        )
      );
    } catch (error) {
      setAddError(
        error instanceof Error
          ? error.message
          : "Failed to add title"
      );
    } finally {
      setAddingId(null);
    }
  }

  function closeAddModal() {
    setShowAddModal(false);
    setAddQuery("");
    setAddResults([]);
    setAddError("");
    setSearching(false);
  }

  function getFilterButtonClass(
    active: boolean
  ) {
    return active
      ? "rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition"
      : "rounded-full border border-gray-800 bg-gray-900 px-4 py-2 text-sm text-gray-400 transition hover:border-gray-600 hover:text-white";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="animate-pulse">
            <div className="h-10 w-48 rounded bg-gray-800" />

            <div className="mt-4 h-5 w-64 rounded bg-gray-900" />

            <div className="mt-10 h-12 rounded-lg bg-gray-900" />

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({
                length: 12,
              }).map((_, index) => (
                <div key={index}>
                  <div className="aspect-[2/3] rounded-xl bg-gray-900" />

                  <div className="mt-3 h-4 rounded bg-gray-900" />

                  <div className="mt-2 h-3 w-24 rounded bg-gray-900" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              My Library
            </h1>

            {/* Movie / TV sections */}
            <div className="mt-5 flex flex-wrap gap-3">
              {/* Movies */}
              <button
                type="button"
                onClick={() =>
                  setFilter("movies")
                }
                className={`group flex min-w-[170px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  filter === "movies" ||
                  filter ===
                    "rewatched-movies"
                    ? "border-gray-500 bg-gray-800"
                    : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-lg transition group-hover:bg-gray-700">
                  🎬
                </div>

                <div>
                  <p className="text-2xl font-bold leading-none">
                    {movieCount}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {movieCount ===
                    1
                      ? "Movie"
                      : "Movies"}
                  </p>
                </div>
              </button>

              {/* TV Shows */}
              <button
                type="button"
                onClick={() =>
                  setFilter("tv")
                }
                className={`group flex min-w-[170px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  filter === "tv" ||
                  filter ===
                    "rewatched-tv"
                    ? "border-gray-500 bg-gray-800"
                    : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-lg transition group-hover:bg-gray-700">
                  📺
                </div>

                <div>
                  <p className="text-2xl font-bold leading-none">
                    {tvCount}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {tvCount ===
                    1
                      ? "TV Show"
                      : "TV Shows"}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Add */}
            {isOwner && (
  <button
    type="button"
    onClick={() => setShowAddModal(true)}
    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:bg-gray-200"
  >
    <span className="text-lg leading-none">+</span>
    Add title
  </button>
)}

            {/* Export */}
            <div className="relative">
              <details className="group">
                <summary className="cursor-pointer list-none rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-gray-500 hover:bg-gray-800">
                  {exporting
                    ? "Exporting..."
                    : "Export ▾"}
                </summary>

                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-gray-800 bg-gray-900 shadow-2xl">
                  <button
                    type="button"
                    disabled={
                      !!exporting
                    }
                    onClick={(
                      event
                    ) => {
                      event.currentTarget
                        .closest(
                          "details"
                        )
                        ?.removeAttribute(
                          "open"
                        );

                      exportLibrary(
                        "csv"
                      );
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-gray-300 transition hover:bg-gray-800 hover:text-white disabled:opacity-50"
                  >
                    Export CSV
                  </button>

                  <button
                    type="button"
                    disabled={
                      !!exporting
                    }
                    onClick={(
                      event
                    ) => {
                      event.currentTarget
                        .closest(
                          "details"
                        )
                        ?.removeAttribute(
                          "open"
                        );

                      exportLibrary(
                        "xlsx"
                      );
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-gray-300 transition hover:bg-gray-800 hover:text-white disabled:opacity-50"
                  >
                    Export Excel
                  </button>

                  <button
                    type="button"
                    disabled={
                      !!exporting
                    }
                    onClick={(
                      event
                    ) => {
                      event.currentTarget
                        .closest(
                          "details"
                        )
                        ?.removeAttribute(
                          "open"
                        );

                      exportLibrary(
                        "json"
                      );
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-gray-300 transition hover:bg-gray-800 hover:text-white disabled:opacity-50"
                  >
                    Export JSON
                  </button>
                </div>
              </details>
            </div>
          </div>
        </header>

        {/* Library search */}
        <div className="relative mt-8">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
            />

            <path d="m20 20-3.5-3.5" />
          </svg>

          <input
            type="text"
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value
              )
            }
            placeholder="Search your library..."
            className="w-full rounded-xl border border-gray-800 bg-gray-900 py-3.5 pl-12 pr-4 text-white outline-none placeholder:text-gray-600 transition focus:border-gray-600"
          />
        </div>

        {/* Contextual filters */}
        <div className="mt-5 flex flex-wrap gap-2">
          {filter === "all" && (
            <button
              type="button"
              onClick={() =>
                setFilter("all")
              }
              className={getFilterButtonClass(
                true
              )}
            >
              All
            </button>
          )}

          {(filter === "movies" ||
            filter ===
              "rewatched-movies") && (
            <>
              <button
                type="button"
                onClick={() =>
                  setFilter("movies")
                }
                className={getFilterButtonClass(
                  filter === "movies"
                )}
              >
                All Movies
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter(
                    "rewatched-movies"
                  )
                }
                className={getFilterButtonClass(
                  filter ===
                    "rewatched-movies"
                )}
              >
                Rewatched Movies
              </button>
            </>
          )}

          {(filter === "tv" ||
            filter ===
              "rewatched-tv") && (
            <>
              <button
                type="button"
                onClick={() =>
                  setFilter("tv")
                }
                className={getFilterButtonClass(
                  filter === "tv"
                )}
              >
                All TV Shows
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter(
                    "rewatched-tv"
                  )
                }
                className={getFilterButtonClass(
                  filter === "rewatched-tv"
                )}
              >
                Rewatched TV
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filteredItems.length}{" "}
            {filteredItems.length === 1
              ? "title"
              : "titles"}
          </p>
        </div>

        {filteredItems.length ===
        0 ? (
          <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-2xl">
              🎬
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              No titles found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {query
                ? "Try a different search."
                : "Your library doesn't have any titles in this filter yet."}
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredItems.map(
              (item) => {
                const media =
                  item.media;

                const watchCount =
                  watchCounts[
                    media.id
                  ] || 0;

                const rewatchCount =
                  Math.max(
                    0,
                    watchCount - 1
                  );

                return (
                  <Link
                    key={item.id}
                    href={`/library/${item.id}`}
                    className="group min-w-0"
                  >
                    <div className="relative overflow-hidden rounded-xl bg-gray-900 shadow-lg ring-1 ring-white/[0.04]">
                      {media.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                          alt={
                            media.title
                          }
                          loading="lazy"
                          className="aspect-[2/3] w-full object-cover transition duration-500 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex aspect-[2/3] items-center justify-center bg-gray-800 text-sm text-gray-500">
                          No poster
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />

                      <div className="pointer-events-none absolute inset-0 bg-white/0 transition duration-300 group-hover:bg-white/[0.05]" />

                      {/* Type */}
                      <div className="absolute left-3 top-3">
                        <span className="rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-200 shadow backdrop-blur-md">
                          {media.type ===
                          "movie"
                            ? "Movie"
                            : "TV"}
                        </span>
                      </div>

                      {/* TMDB rating */}
                      {media.tmdb_rating !==
                        null && (
                        <div className="absolute right-3 top-3">
                          <span className="rounded-md bg-black/75 px-2 py-1 text-xs font-semibold text-white shadow backdrop-blur-md">
                            ⭐{" "}
                            {Number(
                              media.tmdb_rating
                            ).toFixed(
                              1
                            )}
                          </span>
                        </div>
                      )}

                      {/* Rewatch */}
                      {rewatchCount >
                        0 && (
                        <div className="absolute bottom-3 left-3">
                          <span className="rounded-md bg-black/75 px-2 py-1 text-xs font-medium text-gray-200 shadow backdrop-blur-md">
                            ↻{" "}
                            {
                              rewatchCount
                            }{" "}
                            {rewatchCount ===
                            1
                              ? "rewatch"
                              : "rewatches"}
                          </span>
                        </div>
                      )}

                      {/* Arrow */}
                      <div className="absolute bottom-3 right-3 flex h-8 w-8 translate-y-2 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </div>
                    </div>

                    <div className="mt-3">
                      <h2 className="truncate text-sm font-semibold text-gray-100 transition group-hover:text-white">
                        {
                          media.title
                        }
                      </h2>

                      <p className="mt-1 text-xs text-gray-500">
                        {media.release_date?.slice(
                          0,
                          4
                        ) ||
                          "Unknown"}

                        <span className="mx-1.5 text-gray-700">
                          ·
                        </span>

                        {media.type ===
                        "movie"
                          ? "Movie"
                          : "TV"}
                      </p>

                      <p className="mt-1 text-xs text-gray-600">
                        Added{" "}
                        {new Date(
                          item.created_at
                        ).toLocaleDateString(
                          undefined,
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ADD TO LIBRARY MODAL */}
      {/* ========================================================= */}

      {isOwner && showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAddModal();
            }
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Add to Library
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Search for a movie
                  or TV show
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeAddModal
                }
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-gray-500 transition hover:bg-gray-800 hover:text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-gray-800 p-5">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />

                  <path d="m20 20-3.5-3.5" />
                </svg>

                <input
                  autoFocus
                  type="text"
                  value={addQuery}
                  onChange={(
                    event
                  ) =>
                    setAddQuery(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search movies and TV shows..."
                  className="w-full rounded-xl border border-gray-800 bg-gray-900 py-3.5 pl-12 pr-4 text-white outline-none placeholder:text-gray-600 transition focus:border-gray-600"
                />
              </div>

              {addError && (
                <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                  {addError}
                </div>
              )}
            </div>

            {/* Results */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!addQuery.trim() ? (
                <div className="px-5 py-12 text-center">
                  <div className="text-3xl">
                    🎬
                  </div>

                  <p className="mt-4 text-sm text-gray-500">
                    Start typing to
                    search TMDB.
                  </p>
                </div>
              ) : searching ? (
                <div className="space-y-2 p-2">
                  {Array.from({
                    length: 4,
                  }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className="flex animate-pulse items-center gap-4 rounded-xl p-3"
                      >
                        <div className="h-20 w-14 rounded-lg bg-gray-900" />

                        <div className="flex-1">
                          <div className="h-4 w-2/3 rounded bg-gray-900" />

                          <div className="mt-3 h-3 w-24 rounded bg-gray-900" />
                        </div>

                        <div className="h-9 w-14 rounded-lg bg-gray-900" />
                      </div>
                    )
                  )}
                </div>
              ) : addResults.length ===
                0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm text-gray-500">
                    No movies or TV
                    shows found.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {addResults.map(
                    (result) => (
                      <div
                        key={`${result.type}-${result.tmdb_id}`}
                        className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-gray-900"
                      >
                        {/* Poster */}
                        {result.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${result.poster_path}`}
                            alt={
                              result.title
                            }
                            className="h-20 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-center text-[10px] text-gray-600">
                            No poster
                          </div>
                        )}

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-medium text-white">
                            {
                              result.title
                            }
                          </h3>

                          <p className="mt-1 text-xs text-gray-500">
                            {result.year ||
                              "Unknown"}

                            <span className="mx-1.5 text-gray-700">
                              ·
                            </span>

                            {result.type ===
                            "movie"
                              ? "Movie"
                              : "TV Show"}
                          </p>
                        </div>

                        {/* Add */}
                        <button
                          type="button"
                          onClick={() =>
                            addToLibrary(
                              result
                            )
                          }
                          disabled={
                            addingId ===
                            result.tmdb_id
                          }
                          className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {addingId ===
                          result.tmdb_id
                            ? "Adding..."
                            : "Add"}
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}