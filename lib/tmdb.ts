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

// const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// export async function searchTMDB(query: string) {
//   const token = process.env.TMDB_API_TOKEN;

//   if (!token) {
//     throw new Error("TMDB_API_TOKEN is missing");
//   }

//   const response = await fetch(
//     `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}`,
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         accept: "application/json",
//       },
//     }
//   );

//   const body = await response.text();

//   if (!response.ok) {
//     throw new Error(`TMDB ${response.status}: ${body}`);
//   }

//   return JSON.parse(body);
// }

// const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// async function tmdbFetch(path: string) {
//   const token = process.env.TMDB_API_TOKEN;

//   if (!token) {
//     throw new Error("TMDB_API_TOKEN is missing");
//   }

//   const response = await fetch(`${TMDB_BASE_URL}${path}`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//       accept: "application/json",
//     },
//   });

//   const body = await response.text();

//   if (!response.ok) {
//     throw new Error(`TMDB ${response.status}: ${body}`);
//   }

//   return JSON.parse(body);
// }

// export async function searchTMDB(query: string) {
//   return tmdbFetch(
//     `/search/multi?query=${encodeURIComponent(query)}`
//   );
// }

// export async function getTMDBDetails(
//   tmdbId: number,
//   type: "movie" | "tv"
// ) {
//   return tmdbFetch(`/${type}/${tmdbId}`);
// }