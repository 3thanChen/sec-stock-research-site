const params = new URLSearchParams(window.location.search);

const ticker = params.get("ticker");
const cik = params.get("cik");

document.getElementById("title").textContent = `${ticker} | ${cik}`;

document.getElementById("secLinks").innerHTML = `
  <p><a target="_blank" href="https://www.sec.gov/edgar/search/#/q=${ticker}">SEC EDGAR Search</a></p>
  <p><a target="_blank" href="https://data.sec.gov/submissions/CIK${cik}.json">Official SEC Submissions JSON</a></p>
`;

document.getElementById("financials").innerHTML = `
  <p>財報 source: 10-K and 10-Q filings.</p>
  <p>Use SEC API tomorrow to extract revenue, income, cash flow, and balance sheet data.</p>
`;

document.getElementById("events").innerHTML = `
  <p>Events/news-like updates will come from latest 8-K filings.</p>
`;
