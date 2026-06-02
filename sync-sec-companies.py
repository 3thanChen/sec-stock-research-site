"""
Sync SEC company tickers into data/company_tickers.json.

This script is designed for GitHub Actions. It downloads the SEC company ticker
file using a proper User-Agent, normalizes the structure, and optionally adds
latest filing form/date for the first N companies to avoid hammering SEC.
"""

from __future__ import annotations

import json
import os
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_FILE = DATA_DIR / "company_tickers.json"

SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"

USER_AGENT = os.getenv(
    "SEC_USER_AGENT",
    "SEC Stock Research Site contact@example.com",
)

# Keep this conservative. SEC is not your private database.
# Company list sync is always full. Latest filing enrichment is optional/limited.
ENRICH_LIMIT = int(os.getenv("SEC_ENRICH_LIMIT", "0"))
REQUEST_DELAY_SECONDS = float(os.getenv("SEC_REQUEST_DELAY_SECONDS", "0.25"))


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept-Encoding": "gzip, deflate",
            "Host": urllib.parse.urlparse(url).netloc,
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def cik10(cik: int | str) -> str:
    return str(cik).zfill(10)


def get_latest_filing(cik: str) -> tuple[str, str]:
    try:
        data = fetch_json(SEC_SUBMISSIONS_URL.format(cik=cik))
        recent = data.get("filings", {}).get("recent", {})
        forms = recent.get("form", [])
        dates = recent.get("filingDate", [])
        if forms and dates:
            return forms[0], dates[0]
    except Exception as exc:
        print(f"Warning: could not fetch latest filing for {cik}: {exc}")
    return "—", "—"


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    raw = fetch_json(SEC_TICKERS_URL)
    rows = []

    for item in raw.values():
        cik = cik10(item["cik_str"])
        rows.append(
            {
                "ticker": item.get("ticker", ""),
                "title": item.get("title", ""),
                "cik_str": item.get("cik_str"),
                "cik10": cik,
                "latest_form": "—",
                "latest_filed": "—",
            }
        )

    rows.sort(key=lambda x: x["ticker"])

    if ENRICH_LIMIT > 0:
        print(f"Enriching latest filings for first {ENRICH_LIMIT} companies...")
        for row in rows[:ENRICH_LIMIT]:
            form, filed = get_latest_filing(row["cik10"])
            row["latest_form"] = form
            row["latest_filed"] = filed
            time.sleep(REQUEST_DELAY_SECONDS)

    payload = {
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "source": SEC_TICKERS_URL,
        "count": len(rows),
        "companies": rows,
    }

    OUTPUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} companies to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
