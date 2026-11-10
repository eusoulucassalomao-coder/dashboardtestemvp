import { useState, useRef } from "react";
import { type Candle, sma } from "@/lib/market";

export function CandleChart({ data, height = 380 }: { data: Candle[]; height?: number }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 900, H = height, volH = 70, pad = 60;
  const priceH = H - volH - 20;

  if (!data || data.length === 0) return <div className="text-center py-10 text-muted-foreground">Sem dados para exibir</div>;

  const hi = Math.max(...data.map((d) => d.h)), lo = Math.min(...data.map((d) => d.l));
  const maxV = Math.max(...data.map((d) => d.v || 1));
  const step = (W - pad) / Math.max(data.length, 1);
  const bw = Math.max(step * 0.7, 1);

  const y = (p: number) => 10 + ((hi - p) / (hi - lo || 1)) * (priceH - 10);
  const x = (i: number) => i * step + step / 2;

  const closes = data.map((d) => d.c);
  const line = (arr: (number | null)[]) => arr.map((v, i) => (v == null ? "" : `${arr[i - 1] == null ? "M" : "L"}${x(i)},${y(v)}`)).join("");
  const last = data[data.length - 1]!;
  const h = hoverIndex != null ? data[hoverIndex] : last; // Mostra a última vela se não houver hover, ou a selecionada

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    // Converter coordenada da tela para coordenada SVG (W x H)
    const svgX = (mouseX / rect.width) * W;
    const index = Math.floor(svgX / step);
    if (index >= 0 && index < data.length) {
      setHoverIndex(index);
    }
  };

  return (
    <div className="relative select-none">
      {/* Tooltip superior flutuante com dados detalhados */}
      <div className="mb-2 flex flex-wrap items-center gap-4 rounded-lg bg-panel/80 border border-border px-3 py-1.5 text-xs">
        <span className="font-semibold text-primary">{new Date(h.t).toLocaleDateString()}</span>
        <span>Abertura: <b className="text-foreground">${h.o.toFixed(2)}</b></span>
        <span>Máxima: <b className="text-bull">${h.h.toFixed(2)}</b></span>
        <span>Mínima: <b className="text-bear">${h.l.toFixed(2)}</b></span>
        <span>Cierre: <b className="text-foreground">${h.c.toFixed(2)}</b></span>
        <span>Vol: <b className="text-muted-foreground">{(h.v / 1e6).toFixed(2)}M</b></span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair overflow-visible"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Linhas de grade horizontais */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const p = hi - f * (hi - lo);
          return (
            <g key={f}>
              <line x1={0} x2={W - pad} y1={y(p)} y2={y(p)} className="stroke-border/40" strokeDasharray="2 4" />
              <text x={W - pad + 6} y={y(p) + 4} className="fill-muted-foreground" fontSize={10}>{p.toFixed(2)}</text>
            </g>
          );
        })}

        {/* Linha vertical de cruz (Crosshair) no hover */}
        {hoverIndex != null && (
          <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={0} y2={priceH} className="stroke-primary/50" strokeDasharray="3 3" />
        )}

        {/* Candles e Volume */}
        {data.map((d, i) => {
          const up = d.c >= d.o;
          const cls = up ? "fill-bull stroke-bull" : "fill-bear stroke-bear";
          const isHovered = hoverIndex === i;
          return (
            <g key={i} className={isHovered ? "opacity-100" : "opacity-90 hover:opacity-100"}>
              {/* Barra de Volume */}
              <rect x={x(i) - bw / 2} y={H - (d.v / maxV) * volH} width={bw} height={(d.v / maxV) * volH} className={up ? "fill-bull/30" : "fill-bear/30"} rx={1} />
              {/* Pavio */}
              <line x1={x(i)} x2={x(i)} y1={y(d.h)} y2={y(d.l)} className={cls} strokeWidth={isHovered ? 2 : 1} />
            {/* Corpo do Candle */}
              <rect x={x(i) - bw / 2} y={y(Math.max(d.o, d.c))} width={bw} height={Math.max(Math.abs(y(d.o) - y(d.c)), 1)} className={cls} rx={1} />
            </g>
          );
        })}

        {/* Indicadores SMA */}
        <path d={line(sma(closes, 20))} className="stroke-gold" fill="none" strokeWidth={1.8} />
        <path d={line(sma(closes, 50))} className="stroke-cyan" fill="none" strokeWidth={1.8} />

        {/* Linha de Preço Atual */}
        <line x1={0} x2={W - pad} y1={y(last.c)} y2={y(last.c)} className="stroke-primary" strokeDasharray="4 3" />
        <rect x={W - pad} y={y(last.c) - 9} width={pad} height={18} className="fill-primary" rx={3} />
        <text x={W - pad + 6} y={y(last.c) + 4} fontSize={10} className="fill-primary-foreground font-bold">{last.c.toFixed(2)}</text>
      </svg>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
        <div className="flex gap-4">
          <span><span className="text-gold font-bold">━</span> SMA 20</span>
          <span><span className="text-cyan font-bold">━</span> SMA 50</span>
          <span>Volume</span>
        </div>
        <div>Pase el cursor sobre el gráfico para ver los detalles</div>
      </div>
    </div>
  );
}
