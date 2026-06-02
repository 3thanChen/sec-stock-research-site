import os, json, requests
from pathlib import Path
from datetime import datetime, timezone

API_KEY = os.environ["SEC_API_KEY"]

TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "AMD"]

HEADERS = {"Authorization": API_KEY}

Path("data/stocks").mkdir(parents=True, exist_ok=True)

companies = []

for ticker in TICKERS:
    query = {
        "query": f'ticker:{ticker}',
        "from": "0",
        "size": "20",
        "sort": [{"filedAt": {"order": "desc"}}]
    }

    r = requests.post(
        "https://api.sec-api.io",
        headers=HEADERS,
        json=query,
        timeout=30
    )

    data = r.json()
    filings = data.get("filings", [])

    title = filings[0].get("companyName", ticker) if filings else ticker
    cik = filings[0].get("cik", "") if filings else ""

    companies.append({
        "ticker": ticker,
        "title": title,
        "cik": cik
    })

    stock_data = {
        "ticker": ticker,
        "title": title,
        "cik": cik,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "filings": filings
    }

    with open(f"data/stocks/{ticker}.json", "w", encoding="utf-8") as f:
        json.dump(stock_data, f, indent=2)

with open("data/companies.json", "w", encoding="utf-8") as f:
    json.dump({
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(companies),
        "companies": companies
    }, f, indent=2)
