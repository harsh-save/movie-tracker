import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const { data: library, error: libraryError } =
      await supabaseServer
        .from("library")
        .select(`
          id,
          status,
          rating,
          media (
            id,
            type,
            title
          )
        `);

    if (libraryError) throw libraryError;

    const { data: history, error: historyError } =
      await supabaseServer
        .from("watch_history")
        .select("id, media_id, watched_at, rating");

    if (historyError) throw historyError;

    const items = library || [];
    const watches = history || [];

    const movies = items.filter(
      (item: any) => item.media?.type === "movie"
    ).length;

    const tvShows = items.filter(
      (item: any) => item.media?.type === "tv"
    ).length;

    const watchesByMedia: Record<number, number> = {};

    for (const watch of watches) {
      watchesByMedia[watch.media_id] =
        (watchesByMedia[watch.media_id] || 0) + 1;
    }

    const rewatches = Object.values(watchesByMedia).reduce(
      (total, count) => total + Math.max(0, count - 1),
      0
    );

    const ratedItems = items.filter(
      (item: any) => item.rating !== null
    );

    const averageRating =
      ratedItems.length > 0
        ? ratedItems.reduce(
            (total: number, item: any) =>
              total + Number(item.rating),
            0
          ) / ratedItems.length
        : null;

    return NextResponse.json({
      totals: {
        titles: items.length,
        movies,
        tvShows,
        totalWatches: watches.length,
        rewatches,
        ratings: ratedItems.length,
        averageRating,
      },

      status: {
        completed: items.filter(
          (item: any) => item.status === "completed"
        ).length,

        watching: items.filter(
          (item: any) => item.status === "watching"
        ).length,

        watchlist: items.filter(
          (item: any) => item.status === "watchlist"
        ).length,

        dropped: items.filter(
          (item: any) => item.status === "dropped"
        ).length,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard",
      },
      { status: 500 }
    );
  }
}