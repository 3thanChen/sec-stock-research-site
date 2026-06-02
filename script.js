let companies = [];

async function loadCompanies() {
  const res = await fetch("./data/company_tickers.json");
  const data = await res.json();

  companies = data.companies || [];
  render(companies.slice(0, 300));
}

function render(list) {
  const table = document.getElementById("companyTable");
  table.innerHTML = "";

  list.forEach(c => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><strong>${c.ticker}</strong></td>
      <td>${c.title}</td>
      <td>${c.cik10}</td>
      <td>
        <a href="stock.html?ticker=${c.ticker}&cik=${c.cik10}">
          Open
        </a>
      </td>
    `;

    table.appendChild(row);
  });
}

document.getElementById("searchInput").addEventListener("input", e => {
  const q = e.target.value.toUpperCase().trim();

  if (!q) {
    render(companies.slice(0, 300));
    return;
  }

  const filtered = companies.filter(c =>
    c.ticker.includes(q) ||
    c.title.toUpperCase().includes(q) ||
    c.cik10.includes(q)
  );

  render(filtered.slice(0, 300));
});

loadCompanies();
