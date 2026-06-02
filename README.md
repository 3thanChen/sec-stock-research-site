# SEC Stock Research Site

Clean GitHub Pages stock research website.

## Structure

- `index.html` — compact company screener
- `stock.html` — stock detail page
- `script.js` — homepage logic
- `stock.js` — detail-page logic
- `data/company_tickers.json` — SEC company database
- `.github/workflows/sync-sec-companies.yml` — daily SEC company sync
- `scripts/sync-sec-companies.py` — downloads official SEC company ticker data

## GitHub Pages

Settings → Pages → Deploy from branch → main → /root

## Sync data

Actions → Sync SEC Companies → Run workflow

## Next upgrade

Add Finnhub sync for price, news, and earnings schedule without exposing API keys in frontend code.
