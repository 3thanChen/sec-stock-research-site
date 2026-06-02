const DATA_URL = './data/company_tickers.json';
let allCompanies = [];

const rows = document.getElementById('companyRows');
const searchInput = document.getElementById('searchInput');
const limitSelect = document.getElementById('limitSelect');
const stats = document.getElementById('stats');

function normalizeCompany(raw) {
  const cik = String(raw.cik10 || raw.cik_str || '').padStart(10, '0');
  return {
    ticker: raw.ticker || '',
    title: raw.title || raw.name || '',
    cik_str: raw.cik_str || Number(cik),
    cik10: cik
  };
}

async function loadCompanies() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not load ${DATA_URL}: ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data.companies) ? data.companies : Object.values(data);
    allCompanies = list.map(normalizeCompany).filter(c => c.ticker && c.title);
    stats.textContent = `${allCompanies.length.toLocaleString()} companies loaded`;
    renderRows();
  } catch (err) {
    rows.innerHTML = `<tr><td colspan="4" class="error">${err.message}</td></tr>`;
    stats.textContent = 'Load failed';
  }
}

function renderRows() {
  const q = searchInput.value.trim().toLowerCase();
  const limit = Number(limitSelect.value);
  const filtered = allCompanies.filter(c =>
    c.ticker.toLowerCase().includes(q) ||
    c.title.toLowerCase().includes(q) ||
    c.cik10.includes(q)
  );
  const shown = filtered.slice(0, limit);
  rows.innerHTML = shown.map(c => `
    <tr>
      <td><a class="ticker-link" href="stock.html?ticker=${encodeURIComponent(c.ticker)}">${c.ticker}</a></td>
      <td>${c.title}</td>
      <td>${c.cik10}</td>
      <td><a href="https://www.sec.gov/edgar/browse/?CIK=${c.cik10}" target="_blank" rel="noopener">SEC</a></td>
    </tr>
  `).join('') || '<tr><td colspan="4">No results</td></tr>';
  stats.textContent = `${filtered.length.toLocaleString()} matches · showing ${shown.length}`;
}

searchInput.addEventListener('input', renderRows);
limitSelect.addEventListener('change', renderRows);
loadCompanies();
