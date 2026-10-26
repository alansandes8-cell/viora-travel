/** Mapa esquemático de la ruta (SVG), sin dependencias externas. Alternativa funcional al mapa interactivo. */
export function RouteSketch({ stops, className }: { stops: { name: string; lat: number | null; lng: number | null; nights: number }[]; className?: string }) {
  const pts = stops.filter((s) => s.lat !== null && s.lng !== null) as { name: string; lat: number; lng: number; nights: number }[];
  if (!pts.length) return null;
  const W = 640;
  const H = 360;
  const pad = 60;
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng * Math.cos((((Math.max(...lats) + Math.min(...lats)) / 2) * Math.PI) / 180));
  const minX = Math.min(...lngs);
  const maxX = Math.max(...lngs);
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const span = Math.max(maxX - minX, maxY - minY, 0.5);
  const scale = Math.min((W - pad * 2) / span, (H - pad * 2) / span);
  const cx = (W - (maxX - minX) * scale) / 2;
  const cy = (H - (maxY - minY) * scale) / 2;
  const xy = pts.map((p, i) => ({ x: cx + (lngs[i] - minX) * scale, y: H - (cy + (p.lat - minY) * scale), ...p }));
  const colors = ["#12a59b", "#f6a01a", "#ff5a5f", "#6b3fa0", "#149fc4"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Ruta: ${pts.map((p) => p.name).join(", ")}`}>
      <rect width={W} height={H} rx={24} fill="#eef6f6" />
      <polyline points={xy.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#1b2a4a" strokeWidth={2.5} strokeDasharray="6 6" strokeLinecap="round" />
      {xy.map((p, i) => (
        <g key={p.name}>
          <circle cx={p.x} cy={p.y} r={14} fill={colors[i % colors.length]} stroke="#fff" strokeWidth={3} />
          <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">
            {i + 1}
          </text>
          <text x={p.x} y={p.y - 22} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1b2a4a" style={{ paintOrder: "stroke", stroke: "#eef6f6", strokeWidth: 4 }}>
            {p.name} · {p.nights}n
          </text>
        </g>
      ))}
    </svg>
  );
}
