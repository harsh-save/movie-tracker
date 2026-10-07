"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Genre = {
  id: number;
  name: string;
};

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
    backdrop_path: string | null;
    overview: string | null;
    release_date: string | null;
    tmdb_rating: number | null;
    runtime: number | null;
    media_genres: {
      genres: Genre | null;
    }[];
  };
};

export default function LibraryDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [item, setItem] = useState<LibraryItem | null>(null);
  const [watchCount, setWatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadItem() {
      try {
        const response = await fetch("/api/library");

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to load library"
          );
        }

        const libraryItem = data.items.find(
          (entry: LibraryItem) =>
            entry.id === Number(params.id)
        );

        if (!libraryItem) {
          throw new Error("Title not found");
        }

        setItem(libraryItem);

        const count =
          data.watchCounts?.[libraryItem.media.id] || 0;

        setWatchCount(count);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load title"
        );
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [params.id]);

  async function addWatch() {
    if (!item) {
      return;
    }

    setUpdating(true);
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
            media_id: item.media.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to record watch"
        );
      }

      setWatchCount((current) => current + 1);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to record watch"
      );
    } finally {
      setUpdating(false);
    }
  }

  async function removeWatch() {
    if (!item || watchCount <= 1) {
      return;
    }

    setUpdating(true);
    setError("");

    try {
      const response = await fetch(
        `/api/library/watch?media_id=${item.media.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to remove rewatch"
        );
      }

      setWatchCount((current) =>
        Math.max(1, current - 1)
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to remove rewatch"
      );
    } finally {
      setUpdating(false);
    }
  }

  async function deleteFromLibrary() {
    if (!item) {
      return;
    }

    const confirmed = window.confirm(
      `Remove "${item.media.title}" from your library?`
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `/api/library?id=${item.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to remove from library"
        );
      }

      router.push("/library");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to remove from library"
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-32 rounded bg-gray-800" />
            <div className="h-[500px] rounded-2xl bg-gray-900" />
          </div>
        </div>
      </main>
    );
  }

  if (error && !item) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-red-400">{error}</p>

          <button
            onClick={() => router.push("/library")}
            className="mt-4 text-sm text-gray-400 transition hover:text-white"
          >
            ← Back to library
          </button>
        </div>
      </main>
    );
  }

  if (!item) {
    return null;
  }

  const media = item.media;

  const rewatchCount = Math.max(
    0,
    watchCount - 1
  );

  const genres =
    media.media_genres
      ?.map((item) => item.genres)
      .filter(
        (genre): genre is Genre => genre !== null
      ) || [];

  const formattedRuntime =
    media.runtime && media.runtime > 0
      ? `${Math.floor(media.runtime / 60)}h ${
          media.runtime % 60
        }m`
      : null;

  const backdropUrl = media.backdrop_path
    ? `https://image.tmdb.org/t/p/original${media.backdrop_path}`
    : null;

  const year =
    media.release_date?.slice(0, 4) || "Unknown";

  const formattedAddedDate = new Date(
    item.created_at
  ).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative min-h-[620px] overflow-hidden">
        {/* Backdrop */}
        {backdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url("${backdropUrl}")`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gray-900" />
        )}

        {/* Dark overlays */}
        <div className="absolute inset-0 bg-black/60" />

        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-black/20" />

        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/50 to-transparent" />

        {/* Hero content */}
        <div className="relative mx-auto max-w-6xl px-6 py-8">
          {/* Back */}
          <button
            onClick={() => router.push("/library")}
            className="mb-12 text-sm font-medium text-gray-300 transition hover:text-white"
          >
            ← Back to library
          </button>

          <div className="grid items-end gap-8 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr]">
            {/* Poster */}
            <div className="mx-auto w-full max-w-[300px] md:mx-0">
              {media.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                  alt={media.title}
                  className="w-full rounded-2xl object-cover shadow-2xl ring-1 ring-white/10"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center rounded-2xl bg-gray-800 text-gray-500">
                  No poster
                </div>
              )}
            </div>

            {/* Information */}
            <div className="pb-2">
              {/* Type badge */}
              <div className="mb-4">
                <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-200 backdrop-blur">
                  {media.type === "movie"
                    ? "Movie"
                    : "TV Show"}
                </span>
              </div>

              {/* Title */}
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {media.title}
              </h1>

              {/* Basic metadata */}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-300">
                <span>{year}</span>

                <span className="text-gray-600">
                  •
                </span>

                <span>
                  {media.type === "movie"
                    ? "Movie"
                    : "TV Show"}
                </span>

                {formattedRuntime && (
                  <>
                    <span className="text-gray-600">
                      •
                    </span>

                    <span>
                      {formattedRuntime}
                    </span>
                  </>
                )}
              </div>

              {/* Rating */}
              {media.tmdb_rating !== null && (
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-black/50 px-4 py-2.5 backdrop-blur">
                    <span className="text-lg">
                      ⭐
                    </span>

                    <span className="text-lg font-semibold">
                      {Number(
                        media.tmdb_rating
                      ).toFixed(1)}
                    </span>

                    <span className="text-sm text-gray-400">
                      / 10
                    </span>

                    <span className="ml-1 text-xs uppercase tracking-wider text-gray-500">
                      TMDB
                    </span>
                  </div>
                </div>
              )}

              {/* Genres */}
              {genres.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-sm text-gray-300 backdrop-blur"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Added date */}
              <p className="mt-6 text-sm text-gray-500">
                Added to library{" "}
                <span className="text-gray-300">
                  {formattedAddedDate}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CONTENT
      ====================================================== */}
      <div className="mx-auto max-w-6xl px-6 pb-16">
        {/* Description */}
        {media.overview && (
          <section className="border-b border-gray-800 py-10">
            <h2 className="text-xl font-semibold">
              Overview
            </h2>

            <p className="mt-4 max-w-4xl text-base leading-8 text-gray-400">
              {media.overview}
            </p>
          </section>
        )}

        {/* Watch information */}
        <section className="py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
                Your Library
              </p>

              <h2 className="mt-1 text-2xl font-semibold">
                Watch History
              </h2>
            </div>

            {/* Status */}
            <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Status
              </p>

              <p className="mt-1 capitalize text-gray-200">
                {item.status}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-sm text-gray-500">
                Total Watches
              </p>

              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-bold">
                  {watchCount}
                </span>

                <span className="mb-1 text-sm text-gray-500">
                  {watchCount === 1
                    ? "watch"
                    : "watches"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-sm text-gray-500">
                Rewatches
              </p>

              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-bold">
                  {rewatchCount}
                </span>

                <span className="mb-1 text-sm text-gray-500">
                  {rewatchCount === 1
                    ? "rewatch"
                    : "rewatches"}
                </span>
              </div>
            </div>
          </div>

          {/* Rewatch controls */}
          <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium">
                  Rewatch counter
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Add a watch whenever you watch this
                  title again.
                </p>
              </div>

              <div className="flex h-12 items-center overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
                <button
                  type="button"
                  onClick={removeWatch}
                  disabled={
                    updating ||
                    rewatchCount <= 0
                  }
                  aria-label="Remove rewatch"
                  className="flex h-full w-14 items-center justify-center text-2xl text-gray-300 transition hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:text-gray-700 disabled:hover:bg-transparent"
                >
                  −
                </button>

                <div className="flex h-full min-w-16 items-center justify-center border-x border-gray-800 px-4">
                  <span className="font-semibold">
                    {rewatchCount}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={addWatch}
                  disabled={updating}
                  aria-label="Add rewatch"
                  className="flex h-full w-14 items-center justify-center text-2xl text-gray-300 transition hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updating ? "…" : "+"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Delete */}
        <section className="border-t border-gray-800 pt-8">
          <button
            type="button"
            onClick={deleteFromLibrary}
            className="rounded-lg border border-red-900 px-4 py-2.5 text-sm text-red-400 transition hover:border-red-700 hover:bg-red-950 hover:text-red-300"
          >
            Delete from Library
          </button>
        </section>
      </div>
    </main>
  );
}