# SEC Stock Research Site

A Google Finance-inspired website for live U.S. stock research.

The first version includes:

- Live SEC company search from the official SEC company ticker file
- Quote-style stock pages at `/quote/NVDA:NASDAQ`
- Live SEC filings for 10-K, 10-Q, 8-K, and Form 4
- Financials from SEC XBRL company facts
- 8-K event updates, insider activity, evidence links, and news
- A placeholder AI signal panel for the later ranked top-10 recommendation page

## Deploy

Deploy this GitHub repository on Vercel. GitHub Pages can host the static frontend, but it cannot run the live `/api/*` endpoints needed for SEC CORS proxying and API-key protected market data.

## Local Preview

```sh
npm start
```

Open `http://localhost:5173`.

## Live Data Notes

- SEC company, filings, and XBRL data come from official SEC endpoints.
- Live/delayed quote data uses Yahoo chart data first, then Stooq as a fallback.
- News uses Yahoo Finance RSS.
- SEC data is not investment advice, and the AI signal panel is intentionally marked as a future evidence-ranking layer.
