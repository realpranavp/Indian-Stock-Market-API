import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Helpers
const quoteUrl = (symbols) =>
  `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

const searchUrl = (query) =>
  `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;

app.get("/", (_, res) => {
  res.json({ status: "ok", service: "stockbook-market-api" });
});

// /search?q=reliance
app.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ status: "ok", query: q, total_results: 0, results: [] });

  try {
    const r = await fetch(searchUrl(q));
    const data = await r.json();

    const results = (data.quotes || []).map((item) => ({
      symbol: item.symbol,
      company_name: item.shortname || item.longname || item.symbol
    }));

    res.json({
      status: "ok",
      query: q,
      total_results: results.length,
      results
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// /stock/list?symbols=ITC.TO,TCS.NS&res=num
app.get("/stock/list", async (req, res) => {
  const symbols = (req.query.symbols || "").trim();
  if (!symbols) return res.json({ status: "ok", response_format: "num", count: 0, stocks: [] });

  try {
    const r = await fetch(quoteUrl(symbols));
    const data = await r.json();

    const stocks = (data.quoteResponse?.result || []).map((q) => ({
      symbol: q.symbol,
      exchange: q.fullExchangeName,
      ticker: q.symbol,
      company_name: q.shortName || q.longName || q.symbol,
      last_price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      percent_change: q.regularMarketChangePercent ?? 0
    }));

    res.json({
      status: "ok",
      response_format: "num",
      count: stocks.length,
      stocks
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
