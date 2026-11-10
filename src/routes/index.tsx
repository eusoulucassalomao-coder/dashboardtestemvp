import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, Bar, BarChart, ResponsiveContainer, YAxis, ReferenceLine, Cell } from "recharts";
import { LayoutDashboard, LineChart as LineIcon, Newspaper, HelpCircle, Plug, LogOut, RefreshCw, User, Activity, TrendingUp, TrendingDown, Brain, Search } from "lucide-react";
import { CandleChart } from "@/components/dash/CandleChart";
import { type ApiConfig, type Candle, type News, loadConfig, saveConfig, mockCandles, MOCK_NEWS, sentiment, sentimentLabel, rsi, macd, sma } from "@/lib/market";
import { fetchYahoo, fetchNews } from "@/lib/api.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Profesional de Análisis de Acciones" },
      { name: "description", content: "Dashboard de trading com candlestick, indicadores técnicos, notícias e sentimento por IA." },
      { property: "og:title", content: "Dashboard Profesional de Análisis de Acciones" },
      { property: "og:description", content: "Candlestick, OHLCV, notícias e sentimento de IA em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Tab = "dash" | "tech" | "news" | "how" | "api";
const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dash", label: "Dashboard", icon: LayoutDashboard },
  { id: "tech", label: "Análise Técnica", icon: LineIcon },
  { id: "news", label: "Notícias e Sentimento", icon: Newspaper },
  { id: "how", label: "¿Cómo Funciona?", icon: HelpCircle },
  { id: "api", label: "Conexões de API", icon: Plug },
];
const SYMBOLS = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN"];

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => setAuthed(localStorage.getItem("dash_auth") === "1"), []);
  if (authed === null) return null;
  if (!authed) return <Login onOk={() => { localStorage.setItem("dash_auth", "1"); setAuthed(true); }} />;
  return <Dashboard onLogout={() => { localStorage.removeItem("dash_auth"); setAuthed(false); }} />;
}

function Login({ onOk }: { onOk: () => void }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState("");
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form className="panel glow w-full max-w-sm space-y-4 p-8" onSubmit={(e) => { e.preventDefault(); if (u === "mvpteste" && p === "mvpteste33") onOk(); else setErr("Usuário ou senha inválidos"); }}>
        <div className="flex items-center gap-2"><Activity className="text-primary" /><h1 className="font-display text-lg text-neon-gradient">NEO-ANALYTICS</h1></div>
        <p className="text-sm text-muted-foreground">Entre para acessar o dashboard.</p>
        <input className="w-full rounded-md border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Usuário" value={u} onChange={(e) => setU(e.target.value)} />
        <input type="password" className="w-full rounded-md border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Senha" value={p} onChange={(e) => setP(e.target.value)} />
        {err && <p className="text-sm text-bear">{err}</p>}
        <button className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground glow">Entrar</button>
      </form>
    </div>
  );
}

