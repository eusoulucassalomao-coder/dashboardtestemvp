import { useState } from "react";
import { type Candle, sma } from "@/lib/market";

export function CandleChart({ data, height = 380 }: { data: Candle[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 900, H = height, volH = 70, pad = 50;
  const priceH = H - volH - 20;
  const hi = Math.max(...data.map((d) => d.h)), lo = Math.min(...data.map((d) => d.l));
  const maxV = Math.max(...data.map((d) => d.v));
  const step = (W - pad) / data.length, bw = Math.max(step * 0.6, 1);
  const y = (p: number) => 10 + ((hi - p) / (hi - lo)) * (priceH - 10);
  const x = (i: number) => i * step + step / 2;
  const closes = data.map((d) => d.c);
  const line = (arr: (number | null)[]) => arr.map((v, i) => (v == null ? "" : `${arr[i - 1] == null ? "M" : "L"}${x(i)},${y(v)}`)).join("");
  const last = data[data.length - 1];
  const h = hover != null ? data[hover] : null;
  return (
    <div className="relative">
      {h && (
        <div className="absolute left-2 top-1 z-10 flex gap-3 rounded-md bg-background/80 px-2 py-1 text-[11px] text-muted-foreground">
          <span>{new Date(h.t).toLocaleDateString()}</span><span>O <b className="text-foreground">{h.o.toFixed(2)}</b></span>
          <span>H <b className="text-bull">{h.h.toFixed(2)}</b></span><span>L <b className="text-bear">{h.l.toFixed(2)}</b></span><span>C <b className="text-foreground">{h.c.toFixed(2)}</b></span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => { const p = hi - f * (hi - lo); return (
          <g key={f}><line x1={0} x2={W - pad} y1={y(p)} y2={y(p)} className="stroke-border" strokeDasharray="2 4" />
          <text x={W - pad + 4} y={y(p) + 3} className="fill-muted-foreground" fontSize={10}>{p.toFixed(2)}</text></g>); })}
        {data.map((d, i) => { const up = d.c >= d.o; const cls = up ? "fill-bull stroke-bull" : "fill-bear stroke-bear"; return (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={x(i) - step / 2} y={0} width={step} height={H} fill="transparent" />
            <rect x={x(i) - bw / 2} y={H - (d.v / maxV) * volH} width={bw} height={(d.v / maxV) * volH} className={up ? "fill-bull/25" : "fill-bear/25"} />
            <line x1={x(i)} x2={x(i)} y1={y(d.h)} y2={y(d.l)} className={cls} />
            <rect x={x(i) - bw / 2} y={y(Math.max(d.o, d.c))} width={bw} height={Math.max(Math.abs(y(d.o) - y(d.c)), 1)} className={cls} rx={1} />
          </g>); })}
        <path d={line(sma(closes, 20))} className="stroke-gold" fill="none" strokeWidth={1.5} />
        <path d={line(sma(closes, 50))} className="stroke-cyan" fill="none" strokeWidth={1.5} />
        <line x1={0} x2={W - pad} y1={y(last.c)} y2={y(last.c)} className="stroke-primary" strokeDasharray="4 3" />
        <rect x={W - pad} y={y(last.c) - 8} width={pad} height={16} className="fill-primary" rx={2} />
        <text x={W - pad + 4} y={y(last.c) + 4} fontSize={10} className="fill-primary-foreground font-semibold">{last.c.toFixed(2)}</text>
      </svg>
      <div className="mt-1 flex gap-4 text-[11px] text-muted-foreground">
        <span><span className="text-gold">━</span> SMA 20</span><span><span className="text-cyan">━</span> SMA 50</span><span>Volume</span>
      </div>
    </div>
  );
}
