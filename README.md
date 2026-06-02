# SEC Stock Research Site

A compact GitHub Pages stock research screener using SEC company data synced by GitHub Actions.

## What this does

- Displays all SEC public-company ticker records from `data/company_tickers.json`
- Search by ticker, company name, or CIK
- Links each company to official SEC EDGAR and SEC JSON filing feed
- Updates the SEC company list automatically through GitHub Actions
- Does **not** include AI recommendations yet
- Does **not** expose API keys in frontend code

## Files to upload to GitHub

Upload everything in this folder:

```text
index.html
style.css
script.js
data/company_tickers.json
scripts/sync-sec-companies.py
.github/workflows/sync-sec-companies.yml
README.md
```

## GitHub Pages setup

1. Create a GitHub repository.
2. Upload all files and folders.
3. Go to `Settings` → `Pages`.
4. Under `Build and deployment`, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save.

Your site will appear at:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/
```

## GitHub Action setup

Go to:

```text
Settings → Secrets and variables → Actions → New repository secret
```

Add:

```text
SEC_USER_AGENT
```

Value example:

```text
Your Name your-email@example.com
```

SEC asks automated requests to identify the requester through a User-Agent. Do not spam SEC endpoints.

Then run:

```text
Actions → Sync SEC Companies → Run workflow
```

The workflow also runs daily.

## Optional future APIs

Later, add these through GitHub Actions, not frontend JavaScript:

- Finnhub: prices, company profiles, news, earnings calendar
- sec-api.io: advanced SEC filing search/extraction

Never put API keys directly inside `script.js`.
