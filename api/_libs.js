const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT ||
  "sec-stock-research-site/0.1 admin@example.com";

const fallbackCompanies = [
  { cik: 320193, ticker: "AAPL", name: "Apple Inc.", exchange: "Nasdaq" },
  { cik: 789019, ticker: "MSFT", name: "Microsoft Corp", exchange: "Nasdaq" },
  { cik: 1045810, ticker: "NVDA", name: "NVIDIA Corp", exchange: "Nasdaq" },
  { cik: 1018724, ticker: "AMZN", name: "Amazon.com Inc.", exchange: "Nasdaq" },
  { cik: 1652044, ticker: "GOOGL", name: "Alphabet Inc.", exchange: "Nasdaq" },
  { cik: 1326801, ticker: "META", name: "Meta Platforms Inc.", exchange: "Nasdaq" },
  { cik: 1318605, ticker: "TSLA", name: "Tesla Inc.", exchange: "Nasdaq" },
  { cik: 34088, ticker: "XOM", name: "Exxon Mobil Corp", exchange: "NYSE" },
  { cik: 19617, ticker: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE" },
  { cik: 1067983, ticker: "BRK-B", name: "Berkshire Hathaway Inc.", exchange: "NYSE" }
];

function cacheStore() {
  globalThis.__secStockCache = globalThis.__secStockCache || new Map();
  return globalThis.__secStockCache;
}

async function cached(key, ttlMs, loader) {
  const store = cacheStore();
  const hit = store.get(key);
  if (hit && Date.now() - hit.time < ttlMs) return hit.value;
  const value = await loader();
  store.set(key, { time: Date.now(), value });
  return value;
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 12000);
  try {
    const response = await fetch(url, {
      headers: options.headers || {},
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options = {}) {
  return JSON.parse(await fetchText(url, options));
}

function secHeaders() {
  return {
    "User-Agent": SEC_USER_AGENT,
    "Accept-Encoding": "gzip, deflate",
    Accept: "application/json,text/plain,*/*"
  };
}

function padCik(cik) {
  return String(cik || "").replace(/\D/g, "").padStart(10, "0");
}

function normalizeExchange(exchange = "") {
  const value = String(exchange || "").trim();
  if (/nasdaq/i.test(value)) return "NASDAQ";
  if (/nyse/i.test(value)) return "NYSE";
  if (/amex/i.test(value)) return "NYSEAMERICAN";
  return value.toUpperCase() || "SEC";
}

function normalizeTicker(ticker = "") {
  return String(ticker).trim().toUpperCase().replace(".", "-");
}

async function getCompanies() {
  return cached("sec-companies", 1000 * 60 * 60 * 6, async () => {
    try {
      const payload = await fetchJson("https://www.sec.gov/files/company_tickers_exchange.json", {
        headers: secHeaders()
      });
      const fields = payload.fields || [];
      const rows = payload.data || [];
      const idx = Object.fromEntries(fields.map((field, index) => [field, index]));
      return rows
        .map((row) => ({
          cik: Number(row[idx.cik]),
          ticker: normalizeTicker(row[idx.ticker]),
          name: row[idx.name],
          exchange: normalizeExchange(row[idx.exchange])
        }))
        .filter((company) => company.cik && company.ticker && company.name);
    } catch (error) {
      return fallbackCompanies.map((company) => ({
        ...company,
        ticker: normalizeTicker(company.ticker),
        exchange: normalizeExchange(company.exchange),
        fallback: true
      }));
    }
  });
}

async function findCompany(input) {
  const query = normalizeTicker(input);
  const companies = await getCompanies();
  return (
    companies.find((company) => company.ticker === query) ||
    companies.find((company) => `${company.ticker}:${company.exchange}` === query) ||
    companies.find((company) => String(company.cik) === String(input).replace(/\D/g, ""))
  );
}

function filingUrl(cik, accessionNumber, primaryDocument) {
  if (!accessionNumber || !primaryDocument) return null;
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionNumber.replace(/-/g, "")}/${primaryDocument}`;
}

function filingIndexUrl(cik, accessionNumber) {
  if (!accessionNumber) return null;
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionNumber.replace(/-/g, "")}/${accessionNumber}-index.html`;
}

function recentFilingsFromSubmissions(company, submission) {
  const recent = submission.filings && submission.filings.recent ? submission.filings.recent : {};
  const forms = recent.form || [];
  return forms.map((form, index) => {
    const accessionNumber = recent.accessionNumber[index];
    const primaryDocument = recent.primaryDocument[index];
    return {
      form,
      accessionNumber,
      filingDate: recent.filingDate[index],
      reportDate: recent.reportDate[index],
      acceptanceDateTime: recent.acceptanceDateTime[index],
      act: recent.act[index],
      fileNumber: recent.fileNumber[index],
      filmNumber: recent.filmNumber[index],
      items: recent.items ? recent.items[index] : "",
      primaryDocument,
      description: recent.primaryDocDescription ? recent.primaryDocDescription[index] : "",
      url: filingUrl(company.cik, accessionNumber, primaryDocument),
      indexUrl: filingIndexUrl(company.cik, accessionNumber)
    };
  });
}

async function getSubmissions(company) {
  const cik = padCik(company.cik);
  return cached(`submissions-${cik}`, 1000 * 60, async () =>
    fetchJson(`https://data.sec.gov/submissions/CIK${cik}.json`, { headers: secHeaders() })
  );
}

function sendJson(res, payload, status = 200) {
  res.status(status);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.json(payload);
}

function handleError(res, error, status = 500) {
  sendJson(
    res,
    {
      error: error.message || "Unexpected API error",
      live: false,
      updatedAt: new Date().toISOString()
    },
    status
  );
}

module.exports = {
  cached,
  fetchJson,
  fetchText,
  filingIndexUrl,
  filingUrl,
  findCompany,
  getCompanies,
  getSubmissions,
  handleError,
  normalizeTicker,
  padCik,
  recentFilingsFromSubmissions,
  secHeaders,
  sendJson
};
