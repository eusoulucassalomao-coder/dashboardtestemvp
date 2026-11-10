export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };
export type News = { title: string; source: string; url: string; publishedAt: string; score?: number };
export type ApiConfig = { priceUrl: string; newsApiKey: string; newsQuery: string; refreshSec: number };

export const DEFAULT_CONFIG: ApiConfig = { priceUrl: "", newsApiKey: "", newsQuery: "", refreshSec: 60 };
const CFG_KEY = "dash_api_config";
export const loadConfig = (): ApiConfig => {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CFG_KEY) || "{}") }; } catch { return DEFAULT_CONFIG; }
};
export const saveConfig = (c: ApiConfig) => localStorage.setItem(CFG_KEY, JSON.stringify(c));

function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
export function mockCandles(symbol: string, last = 348.04, n = 90): Candle[] {
  const r = rng([...symbol].reduce((a, c) => a + c.charCodeAt(0), 7) * 997);
  const out: Candle[] = [];
  let p = last * 0.88;
  const day = 86400000; const start = Date.now() - n * day;
  for (let i = 0; i < n; i++) {
    const o = p; const c = o * (1 + (r() - 0.47) * 0.035);
    out.push({ t: start + i * day, o, c, h: Math.max(o, c) * (1 + r() * 0.012), l: Math.min(o, c) * (1 - r() * 0.012), v: Math.round(4e7 + r() * 6e7) });
    p = c;
  }
  const k = last / out[n - 1]!.c;
  const fixed = out.map((x) => ({ ...x, o: x.o * k, h: x.h * k, l: x.l * k, c: x.c * k }));
  // last day -0.76%
  const prev = fixed[n - 2]!.c; fixed[n - 1]!.c = prev * (1 - 0.0076); fixed[n - 1]!.o = prev;
  fixed[n - 1]!.h = Math.max(fixed[n - 1]!.h, prev); fixed[n - 1]!.l = Math.min(fixed[n - 1]!.l, fixed[n - 1]!.c);
  return fixed;
}

export const sma = (v: number[], p: number) => v.map((_, i) => (i < p - 1 ? null : v.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p));
export function ema(v: number[], p: number) { const k = 2 / (p + 1); const out: number[] = []; v.forEach((x, i) => out.push(i ? x * k + out[i - 1]! * (1 - k) : x)); return out; }
export function rsi(v: number[], p = 14) {
  const out: (number | null)[] = [null]; let g = 0, l = 0;
  for (let i = 1; i < v.length; i++) {
    const d = v[i] - v[i - 1]!; const up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= p) { g += up / p; l += dn / p; out.push(i === p ? 100 - 100 / (1 + g / (l || 1e-9)) : null); }
    else { g = (g * (p - 1) + up) / p; l = (l * (p - 1) + dn) / p; out.push(100 - 100 / (1 + g / (l || 1e-9))); }
  }
  return out;
}
export function macd(v: number[]) { const m = ema(v, 12).map((x, i) => x - ema(v, 26)[i]!); const s = ema(m, 9); return m.map((x, i) => ({ macd: x, signal: s[i]!, hist: x - s[i]! })); }

// Lightweight VADER-style lexicon sentiment (compound score -1..1)
const LEX: Record<string, number> = {
  surge: 2.5, soar: 2.6, rally: 2.2, gain: 1.8, gains: 1.8, beat: 1.9, beats: 1.9, record: 1.6, growth: 1.8, strong: 1.9, up: 1.0, rise: 1.6, rises: 1.6, bullish: 2.4, upgrade: 2.0, profit: 1.9, boost: 1.8, win: 2.0, best: 2.2, positive: 2.0, high: 0.8, jump: 1.9, jumps: 1.9, optimism: 2.2, innovation: 1.5,
  fall: -1.7, falls: -1.7, drop: -1.8, drops: -1.8, plunge: -2.6, crash: -3.0, loss: -2.0, losses: -2.0, weak: -1.9, down: -1.0, miss: -1.8, misses: -1.8, bearish: -2.4, downgrade: -2.0, lawsuit: -2.0, fear: -2.2, risk: -1.3, cut: -1.4, cuts: -1.4, decline: -1.8, slump: -2.2, probe: -1.5, warning: -1.8, worst: -2.8, tariff: -1.2, layoffs: -2.1,
};
const NEG = new Set(["not", "no", "never", "without", "isn't", "don't", "doesn't"]);
export function sentiment(text: string) {
  const w = text.toLowerCase().replace(/[^a-z'\s]/g, " ").split(/\s+/).filter(Boolean);
  let s = 0;
  w.forEach((t, i) => { const v = LEX[t]; if (v) s += NEG.has(w[i - 1]) ? -v * 0.74 : v; });
  if (text.includes("!")) s *= 1.15;
  return +(s / Math.sqrt(s * s + 15)).toFixed(3);
}
export const sentimentLabel = (s: number) => (s >= 0.05 ? "Positivo" : s <= -0.05 ? "Negativo" : "Neutro");

export const MOCK_NEWS: News[] = [
  "Apple shares rally as iPhone sales beat expectations",
  "Tesla stock drops after delivery numbers miss estimates",
  "Fed holds rates steady; markets await inflation data",
  "Nvidia record revenue fuels strong AI growth optimism",
  "Regulators open probe into big tech app store practices",
  "Microsoft cloud growth boosts profit outlook",
  "Oil prices slump on demand fear and tariff risk",
  "Amazon announces logistics innovation in Europe",
].map((title, i) => ({ title, source: ["Reuters", "Bloomberg", "CNBC", "WSJ", "FT"][i % 5], url: "#", publishedAt: new Date(Date.now() - i * 3.6e6 * 2).toISOString() }));
