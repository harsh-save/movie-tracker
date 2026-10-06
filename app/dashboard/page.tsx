"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  totals: {
    titles: number;
    movies: number;
    tvShows: number;
    totalWatches: number;
    rewatches: number;
    ratings: number;
    averageRating: number | null;
  };

  status: {
    completed: number;
    watching: number;
    watchlist: number;
    dropped: number;
  };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const response = await fetch("/api/dashboard");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to load dashboard"
        );
      }

      setData(result);
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 p-8 text-white">
        <p className="text-gray-400">
          Loading dashboard...
        </p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gray-950 p-8 text-white">
        <p className="text-red-400">
          {error || "Failed to load dashboard"}
        </p>
      </main>
    );
  }

  const { totals, status } = data;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">

        <header className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              Dashboard
            </h1>

            <p className="mt-2 text-gray-400">
              Your watching statistics
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/"
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-900"
            >
              Search
            </a>

            <a
              href="/library"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200"
            >
              Library
            </a>
          </div>
        </header>

        {/* Main statistics */}

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">

          <StatCard
            label="Total Titles"
            value={totals.titles}
          />

          <StatCard
            label="Movies"
            value={totals.movies}
          />

          <StatCard
            label="TV Shows"
            value={totals.tvShows}
          />

          <StatCard
            label="Total Watches"
            value={totals.totalWatches}
          />

          <StatCard
            label="Rewatches"
            value={totals.rewatches}
          />

          <StatCard
            label="Ratings"
            value={totals.ratings}
          />

          <StatCard
            label="Average Rating"
            value={
              totals.averageRating === null
                ? "—"
                : totals.averageRating.toFixed(1)
            }
          />

          <StatCard
            label="Completed"
            value={status.completed}
          />

        </section>

        {/* Library status */}

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">
            Library Status
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

            <StatusCard
              label="Completed"
              value={status.completed}
            />

            <StatusCard
              label="Watching"
              value={status.watching}
            />

            <StatusCard
              label="Watchlist"
              value={status.watchlist}
            />

            <StatusCard
              label="Dropped"
              value={status.dropped}
            />

          </div>
        </section>

        {/* Watch summary */}

        <section className="mt-10 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-xl font-semibold">
            Watch Summary
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-6">

            <div>
              <p className="text-sm text-gray-400">
                Total watches
              </p>

              <p className="mt-1 text-3xl font-bold">
                {totals.totalWatches}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-400">
                Rewatches
              </p>

              <p className="mt-1 text-3xl font-bold">
                {totals.rewatches}
              </p>
            </div>

          </div>
        </section>

      </div>
    </main>
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

function StatusCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-sm text-gray-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}