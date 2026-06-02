import json
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

SEC_URL = "https://www.sec.gov/files/company_tickers.json"
OUT = Path("data/company_tickers.json")

req = urllib.request.Request(
    SEC_URL,
    headers={
        "User-Agent": "sec-stock-research-site yx.ethanc@gmail.com"
    }
)

with urllib.request.urlopen(req, timeout=30) as response:
    raw = json.loads(response.read().decode("utf-8"))

companies = []

for item in raw.values():
    cik10 = str(item["cik_str"]).zfill(10)

    companies.append({
        "ticker": item["ticker"],
        "title": item["title"],
        "cik_str": item["cik_str"],
        "cik10": cik10,
        "latest_form": "—",
        "latest_filed": "—"
    })

companies.sort(key=lambda x: x["ticker"])

OUT.parent.mkdir(parents=True, exist_ok=True)

with OUT.open("w", encoding="utf-8") as f:
    json.dump({
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": SEC_URL,
        "count": len(companies),
        "companies": companies
    }, f, indent=2)

print(f"Saved {len(companies)} companies.")
