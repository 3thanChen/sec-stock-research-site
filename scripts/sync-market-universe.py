import os
import json
import urllib.request
import requests
from pathlib import Path
from datetime import datetime, timezone

FINNHUB_API_KEY = os.environ["FINNHUB_API_KEY"]

SEC_URL = "https://www.sec.gov/files/company_tickers.json"
FINNHUB_SYMBOLS_URL = "https://finnhub.io/api/v1/stock/symbol?exchange=US"

OUT = Path("data/market_universe.json")

# 1. Load SEC companies
req = urllib.request.Request(
    SEC_URL,
    headers={
        "User-Agent": "sec-stock-research-site yx.ethanc@gmail.com"
    }
)

with urllib.request.urlopen(req, timeout=30) as response:
    sec_raw = json.loads(response.read().decode("utf-8"))

sec_companies = {}

for item in sec_raw.values():
    ticker = item["ticker"].upper()
    sec_companies[ticker] = {
        "ticker": ticker,
        "title": item["title"],
        "cik_str": item["cik_str"],
        "cik10": str(item["cik_str"]).zfill(10)
    }

# 2. Load Finnhub supported U.S. symbols
finnhub_symbols = requests.get(
    FINNHUB_SYMBOLS_URL,
    params={"token": FINNHUB_API_KEY},
    timeout=30
).json()

finnhub_tickers = set()

for item in finnhub_symbols:
    symbol = item.get("symbol", "").upper()

    # Avoid weird derivatives/warrants/units for now
    if "." in symbol or "/" in symbol or "-" in symbol:
        continue

    finnhub_tickers.add(symbol)

# 3. Keep only tickers found in both
matched = []

for ticker, company in sec_companies.items():
    if ticker in finnhub_tickers:
        matched.append(company)

matched.sort(key=lambda x: x["ticker"])

OUT.parent.mkdir(parents=True, exist_ok=True)

with OUT.open("w", encoding="utf-8") as f:
    json.dump({
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "sec": SEC_URL,
            "finnhub": FINNHUB_SYMBOLS_URL
        },
        "count": len(matched),
        "companies": matched
    }, f, indent=2)

print(f"Matched {len(matched)} SEC + Finnhub companies.")
