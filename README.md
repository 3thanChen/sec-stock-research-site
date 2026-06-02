# SignalDesk

Static GitHub Pages stock research site.

## Deploy
Upload these files/folders to the repo root:

- `index.html`
- `styles.css`
- `app.js`
- `data/company_tickers.json`

Then enable GitHub Pages from `main` branch `/root`.

## Company database
The app loads `data/company_tickers.json` first. Replace that file with the full SEC ticker file when you want the entire SEC universe:

https://www.sec.gov/files/company_tickers.json

The app also tries to fetch the live SEC file/proxy as fallback, but GitHub Pages can be blocked by CORS/rate limits. Local JSON is more reliable.
