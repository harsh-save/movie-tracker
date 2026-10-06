// import { NextRequest, NextResponse } from "next/server";
// import { supabaseServer } from "@/lib/supabase-server";

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { media_id } = body;

//     if (!media_id) {
//       return NextResponse.json(
//         { error: "media_id is required" },
//         { status: 400 }
//       );
//     }

//     const { error } = await supabaseServer
//       .from("watch_history")
//       .insert({
//         media_id,
//       });

//     if (error) {
//       throw error;
//     }

//     return NextResponse.json({
//       success: true,
//       message: "Watch recorded",
//     });
//   } catch (error) {
//     console.error("Watch history error:", error);

//     return NextResponse.json(
//       {
//         error:
//           error instanceof Error
//             ? error.message
//             : "Something went wrong",
//       },
//       { status: 500 }
//     );
//   }
// }

//--------------------------------------------------------------------------------------
// import { NextRequest, NextResponse } from "next/server";
// import { supabaseServer } from "@/lib/supabase-server";

// // GET /api/library
// // Loads library, watch counts, and library statistics
// export async function GET() {
//   try {
//     const { data: library, error: libraryError } =
//       await supabaseServer
//         .from("library")
//         .select(`
//           id,
//           status,
//           rating,
//           notes,
//           media (
//             id,
//             title,
//             type,
//             poster_path,
//             release_date
//           )
//         `)
//         .order("created_at", { ascending: false });

//     if (libraryError) {
//       throw libraryError;
//     }

//     const items = library || [];

//     const mediaIds = items
//       .map((item: any) => item.media?.id)
//       .filter(Boolean);

//     let history: {
//       media_id: number;
//     }[] = [];

//     if (mediaIds.length > 0) {
//       const { data, error: historyError } =
//         await supabaseServer
//           .from("watch_history")
//           .select("media_id")
//           .in("media_id", mediaIds);

//       if (historyError) {
//         throw historyError;
//       }

//       history = data || [];
//     }

//     // Count watches for each title
//     const watchCounts: Record<number, number> = {};

//     for (const watch of history) {
//       watchCounts[watch.media_id] =
//         (watchCounts[watch.media_id] || 0) + 1;
//     }

//     // Count movies
//     const movies = items.filter(
//       (item: any) => item.media?.type === "movie"
//     ).length;

//     // Count TV shows
//     const tvShows = items.filter(
//       (item: any) => item.media?.type === "tv"
//     ).length;

//     // A title is considered rewatched when it has
//     // more than one watch-history record.
//     const rewatchedMovies = items.filter(
//       (item: any) =>
//         item.media?.type === "movie" &&
//         (watchCounts[item.media.id] || 0) > 1
//     ).length;

//     const rewatchedTVShows = items.filter(
//       (item: any) =>
//         item.media?.type === "tv" &&
//         (watchCounts[item.media.id] || 0) > 1
//     ).length;

//     // Total number of watch-history records
//     const totalWatches = history.length;

//     // Ratings
//     const ratedItems = items.filter(
//       (item: any) => item.rating !== null
//     );

//     const averageRating =
//       ratedItems.length > 0
//         ? ratedItems.reduce(
//             (total: number, item: any) =>
//               total + Number(item.rating),
//             0
//           ) / ratedItems.length
//         : null;

//     return NextResponse.json({
//       items,
//       watchCounts,

//       stats: {
//         movies,
//         tvShows,
//         rewatchedMovies,
//         rewatchedTVShows,
//         totalWatches,
//         ratings: ratedItems.length,
//         averageRating,
//       },
//     });
//   } catch (error) {
//     console.error("Library GET error:", error);

//     return NextResponse.json(
//       {
//         error:
//           error instanceof Error
//             ? error.message
//             : "Failed to load library",
//       },
//       { status: 500 }
//     );
//   }
// }


// // POST /api/library
// // Adds a movie/show and records its first watch
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();

//     const {
//       tmdb_id,
//       type,
//       title,
//       poster_path,
//       backdrop_path,
//       overview,
//       release_date,
//     } = body;

//     if (!tmdb_id || !type || !title) {
//       return NextResponse.json(
//         { error: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     // Check whether the media already exists
//     const { data: existingMedia, error: mediaCheckError } =
//       await supabaseServer
//         .from("media")
//         .select("id")
//         .eq("tmdb_id", tmdb_id)
//         .eq("type", type)
//         .maybeSingle();

//     if (mediaCheckError) {
//       throw mediaCheckError;
//     }

//     let mediaId = existingMedia?.id;

//     // Create media record if necessary
//     if (!mediaId) {
//       const { data: newMedia, error: mediaInsertError } =
//         await supabaseServer
//           .from("media")
//           .insert({
//             tmdb_id,
//             type,
//             title,
//             poster_path,
//             backdrop_path,
//             overview,
//             release_date: release_date || null,
//           })
//           .select("id")
//           .single();

//       if (mediaInsertError) {
//         throw mediaInsertError;
//       }

//       mediaId = newMedia.id;
//     }

//     // Check whether it's already in the library
//     const { data: existingLibrary, error: libraryCheckError } =
//       await supabaseServer
//         .from("library")
//         .select("id")
//         .eq("media_id", mediaId)
//         .maybeSingle();

//     if (libraryCheckError) {
//       throw libraryCheckError;
//     }

//     if (existingLibrary) {
//       return NextResponse.json({
//         success: false,
//         message: "Already in your library",
//       });
//     }

//     // Add as completed
//     const { error: libraryInsertError } =
//       await supabaseServer
//         .from("library")
//         .insert({
//           media_id: mediaId,
//           status: "completed",
//         });

//     if (libraryInsertError) {
//       throw libraryInsertError;
//     }

//     // Record the first watch
//     const { error: historyInsertError } =
//       await supabaseServer
//         .from("watch_history")
//         .insert({
//           media_id: mediaId,
//         });

//     if (historyInsertError) {
//       throw historyInsertError;
//     }

//     return NextResponse.json({
//       success: true,
//       message: "Added to your library",
//     });
//   } catch (error) {
//     console.error("Library POST error:", error);

//     return NextResponse.json(
//       {
//         error:
//           error instanceof Error
//             ? error.message
//             : "Something went wrong",
//       },
//       { status: 500 }
//     );
//   }
// }
//----------------------------------------------------------------------

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