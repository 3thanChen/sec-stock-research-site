const SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_SUBMISSIONS_BASE_URL = "https://data.sec.gov/submissions/";

let allCompanies = [];
let filteredCompanies = [];

function padCik(cik) {
  return String(cik).padStart(10, "0");
}

function secBrowseUrl(cik) {
  return `https://www.sec.gov/edgar/browse/?CIK=${padCik(cik)}&owner=exclude`;
}

function secSubmissionsUrl(cik) {
  return `${SEC_SUBMISSIONS_BASE_URL}CIK${padCik(cik)}.json`;
}

function normalizeCompany(raw) {
  return {
    ticker: String(raw.ticker || "").toUpperCase(),
    name: raw.title || "Unknown Company",
    cik: padCik(raw.cik_str)
  };
}

async function loadAllCompaniesFromSEC() {
  const response = await fetch(SEC_COMPANY_TICKERS_URL);
  if (!response.ok) throw new Error(`SEC request failed: ${response.status}`);

  const data = await response.json();
  allCompanies = Object.values(data).map(normalizeCompany).sort((a, b) => a.ticker.localeCompare(b.ticker));
  filteredCompanies = [...allCompanies];

  localStorage.setItem("secCompanies", JSON.stringify(allCompanies));
  return allCompanies;
}

function loadCompaniesFromCache() {
  const cached = localStorage.getItem("secCompanies");
  if (!cached) return [];
  try {
    return JSON.parse(cached);
  } catch {
    return [];
  }
}

function getDisplayLimit() {
  const select = document.getElementById("displayLimit");
  if (!select || select.value === "all") return Infinity;
  return Number(select.value);
}

function updateCounts(visible) {
  const loadedCount = document.getElementById("loadedCount");
  const visibleCount = document.getElementById("visibleCount");
  if (loadedCount) loadedCount.textContent = allCompanies.length.toLocaleString();
  if (visibleCount) visibleCount.textContent = visible.toLocaleString();
}

function renderCompanies() {
  const tableBody = document.getElementById("companyTableBody");
  const status = document.getElementById("statusText");
  if (!tableBody) return;

  const limit = getDisplayLimit();
  const visibleCompanies = filteredCompanies.slice(0, limit);

  tableBody.innerHTML = visibleCompanies.map(company => `
    <tr>
      <td class="ticker-cell"><a href="company.html?ticker=${encodeURIComponent(company.ticker)}">${company.ticker}</a></td>
      <td class="company-name-cell">${company.name}</td>
      <td class="cik-cell">${company.cik}</td>
      <td>
        <div class="action-links">
          <a href="company.html?ticker=${encodeURIComponent(company.ticker)}">Filings</a>
          <a href="${secBrowseUrl(company.cik)}" target="_blank" rel="noopener">EDGAR</a>
          <a href="${secSubmissionsUrl(company.cik)}" target="_blank" rel="noopener">JSON</a>
        </div>
      </td>
    </tr>
  `).join("");

  updateCounts(visibleCompanies.length);

  if (status) {
    if (filteredCompanies.length === 0) {
      status.textContent = "No companies match your search.";
    } else if (visibleCompanies.length < filteredCompanies.length) {
      status.textContent = `Showing ${visibleCompanies.length.toLocaleString()} of ${filteredCompanies.length.toLocaleString()} matching companies. Use search or choose All.`;
    } else {
      status.textContent = `Showing ${visibleCompanies.length.toLocaleString()} companies from SEC company_tickers.json.`;
    }
  }
}

function filterCompanies() {
  const input = document.getElementById("searchInput");
  const query = input ? input.value.trim().toUpperCase() : "";

  if (!query) {
    filteredCompanies = [...allCompanies];
  } else {
    filteredCompanies = allCompanies.filter(company =>
      company.ticker.includes(query) ||
      company.name.toUpperCase().includes(query) ||
      company.cik.includes(query)
    );
  }

  renderCompanies();
}

