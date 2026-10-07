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
        <div className="mx-auto max-w-5xl px-6 py-12">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (error && !item) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <p className="text-red-400">{error}</p>

          <button
            onClick={() => router.push("/library")}
            className="mt-4 text-sm text-gray-400 hover:text-white"
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

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Back */}
        <button
          onClick={() => router.push("/library")}
          className="mb-8 text-sm text-gray-400 transition hover:text-white"
        >
          ← Back to library
        </button>

        {/* Main information */}
        <div className="grid gap-8 md:grid-cols-[280px_1fr]">
          {/* Poster */}
          <div>
            {media.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                alt={media.title}
                className="w-full rounded-xl object-cover shadow-2xl"
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center rounded-xl bg-gray-800 text-gray-500">
                No poster
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 className="text-4xl font-bold">
              {media.title}
            </h1>

            <p className="mt-3 text-gray-400">
              {media.release_date?.slice(0, 4) ||
                "Unknown"}{" "}
              ·{" "}
              {media.type === "movie"
                ? "Movie"
                : "TV"}
            </p>

            {/* Metadata */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {media.tmdb_rating !== null && (
                <span className="rounded-lg bg-gray-900 px-4 py-2 text-sm">
                  ⭐ {Number(media.tmdb_rating).toFixed(1)}
                  <span className="ml-2 text-gray-500">
                    TMDB
                  </span>
                </span>
              )}

              {formattedRuntime && (
                <span className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-gray-300">
                  🕒 {formattedRuntime}
                </span>
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-full border border-gray-700 px-3 py-1 text-sm text-gray-300"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {/* Added date */}
            <p className="mt-6 text-sm text-gray-500">
              Added{" "}
              {new Date(
                item.created_at
              ).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>

            {/* Status */}
            <div className="mt-6">
              <p className="text-sm text-gray-500">
                Status
              </p>

              <p className="mt-1 capitalize text-gray-200">
                {item.status}
              </p>
            </div>

            {/* Personal rating */}
            {/* <div className="mt-5">
              <p className="text-sm text-gray-500">
                My Rating
              </p>

              <p className="mt-1 text-lg font-semibold">
                {item.rating !== null
                  ? `${Number(item.rating).toFixed(1)} / 10`
                  : "Not rated"}
              </p>
            </div> */}
          </div>
        </div>

        {/* Description */}
        {media.overview && (
          <section className="mt-10 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-lg font-semibold">
              Description
            </h2>

            <p className="mt-3 leading-7 text-gray-400">
              {media.overview}
            </p>
          </section>
        )}

        {/* Watch history */}
        <section className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold">
            Watch History
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-800 p-4">
              <p className="text-sm text-gray-400">
                Total Watches
              </p>

              <p className="mt-2 text-3xl font-bold">
                {watchCount}
              </p>
            </div>

            <div className="rounded-lg bg-gray-800 p-4">
              <p className="text-sm text-gray-400">
                Rewatches
              </p>

              <p className="mt-2 text-3xl font-bold">
                {rewatchCount}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm text-gray-400">
              Rewatch counter
            </p>

            <div className="flex items-center justify-between rounded-lg bg-gray-800">
              <button
                type="button"
                onClick={removeWatch}
                disabled={
                  updating ||
                  rewatchCount <= 0
                }
                className="px-6 py-3 text-xl text-white hover:text-gray-300 disabled:cursor-not-allowed disabled:text-gray-600"
              >
                −
              </button>

              <span className="text-lg font-semibold">
                {rewatchCount}
              </span>

              <button
                type="button"
                onClick={addWatch}
                disabled={updating}
                className="px-6 py-3 text-xl text-white hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updating ? "..." : "+"}
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Press + whenever you watch this title
              again.
            </p>
          </div>
        </section>

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Delete */}
        <div className="mt-8 border-t border-gray-800 pt-8">
          <button
            type="button"
            onClick={deleteFromLibrary}
            className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 transition hover:border-red-700 hover:bg-red-950 hover:text-red-300"
          >
            Delete from Library
          </button>
        </div>
      </div>
    </main>
  );
}