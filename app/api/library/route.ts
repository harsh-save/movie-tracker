// import { NextRequest, NextResponse } from "next/server";
// import { supabaseServer } from "@/lib/supabase-server";

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

//     // Check whether this movie/show already exists in media
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

//     // If it doesn't exist, create it
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

//     // Add it to the library as a watchlist item
//     const { error: libraryInsertError } =
//       await supabaseServer.from("library").insert({
//         media_id: mediaId,
//         status: "watchlist",
//       });

//     if (libraryInsertError) {
//       throw libraryInsertError;
//     }

//     return NextResponse.json({
//       success: true,
//       message: "Added to your library",
//     });
//   } catch (error) {
//     console.error("Library error:", error);

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


// import { NextRequest, NextResponse } from "next/server";
// import { supabaseServer } from "@/lib/supabase-server";

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

//     // Validate required fields
//     if (!tmdb_id || !type || !title) {
//       return NextResponse.json(
//         { error: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     // Check whether the movie/show already exists in media
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

//     // Create media record if it doesn't exist
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

//     // Don't add it twice
//     if (existingLibrary) {
//       return NextResponse.json({
//         success: false,
//         message: "Already in your library",
//       });
//     }

//     // Add to library as completed
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
//     console.error("Library error:", error);

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


import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// GET /api/library
// Loads the library and watch counts
export async function GET() {
  try {
    const { data: library, error: libraryError } =
      await supabaseServer
        .from("library")
        .select(`
          id,
          status,
          rating,
          notes,
          created_at,
          media (
            id,
            title,
            type,
            poster_path,
            release_date
          )
          
        `)
        .order("created_at", { ascending: false });

    if (libraryError) {
      throw libraryError;
    }

    const mediaIds = (library || [])
      .map((item: any) => item.media?.id)
      .filter(Boolean);

    let watchCounts: Record<number, number> = {};

    if (mediaIds.length > 0) {
      const { data: history, error: historyError } =
        await supabaseServer
          .from("watch_history")
          .select("media_id")
          .in("media_id", mediaIds);

      if (historyError) {
        throw historyError;
      }

      for (const watch of history || []) {
        watchCounts[watch.media_id] =
          (watchCounts[watch.media_id] || 0) + 1;
      }
    }

    return NextResponse.json({
      items: library || [],
      watchCounts,
    });
  } catch (error) {
    console.error("Library GET error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load library",
      },
      { status: 500 }
    );
  }
}


// POST /api/library
// Adds a movie/show and records its first watch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      tmdb_id,
      type,
      title,
      poster_path,
      backdrop_path,
      overview,
      release_date,
    } = body;

    if (!tmdb_id || !type || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check whether the media already exists
    const { data: existingMedia, error: mediaCheckError } =
      await supabaseServer
        .from("media")
        .select("id")
        .eq("tmdb_id", tmdb_id)
        .eq("type", type)
        .maybeSingle();

    if (mediaCheckError) {
      throw mediaCheckError;
    }

    let mediaId = existingMedia?.id;

    // Create media record if necessary
    if (!mediaId) {
      const { data: newMedia, error: mediaInsertError } =
        await supabaseServer
          .from("media")
          .insert({
            tmdb_id,
            type,
            title,
            poster_path,
            backdrop_path,
            overview,
            release_date: release_date || null,
          })
          .select("id")
          .single();

      if (mediaInsertError) {
        throw mediaInsertError;
      }

      mediaId = newMedia.id;
    }

    // Check whether it's already in the library
    const { data: existingLibrary, error: libraryCheckError } =
      await supabaseServer
        .from("library")
        .select("id")
        .eq("media_id", mediaId)
        .maybeSingle();

    if (libraryCheckError) {
      throw libraryCheckError;
    }

    if (existingLibrary) {
      return NextResponse.json({
        success: false,
        message: "Already in your library",
      });
    }

    // Add as completed
    const { error: libraryInsertError } =
      await supabaseServer
        .from("library")
        .insert({
          media_id: mediaId,
          status: "completed",
        });

    if (libraryInsertError) {
      throw libraryInsertError;
    }

    // Record the first watch
    const { error: historyInsertError } =
      await supabaseServer
        .from("watch_history")
        .insert({
          media_id: mediaId,
        });

    if (historyInsertError) {
      throw historyInsertError;
    }

    return NextResponse.json({
      success: true,
      message: "Added to your library",
    });
  } catch (error) {
    console.error("Library POST error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong",
      },
      { status: 500 }
    );
  }
}

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

//     if (type !== "movie" && type !== "tv") {
//       return NextResponse.json(
//         { error: "Invalid media type" },
//         { status: 400 }
//       );
//     }

