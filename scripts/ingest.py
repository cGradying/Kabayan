#!/usr/bin/env python3
"""Ingest vendor/food/shop data into a JSONL file for scripts/embed_load.mjs.

Sources:
  overpass  - OpenStreetMap Overpass API (legal, free, exact lat/lng). Default
              and only source that works with zero extra installs.
  facebook  - kevinzg/facebook-scraper over public vendor pages listed in
              scripts/pages/<city>.txt. Optional (pip install -r
              scripts/requirements.txt), best-effort by design: a failed
              page never aborts the run.

Usage:
  python3 scripts/ingest.py --source overpass --city manila --out data/manila.jsonl
  python3 scripts/ingest.py --source facebook --city manila --out data/manila_fb.jsonl
"""
import argparse
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

CITY_NAMES = {
    "manila": "Manila",
    "quezon_city": "Quezon City",
    "antipolo": "Antipolo",
}

# ponytail: nodes only (no way/relation centroid math). Add if node coverage
# for a city proves too sparse — most named vendors in OSM PH are nodes.
OVERPASS_QUERY = """
[out:json][timeout:60];
area["name"="{city_name}"]["boundary"="administrative"]->.searchArea;
(
  node["amenity"~"^(restaurant|fast_food|cafe|food_court|marketplace)$"](area.searchArea);
  node["shop"](area.searchArea);
);
out center tags;
"""

PRICE_RE = re.compile(r"(?:₱|php|p)\s?(\d{2,5}(?:[.,]\d{2})?)", re.IGNORECASE)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def parse_price(text):
    if not text:
        return None, None
    matches = [float(m.replace(",", "")) for m in PRICE_RE.findall(text)]
    if not matches:
        return None, None
    return min(matches), max(matches)


def location_label(tags, fallback_city):
    parts = [tags.get("addr:street"), tags.get("addr:city") or fallback_city]
    parts = [p for p in parts if p]
    return ", ".join(parts) if parts else fallback_city


def ingest_overpass(city):
    city_name = CITY_NAMES[city]
    query = OVERPASS_QUERY.format(city_name=city_name)
    # Overpass's usage policy asks for an identifying User-Agent; their
    # default-blocked bot filter also 406s Python's default UA outright.
    req = urllib.request.Request(
        OVERPASS_URL,
        data=query.encode("utf-8"),
        headers={
            "Content-Type": "text/plain",
            "User-Agent": "kabayan-ingest/1.0 (+https://github.com/kabayan; contact: cgradying@gmail.com)",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        payload = json.loads(resp.read())

    records = []
    for el in payload.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name or el.get("type") != "node":
            continue
        category = tags.get("amenity") or tags.get("shop") or "vendor"
        loc = location_label(tags, city_name)
        content_bits = [name, category, f"in {loc}"]
        if tags.get("cuisine"):
            content_bits.append(f"cuisine: {tags['cuisine']}")
        records.append(
            {
                "source": "overpass",
                "source_id": f"osm:node/{el['id']}",
                "city": city,
                "name": name,
                "store_name": None,
                "category": category,
                "price_text": None,
                "price_min": None,
                "price_max": None,
                "location_label": loc,
                "latitude": el.get("lat"),
                "longitude": el.get("lon"),
                "url": None,
                "content": " — ".join(content_bits),
                "metadata": tags,
                "scraped_at": now_iso(),
            }
        )
    return records


def ingest_facebook(city):
    try:
        from facebook_scraper import get_posts, set_cookies
    except ImportError:
        print(
            "facebook-scraper not installed. Run:\n"
            "  python3 -m venv scripts/.venv && scripts/.venv/bin/pip install -r scripts/requirements.txt\n"
            "then rerun with scripts/.venv/bin/python3.",
            file=sys.stderr,
        )
        return []

    import os

    cookies_path = os.environ.get("FB_COOKIES_PATH")
    if not cookies_path or not Path(cookies_path).exists():
        print(
            "FB_COOKIES_PATH not set (or file missing) — Facebook now requires a logged-in\n"
            "session for almost all pages. Export cookies.txt (Netscape format) from a\n"
            "throwaway account using a browser extension (e.g. 'Get cookies.txt LOCALLY'),\n"
            "then: export FB_COOKIES_PATH=/path/to/cookies.txt",
            file=sys.stderr,
        )
        return []
    set_cookies(cookies_path)

    pages_file = Path(__file__).parent / "pages" / f"{city}.txt"
    if not pages_file.exists():
        print(f"No page list at {pages_file} — add one public vendor page per line.", file=sys.stderr)
        return []
    pages = [p.strip() for p in pages_file.read_text().splitlines() if p.strip() and not p.startswith("#")]

    records = []
    for page in pages:
        try:
            for post in get_posts(page, pages=3):
                text = post.get("text") or ""
                if not text:
                    continue
                price_min, price_max = parse_price(text)
                records.append(
                    {
                        "source": "facebook",
                        "source_id": f"fb:{post.get('post_id')}",
                        "city": city,
                        "name": text.split("\n")[0][:120],
                        "store_name": page,
                        "category": None,
                        "price_text": text if price_min else None,
                        "price_min": price_min,
                        "price_max": price_max,
                        "location_label": None,
                        "latitude": None,
                        "longitude": None,
                        "url": post.get("post_url"),
                        "content": text,
                        "metadata": {"page": page},
                        "scraped_at": now_iso(),
                    }
                )
        except Exception as err:  # best-effort: one broken page shouldn't kill the run
            print(f"facebook page '{page}' failed: {err}", file=sys.stderr)
    return records


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=["overpass", "facebook"], required=True)
    parser.add_argument("--city", choices=list(CITY_NAMES.keys()), required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    records = ingest_overpass(args.city) if args.source == "overpass" else ingest_facebook(args.city)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w") as f:
        for record in records:
            f.write(json.dumps(record) + "\n")

    print(f"Wrote {len(records)} records to {out_path}")


if __name__ == "__main__":
    main()
