const state = {
  symbol: "NVDA",
  exchange: "NASDAQ",
  range: "1d",
  financialMode: "quarterly",
  financials: null,
  filings: null,
  quote: null,
  news: null,
  refreshTimer: null
};

const el = (id) => document.getElementById(id);

function fromPath() {
  const match = window.location.pathname.match(/\/quote\/([^/]+)/i);
  const raw = match ? decodeURIComponent(match[1]) : new URLSearchParams(window.location.search).get("symbol");
  if (!raw) return;
  const [symbol, exchange] = raw.split(":");
  state.symbol = (symbol || "NVDA").toUpperCase().replace(".", "-");
  state.exchange = (exchange || "NASDAQ").toUpperCase();
}

function fmtCurrency(value, maximumFractionDigits = 2) {
  if (!Number.isFinite(Number(value))) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits
  }).format(Number(value));
}

function fmtNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(number) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(number) >= 1_000_000 ? 2 : 0
  }).format(number);
}

function fmtDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function fmtDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || response.statusText);
  return payload;
}

function setLoading() {
  el("tickerLine").textContent = `${state.symbol}:${state.exchange}`;
  el("companyName").textContent = state.symbol;
  el("mainPrice").textContent = "$--";
  el("mainChange").textContent = "--";
  el("mainChange").className = "main-change neutral";
  el("marketNote").textContent = "Loading live quote...";
  el("lastUpdated").textContent = "Last synced: --";
  el("filingsList").innerHTML = '<div class="empty-state">Loading SEC filings...</div>';
  el("eventsList").innerHTML = '<div class="empty-state">Loading 8-K events...</div>';
  el("insiderList").innerHTML = '<div class="empty-state">Loading Form 4 activity...</div>';
  el("newsList").innerHTML = '<div class="empty-state">Loading market news...</div>';
  el("evidenceList").innerHTML = '<div class="empty-state">Loading evidence links...</div>';
}

function companyTitle(company) {
  if (!company) return state.symbol;
  return company.name || company.ticker || state.symbol;
}

function setCompany(company) {
  if (!company) return;
  state.symbol = company.ticker || state.symbol;
  state.exchange = company.exchange || state.exchange;
  document.title = `${state.symbol} Research - SEC Stock Research`;
  el("tickerLine").textContent = `${state.symbol}:${state.exchange}`;
  el("companyName").textContent = companyTitle(company);
  el("searchInput").value = "";
  el("secCompanyLink").href = `https://www.sec.gov/edgar/browse/?CIK=${company.cik}`;
}

