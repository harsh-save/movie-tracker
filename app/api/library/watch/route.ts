import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { media_id } = body;

    if (!media_id) {
      return NextResponse.json(
        {
          error: "media_id is required",
        },
        { status: 400 }
      );
    }

    // Make sure the title exists
    const { data: media, error: mediaError } =
      await supabaseServer
        .from("media")
        .select("id")
        .eq("id", media_id)
        .maybeSingle();

    if (mediaError) {
      throw mediaError;
    }

    if (!media) {
      return NextResponse.json(
        {
          error: "Media not found",
        },
        { status: 404 }
      );
    }

    // Record another watch
    const { data: watch, error: watchError } =
      await supabaseServer
        .from("watch_history")
        .insert({
          media_id,
        })
        .select("id, media_id, watched_at")
        .single();

    if (watchError) {
      throw watchError;
    }

    return NextResponse.json({
      success: true,
      watch,
    });
  } catch (error) {
    console.error("Watch history error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to record watch",
      },
      { status: 500 }
    );
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const mediaId = request.nextUrl.searchParams.get("media_id");

    if (!mediaId) {
      return NextResponse.json(
        {
          error: "media_id is required",
        },
        { status: 400 }
      );
    }

    const parsedMediaId = Number(mediaId);

    if (!Number.isInteger(parsedMediaId)) {
      return NextResponse.json(
        {
          error: "Invalid media_id",
        },
        { status: 400 }
      );
    }

    // Get all watches, newest first.
    const { data: watches, error: watchesError } =
      await supabaseServer
        .from("watch_history")
        .select("id, watched_at")
        .eq("media_id", parsedMediaId)
        .order("watched_at", { ascending: false });

    if (watchesError) {
      throw watchesError;
    }

    // Keep the original watch.
    if (!watches || watches.length <= 1) {
      return NextResponse.json(
        {
          error: "There are no rewatches to remove",
        },
        { status: 400 }
      );
    }

    // Remove the most recent rewatch.
    const latestWatch = watches[0];

    const { error: deleteError } =
      await supabaseServer
        .from("watch_history")
        .delete()
        .eq("id", latestWatch.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Rewatch removed",
    });
  } catch (error) {
    console.error(
      "Remove watch history error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove rewatch",
      },
      { status: 500 }
    );
  }
}