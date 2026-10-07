import json
import re

INPUT_FILE = "export.json"

# Full import
OUTPUT_FILE = "tmdb_import.json"

# Small test import
TEST_OUTPUT_FILE = "tmdb_test_import.json"


def extract_tmdb_id(url):
    """Extract the TMDB ID and content type from a TMDB URL."""
    if not url:
        return None

    match = re.search(r"themoviedb\.org/(movie|tv)/(\d+)", url)

    if match:
        return {
            "tmdb_id": int(match.group(2)),
            "type": match.group(1)
        }

    return None


def main():

    # --------------------------------------------------
    # LOAD JSON
    # --------------------------------------------------

    with open(INPUT_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    movies = []
    tv_shows = []

    seen_movies = set()
    seen_tv = set()

    skipped_rewatch = []
    skipped_imdb = []
    skipped_other = []
    skipped_invalid = []

    # --------------------------------------------------
    # PROCESS ALL LISTS
    # --------------------------------------------------

    for content_list in data.get("lists", []):

        for item in content_list.get("items", []):

            item_type = item.get("type", "")
            title = item.get("title", "").strip()
            url = item.get("url", "")
            date_added = item.get("dateAdded")

            # ------------------------------------------
            # REWATCH
            # ------------------------------------------

            if item_type == "Rewatch":
                skipped_rewatch.append({
                    "title": title,
                    "url": url,
                    "date_added": date_added
                })
                continue

            # ------------------------------------------
            # OTHER TYPES (TASKS ETC.)
            # ------------------------------------------

            if item_type not in ("Movies", "TV Shows"):

                skipped_other.append({
                    "title": title,
                    "type": item_type
                })

                continue

            # ------------------------------------------
            # EXTRACT TMDB ID
            # ------------------------------------------

            result = extract_tmdb_id(url)

            if result is None:

                # IMDb entry
                if "imdb.com" in url.lower():

                    skipped_imdb.append({
                        "title": title,
                        "url": url,
                        "type": item_type,
                        "date_added": date_added
                    })

                else:

                    skipped_invalid.append({
                        "title": title,
                        "url": url,
                        "type": item_type,
                        "date_added": date_added,
                        "reason": "No valid TMDB URL"
                    })

                continue

            tmdb_id = result["tmdb_id"]
            url_type = result["type"]

            # ------------------------------------------
            # MOVIE
            # ------------------------------------------

            if item_type == "Movies":

                if url_type != "movie":

                    skipped_invalid.append({
                        "title": title,
                        "url": url,
                        "type": item_type,
                        "date_added": date_added,
                        "reason": "Expected movie URL"
                    })

                    continue

                if tmdb_id not in seen_movies:

                    seen_movies.add(tmdb_id)

                    movies.append({
                        "tmdb_id": tmdb_id,
                        "type": "movie",
                        "date_added": date_added
                    })

            # ------------------------------------------
            # TV SHOW
            # ------------------------------------------

            elif item_type == "TV Shows":

                if url_type != "tv":

                    skipped_invalid.append({
                        "title": title,
                        "url": url,
                        "type": item_type,
                        "date_added": date_added,
                        "reason": "Expected TV URL"
                    })

                    continue

                if tmdb_id not in seen_tv:

                    seen_tv.add(tmdb_id)

                    tv_shows.append({
                        "tmdb_id": tmdb_id,
                        "type": "tv",
                        "date_added": date_added
                    })

    # --------------------------------------------------
    # FULL IMPORT FILE
    # --------------------------------------------------

    full_output = {
        "movies": movies,
        "tv": tv_shows
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(full_output, file, indent=2, ensure_ascii=False)

    # --------------------------------------------------
    # TEST IMPORT FILE
    # --------------------------------------------------

    test_output = {
        "movies": movies[:2],
        "tv": tv_shows[:2]
    }

    with open(TEST_OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(test_output, file, indent=2, ensure_ascii=False)

    # --------------------------------------------------
    # SUMMARY
    # --------------------------------------------------

    print()
    print("TMDB extraction complete")
    print("========================")
    print(f"Movies found:           {len(movies)}")
    print(f"TV Shows found:         {len(tv_shows)}")
    print(f"Total TMDB entries:     {len(movies) + len(tv_shows)}")
    print()
    print(f"Rewatches skipped:      {len(skipped_rewatch)}")
    print(f"IMDb entries skipped:   {len(skipped_imdb)}")
    print(f"Other entries skipped:  {len(skipped_other)}")
    print(f"Invalid TMDB entries:   {len(skipped_invalid)}")
    print()
    print(f"Full import:            {OUTPUT_FILE}")
    print(f"Test import:            {TEST_OUTPUT_FILE}")
    print()

    # --------------------------------------------------
    # TEST FILE SUMMARY
    # --------------------------------------------------

    print("TEST FILE")
    print("---------")
    print(f"Movies:   {len(test_output['movies'])}")
    print(f"TV Shows: {len(test_output['tv'])}")
    print()

    for movie in test_output["movies"]:
        print(
            f"Movie: {movie['tmdb_id']} "
            f"| Added: {movie['date_added']}"
        )

    for show in test_output["tv"]:
        print(
            f"TV: {show['tmdb_id']} "
            f"| Added: {show['date_added']}"
        )

    # --------------------------------------------------
    # REWATCHES
    # --------------------------------------------------

    if skipped_rewatch:

        print()
        print("REWATCHES")
        print("---------")

        for item in skipped_rewatch:
            print(f"- {item['title']}")

    # --------------------------------------------------
    # IMDb
    # --------------------------------------------------

    if skipped_imdb:

        print()
        print("IMDb ENTRIES")
        print("------------")

        for item in skipped_imdb:
            print(f"- {item['title']} ({item['type']})")
            print(f"  {item['url']}")

    # --------------------------------------------------
    # INVALID
    # --------------------------------------------------

    if skipped_invalid:

        print()
        print("INVALID / PROBLEM ENTRIES")
        print("--------------------------")

        for item in skipped_invalid:
            print(f"- {item['title']} ({item['type']})")
            print(f"  Reason: {item['reason']}")
            print(f"  URL: {item['url']}")

    # --------------------------------------------------
    # OTHER TYPES
    # --------------------------------------------------

    if skipped_other:

        print()
        print("OTHER TYPES")
        print("-----------")

        type_counts = {}

        for item in skipped_other:

            item_type = item["type"]

            if item_type not in type_counts:
                type_counts[item_type] = 0

            type_counts[item_type] += 1

        for item_type, count in sorted(type_counts.items()):
            print(f"- {item_type}: {count}")


if __name__ == "__main__":
    main()