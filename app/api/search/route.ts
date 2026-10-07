import { NextResponse } from "next/server";
import { searchTMDB } from "@/lib/tmdb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({
        results: [],
      });
    }

    const data = await searchTMDB(query);

    const results = (data.results || [])
      .filter(
        (item: any) =>
          item.media_type === "movie" ||
          item.media_type === "tv"
      )
      .map((item: any) => ({
        tmdb_id: Number(item.id),
        title:
          item.media_type === "movie"
            ? item.title
            : item.name,
        type: item.media_type,
        poster_path: item.poster_path || null,
        year:
          item.media_type === "movie"
            ? item.release_date?.slice(0, 4) || null
            : item.first_air_date?.slice(0, 4) || null,
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("TMDB search error:", error);

    return NextResponse.json(
      { error: "Failed to search TMDB" },
      { status: 500 }
    );
  }
}