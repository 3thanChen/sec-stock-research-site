const DATA_URL = './data/company_tickers.json';
const params = new URLSearchParams(location.search);
const tickerParam = (params.get('ticker') || '').toUpperCase();

function $(id) { return document.getElementById(id); }
function normalizeCompany(raw) {
  const cik = String(raw.cik10 || raw.cik_str || '').padStart(10, '0');
  return {
    ticker: raw.ticker || '',
    title: raw.title || raw.name || '',
    cik10: cik
  };
}

async function loadCompany() {
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load ${DATA_URL}`);
  const data = await res.json();
  const list = Array.isArray(data.companies) ? data.companies : Object.values(data);
  const company = list.map(normalizeCompany).find(c => c.ticker.toUpperCase() === tickerParam);
  if (!company) throw new Error(`Ticker not found: ${tickerParam}`);
  return company;
}

async function loadFilings(cik10) {
  const url = `https://data.sec.gov/submissions/CIK${cik10}.json`;
  const filingsList = $('filingsList');
  $('allFilingsLink').href = `https://www.sec.gov/edgar/browse/?CIK=${cik10}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('SEC filings unavailable from browser. Use SEC link.');
    const data = await res.json();
    const recent = data.filings?.recent;
    if (!recent) throw new Error('No recent filings found.');

    const rows = recent.form.map((form, i) => ({
      form,
      date: recent.filingDate[i],
      accession: recent.accessionNumber[i],
      doc: recent.primaryDocument[i]
    })).filter(x => ['10-K','10-Q','8-K','4','S-1','DEF 14A'].includes(x.form)).slice(0, 12);

    filingsList.innerHTML = rows.map(f => {
      const accNoDash = f.accession.replaceAll('-', '');
      const link = `https://www.sec.gov/Archives/edgar/data/${Number(cik10)}/${accNoDash}/${f.doc}`;
      return `<div class="item">
        <span>${f.date}</span>
        <span class="badge">${f.form}</span>
        <span>${labelForm(f.form)}</span>
        <a href="${link}" target="_blank" rel="noopener">View</a>
      </div>`;
    }).join('') || '<p class="muted">No matching recent filings.</p>';
  } catch (err) {
    filingsList.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function labelForm(form) {
  return {
    '10-K': 'Annual report / 年報',
    '10-Q': 'Quarterly report / 季報',
    '8-K': 'Major event report',
    '4': 'Insider transaction',
    'S-1': 'IPO registration',
    'DEF 14A': 'Proxy statement'
  }[form] || 'SEC filing';
}

function renderNewsLinks(company) {
  const q = encodeURIComponent(`${company.ticker} ${company.title} stock news`);
  $('newsSearchLink').href = `https://www.google.com/search?q=${q}&tbm=nws`;
  $('newsList').innerHTML = `
    <div class="item"><span>News</span><span class="badge">Google</span><span>Latest market news for ${company.ticker}</span><a href="https://www.google.com/search?q=${q}&tbm=nws" target="_blank" rel="noopener">Open</a></div>
    <div class="item"><span>Finance</span><span class="badge">Yahoo</span><span>Quote, headlines, chart, financials</span><a href="https://finance.yahoo.com/quote/${company.ticker}" target="_blank" rel="noopener">Open</a></div>
    <div class="item"><span>SEC</span><span class="badge">EDGAR</span><span>Official filings and 財報 source</span><a href="https://www.sec.gov/edgar/browse/?CIK=${company.cik10}" target="_blank" rel="noopener">Open</a></div>
  `;
}

async function init() {
  try {
    if (!tickerParam) throw new Error('No ticker selected.');
    const company = await loadCompany();
    document.title = `${company.ticker} · Stock Detail`;
    $('stockTitle').textContent = `${company.ticker}`;
    $('stockSubtitle').textContent = company.title;
    $('tickerHeading').textContent = company.ticker;
    $('companyName').textContent = company.title;
    $('companyCik').textContent = company.cik10;
    renderNewsLinks(company);
    await loadFilings(company.cik10);
  } catch (err) {
    $('stockTitle').textContent = 'Error';
    $('stockSubtitle').textContent = err.message;
    $('filingsList').innerHTML = `<p class="error">${err.message}</p>`;
  }
}

init();