function Panel({ title, right, children, className = "" }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between"><h3 className="border-b-2 border-primary pb-1 text-xs font-semibold uppercase tracking-wider">{title}</h3>{right}</div>
      {children}
    </section>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("dash");
  const [symbol, setSymbol] = useState("AAPL");
  const [search, setSearch] = useState("");
  const [cfg, setCfg] = useState<ApiConfig>(loadConfig);
  const [candles, setCandles] = useState<Candle[]>(() => mockCandles("AAPL"));
  const [news, setNews] = useState<News[]>(MOCK_NEWS);
  const [status, setStatus] = useState({ price: "mock", news: "mock", at: new Date() });
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    let priceSrc = "mock", newsSrc = "mock";
    try {
      if (cfg.priceUrl) {
        const r = await fetch(cfg.priceUrl.replace("{symbol}", symbol)); const j = await r.json();
        if (Array.isArray(j) && j.length) { setCandles(j); priceSrc = "custom"; }
      } else {
        const r = await fetchYahoo({ data: { symbol, range: "6mo" } });
        if (r.candles.length) { setCandles(r.candles); priceSrc = "yahoo"; } else setCandles(mockCandles(symbol));
      }
    } catch { setCandles(mockCandles(symbol)); }
    try {
      if (cfg.newsApiKey) {
        const r = await fetchNews({ data: { apiKey: cfg.newsApiKey, q: cfg.newsQuery || symbol } });
        if (r.articles.length) { setNews(r.articles); newsSrc = "newsapi"; } else newsSrc = `erro: ${r.error}`;
      } else setNews(MOCK_NEWS);
    } catch { newsSrc = "erro"; }
    setStatus({ price: priceSrc, news: newsSrc, at: new Date() }); setLoading(false);
  }
  useEffect(() => { load(); const id = setInterval(load, Math.max(cfg.refreshSec, 15) * 1000); return () => clearInterval(id); /* eslint-disable-next-line */ }, [symbol, cfg]);

  const scored = useMemo(() => news.map((n) => ({ ...n, score: sentiment(n.title) })), [news]);
  const avgSent = scored.reduce((a, b) => a + b.score, 0) / (scored.length || 1);
  const last = candles[candles.length - 1]!, prev = candles[candles.length - 2] ?? last;
  const chg = ((last.c - prev.c) / prev.c) * 100;
  const closes = candles.map((c) => c.c);
  const rsiV = rsi(closes), mac = macd(closes);
  const ind = candles.map((c, i) => ({ i, rsi: rsiV[i], ...mac[i] })).slice(-60);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-16 flex-col border-r bg-panel p-2 md:w-60 md:p-4">
        <div className="mb-8 flex items-center gap-2 px-2"><Activity className="shrink-0 text-primary" /><span className="hidden font-display text-sm text-neon-gradient md:block">NEO-ANALYTICS</span></div>
        <nav className="flex-1 space-y-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${tab === t.id ? "bg-accent text-accent-foreground glow" : "text-muted-foreground hover:bg-muted"}`}>
              <t.icon className="h-4 w-4 shrink-0" /><span className="hidden md:block">{t.label}</span>
            </button>
          ))}
        </nav>
        <button onClick={onLogout} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"><LogOut className="h-4 w-4" /><span className="hidden md:block">Sair</span></button>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <h1 className="font-display text-sm tracking-wide md:text-base"><span className="text-neon-gradient">Dashboard Profesional</span> de Análisis de Acciones</h1>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">Preço: <b className="text-primary">{status.price}</b> · Notícias: <b className="text-gold">{status.news}</b> · {status.at.toLocaleTimeString()}</span>
            <button onClick={load} className="rounded-md border p-2 hover:border-primary"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
            <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs"><User className="h-4 w-4 text-primary" />mvpteste</div>
          </div>
        </header>

        <div className="space-y-4 p-4 md:p-6">
          {tab !== "how" && tab !== "api" && (
            <div className="flex flex-wrap items-center gap-2">
              {SYMBOLS.map((s) => <button key={s} onClick={() => setSymbol(s)} className={`rounded-md border px-3 py-1.5 text-xs font-medium ${symbol === s ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground hover:border-primary"}`}>{s}</button>)}
              <form onSubmit={(e) => { e.preventDefault(); if (search.trim()) setSymbol(search.trim().toUpperCase()); }} className="flex items-center gap-1 rounded-md border px-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ticker..." className="w-24 bg-transparent py-1.5 text-xs outline-none" />
              </form>
            </div>
          )}

          {tab === "dash" && (<>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric label="Preço atual" value={`$${last.c.toFixed(2)}`} sub={`${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`} up={chg >= 0} icon={chg >= 0 ? TrendingUp : TrendingDown} />
              <Metric label="Máxima (dia)" value={`$${last.h.toFixed(2)}`} sub="High" up />
              <Metric label="Mínima (dia)" value={`$${last.l.toFixed(2)}`} sub="Low" up={false} />
              <Metric label="Sentimento IA" value={sentimentLabel(avgSent)} sub={`score ${avgSent.toFixed(2)}`} up={avgSent >= 0} icon={Brain} />
            </div>
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <Panel title={`${symbol} · Candlestick`} right={<span className={`text-sm font-semibold ${chg >= 0 ? "text-bull" : "text-bear"}`}>${last.c.toFixed(2)} ({chg.toFixed(2)}%)</span>}>
                <CandleChart data={candles.slice(-70)} />
              </Panel>
              <OrderBook price={last.c} />
            </div>
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <NewsList items={scored.slice(0, 5)} />
              <div className="space-y-4"><TradeHistory price={last.c} /><Wallet /></div>
            </div>
          </>)}

          {tab === "tech" && (<>
            <Panel title={`${symbol} · Preço + SMA`}><CandleChart data={candles.slice(-90)} height={420} /></Panel>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="RSI (14)" right={<span className="text-xs text-gold">{(rsiV[rsiV.length - 1] ?? 0).toFixed(1)}</span>}>
                <ResponsiveContainer width="100%" height={160}><LineChart data={ind}><YAxis domain={[0, 100]} hide /><ReferenceLine y={70} stroke="var(--bear)" strokeDasharray="3 3" /><ReferenceLine y={30} stroke="var(--bull)" strokeDasharray="3 3" /><Line dataKey="rsi" stroke="var(--cyan)" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer>
              </Panel>
              <Panel title="MACD (12, 26, 9)">
                <ResponsiveContainer width="100%" height={160}><BarChart data={ind}><YAxis hide /><Bar dataKey="hist">{ind.map((d, i) => <Cell key={i} fill={(d.hist ?? 0) >= 0 ? "var(--bull)" : "var(--bear)"} />)}</Bar></BarChart></ResponsiveContainer>
              </Panel>
            </div>
            <Panel title="Dados OHLCV">
              <div className="max-h-96 overflow-auto"><table className="w-full text-xs">
                <thead className="sticky top-0 bg-panel text-muted-foreground"><tr>{["Data", "Abertura", "Máximo", "Mínimo", "Fechamento", "Volume", "SMA20"].map((h) => <th key={h} className="py-2 text-right first:text-left">{h}</th>)}</tr></thead>
                <tbody>{candles.map((c, i) => ({ c, s: sma(closes, 20)[i] })).reverse().slice(0, 60).map(({ c, s }) => (
                  <tr key={c.t} className="border-t"><td className="py-1.5">{new Date(c.t).toLocaleDateString()}</td><td className="text-right">{c.o.toFixed(2)}</td><td className="text-right text-bull">{c.h.toFixed(2)}</td><td className="text-right text-bear">{c.l.toFixed(2)}</td><td className={`text-right font-medium ${c.c >= c.o ? "text-bull" : "text-bear"}`}>{c.c.toFixed(2)}</td><td className="text-right">{(c.v / 1e6).toFixed(1)}M</td><td className="text-right text-gold">{s?.toFixed(2) ?? "–"}</td></tr>))}</tbody>
              </table></div>
            </Panel>
          </>)}

          {tab === "news" && (<>
            <div className="grid grid-cols-3 gap-4">
              {(["Positivo", "Neutro", "Negativo"] as const).map((l) => <Metric key={l} label={l} value={String(scored.filter((n) => sentimentLabel(n.score) === l).length)} sub="notícias" up={l !== "Negativo"} />)}
            </div>
            <NewsList items={scored} />
          </>)}

          {tab === "how" && <How />}
          {tab === "api" && <ApiSettings cfg={cfg} onSave={(c) => { saveConfig(c); setCfg(c); }} />}
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, sub, up, icon: Icon }: { label: string; value: string; sub: string; up: boolean; icon?: typeof Brain }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">{label}{Icon && <Icon className={`h-4 w-4 ${up ? "text-bull" : "text-bear"}`} />}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className={`text-xs ${up ? "text-bull" : "text-bear"}`}>{sub}</div>
    </div>
  );
}