//     /*
//      * Fetch the complete title details from TMDB.
//      * This gives us runtime, rating and genres.
//      */
//     const { getTMDBDetails } = await import("@/lib/tmdb");

//     const details = await getTMDBDetails(
//       Number(tmdb_id),
//       type
//     );

//     /*
//      * TV and movies use different runtime fields.
//      *
//      * Movies:
//      *   runtime: 120
//      *
//      * TV:
//      *   episode_run_time: [43]
//      */
//     const runtime =
//       type === "movie"
//         ? details.runtime ?? null
//         : details.episode_run_time?.[0] ?? null;

//     const tmdbRating =
//       typeof details.vote_average === "number"
//         ? Number(details.vote_average.toFixed(1))
//         : null;

//     /*
//      * Check whether this TMDB title already exists.
//      */
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

//     /*
//      * Create the media record if it doesn't exist.
//      */
//     if (!mediaId) {
//       const { data: newMedia, error: mediaInsertError } =
//         await supabaseServer
//           .from("media")
//           .insert({
//             tmdb_id,
//             type,
//             title,
//             overview:
//               details.overview ??
//               overview ??
//               null,
//             poster_path:
//               details.poster_path ??
//               poster_path ??
//               null,
//             backdrop_path:
//               details.backdrop_path ??
//               backdrop_path ??
//               null,
//             release_date:
//               details.release_date ||
//               details.first_air_date ||
//               release_date ||
//               null,
//             tmdb_rating: tmdbRating,
//             runtime,
//           })
//           .select("id")
//           .single();

//       if (mediaInsertError) {
//         throw mediaInsertError;
//       }

//       mediaId = newMedia.id;
//     } else {
//       /*
//        * Update cached TMDB information in case the title
//        * already exists in the media table.
//        */
//       const { error: mediaUpdateError } =
//         await supabaseServer
//           .from("media")
//           .update({
//             overview:
//               details.overview ??
//               overview ??
//               null,
//             poster_path:
//               details.poster_path ??
//               poster_path ??
//               null,
//             backdrop_path:
//               details.backdrop_path ??
//               backdrop_path ??
//               null,
//             release_date:
//               details.release_date ||
//               details.first_air_date ||
//               release_date ||
//               null,
//             tmdb_rating: tmdbRating,
//             runtime,
//           })
//           .eq("id", mediaId);

//       if (mediaUpdateError) {
//         throw mediaUpdateError;
//       }
//     }

//     /*
//      * Save genres.
//      */
//     const genres = Array.isArray(details.genres)
//       ? details.genres
//       : [];

//     for (const genre of genres) {
//       if (!genre.id || !genre.name) {
//         continue;
//       }

//       const { data: existingGenre, error: genreCheckError } =
//         await supabaseServer
//           .from("genres")
//           .select("id")
//           .eq("tmdb_id", genre.id)
//           .maybeSingle();

//       if (genreCheckError) {
//         throw genreCheckError;
//       }

//       let genreId = existingGenre?.id;

//       if (!genreId) {
//         const { data: newGenre, error: genreInsertError } =
//           await supabaseServer
//             .from("genres")
//             .insert({
//               tmdb_id: genre.id,
//               name: genre.name,
//             })
//             .select("id")
//             .single();

//         if (genreInsertError) {
//           throw genreInsertError;
//         }

//         genreId = newGenre.id;
//       }

//       const { error: mediaGenreError } =
//         await supabaseServer
//           .from("media_genres")
//           .upsert(
//             {
//               media_id: mediaId,
//               genre_id: genreId,
//             },
//             {
//               onConflict: "media_id,genre_id",
//               ignoreDuplicates: true,
//             }
//           );

//       if (mediaGenreError) {
//         throw mediaGenreError;
//       }
//     }

//     /*
//      * Check whether the title is already in the library.
//      */
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

//     /*
//      * Add it to the library as completed.
//      */
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

//     /*
//      * Adding a title means it has been watched once.
//      */
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

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error: "Library id is required",
        },
        { status: 400 }
      );
    }

    const libraryId = Number(id);

    if (!Number.isInteger(libraryId)) {
      return NextResponse.json(
        {
          error: "Invalid library id",
        },
        { status: 400 }
      );
    }

    const { data: libraryItem, error: findError } =
      await supabaseServer
        .from("library")
        .select("id, media_id")
        .eq("id", libraryId)
        .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (!libraryItem) {
      return NextResponse.json(
        {
          error: "Title not found in your library",
        },
        { status: 404 }
      );
    }

    const { error: deleteError } =
      await supabaseServer
        .from("library")
        .delete()
        .eq("id", libraryId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Removed from your library",
    });
  } catch (error) {
    console.error("Library DELETE error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove from library",
      },
      { status: 500 }
    );
  }
}
