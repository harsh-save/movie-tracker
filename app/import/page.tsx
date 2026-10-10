"use client";

import { useEffect, useState } from "react";

type ImportItem = {
  tmdb_id: number;
  type: "movie" | "tv";
   date_added?: string;
};

type ImportFile = {
  movies?: ImportItem[];
  tv?: ImportItem[];
};

type ImportResult = {
  tmdb_id: number;
  type: "movie" | "tv";
  title?: string;
  success: boolean;
  message: string;
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

const [isOwner, setIsOwner] = useState(false);
const [checkingOwner, setCheckingOwner] = useState(true);

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
    } finally {
      if (active) {
        setCheckingOwner(false);
      }
    }
  }

  checkOwner();

  return () => {
    active = false;
  };
}, []);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);
    setError("");
    setResults([]);
    setProgress(0);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result;

        if (typeof text !== "string") {
          throw new Error("Could not read the file");
        }

        const data: ImportFile = JSON.parse(text);

        const movies = Array.isArray(data.movies)
          ? data.movies.map((item) => ({
              ...item,
              type: "movie" as const,
            }))
          : [];

        const tv = Array.isArray(data.tv)
          ? data.tv.map((item) => ({
              ...item,
              type: "tv" as const,
            }))
          : [];

        const allItems = [...movies, ...tv];

        if (allItems.length === 0) {
          throw new Error(
            "The JSON file does not contain any movies or TV shows."
          );
        }

        const invalidItem = allItems.find(
          (item) =>
            !Number.isInteger(item.tmdb_id) ||
            item.tmdb_id <= 0
        );

        if (invalidItem) {
          throw new Error(
            "Every item must have a valid tmdb_id."
          );
        }

        setItems(allItems);
      } catch (error) {
        setItems([]);
        setError(
          error instanceof Error
            ? error.message
            : "Invalid JSON file"
        );
      }
    };

    reader.readAsText(selectedFile);
  }

  async function startImport() {
    if (items.length === 0) {
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setProgress(0);

    const importResults: ImportResult[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        const response = await fetch("/api/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(item),
        });

        const data = await response.json();

        importResults.push({
          tmdb_id: item.tmdb_id,
          type: item.type,
          title: data.title,
          success: response.ok && data.success,
          message:
            data.message ||
            data.error ||
            "Unknown result",
        });
      } catch (error) {
        importResults.push({
          tmdb_id: item.tmdb_id,
          type: item.type,
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Import failed",
        });
      }

      setResults([...importResults]);
      setProgress(
        Math.round(((i + 1) / items.length) * 100)
      );
    }

    setLoading(false);
  }

  const successful = results.filter(
    (result) => result.success
  ).length;

  const failed = results.filter(
    (result) => !result.success
  ).length;

  if (checkingOwner) {
  return (
    <main className="min-h-screen bg-gray-950 px-6 py-12 text-white">
      <p className="text-sm text-gray-400">
        Checking permissions…
      </p>
    </main>
  );
}

if (!isOwner) {
  return (
    <main className="min-h-screen bg-gray-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">
          Import Library
        </h1>

        <p className="mt-3 text-gray-400">
          Sign in as the library owner to import data.
        </p>

        <a
          href="/login?next=%2Fimport"
          className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
        >
          Sign in
        </a>
      </div>
    </main>
  );
}
  return (
    
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <button
          onClick={() => window.history.back()}
          className="mb-8 text-sm text-gray-400 hover:text-white"
        >
          ← Back
        </button>

        <h1 className="text-4xl font-bold">
          Bulk Import
        </h1>

        <p className="mt-2 text-gray-400">
          Import movies and TV shows using their TMDB IDs.
        </p>

        {/* Upload */}
        <section className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold">
            JSON File
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Upload a JSON file containing movies and TV
            shows.
          </p>

          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-700 bg-gray-950 px-6 py-10 transition hover:border-gray-500">
            <span className="text-sm text-gray-300">
              {file
                ? file.name
                : "Click to select a JSON file"}
            </span>

            <span className="mt-2 text-xs text-gray-500">
              JSON files only
            </span>

            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {items.length > 0 && (
            <div className="mt-5 rounded-lg bg-gray-800 p-4">
              <p className="text-sm text-gray-300">
                Ready to import{" "}
                <span className="font-semibold text-white">
                  {items.length}
                </span>{" "}
                titles.
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {items.filter(
                  (item) => item.type === "movie"
                ).length}{" "}
                movies ·{" "}
                {items.filter(
                  (item) => item.type === "tv"
                ).length}{" "}
                TV shows
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}

          {items.length > 0 && (
            <button
              type="button"
              onClick={startImport}
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-white px-4 py-3 font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? `Importing... ${progress}%`
                : `Import ${items.length} Titles`}
            </button>
          )}

          {loading && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full bg-white transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          )}
        </section>

        {/* Results */}
        {results.length > 0 && (
          <section className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Import Results
              </h2>

              <div className="text-sm">
                <span className="text-green-400">
                  {successful} successful
                </span>

                {failed > 0 && (
                  <span className="ml-3 text-red-400">
                    {failed} failed
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 max-h-[500px] overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.tmdb_id}-${index}`}
                  className="flex items-center justify-between border-b border-gray-800 py-3 last:border-b-0"
                >
                  <div>
                    <p className="font-medium">
                      {result.title ||
                        `TMDB ${result.tmdb_id}`}
                    </p>

                    <p className="text-xs text-gray-500">
                      {result.type === "movie"
                        ? "Movie"
                        : "TV"}{" "}
                      · TMDB {result.tmdb_id}
                    </p>
                  </div>

                  <span
                    className={
                      result.success
                        ? "text-sm text-green-400"
                        : "text-sm text-red-400"
                    }
                  >
                    {result.success
                      ? "✓ Imported"
                      : `✕ ${result.message}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}