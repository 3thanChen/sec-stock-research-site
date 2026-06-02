const params = new URLSearchParams(
    window.location.search
);

const ticker = params.get("ticker");

document.getElementById("title")
.textContent = ticker;

async function loadStock() {

    const response = await fetch(
        `./data/stocks/${ticker}.json`
    );

    const data = await response.json();

    const filingsTable =
        document.getElementById("filings");

    filingsTable.innerHTML = "";

    data.filings.forEach(filing => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${filing.filedAt || ""}</td>
            <td>${filing.formType || ""}</td>
            <td>
                <a href="${filing.linkToFilingDetails}"
                   target="_blank">
                   View
                </a>
            </td>
        `;

        filingsTable.appendChild(row);
    });
}

loadStock();
