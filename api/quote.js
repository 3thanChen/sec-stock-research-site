const { cached, fetchJson, fetchText, findCompany, handleError, normalizeTicker, sendJson } = require("./_lib");

function yahooSymbol(ticker) {
  return normalizeTicker(ticker).replace("-", ".");
}

function parseYahooChart(symbol, payload) {
  const result = payload.chart && payload.chart.result && payload.chart.result[0];
  if (!result) throw new Error("No chart data");
  const quote = result.indicators.quote[0] || {};
  const meta = result.meta || {};
  const timestamps = result.timestamp || [];
  const points = timestamps
    .map((time, index) => ({
      time: new Date(time * 1000).toISOString(),
      close: quote.close[index],
      open: quote.open[index],
      high: quote.high[index],
      low: quote.low[index],
      volume: quote.volume[index]
    }))
    .filter((point) => Number.isFinite(point.close));
  const last = points[points.length - 1] || {};
  const previousClose = meta.chartPreviousClose || meta.previousClose || points[0]?.close;
  const price = meta.regularMarketPrice || last.close;
  return {
    symbol,
    currency: meta.currency || "USD",
    exchange: meta.fullExchangeName || meta.exchangeName || "Market",
    price,
    previousClose,
    change: price && previousClose ? price - previousClose : null,
    changePercent: price && previousClose ? ((price - previousClose) / previousClose) * 100 : null,
    dayHigh: meta.regularMarketDayHigh || last.high,
    dayLow: meta.regularMarketDayLow || last.low,
    open: meta.regularMarketOpen || last.open,
    volume: meta.regularMarketVolume || last.volume,
    marketState: meta.marketState || "UNKNOWN",
    regularMarketTime: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : last.time,
    points
  };
}

function parseStooqCsv(symbol, text) {
  const [header, row] = text.trim().split(/\r?\n/);
  const fields = header.split(",");
  const values = row.split(",");
  const item = Object.fromEntries(fields.map((field, index) => [field.toLowerCase(), values[index]]));
  const price = Number(item.close);
  return {
    symbol,
    currency: "USD",
    exchange: "Delayed market quote",
    price,
    previousClose: null,
    change: null,
    changePercent: null,
    dayHigh: Number(item.high),
    dayLow: Number(item.low),
    open: Number(item.open),
    volume: Number(item.volume),
    marketState: "DELAYED",
    regularMarketTime: `${item.date}T${item.time || "00:00:00"}Z`,
    points: []
  };
}

module.exports = async function handler(req, res) {
  try {
    const ticker = (req.query && (req.query.ticker || req.query.symbol)) || "NVDA";
    const company = await findCompany(ticker);
    const symbol = yahooSymbol(company ? company.ticker : ticker);
    const range = (req.query && req.query.range) || "1d";
    const interval = range === "1d" ? "5m" : "1d";

    const quote = await cached(`quote-${symbol}-${range}`, 1000 * 30, async () => {
      try {
        const chart = await fetchJson(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=true`
        );
        return { ...parseYahooChart(symbol, chart), source: "Yahoo Finance chart" };
      } catch (error) {
        const text = await fetchText(
          `https://stooq.com/q/l/?s=${encodeURIComponent(symbol.toLowerCase().replace(".", "-"))}.us&f=sd2t2ohlcv&h&e=csv`
        );
        return { ...parseStooqCsv(symbol, text), source: "Stooq delayed quote" };
      }
    });

    sendJson(res, {
      updatedAt: new Date().toISOString(),
      live: true,
      company,
      quote
    });
  } catch (error) {
    handleError(res, error);
  }
};
