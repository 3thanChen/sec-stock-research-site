import json
import urllib.request
from pathlib import Path
from datetime import datetime

SEC_URL = "https://www.sec.gov/files/company_tickers.json"

req = urllib.request.Request(
    SEC_URL,
    headers={
        "User-Agent": "SECStockResearch/1.0 your-email@example.com"
    }
)

with urllib.request.urlopen(req) as response:
    raw = json.loads(response.read().decode("utf-8"))

companies = []

for company in raw.values():
    companies.append({
        "ticker": company["ticker"],
        "title": company["title"],
        "cik_str": company["cik_str"],
        "cik10": str(company["cik_str"]).zfill(10)
    })

output = {
    "updated_at": datetime.utcnow().isoformat(),
    "count": len(companies),
    "companies": companies
}

Path("data").mkdir(exist_ok=True)

with open("data/company_tickers.json", "w") as f:
    json.dump(output, f)
