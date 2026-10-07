const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function searchTMDB(query: string) {
  const response = await fetch(
    `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_TOKEN}`,
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to search TMDB");
  }

  return response.json();
}

