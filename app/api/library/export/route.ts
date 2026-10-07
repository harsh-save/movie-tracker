import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type ExportRow = {
  id: number;
  tmdb_id: number;
  title: string;
  type: "movie" | "tv";
  release_date: string | null;
  date_added: string;
  status: string;
  tmdb_rating: number | null;
  runtime: number | null;
  genres: string;
  overview: string;
  watch_count: number;
};

function escapeCsv(value: unknown) {
  const stringValue =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${stringValue.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const format =
      request.nextUrl.searchParams.get("format");

    if (
      format !== "csv" &&
      format !== "xlsx" &&
      format !== "json"
    ) {
      return NextResponse.json(
        {
          error:
            "format must be csv, xlsx, or json",
        },
        { status: 400 }
      );
    }

    const { data: library, error } =
      await supabaseServer
        .from("library")
        .select(`
          id,
          status,
          created_at,
          media (
            id,
            tmdb_id,
            title,
            type,
            release_date,
            overview,
            tmdb_rating,
            runtime,
            media_genres (
              genres (
                name
              )
            )
          )
        `)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      throw error;
    }

    const mediaIds =
      library
        ?.map((item) => item.media?.id)
        .filter(
          (id): id is number => typeof id === "number"
        ) || [];

    let watchCounts: Record<number, number> = {};

    if (mediaIds.length > 0) {
      const { data: watches, error: watchError } =
        await supabaseServer
          .from("watch_history")
          .select("media_id")
          .in("media_id", mediaIds);

      if (watchError) {
        throw watchError;
      }

      watchCounts = {};

      for (const watch of watches || []) {
        watchCounts[watch.media_id] =
          (watchCounts[watch.media_id] || 0) + 1;
      }
    }

    const rows: ExportRow[] = (library || [])
      .filter((item) => item.media)
      .map((item) => {
        const media = item.media!;

        const genres =
          media.media_genres
            ?.map(
              (item) => item.genres?.name
            )
            .filter(Boolean)
            .join(", ") || "";

        return {
          id: item.id,
          tmdb_id: media.tmdb_id,
          title: media.title,
          type: media.type,
          release_date: media.release_date,
          date_added: item.created_at,
          status: item.status,
          tmdb_rating: media.tmdb_rating,
          runtime: media.runtime,
          genres,
          overview: media.overview || "",
          watch_count:
            watchCounts[media.id] || 0,
        };
      });

    if (format === "json") {
      return new NextResponse(
        JSON.stringify(rows, null, 2),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="my-library.json"',
          },
        }
      );
    }

    if (format === "csv") {
      const headers = [
        "id",
        "tmdb_id",
        "title",
        "type",
        "release_date",
        "date_added",
        "status",
        "tmdb_rating",
        "runtime",
        "genres",
        "overview",
        "watch_count",
      ];

      const csv = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) =>
          headers
            .map((header) =>
              escapeCsv(
                row[
                  header as keyof ExportRow
                ]
              )
            )
            .join(",")
        ),
      ].join("\r\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="my-library.csv"',
        },
      });
    }

    // Excel export is handled below.
    const XLSX = await import("xlsx");

    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Library"
    );

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="my-library.xlsx"',
      },
    });
  } catch (error) {
    console.error("Library export error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Export failed",
      },
      { status: 500 }
    );
  }
}