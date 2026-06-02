const {
  findCompany,
  getSubmissions,
  handleError,
  recentFilingsFromSubmissions,
  sendJson
} = require("./_lib");

const watchedForms = new Set(["10-K", "10-Q", "8-K", "4"]);

module.exports = async function handler(req, res) {
  try {
    const ticker = (req.query && (req.query.ticker || req.query.symbol)) || "NVDA";
    const company = await findCompany(ticker);
    if (!company) return sendJson(res, { error: "Company not found", results: [] }, 404);

    const submission = await getSubmissions(company);
    const filings = recentFilingsFromSubmissions(company, submission);
    const selected = filings.filter((filing) => watchedForms.has(filing.form)).slice(0, 80);

    sendJson(res, {
      updatedAt: new Date().toISOString(),
      live: true,
      company,
      latest: selected.slice(0, 24),
      annualQuarterly: selected.filter((filing) => filing.form === "10-K" || filing.form === "10-Q").slice(0, 12),
      events: selected.filter((filing) => filing.form === "8-K").slice(0, 16),
      insider: selected.filter((filing) => filing.form === "4").slice(0, 16),
      evidence: selected.slice(0, 12).map((filing) => ({
        label: `${filing.form} filed ${filing.filingDate}`,
        url: filing.url || filing.indexUrl,
        accessionNumber: filing.accessionNumber
      }))
    });
  } catch (error) {
    handleError(res, error);
  }
};
