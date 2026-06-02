const { cached, fetchJson, findCompany, handleError, padCik, secHeaders, sendJson } = require("./_lib");

const metrics = [
  { key: "revenue", label: "Revenue", concepts: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"] },
  { key: "grossProfit", label: "Gross profit", concepts: ["GrossProfit"] },
  { key: "operatingIncome", label: "Operating income", concepts: ["OperatingIncomeLoss"] },
  { key: "netIncome", label: "Net income", concepts: ["NetIncomeLoss", "ProfitLoss"] },
  { key: "epsDiluted", label: "Diluted EPS", concepts: ["EarningsPerShareDiluted"] },
  { key: "assets", label: "Assets", concepts: ["Assets"] },
  { key: "liabilities", label: "Liabilities", concepts: ["Liabilities"] },
  { key: "equity", label: "Stockholders equity", concepts: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"] },
  { key: "operatingCashFlow", label: "Operating cash flow", concepts: ["NetCashProvidedByUsedInOperatingActivities"] }
];

const durationMetrics = new Set([
  "revenue",
  "grossProfit",
  "operatingIncome",
  "netIncome",
  "epsDiluted",
  "operatingCashFlow"
]);

function pickUnits(fact) {
  if (!fact || !fact.units) return [];
  return fact.units.USD || fact.units["USD/shares"] || fact.units.shares || Object.values(fact.units)[0] || [];
}

function cleanFact(unit) {
  return {
    end: unit.end,
    fy: unit.fy,
    fp: unit.fp,
    form: unit.form,
    filed: unit.filed,
    frame: unit.frame,
    value: unit.val
  };
}

function durationDays(unit) {
  if (!unit.start || !unit.end) return null;
  const start = new Date(unit.start);
  const end = new Date(unit.end);
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  return Number.isFinite(days) ? days : null;
}

function matchesPeriod(unit, metric, periodType) {
  if (!durationMetrics.has(metric.key)) {
    return periodType === "annual" ? unit.fp === "FY" : unit.fp && unit.fp !== "FY";
  }

  const days = durationDays(unit);
  if (!days) return false;
  return periodType === "annual"
    ? unit.fp === "FY" && days >= 300 && days <= 390
    : unit.fp && unit.fp !== "FY" && days >= 60 && days <= 125;
}

function latestForMetric(facts, metric, periodType) {
  for (const concept of metric.concepts) {
    const units = pickUnits(facts[concept])
      .filter((unit) => ["10-K", "10-Q"].includes(unit.form))
      .filter((unit) => matchesPeriod(unit, metric, periodType))
      .sort((a, b) => String(b.end).localeCompare(String(a.end)));
    if (units.length) return units.slice(0, periodType === "annual" ? 5 : 6).map(cleanFact);
  }
  return [];
}

module.exports = async function handler(req, res) {
  try {
    const ticker = (req.query && (req.query.ticker || req.query.symbol)) || "NVDA";
    const company = await findCompany(ticker);
    if (!company) return sendJson(res, { error: "Company not found", results: [] }, 404);

    const cik = padCik(company.cik);
    const payload = await cached(`facts-${cik}`, 1000 * 60 * 10, async () =>
      fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers: secHeaders() })
    );
    const facts = payload.facts && payload.facts["us-gaap"] ? payload.facts["us-gaap"] : {};

    const quarterly = metrics.map((metric) => ({
      key: metric.key,
      label: metric.label,
      values: latestForMetric(facts, metric, "quarterly")
    }));

    const annual = metrics.map((metric) => ({
      key: metric.key,
      label: metric.label,
      values: latestForMetric(facts, metric, "annual")
    }));

    sendJson(res, {
      updatedAt: new Date().toISOString(),
      live: true,
      company,
      source: "SEC XBRL Company Facts",
      quarterly,
      annual
    });
  } catch (error) {
    handleError(res, error);
  }
};