function renderChart(points = [], change = 0) {
  const svg = el("priceChart");
  if (!points.length) {
    svg.innerHTML =
      '<rect x="0" y="0" width="900" height="300" fill="#f4f6f8"></rect><text x="450" y="155" text-anchor="middle" fill="#66707d" font-size="16">Chart data updating</text>';
    return;
  }

  const width = 900;
  const height = 300;
  const pad = 22;
  const values = points.map((point) => Number(point.close)).filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const step = (width - pad * 2) / Math.max(points.length - 1, 1);
  const d = points
    .map((point, index) => {
      const x = pad + index * step;
      const y = height - pad - ((point.close - min) / spread) * (height - pad * 2);
      return `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const stroke = change >= 0 ? "#137333" : "#b3261e";
  const area = `${d} L ${width - pad} ${height - pad} L ${pad} ${height - pad} Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${stroke}" stop-opacity="0.18"></stop>
        <stop offset="100%" stop-color="${stroke}" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"></rect>
    <path d="${area}" fill="url(#chartFill)"></path>
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round"></path>
  `;
}

function renderQuote(payload) {
  state.quote = payload;
  setCompany(payload.company);
  const quote = payload.quote || {};
  const change = Number(quote.change);
  const changePercent = Number(quote.changePercent);
  const positive = change >= 0;

  el("mainPrice").textContent = fmtCurrency(quote.price);
  el("mainChange").textContent =
    Number.isFinite(change) && Number.isFinite(changePercent)
      ? `${positive ? "+" : ""}${fmtCurrency(change)} ${positive ? "+" : ""}${changePercent.toFixed(2)}%`
      : "--";
  el("mainChange").className = `main-change ${Number.isFinite(change) ? (positive ? "positive" : "negative") : "neutral"}`;
  el("marketNote").textContent = `${quote.marketState || "Market"} · ${quote.source || "Live quote"} · ${fmtDateTime(quote.regularMarketTime)}`;
  renderChart(quote.points, change);

  const stats = [
    ["Open", fmtCurrency(quote.open)],
    ["High", fmtCurrency(quote.dayHigh)],
    ["Low", fmtCurrency(quote.dayLow)],
    ["Volume", fmtNumber(quote.volume)],
    ["Previous close", fmtCurrency(quote.previousClose)],
    ["Source", quote.source || "--"]
  ];
  el("statsGrid").innerHTML = stats
    .map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
  el("overviewMetrics").innerHTML = stats
    .slice(0, 3)
    .map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderItemList(target, rows, emptyLabel) {
  if (!rows || !rows.length) {
    el(target).innerHTML = `<div class="empty-state">${emptyLabel}</div>`;
    return;
  }
  el(target).innerHTML = rows
    .map(
      (filing) => `
        <article class="item-row">
          <div><span class="form-badge">${escapeHtml(filing.form)}</span></div>
          <div>
            <strong>${escapeHtml(filing.description || `${filing.form} filing`)}</strong>
            <span>Filed ${fmtDate(filing.filingDate)}${filing.reportDate ? ` · Report ${fmtDate(filing.reportDate)}` : ""}</span>
            ${filing.items ? `<small>Items: ${escapeHtml(filing.items)}</small>` : ""}
          </div>
          <a href="${filing.url || filing.indexUrl}" target="_blank" rel="noreferrer">Open</a>
        </article>
      `
    )
    .join("");
}

function renderFilings(payload) {
  state.filings = payload;
  setCompany(payload.company);
  renderItemList("filingsList", payload.latest, "No recent watched filings found.");
  renderItemList("eventsList", payload.events, "No recent 8-K event filings found.");
  renderItemList("insiderList", payload.insider, "No recent Form 4 filings found.");

  const latestReport = (payload.annualQuarterly || [])[0];
  if (latestReport) {
    el("scheduleTitle").textContent = `${latestReport.form} filed ${fmtDate(latestReport.filingDate)}`;
    el("scheduleText").textContent = `Most recent SEC financial report covers ${fmtDate(latestReport.reportDate)}. Earnings calendar data can be added through a market-data API key.`;
  }

  el("evidenceList").innerHTML = (payload.evidence || [])
    .map(
      (item) => `
        <a class="evidence-link" href="${item.url}" target="_blank" rel="noreferrer">
          ${escapeHtml(item.label)}
        </a>
      `
    )
    .join("");

  el("filingSignal").textContent = `${(payload.latest || []).length} filings`;
  el("eventSignal").textContent = `${(payload.events || []).length} 8-Ks`;
}

function metricValueForEnd(metric, end) {
  const item = (metric.values || []).find((value) => value.end === end);
  if (!item) return "--";
  if (metric.key === "epsDiluted") return Number(item.value).toFixed(2);
  return fmtNumber(item.value);
}

function renderFinancials(payload) {
  state.financials = payload;
  setCompany(payload.company);
  const rows = payload[state.financialMode] || [];
  const anchor = rows.find((metric) => metric.key === "revenue" && metric.values?.length) || rows[0];
  const periods = Array.from(new Set((anchor?.values || []).map((value) => value.end)))
    .sort()
    .slice(-5);

  const table = el("financialTable");
  table.querySelector("thead").innerHTML = `
    <tr>
      <th>Metric</th>
      ${periods.map((period) => `<th>${fmtDate(period)}</th>`).join("")}
    </tr>
  `;
  table.querySelector("tbody").innerHTML = rows
    .map(
      (metric) => `
        <tr>
          <td>${escapeHtml(metric.label)}</td>
          ${periods.map((period) => `<td>${metricValueForEnd(metric, period)}</td>`).join("")}
        </tr>
      `
    )
    .join("");

  const revenue = rows.find((metric) => metric.key === "revenue");
  const latest = revenue?.values?.[0]?.value;
  const prior = revenue?.values?.[1]?.value;
  if (Number.isFinite(latest) && Number.isFinite(prior)) {
    const growth = ((latest - prior) / Math.abs(prior)) * 100;
    el("trendSignal").textContent = `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}% revenue`;
  } else {
    el("trendSignal").textContent = "SEC XBRL";
  }
}

function renderNews(payload) {
  state.news = payload;
  setCompany(payload.company);
  const news = payload.news || [];
  if (!news.length) {
    el("newsList").innerHTML = '<div class="empty-state">No headlines returned for this ticker.</div>';
    return;
  }
  el("newsList").innerHTML = news
    .map(
      (item) => `
        <article class="news-card">
          <div class="news-meta">${escapeHtml(item.source)} · ${fmtDateTime(item.publishedAt)}</div>
          <a href="${item.url}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>
          ${item.summary ? `<p>${escapeHtml(item.summary).slice(0, 180)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function renderSignalSummary() {
  const filings = state.filings?.latest?.length || 0;
  const events = state.filings?.events?.length || 0;
  const news = state.news?.news?.length || 0;
  const quoteSource = state.quote?.quote?.source || "quote feed";
  el("signalText").textContent = `${state.symbol} has ${filings} watched SEC filings, ${events} recent 8-K event reports, ${news} market headlines, and ${quoteSource} price evidence ready for the future AI ranking model.`;
}

async function loadStock(pushUrl = false) {
  setLoading();
  if (pushUrl) {
    history.pushState({}, "", `/quote/${encodeURIComponent(`${state.symbol}:${state.exchange}`)}`);
  }

  const query = encodeURIComponent(state.symbol);
  try {
    const quote = await getJson(`/api/quote?ticker=${query}&range=${state.range}`);
    renderQuote(quote);
  } catch (error) {
    el("marketNote").textContent = `Quote unavailable: ${error.message}`;
  }

  await Promise.allSettled([
    getJson(`/api/filings?ticker=${query}`).then(renderFilings),
    getJson(`/api/financials?ticker=${query}`).then(renderFinancials),
    getJson(`/api/news?ticker=${query}`).then(renderNews)
  ]);

  el("lastUpdated").textContent = `Last synced: ${fmtDateTime(new Date().toISOString())}`;
  renderSignalSummary();
}

let searchTimer;
async function runSearch(value) {
  const q = value.trim();
  if (!q) {
    el("searchResults").hidden = true;
    return;
  }
  const payload = await getJson(`/api/companies?q=${encodeURIComponent(q)}&limit=8`);
  const results = payload.results || [];
  if (!results.length) {
    el("searchResults").innerHTML = '<div class="empty-state">No matching SEC companies.</div>';
    el("searchResults").hidden = false;
    return;
  }
  el("searchResults").innerHTML = results
    .map(
      (company) => `
        <button class="search-result" data-ticker="${company.ticker}" data-exchange="${company.exchange}">
          <strong>${escapeHtml(company.ticker)}</strong>
          <span>${escapeHtml(company.name)}</span>
          <small>${escapeHtml(company.exchange)}</small>
        </button>
      `
    )
    .join("");
  el("searchResults").hidden = false;
}

function bindEvents() {
  el("searchInput").addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(event.target.value).catch(console.error), 220);
  });

  el("searchResults").addEventListener("click", (event) => {
    const button = event.target.closest(".search-result");
    if (!button) return;
    state.symbol = button.dataset.ticker;
    state.exchange = button.dataset.exchange;
    el("searchResults").hidden = true;
    loadStock(true);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-wrap")) el("searchResults").hidden = true;
  });

  document.querySelectorAll(".range-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".range-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.range = button.dataset.range;
      loadStock(false);
    });
  });

  el("quarterlyBtn").addEventListener("click", () => {
    state.financialMode = "quarterly";
    el("quarterlyBtn").classList.add("active");
    el("annualBtn").classList.remove("active");
    if (state.financials) renderFinancials(state.financials);
  });

  el("annualBtn").addEventListener("click", () => {
    state.financialMode = "annual";
    el("annualBtn").classList.add("active");
    el("quarterlyBtn").classList.remove("active");
    if (state.financials) renderFinancials(state.financials);
  });

  window.addEventListener("popstate", () => {
    fromPath();
    loadStock(false);
  });
}

fromPath();
bindEvents();
loadStock(false);
state.refreshTimer = setInterval(() => loadStock(false), 60_000);