function badge(s: number) { const l = sentimentLabel(s); return <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${l === "Positivo" ? "bg-bull/15 text-bull" : l === "Negativo" ? "bg-bear/15 text-bear" : "bg-warn/15 text-warn"}`}>{l} {s.toFixed(2)}</span>; }

function NewsList({ items }: { items: (News & { score: number })[] }) {
  return (
    <Panel title="Feed de Notícias · Sentimento IA">
      <ul className="divide-y">{items.map((n, i) => (
        <li key={i} className="flex items-start justify-between gap-3 py-2.5">
          <div><a href={n.url} target="_blank" rel="noreferrer" className="text-sm hover:text-primary">{n.title}</a><div className="text-[11px] text-muted-foreground">{n.source} · {new Date(n.publishedAt).toLocaleString()}</div></div>
          {badge(n.score)}
        </li>))}</ul>
    </Panel>
  );
}

function OrderBook({ price }: { price: number }) {
  const rows = Array.from({ length: 7 }, (_, i) => ({ p: price * (1 + (7 - i) * 0.0012), a: (Math.sin(i * 3) + 1.5) * 120 }));
  const bids = Array.from({ length: 7 }, (_, i) => ({ p: price * (1 - (i + 1) * 0.0012), a: (Math.cos(i * 2) + 1.5) * 120 }));
  const Row = ({ r, ask }: { r: { p: number; a: number }; ask?: boolean }) => (
    <div className="relative flex justify-between px-1 py-1 text-xs"><div className={`absolute inset-y-0 right-0 ${ask ? "bg-bear/15" : "bg-bull/15"}`} style={{ width: `${Math.min(r.a / 3, 100)}%` }} /><span className={`relative ${ask ? "text-bear" : "text-bull"}`}>{r.p.toFixed(2)}</span><span className="relative text-muted-foreground">{r.a.toFixed(0)}</span></div>);
  return (
    <Panel title="Order Book">
      <div className="flex justify-between px-1 text-[10px] text-muted-foreground"><span>Preço</span><span>Qtd</span></div>
      {rows.map((r, i) => <Row key={i} r={r} ask />)}
      <div className="my-2 text-lg font-semibold text-primary">{price.toFixed(2)} <span className="text-xs text-muted-foreground">USD</span></div>
      {bids.map((r, i) => <Row key={i} r={r} />)}
    </Panel>
  );
}

function TradeHistory({ price }: { price: number }) {
  return (
    <Panel title="Trade History">
      {Array.from({ length: 6 }, (_, i) => { const up = i % 3 !== 1; return (
        <div key={i} className="flex justify-between py-1 text-xs"><span className={up ? "text-bull" : "text-bear"}>{(price * (1 + Math.sin(i) * 0.002)).toFixed(2)}</span><span className="text-muted-foreground">{(Math.abs(Math.cos(i)) * 50 + 1).toFixed(0)}</span><span className="text-muted-foreground">{new Date(Date.now() - i * 47000).toLocaleTimeString()}</span></div>); })}
    </Panel>
  );
}

function Wallet() {
  const w = [["AAPL", 120, 41764.8], ["TSLA", 40, 9812.4], ["USD", 15230, 15230]] as const;
  return (
    <Panel title="Wallet">
      {w.map(([a, q, v]) => <div key={a} className="flex justify-between py-1.5 text-xs"><span className="font-medium">{a}</span><span className="text-muted-foreground">{q}</span><span className="text-primary">${v.toLocaleString()}</span></div>)}
    </Panel>
  );
}

function ApiSettings({ cfg, onSave }: { cfg: ApiConfig; onSave: (c: ApiConfig) => void }) {
  const [c, setC] = useState(cfg); const [ok, setOk] = useState(false);
  const field = (k: keyof ApiConfig, label: string, hint: string, type = "text") => (
    <label className="block space-y-1"><span className="text-sm font-medium">{label}</span>
      <input type={type} value={String(c[k])} onChange={(e) => setC({ ...c, [k]: type === "number" ? Number(e.target.value) : e.target.value })} className="w-full rounded-md border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary" />
      <span className="block text-xs text-muted-foreground">{hint}</span></label>);
  return (
    <Panel title="Conexões de API" className="max-w-2xl">
      <div className="space-y-5">
        {field("newsApiKey", "Chave NewsAPI", "Pegue grátis em newsapi.org. Vazio = notícias de exemplo.", "password")}
        {field("newsQuery", "Busca de notícias", "Termo para o NewsAPI. Vazio = usa o ticker selecionado.")}
        {field("priceUrl", "URL de preços personalizada (opcional)", "Vazio = Yahoo Finance. Use {symbol} na URL; deve retornar [{t,o,h,l,c,v}].")}
        {field("refreshSec", "Atualização automática (segundos)", "Mínimo 15s.", "number")}
        <div className="flex items-center gap-3"><button onClick={() => { onSave(c); setOk(true); setTimeout(() => setOk(false), 2000); }} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground glow">Salvar e conectar</button>{ok && <span className="text-sm text-bull">Salvo!</span>}</div>
        <p className="text-xs text-muted-foreground">As chaves ficam salvas apenas neste navegador.</p>
      </div>
    </Panel>
  );
}

function How() {
  const s = [["Dados de preço", "Cotações OHLCV diárias do Yahoo Finance (mesma fonte do yfinance), buscadas pelo servidor."], ["Notícias", "Manchetes recentes do NewsAPI filtradas pelo ticker ou termo escolhido."], ["Sentimento de IA", "Cada manchete recebe um score de -1 a 1 com um modelo léxico estilo VADER: ≥0.05 positivo, ≤-0.05 negativo."], ["Indicadores", "SMA 20/50, RSI 14 e MACD 12/26/9 calculados a partir dos fechamentos."], ["Atualização", "Os dados recarregam automaticamente no intervalo configurado em Conexões de API."]];
  return <div className="grid gap-4 md:grid-cols-2">{s.map(([t, d], i) => <Panel key={t} title={`${i + 1}. ${t}`}><p className="text-sm text-muted-foreground">{d}</p></Panel>)}</div>;
}