async function initIndexPage() {
  const tableBody = document.getElementById("companyTableBody");
  if (!tableBody) return;

  const status = document.getElementById("statusText");

  try {
    allCompanies = await loadAllCompaniesFromSEC();
    filteredCompanies = [...allCompanies];
    if (status) status.textContent = "Loaded live SEC company list.";
  } catch (error) {
    const cached = loadCompaniesFromCache();
    if (cached.length > 0) {
      allCompanies = cached;
      filteredCompanies = [...allCompanies];
      if (status) status.textContent = "SEC fetch failed, so the site is using the last saved browser cache.";
    } else {
      if (status) status.textContent = "Could not load SEC data. This can happen if the browser blocks the SEC request. Try again later or use a small backend/proxy.";
      tableBody.innerHTML = `<tr class="error-row"><td colspan="4">SEC data failed to load. Open the SEC JSON link above to confirm the source is reachable.</td></tr>`;
      return;
    }
  }

  renderCompanies();

  const input = document.getElementById("searchInput");
  const button = document.getElementById("searchButton");
  const limit = document.getElementById("displayLimit");

  if (input) input.addEventListener("input", filterCompanies);
  if (button) button.addEventListener("click", filterCompanies);
  if (limit) limit.addEventListener("change", renderCompanies);
}

async function findCompanyByTicker(ticker) {
  let companies = loadCompaniesFromCache();

  if (companies.length === 0) {
    companies = await loadAllCompaniesFromSEC();
  }

  return companies.find(company => company.ticker === ticker.toUpperCase());
}

function filingDocumentUrl(cik, accessionNumber, primaryDocument) {
  const accessionNoDashes = accessionNumber.replaceAll("-", "");
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionNoDashes}/${primaryDocument}`;
}

async function renderCompanyPage() {
  const nameElement = document.getElementById("companyName");
  if (!nameElement) return;

  const params = new URLSearchParams(window.location.search);
  const ticker = (params.get("ticker") || "AAPL").toUpperCase();

  const metaElement = document.getElementById("companyMeta");
  const secSearch = document.getElementById("secSearch");
  const secJson = document.getElementById("secJson");
  const edgarTopLink = document.getElementById("edgarTopLink");
  const filingStatus = document.getElementById("filingStatus");
  const filingsTable = document.getElementById("filingsTable");

  try {
    const company = await findCompanyByTicker(ticker);
    if (!company) throw new Error("Company not found in SEC company ticker list.");

    document.title = `${company.ticker} | SEC Research Hub`;
    nameElement.textContent = `${company.ticker} — ${company.name}`;
    metaElement.textContent = `CIK: ${company.cik}`;

    const browse = secBrowseUrl(company.cik);
    const submissions = secSubmissionsUrl(company.cik);

    secSearch.href = browse;
    secJson.href = submissions;
    edgarTopLink.href = browse;

    const response = await fetch(submissions);
    if (!response.ok) throw new Error(`SEC submissions request failed: ${response.status}`);
    const data = await response.json();
    const recent = data.filings.recent;

    const rows = recent.form.slice(0, 25).map((form, index) => {
      const accession = recent.accessionNumber[index];
      const primaryDocument = recent.primaryDocument[index];
      const filingUrl = filingDocumentUrl(company.cik, accession, primaryDocument);

      return `
        <tr>
          <td><strong>${form}</strong></td>
          <td>${recent.filingDate[index] || ""}</td>
          <td>${recent.reportDate[index] || ""}</td>
          <td><a href="${filingUrl}" target="_blank" rel="noopener">${accession}</a></td>
        </tr>
      `;
    }).join("");

    filingsTable.innerHTML = rows;
    filingStatus.textContent = `Showing latest 25 filings from official SEC submissions JSON.`;
  } catch (error) {
    nameElement.textContent = ticker;
    metaElement.textContent = "Could not load company data.";
    filingStatus.textContent = error.message;
    filingsTable.innerHTML = "";
  }
}

initIndexPage();
renderCompanyPage();
