import os
import json
import requests
from pathlib import Path

API_KEY = os.environ["FINNHUB_API_KEY"]

TICKERS = [
    "AAPL",
    "MSFT",
    "NVDA",
    "AMZN",
    "META",
    "GOOGL",
    "TSLA",
    "AMD",
    "JPM",
    "AVGO"
]

Path("data/finnhub").mkdir(parents=True, exist_ok=True)

for ticker in TICKERS:

    quote = requests.get(
        f"https://finnhub.io/api/v1/quote?symbol={ticker}&token={API_KEY}"
    ).json()

    news = requests.get(
        f"https://finnhub.io/api/v1/company-news?symbol={ticker}&from=2026-01-01&to=2026-12-31&token={API_KEY}"
    ).json()

    output = {
        "quote": quote,
        "news": news[:20]
    }

    with open(f"data/finnhub/{ticker}.json", "w") as f:
        json.dump(output, f, indent=2)
