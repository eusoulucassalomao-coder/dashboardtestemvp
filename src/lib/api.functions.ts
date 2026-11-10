import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Proxies Yahoo Finance (yfinance source) and NewsAPI server-side to avoid browser CORS limits.
export const fetchYahoo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ symbol: z.string().min(1).max(15).regex(/^[A-Za-z0-9.\-^=]+$/), range: z.string().max(5) }))
  .handler(async ({ data }) => {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(data.symbol)}?range=${encodeURIComponent(data.range)}&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { error: `Yahoo ${res.status}`, candles: [] };
    const j: any = await res.json();
    const r = j?.chart?.result?.[0]; const q = r?.indicators?.quote?.[0];
    if (!r || !q) return { error: "Sem dados", candles: [] };
    const candles = (r.timestamp as number[]).map((t, i) => ({ t: t * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] })).filter((c) => c.c != null);
    return { error: null, candles };
  });

export const fetchNews = createServerFn({ method: "POST" })
  .inputValidator(z.object({ q: z.string().min(1).max(100) }))
  .handler(async ({ data }) => {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) return { error: "API Key não configurada", articles: [] };
    const res = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(data.q)}&language=en&sortBy=publishedAt&pageSize=20`, { headers: { "X-Api-Key": apiKey, "User-Agent": "dashboard" } });
    const j: any = await res.json();
    if (!res.ok) return { error: j?.message ?? `NewsAPI ${res.status}`, articles: [] };
    return { error: null, articles: (j.articles ?? []).map((a: any) => ({ title: a.title ?? "", source: a.source?.name ?? "", url: a.url ?? "#", publishedAt: a.publishedAt ?? "" })) };
  });
