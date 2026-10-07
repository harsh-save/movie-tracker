const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function tmdbFetch(path: string) {
  const token = process.env.TMDB_API_TOKEN;

  if (!token) {
    throw new Error("TMDB_API_TOKEN is missing");
  }

  const response = await fetch(`${TMDB_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`TMDB ${response.status}: ${body}`);
  }

  return JSON.parse(body);
}

export async function searchTMDB(query: string) {
  return tmdbFetch(
    `/search/multi?query=${encodeURIComponent(query)}`
  );
}

export async function getTMDBDetails(
  tmdbId: number,
  type: "movie" | "tv"
) {
  return tmdbFetch(`/${type}/${tmdbId}`);
}