import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Helpers
const quoteUrl = (symbols) =>
  `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

const searchUrl = (query) =>
  `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;

const yahooHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/"
};

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL_MS = 30_000;

app.get("/", (_, res) => {
  res.json({ status: "ok", service: "stockbook-market-api" });
});

// /search?q=reliance
app.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ status: "ok", query: q, total_results: 0, results: [] });

  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  try {
    const r = await fetch(searchUrl(q), { headers: yahooHeaders });
    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).json({ status: "error", message: text });
    }
    const data = JSON.parse(text);

    const results = (data.quotes || []).map((item) => ({
      symbol: item.symbol,
      company_name: item.shortname || item.longname || item.symbol
    }));

    const responseData = {
      status: "ok",
      query: q,
      total_results: results.length,
      results
    };

    cache.set(cacheKey, { time: Date.now(), data: responseData });
    res.json(responseData);
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// /stock/list?symbols=ITC.NS,TCS.NS&res=num
app.get("/stock/list", async (req, res) => {
  const symbols = (req.query.symbols || "").trim();
  if (!symbols) return res.json({ status: "ok", response_format: "num", count: 0, stocks: [] });

  const cacheKey = `quote:${symbols}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  try {
    const r = await fetch(quoteUrl(symbols), { headers: yahooHeaders });
    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).json({ status: "error", message: text });
    }
    const data = JSON.parse(text);

    const stocks = (data.quoteResponse?.result || []).map((q) => ({
      symbol: q.symbol,
      exchange: q.fullExchangeName,
      ticker: q.symbol,
      company_name: q.shortName || q.longName || q.symbol,
      last_price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      percent_change: q.regularMarketChangePercent ?? 0
    }));

    const responseData = {
      status: "ok",
      response_format: "num",
      count: stocks.length,
      stocks
    };

    cache.set(cacheKey, { time: Date.now(), data: responseData });
    res.json(responseData);
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
