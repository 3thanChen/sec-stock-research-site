const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
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

async function loadCompanies() {
  try {
    const response = await fetch(SEC_TICKERS_URL);
    if (!response.ok) throw new Error("SEC company ticker file failed to load.");
    const data = await response.json();
    companies = Object.values(data).map(item => ({
      cik: String(item.cik_str).padStart(10, "0"),
      ticker: item.ticker,
      title: item.title
    })).sort((a, b) => a.ticker.localeCompare(b.ticker));
    statusText.textContent = `Loaded ${companies.length.toLocaleString()} SEC companies.`;
    renderResults(companies.slice(0, 24));
  } catch (error) {
    statusText.textContent = "Could not load SEC companies. GitHub Pages may be blocked by SEC CORS/rate limits. Use a proxy later.";
    console.error(error);
  }
}

function renderResults(items) {
  resultCount.textContent = items.length;
  results.innerHTML = items.map(company => `
    <article class="result-card" data-ticker="${company.ticker}">
      <span class="ticker-pill">${company.ticker}</span>
      <h4>${company.title}</h4>
      <p class="muted">CIK ${company.cik}</p>
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
  document.getElementById("exchangeLabel").textContent = "SEC reporting company";
  document.getElementById("priceValue").textContent = "—";
  document.getElementById("priceNote").textContent = "Price API not connected yet";

  loadLocalDealData();
  renderFinancialPlaceholders();
  showView("stockView");
  await loadFilings(company);
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
    filingsList.innerHTML = `<div class="list-item"><p>Could not load filings directly from SEC. Add a backend/proxy later if GitHub Pages gets blocked.</p></div>`;
    console.error(error);
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
