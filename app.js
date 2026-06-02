const LOCAL_TICKERS_URL = "./data/company_tickers.json";
const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_TICKERS_PROXY_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(SEC_TICKERS_URL)}`;
const SEC_SUBMISSIONS_BASE = "https://data.sec.gov/submissions/CIK";

let companies = [];
let activeCompany = null;

const views = document.querySelectorAll(".view");
const navButtons = document.querySelectorAll(".nav-btn");
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");
const resultCount = document.getElementById("resultCount");
const statusText = document.getElementById("statusText");

function showView(id) {
  views.forEach(view => view.classList.remove("active-view"));
  document.getElementById(id).classList.add("active-view");
  navButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.view === id));
  if (id === "pipelineView") renderPipeline();
}

navButtons.forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
document.getElementById("backButton").addEventListener("click", () => showView("searchView"));
document.getElementById("clearSearch").addEventListener("click", () => {
  searchInput.value = "";
  renderResults(companies.slice(0, 24));
});

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.json();
}

function normalizeCompanyData(data) {
  const raw = Array.isArray(data) ? data : Object.values(data);
  return raw.map(item => ({
    cik: String(item.cik_str || item.cik || "").padStart(10, "0"),
    ticker: String(item.ticker || "").toUpperCase(),
    title: item.title || item.name || "Unknown Company",
    exchange: item.exchange || item.exchangeLabel || "SEC reporting company"
  })).filter(item => item.cik && item.ticker).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

async function loadCompanies() {
  const sources = [
    { label: "local SEC company database", url: LOCAL_TICKERS_URL },
    { label: "SEC live company database", url: SEC_TICKERS_URL },
    { label: "SEC company database through public proxy", url: SEC_TICKERS_PROXY_URL }
  ];

  for (const source of sources) {
    try {
      const data = await fetchJson(source.url);
      companies = normalizeCompanyData(data);
      if (!companies.length) throw new Error("No companies parsed.");
      statusText.textContent = `Loaded ${companies.length.toLocaleString()} companies from ${source.label}.`;
      renderResults(companies.slice(0, 24));
      return;
    } catch (error) {
      console.warn(`Failed loading ${source.label}`, error);
    }
  }

  statusText.textContent = "Could not load company data. Keep data/company_tickers.json in the repo root folder structure.";
}

function renderResults(items) {
  resultCount.textContent = items.length;
  results.innerHTML = items.map(company => `
    <article class="result-card" data-ticker="${company.ticker}">
      <span class="ticker-pill">${company.ticker}</span>
      <h4>${company.title}</h4>
      <p class="muted">CIK ${company.cik}${company.exchange ? ` · ${company.exchange}` : ""}</p>
    </article>
  `).join("");

  document.querySelectorAll(".result-card").forEach(card => {
    card.addEventListener("click", () => {
      const company = companies.find(c => c.ticker === card.dataset.ticker);
      openCompany(company);
    });
  });
}

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return renderResults(companies.slice(0, 24));
  const matched = companies.filter(c =>
    c.ticker.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
  ).slice(0, 60);
  renderResults(matched);
});

async function openCompany(company) {
  activeCompany = company;
  document.getElementById("stockTitle").textContent = company.title;
  document.getElementById("stockMeta").textContent = `${company.ticker} · CIK ${company.cik}`;
  document.getElementById("exchangeLabel").textContent = company.exchange || "SEC reporting company";
  document.getElementById("priceValue").textContent = "Loading...";
  document.getElementById("priceNote").textContent = "Trying live price endpoint";

  loadLocalDealData();
  renderFinancialPlaceholders();
  showView("stockView");
  await Promise.allSettled([loadLivePrice(company), loadFilings(company)]);
}

async function loadLivePrice(company) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(company.ticker)}?range=1d&interval=5m`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Price endpoint failed.");
    const data = await response.json();
    const result = data.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;
    const currency = result?.meta?.currency || "USD";
    const time = result?.meta?.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toLocaleString() : "latest available";
    if (!price) throw new Error("No price found.");
    document.getElementById("priceValue").textContent = `${currency} ${Number(price).toFixed(2)}`;
    document.getElementById("priceNote").textContent = `Yahoo Finance chart endpoint · ${time}`;
  } catch (error) {
    document.getElementById("priceValue").textContent = "—";
    document.getElementById("priceNote").textContent = "Live price blocked here. Add Finnhub/Polygon backend later.";
    console.warn(error);
  }
}

