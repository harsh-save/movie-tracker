import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getTMDBDetails } from "@/lib/tmdb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { tmdb_id, type, date_added } = body;

    const importedDate =
  date_added && !Number.isNaN(Date.parse(date_added))
    ? date_added
    : new Date().toISOString();

    if (!tmdb_id || !type) {
      return NextResponse.json(
        {
          error: "tmdb_id and type are required",
        },
        { status: 400 }
      );
    }

    if (type !== "movie" && type !== "tv") {
      return NextResponse.json(
        {
          error: "type must be movie or tv",
        },
        { status: 400 }
      );
    }

    /*
     * Get complete metadata from TMDB.
     */
    const details = await getTMDBDetails(
      Number(tmdb_id),
      type
    );

    const title =
      type === "movie"
        ? details.title
        : details.name;

    if (!title) {
      return NextResponse.json(
        {
          error: "TMDB title not found",
        },
        { status: 404 }
      );
    }

    /*
     * Runtime
     *
     * Movies:
     * runtime
     *
     * TV:
     * episode_run_time
     */
    const runtime =
      type === "movie"
        ? details.runtime ?? null
        : details.episode_run_time?.[0] ?? null;

    /*
     * TMDB rating
     */
    const tmdbRating =
      typeof details.vote_average === "number"
        ? Number(details.vote_average.toFixed(1))
        : null;

    /*
     * Release date
     */
    const releaseDate =
      type === "movie"
        ? details.release_date || null
        : details.first_air_date || null;

    /*
     * Check whether media already exists.
     */
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

    /*
     * Insert or update media.
     */
    if (!mediaId) {
      const { data: newMedia, error: insertError } =
        await supabaseServer
          .from("media")
          .insert({
            tmdb_id,
            type,
            title,
            overview: details.overview || null,
            poster_path: details.poster_path || null,
            backdrop_path:
              details.backdrop_path || null,
            release_date: releaseDate,
            tmdb_rating: tmdbRating,
            runtime,
          })
          .select("id")
          .single();

      if (insertError) {
        throw insertError;
      }

      mediaId = newMedia.id;
    } else {
      const { error: updateError } =
        await supabaseServer
          .from("media")
          .update({
            title,
            overview: details.overview || null,
            poster_path: details.poster_path || null,
            backdrop_path:
              details.backdrop_path || null,
            release_date: releaseDate,
            tmdb_rating: tmdbRating,
            runtime,
          })
          .eq("id", mediaId);

      if (updateError) {
        throw updateError;
      }
    }

    /*
     * Add genres.
     */
    const genres = Array.isArray(details.genres)
      ? details.genres
      : [];

    for (const genre of genres) {
      if (!genre.id || !genre.name) {
        continue;
      }

      const { data: existingGenre, error: genreCheckError } =
        await supabaseServer
          .from("genres")
          .select("id")
          .eq("tmdb_id", genre.id)
          .maybeSingle();

      if (genreCheckError) {
        throw genreCheckError;
      }

      let genreId = existingGenre?.id;

      if (!genreId) {
        const { data: newGenre, error: genreInsertError } =
          await supabaseServer
            .from("genres")
            .insert({
              tmdb_id: genre.id,
              name: genre.name,
            })
            .select("id")
            .single();

        if (genreInsertError) {
          throw genreInsertError;
        }

        genreId = newGenre.id;
      }

      const { error: mediaGenreError } =
        await supabaseServer
          .from("media_genres")
          .upsert(
            {
              media_id: mediaId,
              genre_id: genreId,
            },
            {
              onConflict: "media_id,genre_id",
              ignoreDuplicates: true,
            }
          );

      if (mediaGenreError) {
        throw mediaGenreError;
      }
    }

    /*
     * Check if already in library.
     */
    const { data: existingLibrary, error: libraryCheckError } =
      await supabaseServer
        .from("library")
        .select("id")
        .eq("media_id", mediaId)
        .maybeSingle();

    if (libraryCheckError) {
      throw libraryCheckError;
    }

    /*
     * If already in library, don't create another
     * watch history entry.
     */
    if (existingLibrary) {
      return NextResponse.json({
        success: true,
        title,
        message: "Already in library",
      });
    }

    /*
     * Add to library as completed.
     */
    const { error: libraryInsertError } =
  await supabaseServer
    .from("library")
    .insert({
      media_id: mediaId,
      status: "completed",
      created_at: importedDate,
    });

    if (libraryInsertError) {
      throw libraryInsertError;
    }

    /*
     * Importing means the title has been watched once.
     */
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
      title,
      message: "Imported successfully",
    });
  } catch (error) {
    console.error("Import error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Import failed",
      },
      { status: 500 }
    );
  }
}