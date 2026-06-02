let companies = [];

async function loadCompanies() {

    const response = await fetch("./data/companies.json");

    const data = await response.json();

    companies = data.companies || [];

    render(companies);
}

function render(list) {

    const table = document.getElementById("companyTable");

    table.innerHTML = "";

    list.forEach(company => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${company.ticker}</td>
            <td>${company.title}</td>
            <td>
                <a href="stock.html?ticker=${company.ticker}">
                    Open
                </a>
            </td>
        `;

        table.appendChild(row);
    });
}

document
.getElementById("searchInput")
.addEventListener("input", e => {

    const query = e.target.value.toUpperCase();

    const filtered = companies.filter(c =>
        c.ticker.includes(query) ||
        c.title.toUpperCase().includes(query)
    );

    render(filtered);
});

loadCompanies();
