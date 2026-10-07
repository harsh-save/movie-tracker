"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
//      id: number;
//   title: string;
//   type: "movie" | "tv";
//   poster_path: string | null;
//   backdrop_path: string | null;
//   overview: string | null;
//   release_date: string | null;
//   tmdb_rating: number | null;
//   runtime: number | null;
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
    loadItem();
  }, []);
/////////////////////////////////////////////////////////////
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

async function removeWatch() {
  if (!item || updating || watchCount <= 1) {
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
/////////////////////////////////////////////////////////////////
  async function loadItem() {
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

      const libraryItem = data.items?.find(
        (entry: LibraryItem) =>
          entry.id === Number(params.id)
      );

      if (!libraryItem) {
        throw new Error(
          "Title not found in your library"
        );
      }

      setItem(libraryItem);

      setWatchCount(
        data.watchCounts?.[libraryItem.media.id] || 0
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

  async function addWatch() {
    if (!item || updating) {
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 p-8 text-white">
        <p className="text-gray-400">
          Loading...
        </p>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="min-h-screen bg-gray-950 p-8 text-white">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-400 hover:text-white"
          >
            ← Back
          </button>

          <p className="mt-8 text-red-400">
            {error || "Title not found"}
          </p>
        </div>
      </main>
    );
  }

  const { media } = item;

  const year =
    media.release_date?.slice(0, 4) || "Unknown";

  // The first watch is the original watch.
  // Everything after that is a rewatch.
  const rewatchCount = Math.max(
    0,
    watchCount - 1
  );

  const addedDate = new Date(
    item.created_at
  ).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">

        <button
          onClick={() => router.back()}
          className="mb-8 text-sm text-gray-400 hover:text-white"
        >
          ← Back to library
        </button>

        <div className="grid gap-8 md:grid-cols-[280px_1fr]">

          {/* Poster */}
          <div>
            {media.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                alt={media.title}
                className="w-full rounded-xl shadow-2xl"
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

            <p className="mt-2 text-gray-400">
              {year} ·{" "}
              {media.type === "movie"
                ? "Movie"
                : "TV Show"}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Added {addedDate}
            </p>

            <span className="mt-4 inline-block rounded-full bg-gray-800 px-3 py-1 text-sm capitalize text-gray-300">
              {item.status}
            </span>

            {/* Rating */}
            <div className="mt-8">
              <h2 className="text-sm font-medium text-gray-400">
                Rating
              </h2>

              <p className="mt-1 text-2xl font-semibold">
                {item.rating !== null
                  ? `${item.rating}/10`
                  : "Not rated"}
              </p>
            </div>

            {/* Description */}
            {media.overview && (
              <div className="mt-8">
                <h2 className="text-sm font-medium text-gray-400">
                  Description
                </h2>

                <p className="mt-2 leading-7 text-gray-300">
                  {media.overview}
                </p>
              </div>
            )}

            {/* Watch / Rewatch */}
            <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
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
  disabled={updating || rewatchCount <= 0}
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
            </div>

            {/* Delete */}
            {/* <button
              type="button"
              disabled
              className="mt-8 rounded-lg border border-red-900 px-5 py-3 text-sm text-red-400 opacity-50"
            >
              Delete from Library
            </button> */}
            <button
  type="button"
  onClick={deleteFromLibrary}
  className="mt-8 rounded-lg border border-red-900 px-5 py-3 text-sm text-red-400 transition hover:border-red-700 hover:bg-red-950 hover:text-red-300"
>
  Delete from Library
</button>

            {error && (
              <p className="mt-4 text-red-400">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}