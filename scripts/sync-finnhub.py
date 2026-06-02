import os
import json
import requests
from pathlib import Path
from datetime import datetime, timezone

API_KEY = os.environ["FINNHUB_API_KEY"]

with open("data/market_universe.json", "r", encoding="utf-8") as f:
    universe = json.load(f)

companies = universe["companies"]

# Limit for now so you do not destroy your Finnhub rate limit
companies = companies[:1000]

Path("data/finnhub").mkdir(parents=True, exist_ok=True)

for company in companies:
    ticker = company["ticker"]

    quote = requests.get(
        "https://finnhub.io/api/v1/quote",
        params={"symbol": ticker, "token": API_KEY},
        timeout=20
    ).json()

    out = {
        "ticker": ticker,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "price": quote.get("c"),
        "change": quote.get("d"),
        "percent_change": quote.get("dp"),
        "high": quote.get("h"),
        "low": quote.get("l"),
        "open": quote.get("o"),
        "previous_close": quote.get("pc")
    }

    with open(f"data/finnhub/{ticker}.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

print(f"Synced Finnhub data for {len(companies)} companies.")
