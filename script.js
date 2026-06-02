const tableBody = document.getElementById("companyTable");
const searchInput = document.getElementById("searchInput");
const formFilter = document.getElementById("formFilter");
const statusEl = document.getElementById("status");
const countLabel = document.getElementById("countLabel");
const updatedLabel = document.getElementById("updatedLabel");

let companies = [];

function cik10(cik) {
  return String(cik).padStart(10, "0");
}

function edgarCompanyUrl(cik) {
  return `https://www.sec.gov/edgar/browse/?CIK=${cik}&owner=exclude`;
}

function filingJsonUrl(cik) {
  return `https://data.sec.gov/submissions/CIK${cik}.json`;
}

function normalizeCompany(raw) {
  const cik = cik10(raw.cik_str || raw.cik || raw.cik10 || "");
  return {
    ticker: raw.ticker || "",
    title: raw.title || raw.name || "",
    cik,
    latestForm: raw.latest_form || "—",
    latestFiled: raw.latest_filed || "—"
  };
}

function render() {
  const q = searchInput.value.trim().toLowerCase();
  const form = formFilter.value;

  const filtered = companies.filter(c => {
    const matchesSearch = !q ||
      c.ticker.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.cik.includes(q);

    const matchesForm = !form || c.latestForm === form;
    return matchesSearch && matchesForm;
  });

  countLabel.textContent = `${filtered.length.toLocaleString()} shown / ${companies.length.toLocaleString()} total`;

  tableBody.innerHTML = filtered.map(c => `
    <tr>
      <td class="ticker">${c.ticker}</td>
      <td class="company" title="${c.title}">${c.title}</td>
      <td>${c.cik}</td>
      <td>${c.latestForm}</td>
      <td>${c.latestFiled}</td>
      <td class="links">
        <a href="${edgarCompanyUrl(c.cik)}" target="_blank" rel="noopener">EDGAR</a>
        <a href="${filingJsonUrl(c.cik)}" target="_blank" rel="noopener">JSON</a>
      </td>
    </tr>
  `).join("");
}

async function loadData() {
  try {
    statusEl.textContent = "Loading local synced SEC data…";
    const res = await fetch("data/company_tickers.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const rawCompanies = Array.isArray(payload.companies)
      ? payload.companies
      : Object.values(payload);

    companies = rawCompanies.map(normalizeCompany).filter(c => c.ticker && c.cik);
    companies.sort((a, b) => a.ticker.localeCompare(b.ticker));

    if (payload.updated_at) {
      updatedLabel.textContent = `Last sync: ${payload.updated_at}`;
    }

    statusEl.textContent = "Ready";
    render();
  } catch (err) {
    statusEl.innerHTML = `<span class="error">Failed to load data: ${err.message}</span>`;
    tableBody.innerHTML = `<tr><td colspan="6" class="error">Could not load data/company_tickers.json. Run the GitHub Action or upload the data file.</td></tr>`;
  }
}

searchInput.addEventListener("input", render);
formFilter.addEventListener("change", render);

loadData();
