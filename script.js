const companies = [
  { ticker: "AAPL", name: "Apple Inc.", sector: "Technology", cik: "0000320193", bull: "Strong ecosystem, services growth, high customer loyalty.", bear: "Hardware cycles, China exposure, valuation pressure." },
  { ticker: "MSFT", name: "Microsoft Corporation", sector: "Technology", cik: "0000789019", bull: "Cloud, AI infrastructure, enterprise software dominance.", bear: "Regulatory risk, high expectations, cloud competition." },
  { ticker: "NVDA", name: "NVIDIA Corporation", sector: "Semiconductors", cik: "0001045810", bull: "AI chips, CUDA ecosystem, data center demand.", bear: "Export controls, cyclicality, margin normalization risk." },
  { ticker: "TSLA", name: "Tesla, Inc.", sector: "Automotive / Energy", cik: "0001318605", bull: "EV brand, software optionality, energy storage growth.", bear: "Competition, margin compression, execution risk." },
  { ticker: "AMZN", name: "Amazon.com, Inc.", sector: "Consumer / Cloud", cik: "0001018724", bull: "AWS, logistics scale, advertising growth.", bear: "Retail margins, regulation, cloud competition." },
  { ticker: "META", name: "Meta Platforms, Inc.", sector: "Communication Services", cik: "0001326801", bull: "Massive ad network, AI ranking, strong cash flow.", bear: "Regulation, metaverse spending, social platform shifts." },
  { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Communication Services", cik: "0001652044", bull: "Search, YouTube, cloud growth, AI assets.", bear: "AI search disruption, antitrust, ad cyclicality." },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", sector: "Financials", cik: "0000019617", bull: "Scale, deposit base, strong banking franchise.", bear: "Credit cycle, rates, regulatory capital pressure." },
  { ticker: "XOM", name: "Exxon Mobil Corporation", sector: "Energy", cik: "0000034088", bull: "Scale, dividends, upstream strength.", bear: "Oil price volatility, energy transition risk." },
  { ticker: "AMD", name: "Advanced Micro Devices, Inc.", sector: "Semiconductors", cik: "0000002488", bull: "CPU/GPU share gains, AI accelerator opportunity.", bear: "NVIDIA competition, supply chain, valuation risk." }
];

function secSearchUrl(cik) {
  return `https://www.sec.gov/edgar/browse/?CIK=${cik}&owner=exclude`;
}
function secJsonUrl(cik) {
  return `https://data.sec.gov/submissions/CIK${cik}.json`;
}

function renderCompanies() {
  const grid = document.getElementById("companyGrid");
  if (!grid) return;
  grid.innerHTML = companies.map(c => `
    <a class="company-card" href="company.html?ticker=${c.ticker}">
      <div class="ticker">${c.ticker}</div>
      <h2>${c.name}</h2>
      <p>${c.sector}</p>
    </a>
  `).join("");
}

function searchCompany() {
  const value = document.getElementById("searchInput").value.trim().toUpperCase();
  const found = companies.find(c => c.ticker === value || c.name.toUpperCase().includes(value));
  if (found) window.location.href = `company.html?ticker=${found.ticker}`;
  else alert("Ticker not in starter database yet. Add it to script.js first.");
}

function renderCompanyPage() {
  const params = new URLSearchParams(window.location.search);
  const ticker = params.get("ticker") || "AAPL";
  const c = companies.find(x => x.ticker === ticker) || companies[0];
  const name = document.getElementById("companyName");
  if (!name) return;
  name.textContent = `${c.ticker} — ${c.name}`;
  document.getElementById("companyMeta").textContent = `${c.sector} | CIK: ${c.cik}`;
  document.getElementById("secSearch").href = secSearchUrl(c.cik);
  document.getElementById("secJson").href = secJsonUrl(c.cik);
  document.getElementById("bull").textContent = c.bull;
  document.getElementById("bear").textContent = c.bear;
}

renderCompanies();
renderCompanyPage();
