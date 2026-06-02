const { getCompanies, normalizeTicker, sendJson, handleError } = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    const q = normalizeTicker((req.query && req.query.q) || "");
    const limit = Math.min(Number((req.query && req.query.limit) || 20), 50);
    const companies = await getCompanies();
    const results = companies
      .filter((company) => {
        if (!q) return true;
        return (
          company.ticker.includes(q) ||
          company.name.toUpperCase().includes(q) ||
          String(company.cik).includes(q.replace(/\D/g, ""))
        );
      })
      .slice(0, limit);

    sendJson(res, {
      updatedAt: new Date().toISOString(),
      live: !results.some((company) => company.fallback),
      count: results.length,
      results
    });
  } catch (error) {
    handleError(res, error);
  }
};