async function loadFilings(company) {
  const filingsList = document.getElementById("filingsList");
  filingsList.innerHTML = `<div class="list-item"><p>Loading SEC filings...</p></div>`;
  try {
    const url = `${SEC_SUBMISSIONS_BASE}${company.cik}.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("SEC submissions failed.");
    const data = await response.json();
    const recent = data.filings.recent;
    const filings = recent.form.map((form, i) => ({
      form,
      date: recent.filingDate[i],
      accession: recent.accessionNumber[i].replaceAll("-", ""),
      doc: recent.primaryDocument[i],
      desc: recent.primaryDocDescription[i] || "SEC filing"
    })).filter(f => ["10-K", "10-Q", "8-K", "4", "DEF 14A", "S-1"].includes(f.form)).slice(0, 12);

    filingsList.innerHTML = filings.map(f => {
      const cikNoZeros = String(Number(company.cik));
      const link = `https://www.sec.gov/Archives/edgar/data/${cikNoZeros}/${f.accession}/${f.doc}`;
      return `
        <div class="list-item">
          <a href="${link}" target="_blank" rel="noopener">${f.form} · ${f.date}</a>
          <p>${f.desc}</p>
        </div>
      `;
    }).join("") || `<div class="list-item"><p>No major recent filings found.</p></div>`;
  } catch (error) {
    filingsList.innerHTML = `<div class="list-item"><p>Could not load SEC filings directly from the browser. This needs a serverless proxy later.</p></div>`;
    console.warn(error);
  }
}

document.getElementById("refreshFilings").addEventListener("click", () => {
  if (activeCompany) loadFilings(activeCompany);
});

function renderFinancialPlaceholders() {
  const box = document.getElementById("financialsBox");
  const metrics = [
    ["Revenue", "SEC XBRL later"],
    ["Net Income", "SEC XBRL later"],
    ["Assets", "SEC XBRL later"],
    ["Liabilities", "SEC XBRL later"],
    ["Cash", "SEC XBRL later"],
    ["Shares", "SEC XBRL later"]
  ];
  box.innerHTML = metrics.map(([label, value]) => `
    <div class="metric"><p>${label}</p><h4>${value}</h4></div>
  `).join("");
}

function storageKey() {
  return activeCompany ? `signaldesk:${activeCompany.ticker}` : null;
}

function loadLocalDealData() {
  const saved = JSON.parse(localStorage.getItem(storageKey()) || "{}");
  document.getElementById("dealStatus").value = saved.status || "Watching";
  document.getElementById("notesBox").value = saved.notes || "";
  document.getElementById("saveStatus").textContent = "";
}

function saveLocalDealData() {
  if (!activeCompany) return;
  const payload = {
    ticker: activeCompany.ticker,
    title: activeCompany.title,
    cik: activeCompany.cik,
    status: document.getElementById("dealStatus").value,
    notes: document.getElementById("notesBox").value,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(storageKey(), JSON.stringify(payload));
  document.getElementById("saveStatus").textContent = "Saved in this browser.";
}

document.getElementById("saveNotes").addEventListener("click", saveLocalDealData);
document.getElementById("dealStatus").addEventListener("change", saveLocalDealData);

function renderPipeline() {
  const statuses = ["Watching", "Researching", "Contacted", "Negotiating", "Closed", "Passed"];
  const items = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("signaldesk:")) {
      try { items.push(JSON.parse(localStorage.getItem(key))); } catch {}
    }
  }
  document.getElementById("pipelineBoard").innerHTML = statuses.map(status => {
    const rows = items.filter(item => item.status === status);
    return `
      <div class="pipeline-col">
        <h3>${status}</h3>
        ${rows.map(item => `<div class="pipeline-item"><strong>${item.ticker}</strong><br>${item.title}</div>`).join("") || `<p class="muted">No companies yet.</p>`}
      </div>
    `;
  }).join("");
}

loadCompanies();
