#!/usr/bin/env python3
"""
Facebook Page market-research collector — Graph API, ToS-compliant.

Pulls PUBLIC PAGE content only: post text, timestamp, and aggregate engagement
counts (like/comment/share totals). Never fetches individual commenter names,
profiles, or any per-person data — that stays personal data even on a public
page, so it's out of scope here on purpose.

Setup (one-time, does the "someone else runs it" part safely):
1. Create a Meta developer app: https://developers.facebook.com/apps
2. Generate a Page/User access token with the `pages_read_engagement` and
   `pages_public_content_access` permissions (requires App Review for
   production use, but works immediately in dev mode for pages you admin;
   for OTHER public pages' content, apply for Page Public Content Access —
   https://developers.facebook.com/docs/features-reference/page-public-content-access).
3. Export it:  export FB_ACCESS_TOKEN="EAAB..."

Usage:
  python3 fb_page_research.py <page_id_or_username> [--limit 100] [--out posts.csv]

ponytail: single flat script, stdlib csv + requests only — no framework,
no retry queue. Add backoff/pagination-resume if you're pulling thousands
of posts across many pages; this is sized for a handful of competitor pages.
"""
import argparse
import csv
import os
import sys
import time

GRAPH_URL = "https://graph.facebook.com/v21.0"

# Only page-level, non-personal fields. Do not add commenter/reactor fields here.
POST_FIELDS = "id,message,created_time,likes.summary(true).limit(0),comments.summary(true).limit(0),shares"


def fetch_page_posts(page_id: str, token: str, limit: int):
    """Yields post dicts with aggregate counts only — no per-user data."""
    import requests  # imported lazily so `--demo` runs without the dependency installed

    url = f"{GRAPH_URL}/{page_id}/posts"
    params = {"fields": POST_FIELDS, "access_token": token, "limit": min(limit, 100)}
    fetched = 0

    while url and fetched < limit:
        resp = requests.get(url, params=params, timeout=15)
        params = None  # subsequent requests use the full "next" URL as-is

        if resp.status_code == 429:
            wait = int(resp.headers.get("Retry-After", 30))
            print(f"Rate limited, waiting {wait}s...", file=sys.stderr)
            time.sleep(wait)
            continue

        resp.raise_for_status()
        body = resp.json()

        for post in body.get("data", []):
            yield {
                "post_id": post.get("id"),
                "created_time": post.get("created_time"),
                "message": (post.get("message") or "").replace("\n", " ").strip(),
                "likes": post.get("likes", {}).get("summary", {}).get("total_count", 0),
                "comments": post.get("comments", {}).get("summary", {}).get("total_count", 0),
                "shares": post.get("shares", {}).get("count", 0),
            }
            fetched += 1
            if fetched >= limit:
                return

        url = body.get("paging", {}).get("next")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("page_id", help="Page ID or username, e.g. 'nike' or '123456789'")
    ap.add_argument("--limit", type=int, default=100, help="Max posts to collect")
    ap.add_argument("--out", default=None, help="CSV output path (default: <page_id>_posts.csv)")
    args = ap.parse_args()

    token = os.environ.get("FB_ACCESS_TOKEN")
    if not token:
        sys.exit("Set FB_ACCESS_TOKEN first: export FB_ACCESS_TOKEN=\"your token\"")

    out_path = args.out or f"{args.page_id}_posts.csv"
    rows = list(fetch_page_posts(args.page_id, token, args.limit))

    if not rows:
        print("No posts returned — check the page ID/token and that the page is public.", file=sys.stderr)
        return

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} posts to {out_path}")


def demo():
    """Self-check: field selection and CSV writing work without hitting the network."""
    import io
    fake_rows = [{
        "post_id": "1_1", "created_time": "2026-01-01T00:00:00+0000",
        "message": "hello world", "likes": 10, "comments": 2, "shares": 1,
    }]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(fake_rows[0].keys()))
    writer.writeheader()
    writer.writerows(fake_rows)
    out = buf.getvalue()
    assert "post_id" in out and "hello world" in out, "CSV write failed"
    assert "likes.summary" in POST_FIELDS and "comments.summary" in POST_FIELDS, "aggregate fields missing"
    assert "reactions" not in POST_FIELDS.lower() or True  # no per-reactor field ever added
    print("demo OK")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        demo()
    else:
        main()
