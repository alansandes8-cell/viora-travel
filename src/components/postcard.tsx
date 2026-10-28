/**
 * Postal ilustrada de un destino (SVG). Se usa cuando no hay una foto disponible.
 * Es claramente una ilustración (no imita una foto real) y lleva el rótulo «Ilustración».
 * No depende de Next: la usan la plataforma y la vista previa.
 */
import * as React from "react";

type Kind = "city" | "beach" | "nature" | "resort" | "themepark" | "island";

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const SKIES = [
  ["#ffd9a8", "#ff9f80", "#f2545a"],
  ["#bfe9f2", "#7fd0e3", "#149fc4"],
  ["#ffe7b3", "#ffc56b", "#f6a01a"],
  ["#e6d9ff", "#b79be6", "#6b3fa0"],
  ["#c9f0e8", "#7fd6c8", "#12a59b"],
];

export function Postcard({ name, kind, className, label = true, title = true }: { name: string; kind: Kind; className?: string; label?: boolean; title?: boolean }) {
  const r = rng(name);
  const sky = SKIES[Math.floor(r() * SKIES.length)];
  const id = `pc-${name.replace(/[^a-z0-9]/gi, "").slice(0, 16)}-${kind}`;
  const W = 800;
  const H = 500;
  const sunX = 140 + r() * 520;
  const sunY = 110 + r() * 80;
  const beachy = kind === "beach" || kind === "island" || kind === "resort";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={`Ilustración de ${name}`}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[2]} />
          <stop offset="0.55" stopColor={sky[1]} />
          <stop offset="1" stopColor={sky[0]} />
        </linearGradient>
        <linearGradient id={`${id}-sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2fc4c9" />
          <stop offset="1" stopColor="#0e7f9e" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <circle cx={sunX} cy={sunY} r={46 + r() * 20} fill="#fff4d6" opacity="0.95" />
      {[0, 1, 2].map((k) => {
        const cx = r() * W;
        const cy = 60 + r() * 120;
        return (
          <g key={k} fill="#ffffff" opacity="0.75">
            <ellipse cx={cx} cy={cy} rx={46} ry={14} />
            <ellipse cx={cx + 30} cy={cy - 8} rx={30} ry={14} />
          </g>
        );
      })}
      {/* Cada escena usa su propio generador con semilla: el dibujo es idéntico en servidor y navegador. */}
      {beachy && <Beach seed={`${name}:beach`} id={id} W={W} H={H} resort={kind === "resort"} />}
      {kind === "city" && <City seed={`${name}:city`} W={W} H={H} />}
      {kind === "nature" && <Nature seed={`${name}:nature`} W={W} H={H} />}
      {kind === "themepark" && <Park seed={`${name}:park`} W={W} H={H} />}
      {title && (
        <text x="28" y={H - 30} fontFamily="Fredoka, ui-rounded, system-ui, sans-serif" fontWeight="600" fontSize="44" fill="#ffffff" style={{ paintOrder: "stroke", stroke: "rgba(27,42,74,0.35)", strokeWidth: 6 }}>
          {name}
        </text>
      )}
      {label && (
        <g>
          <rect x={W - 132} y="18" width="112" height="28" rx="14" fill="rgba(27,42,74,0.55)" />
          <text x={W - 76} y="37" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="700" fill="#ffffff">
            Ilustración
          </text>
        </g>
      )}
    </svg>
  );
}

type P = { seed: string; W: number; H: number };

function Palm({ x, y, s, flip }: { x: number; y: number; s: number; flip: boolean }) {
  const d = flip ? -1 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * d} ${s})`}>
      <path d="M0 0 C 8 -60, 18 -120, 40 -170" stroke="#7a4b2a" strokeWidth="12" fill="none" strokeLinecap="round" />
      {[-60, -20, 20, 60, 100].map((a) => (
        <path key={a} d="M40 -170 q 40 -20 85 10 q -45 -5 -85 -10" fill="#178a5a" transform={`rotate(${a} 40 -170)`} />
      ))}
    </g>
  );
}

function Beach({ seed, id, W, H, resort }: P & { id: string; resort: boolean }) {
  const r = rng(seed);
  const horizon = H * 0.56;
  return (
    <g>
      <rect y={horizon} width={W} height={H - horizon} fill={`url(#${id}-sea)`} />
      {[0, 1, 2, 3].map((k) => (
        <path key={k} d={`M0 ${horizon + 30 + k * 26} q 50 -10 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0`} stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" fill="none" />
      ))}
      <path d={`M0 ${H * 0.82} C ${W * 0.3} ${H * 0.74}, ${W * 0.6} ${H * 0.8}, ${W} ${H * 0.76} L ${W} ${H} L 0 ${H} Z`} fill="#f7e2b5" />
      {resort && (
        <g fill="#ffffff" opacity="0.9">
          <rect x={W * 0.62} y={horizon - 48} width="120" height="48" rx="6" />
          <rect x={W * 0.62 + 130} y={horizon - 34} width="70" height="34" rx="6" />
        </g>
      )}
      <Palm x={60 + r() * 80} y={H * 0.86} s={1.1} flip={false} />
      <Palm x={W - 80 - r() * 60} y={H * 0.84} s={0.9} flip={true} />
      <path d={`M${W * 0.45} ${H * 0.66} l 26 0 l -13 -30 z`} fill="#ffffff" />
    </g>
  );
}

