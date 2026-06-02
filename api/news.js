const { cached, fetchText, findCompany, handleError, normalizeTicker, sendJson } = require("./_lib");

function decode(text = "") {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function tag(item, name) {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decode(match[1].trim()) : "";
}

function parseRss(xml) {
  return xml
    .match(/<item>[\s\S]*?<\/item>/g)
    ?.slice(0, 12)
    .map((item) => ({
      title: tag(item, "title"),
      url: tag(item, "link"),
      source: tag(item, "source") || "Yahoo Finance",
      publishedAt: tag(item, "pubDate"),
      summary: tag(item, "description").replace(/<[^>]+>/g, "")
    }))
    .filter((item) => item.title && item.url) || [];
}

module.exports = async function handler(req, res) {
  try {
    const ticker = normalizeTicker((req.query && (req.query.ticker || req.query.symbol)) || "NVDA");
    const company = await findCompany(ticker);
    const symbol = company ? company.ticker : ticker;
    const news = await cached(`news-${symbol}`, 1000 * 60 * 3, async () => {
      const xml = await fetchText(
        `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol.replace("-", "."))}&region=US&lang=en-US`
      );
      return parseRss(xml);
    });

    sendJson(res, {
      updatedAt: new Date().toISOString(),
      live: true,
      company,
      source: "Yahoo Finance RSS",
      news
    });
  } catch (error) {
    handleError(res, error);
  }
};
