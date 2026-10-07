"use client";

import { useEffect, useState } from "react";

type LibraryItem = {
  id: number;
  status: "watchlist" | "watching" | "completed" | "dropped";
  rating: number | null;
  notes: string | null;
  created_at: string;
  media: {
    id: number;
    title: string;
    type: "movie" | "tv";
    poster_path: string | null;
    release_date: string | null;
  };
};

type WatchCounts = Record<number, number>;

type LibraryStats = {
  movies: number;
  tvShows: number;
  rewatchedMovies: number;
  rewatchedTVShows: number;
  totalWatches: number;
  ratings: number;
  averageRating: number | null;
};

type Filter =
  | "all"
  | "movies"
  | "tv"
  | "rewatched-movies"
  | "rewatched-tv";

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [watchCounts, setWatchCounts] =
    useState<WatchCounts>({});

  const [stats, setStats] =
    useState<LibraryStats | null>(null);

  const [filter, setFilter] =
    useState<Filter>("all");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] =
    useState<number | null>(null);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/library");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load library"
        );
      }

      const loadedItems: LibraryItem[] =
        data.items || [];

      const loadedWatchCounts: WatchCounts =
        data.watchCounts || {};

      setItems(loadedItems);
      setWatchCounts(loadedWatchCounts);

      calculateStats(
        loadedItems,
        loadedWatchCounts
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(
    libraryItems: LibraryItem[],
    counts: WatchCounts
  ) {
    const movies = libraryItems.filter(
      (item) => item.media.type === "movie"
    ).length;

    const tvShows = libraryItems.filter(
      (item) => item.media.type === "tv"
    ).length;

    const rewatchedMovies =
      libraryItems.filter(
        (item) =>
          item.media.type === "movie" &&
          (counts[item.media.id] || 0) > 1
      ).length;

    const rewatchedTVShows =
      libraryItems.filter(
        (item) =>
          item.media.type === "tv" &&
          (counts[item.media.id] || 0) > 1
      ).length;

    const totalWatches =
      Object.values(counts).reduce(
        (total, count) => total + count,
        0
      );

    const ratedItems = libraryItems.filter(
      (item) => item.rating !== null
    );

    const averageRating =
      ratedItems.length > 0
        ? ratedItems.reduce(
            (total, item) =>
              total + Number(item.rating),
            0
          ) / ratedItems.length
        : null;

    setStats({
      movies,
      tvShows,
      rewatchedMovies,
      rewatchedTVShows,
      totalWatches,
      ratings: ratedItems.length,
      averageRating,
    });
  }

  async function addWatch(mediaId: number) {
    if (updating === mediaId) {
      return;
    }

    setUpdating(mediaId);
    setError("");

    try {
      const response = await fetch(
        "/api/library/watch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            media_id: mediaId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to record watch"
        );
      }

      setWatchCounts((currentCounts) => {
        const currentCount =
          currentCounts[mediaId] || 0;

        const newCounts = {
          ...currentCounts,
          [mediaId]: currentCount + 1,
        };

        calculateStats(items, newCounts);

        return newCounts;
      });
    } catch (error) {
      console.error("Add watch error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to record watch"
      );
    } finally {
      setUpdating(null);
    }
  }

  // --------------------------------------------------
  // FILTER BY TYPE / REWATCH STATUS
  // --------------------------------------------------

  const filterItems = items.filter((item) => {
    const watchCount =
      watchCounts[item.media.id] || 0;

    switch (filter) {
      case "movies":
        return item.media.type === "movie";

      case "tv":
        return item.media.type === "tv";

      case "rewatched-movies":
        return (
          item.media.type === "movie" &&
          watchCount > 1
        );

      case "rewatched-tv":
        return (
          item.media.type === "tv" &&
          watchCount > 1
        );

      case "all":
      default:
        return true;
    }
  });

  // --------------------------------------------------
  // SEARCH WITHIN CURRENT FILTER
  // --------------------------------------------------

  const normalizedSearch =
    search.trim().toLowerCase();

  const filteredItems = filterItems.filter((item) => {
    if (!normalizedSearch) {
      return true;
    }

    return item.media.title
      .toLowerCase()
      .includes(normalizedSearch);
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 p-8 text-white">
        <p className="text-gray-400">
          Loading library...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* HEADER */}
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <a
                href="/"
                className="text-sm text-gray-400 hover:text-white"
              >
                ← Back to search
              </a>

              <h1 className="mt-4 text-4xl font-bold">
                My Library
              </h1>

              <p className="mt-2 text-gray-400">
                {items.length}{" "}
                {items.length === 1
                  ? "title"
                  : "titles"}
              </p>
            </div>

            <a
              href="/"
              className="rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-black hover:bg-gray-200"
            >
              + Add Title
            </a>

          </div>
        </header>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-900 bg-red-950 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* DASHBOARD */}
        {stats && (
          <section className="mb-10">

            <h2 className="mb-4 text-xl font-semibold">
              Dashboard
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">

              <StatCard
                label="Movies"
                value={stats.movies}
              />

              <StatCard
                label="TV Shows"
                value={stats.tvShows}
              />

              <StatCard
                label="Rewatched Movies"
                value={stats.rewatchedMovies}
              />

              <StatCard
                label="Rewatched TV"
                value={stats.rewatchedTVShows}
              />

              <StatCard
                label="Total Watches"
                value={stats.totalWatches}
              />

              <StatCard
                label="Avg Rating"
                value={
                  stats.averageRating !== null
                    ? stats.averageRating.toFixed(1)
                    : "—"
                }
              />

            </div>
          </section>
        )}

        {/* SEARCH */}
        <section className="mb-5">

          <div className="relative">

            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
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
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search your library..."
              className="w-full rounded-xl border border-gray-800 bg-gray-900 py-3 pl-12 pr-12 text-white outline-none placeholder:text-gray-500 focus:border-gray-600"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                ×
              </button>
            )}

          </div>

        </section>

        {/* FILTERS */}
        <section className="mb-8">

          <div className="flex flex-wrap gap-2">

            <FilterButton
              label="All"
              active={filter === "all"}
              onClick={() => setFilter("all")}
              count={items.length}
            />

            <FilterButton
              label="Movies"
              active={filter === "movies"}
              onClick={() => setFilter("movies")}
              count={stats?.movies}
            />

            <FilterButton
              label="TV Shows"
              active={filter === "tv"}
              onClick={() => setFilter("tv")}
              count={stats?.tvShows}
            />

            <FilterButton
              label="Rewatched Movies"
              active={filter === "rewatched-movies"}
              onClick={() =>
                setFilter("rewatched-movies")
              }
              count={stats?.rewatchedMovies}
            />

            <FilterButton
              label="Rewatched TV"
              active={filter === "rewatched-tv"}
              onClick={() =>
                setFilter("rewatched-tv")
              }
              count={stats?.rewatchedTVShows}
            />

          </div>

        </section>

        {/* RESULTS HEADER */}
        <div className="mb-5 flex items-center justify-between">

          <div>
            <h2 className="text-xl font-semibold">
              {getFilterTitle(filter)}
            </h2>

            {search.trim() && (
              <p className="mt-1 text-sm text-gray-500">
                Searching for "{search}"
              </p>
            )}
          </div>

          <p className="text-sm text-gray-500">
            {filteredItems.length}{" "}
            {filteredItems.length === 1
              ? "title"
              : "titles"}
          </p>

        </div>

        {/* RESULTS */}
        {filteredItems.length === 0 ? (

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center">

            <p className="text-gray-400">
              {search.trim()
                ? "No titles match your search."
                : "No titles found for this filter."}
            </p>

            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200"
              >
                Clear Search
              </button>
            )}

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">

            {filteredItems.map((item) => {
              const media = item.media;

              const watchCount =
                watchCounts[media.id] || 0;

              const rewatchCount =
                Math.max(0, watchCount - 1);

              const isUpdating =
                updating === media.id;

              return (
                <article
  key={item.id}
  className="overflow-hidden rounded-xl bg-gray-900"
>
  <a
    href={`/library/${item.id}`}
    className="block"
  >
    {media.poster_path ? (
      <img
        src={`https://image.tmdb.org/t/p/w342${media.poster_path}`}
        alt={media.title}
        className="aspect-[2/3] w-full object-cover transition hover:opacity-80"
      />
    ) : (
      <div className="flex aspect-[2/3] items-center justify-center bg-gray-800 text-sm text-gray-500">
        No poster
      </div>
    )}
  </a>

  <div className="p-4">
    <h2 className="line-clamp-2 font-semibold">
      {media.title}
    </h2>

    <p className="mt-1 text-sm text-gray-400">
      {media.release_date?.slice(0, 4) || "Unknown"}{" "}
      ·{" "}
      {media.type === "movie" ? "Movie" : "TV"}
    </p>

    <p className="mt-2 text-xs text-gray-500">
      Added{" "}
      {new Date(item.created_at).toLocaleDateString(
        undefined,
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      )}
    </p>
  </div>
</article>
//                 <article
//                   key={item.id}
//                   className="overflow-hidden rounded-xl bg-gray-900"
//                 >

//                   {/* POSTER */}
//                   {/* {media.poster_path ? (
//                     <img
//                       src={`https://image.tmdb.org/t/p/w342${media.poster_path}`}
//                       alt={media.title}
//                       className="aspect-[2/3] w-full object-cover"
//                     />
//                   ) : (
//                     <div className="flex aspect-[2/3] items-center justify-center bg-gray-800 text-sm text-gray-500">
//                       No poster
//                     </div>
//                   )} */}
//                   <a
//   href={`/library/${item.id}`}
//   className="block"
// >
//   {media.poster_path ? (
//     <img
//       src={`https://image.tmdb.org/t/p/w342${media.poster_path}`}
//       alt={media.title}
//       className="aspect-[2/3] w-full object-cover transition hover:opacity-80"
//     />
//   ) : (
//     <div className="flex aspect-[2/3] items-center justify-center bg-gray-800 text-sm text-gray-500">
//       No poster
//     </div>
//   )}
// </a>

//                   <div className="p-4">

//                     {/* TITLE */}
//                     <h2 className="line-clamp-2 font-semibold">
//                       {media.title}
//                     </h2>

//                     {/* YEAR / TYPE */}
//                     <p className="mt-1 text-sm text-gray-400">
//                       {media.release_date?.slice(0, 4) ||
//                         "Unknown"}{" "}
//                       ·{" "}
//                       {media.type === "movie"
//                         ? "Movie"
//                         : "TV"}
//                     </p>

//                     {/* STATUS */}
//                     <span className="mt-3 inline-block rounded-full bg-gray-800 px-2.5 py-1 text-xs capitalize text-gray-300">
//                       {item.status}
//                     </span>

//                     {/* WATCH COUNTER */}
//                     <div className="mt-4 border-t border-gray-800 pt-4">

//                       <p className="text-sm text-gray-300">
//                         Watched{" "}
//                         <span className="font-semibold text-white">
//                           {watchCount}
//                         </span>{" "}
//                         {watchCount === 1
//                           ? "time"
//                           : "times"}
//                       </p>

//                       <p className="mt-1 text-xs text-gray-500">
//                         Rewatches: {rewatchCount}
//                       </p>

//                       {/* COUNTER */}
//                       {/* <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-800">

//                         <button
//                           type="button"
//                           disabled
//                           className="px-4 py-2 text-gray-600"
//                         >
//                           −
//                         </button>

//                         <span className="text-sm font-medium">
//                           {rewatchCount}
//                         </span>

//                         <button
//                           type="button"
//                           onClick={() =>
//                             addWatch(media.id)
//                           }
//                           disabled={isUpdating}
//                           className="px-4 py-2 text-lg text-white hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
//                         >
//                           {isUpdating ? "..." : "+"}
//                         </button>

//                       </div>
//  */}
//                     </div>
//                   </div>
//                 </article>
              );
            })}

          </div>
        )}

      </div>
    </main>
  );
}

function getFilterTitle(filter: Filter) {
  switch (filter) {
    case "movies":
      return "Movies";

    case "tv":
      return "TV Shows";

    case "rewatched-movies":
      return "Rewatched Movies";

    case "rewatched-tv":
      return "Rewatched TV Shows";

    case "all":
    default:
      return "All Titles";
  }
}

function FilterButton({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-white bg-white text-black"
          : "border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-600 hover:text-white"
      }`}
    >
      {label}

      {count !== undefined && (
        <span
          className={`ml-2 ${
            active
              ? "text-gray-600"
              : "text-gray-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-sm text-gray-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}