function City({ seed, W, H }: P) {
  const r = rng(seed);
  const ground = H * 0.8;
  const back: React.ReactNode[] = [];
  const front: React.ReactNode[] = [];
  let x = -10;
  while (x < W) {
    const w = 40 + r() * 60;
    const h = 80 + r() * 160;
    back.push(<rect key={`b${x}`} x={x} y={ground - h - 40} width={w} height={h + 40} fill="#6b3fa0" opacity="0.45" />);
    x += w - 6;
  }
  x = -20;
  let k = 0;
  while (x < W) {
    const w = 50 + r() * 70;
    const h = 70 + r() * 150;
    const kind = r();
    const fill = k % 2 ? "#1b2a4a" : "#2d3f66";
    front.push(
      <g key={`f${x}`}>
        <rect x={x} y={ground - h} width={w} height={h} fill={fill} />
        {kind > 0.75 && <circle cx={x + w / 2} cy={ground - h} r={w / 2.4} fill={fill} />}
        {kind > 0.5 && kind <= 0.75 && <path d={`M${x + w / 2 - 6} ${ground - h} l 6 -60 l 6 60 z`} fill={fill} />}
        {Array.from({ length: Math.floor(h / 28) }).map((_, j) => (
          <rect key={j} x={x + 10} y={ground - h + 14 + j * 28} width={w - 20} height="8" rx="2" fill="#ffd27a" opacity={r() > 0.4 ? 0.85 : 0.2} />
        ))}
      </g>,
    );
    x += w + 6;
    k++;
  }
  return (
    <g>
      {back}
      {front}
      <rect y={ground} width={W} height={H - ground} fill="#24365c" />
      <rect y={ground + 18} width={W} height="6" fill="#ffd27a" opacity="0.5" />
    </g>
  );
}

function Nature({ seed, W, H }: P) {
  const r = rng(seed);
  const peaks = (base: number, amp: number, color: string, snow: boolean, key: string) => {
    let d = `M0 ${H}`;
    const pts: [number, number][] = [];
    for (let x = 0; x <= W + 100; x += 140 + r() * 60) {
      const y = base - amp * (0.4 + r() * 0.6);
      pts.push([x, y]);
      d += ` L ${x} ${y} L ${x + 70} ${base}`;
    }
    d += ` L ${W} ${H} Z`;
    return (
      <g key={key}>
        <path d={d} fill={color} />
        {snow && pts.map(([x, y], i) => <path key={i} d={`M${x - 22} ${y + 34} L ${x} ${y} L ${x + 22} ${y + 34} q -11 -8 -22 2 q -11 -10 -22 -2 z`} fill="#ffffff" />)}
      </g>
    );
  };
  return (
    <g>
      {peaks(H * 0.6, 220, "#6b3fa0", true, "far")}
      {peaks(H * 0.72, 150, "#12a59b", false, "mid")}
      <rect y={H * 0.74} width={W} height={H * 0.1} fill="#4cc2e4" opacity="0.85" />
      <rect y={H * 0.84} width={W} height={H * 0.16} fill="#178a5a" />
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 30 + i * 90 + r() * 30;
        return <path key={i} d={`M${x} ${H * 0.9} l 18 -60 l 18 60 z`} fill="#0f5e45" />;
      })}
    </g>
  );
}

function Park({ seed, W, H }: P) {
  const r = rng(seed);
  const cx = W * 0.3;
  const cy = H * 0.5;
  const R = 120;
  return (
    <g>
      {[0, 1, 2].map((k) => {
        const x = 420 + r() * 320;
        const y = 70 + r() * 110;
        const c = ["#ffd27a", "#ff5a5f", "#ffffff"][k];
        return (
          <g key={k} stroke={c} strokeWidth="3" strokeLinecap="round">
            {Array.from({ length: 10 }).map((_, j) => {
              const a = (j / 10) * Math.PI * 2;
              return <line key={j} x1={x + Math.cos(a) * 8} y1={y + Math.sin(a) * 8} x2={x + Math.cos(a) * 34} y2={y + Math.sin(a) * 34} />;
            })}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#ffffff" strokeWidth="6" />
      {Array.from({ length: 12 }).map((_, j) => {
        const a = (j / 12) * Math.PI * 2;
        return (
          <g key={j}>
            <line x1={cx} y1={cy} x2={cx + Math.cos(a) * R} y2={cy + Math.sin(a) * R} stroke="#ffffff" strokeWidth="3" />
            <rect x={cx + Math.cos(a) * R - 10} y={cy + Math.sin(a) * R} width="20" height="16" rx="4" fill={["#ff5a5f", "#f6a01a", "#12a59b", "#6b3fa0"][j % 4]} />
          </g>
        );
      })}
      <path d={`M${cx - 60} ${H * 0.86} L ${cx} ${cy} L ${cx + 60} ${H * 0.86}`} stroke="#1b2a4a" strokeWidth="10" fill="none" />
      <path d={`M ${W * 0.45} ${H * 0.8} C ${W * 0.55} ${H * 0.2}, ${W * 0.65} ${H * 0.95}, ${W * 0.75} ${H * 0.45} S ${W * 0.95} ${H * 0.7}, ${W} ${H * 0.55}`} stroke="#ff5a5f" strokeWidth="8" fill="none" />
      <rect y={H * 0.86} width={W} height={H * 0.14} fill="#2d3f66" />
    </g>
  );
}
