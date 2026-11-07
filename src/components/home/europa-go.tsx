"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cx } from "@/components/ui";

/**
 * «Video» animado de Europa Go hecho con HTML y CSS (liviano, sin archivos pesados).
 * Recorre las funciones de la app; respeta «reducir movimiento» del sistema.
 * Los textos están acá para editarlos fácilmente.
 */
const SCENES = [
  { key: "plan", emoji: "🗓️", title: "Planificación día por día", text: "Tu itinerario completo en el celular: qué hacer cada día y en qué orden." },
  { key: "translate", emoji: "🗣️", title: "Traductor", text: "Hablá con cualquiera: escribís o decís la frase y la app la traduce." },
  { key: "map", emoji: "🗺️", title: "Mapas sin internet", text: "Ubicate y llegá a todos lados aunque no tengas datos." },
  { key: "places", emoji: "📍", title: "Ubicaciones clave", text: "Tu hotel, estaciones, farmacias y los lugares importantes, siempre a mano." },
  { key: "budget", emoji: "💶", title: "Planificador de presupuesto", text: "Cargá tus gastos y mirá cuánto te queda para disfrutar sin sorpresas." },
] as const;

const DURATION = 4200;

function Screen({ k }: { k: (typeof SCENES)[number]["key"] }) {
  if (k === "plan")
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-teal-brand">Día 3 · Roma</p>
        {[
          ["09:00", "Coliseo y Foro Romano"],
          ["13:30", "Almuerzo en Monti"],
          ["16:00", "Fontana di Trevi"],
          ["20:00", "Cena en Trastevere"],
        ].map(([h, t], i) => (
          <div key={t} className="eg-in flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm" style={{ animationDelay: `${0.25 + i * 0.35}s` }}>
            <span className="rounded bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">{h}</span>
            <span className="text-[12px] text-navy">{t}</span>
          </div>
        ))}
      </div>
    );
  if (k === "translate")
    return (
      <div className="space-y-3 pt-2">
        <div className="eg-in ml-auto w-[85%] rounded-2xl rounded-br-sm bg-teal-brand px-3 py-2 text-[12px] text-white" style={{ animationDelay: "0.2s" }}>
          🇦🇷 ¿Dónde está la estación de tren?
        </div>
        <div className="eg-in w-[85%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-[12px] text-navy shadow-sm" style={{ animationDelay: "1s" }}>
          🇮🇹 Dov&apos;è la stazione dei treni?
        </div>
        <div className="eg-in mx-auto flex w-fit items-center gap-1 rounded-full bg-navy px-3 py-1 text-[11px] text-white" style={{ animationDelay: "1.6s" }}>
          🔊 Escuchar
        </div>
      </div>
    );
  if (k === "map")
    return (
      <div className="relative h-full overflow-hidden rounded-xl bg-[#e8f1ec]">
        <svg viewBox="0 0 200 220" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M-10 60 C 50 40, 90 110, 210 80" stroke="#bcd7e6" strokeWidth="14" fill="none" />
          <path d="M20 -10 L 70 230 M 130 -10 L 110 230 M -10 150 L 210 170" stroke="#fff" strokeWidth="6" />
          <path className="eg-route" d="M45 185 C 70 150, 90 140, 115 110 S 150 60, 160 45" stroke="#ff5a5f" strokeWidth="4" strokeDasharray="6 5" fill="none" />
          <circle cx="45" cy="185" r="7" fill="#1b2a4a" />
          <circle cx="160" cy="45" r="8" fill="#ff5a5f" />
        </svg>
        <span className="eg-in absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-navy shadow-sm" style={{ animationDelay: "0.6s" }}>
          ✈️ Modo avión · Mapa disponible ✓
        </span>
      </div>
    );
  if (k === "places")
    return (
      <div className="space-y-2">
        {[
          ["🏨", "Tu hotel", "350 m"],
          ["🚉", "Estación Termini", "900 m"],
          ["💊", "Farmacia 24 h", "200 m"],
          ["🏛️", "Museos Vaticanos", "3,1 km"],
        ].map(([e, t, d], i) => (
          <div key={t} className="eg-in flex items-center justify-between rounded-lg bg-white p-2 shadow-sm" style={{ animationDelay: `${0.2 + i * 0.35}s` }}>
            <span className="text-[12px] text-navy">
              {e} {t}
            </span>
            <span className="text-[10px] font-bold text-teal-brand">{d}</span>
          </div>
        ))}
      </div>
    );
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-teal-brand">Presupuesto del viaje</p>
      {[
        ["Comidas", 70, "bg-orange-brand"],
        ["Transporte", 40, "bg-cyan-brand"],
        ["Entradas", 55, "bg-purple-brand"],
        ["Compras", 25, "bg-coral-brand"],
      ].map(([t, w, c], i) => (
        <div key={t as string}>
          <p className="flex justify-between text-[11px] text-navy">
            <span>{t}</span>
            <span>{w}%</span>
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
            <div className={cx("eg-bar h-full rounded-full", c as string)} style={{ width: `${w}%`, animationDelay: `${0.2 + i * 0.25}s` }} />
          </div>
        </div>
      ))}
      <p className="eg-in rounded-lg bg-white p-2 text-center text-[12px] font-semibold text-navy shadow-sm" style={{ animationDelay: "1.4s" }}>
        Te quedan para disfrutar: 👍
      </p>
    </div>
  );
}

export function EuropaGoVideo() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    // Con «reducir movimiento» no avanza solo: la persona elige cada función.
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {}
    if (!playing || reduced) return;
    const t = setTimeout(() => setI((x) => (x + 1) % SCENES.length), DURATION);
    return () => clearTimeout(t);
  }, [i, playing]);

  const s = SCENES[i];
  return (
    <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
      {/* Teléfono */}
      <div className="relative mx-auto w-[240px]">
        <div className="rounded-[2.4rem] border-[10px] border-navy bg-navy shadow-lift">
          <div className="relative h-[420px] overflow-hidden rounded-[1.8rem] bg-sand">
            <div className="flex items-center justify-between bg-white px-4 pb-2 pt-3">
              <span className="font-display text-[15px] text-navy">
                Europa <span className="text-teal-brand">Go</span>
              </span>
              <span className="text-lg" aria-hidden>
                {s.emoji}
              </span>
            </div>
            <div key={s.key} className="eg-scene h-[330px] p-3">
              <p className="mb-2 text-[13px] font-bold text-navy">{s.title}</p>
              <div className="h-[290px]">
                <Screen k={s.key} />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex justify-around border-t border-line bg-white py-2 text-base" aria-hidden>
              {SCENES.map((x, j) => (
                <span key={x.key} className={cx("transition-opacity", j === i ? "opacity-100" : "opacity-35")}>
                  {x.emoji}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Texto sincronizado */}
      <div>
        <ol className="space-y-2">
          {SCENES.map((x, j) => (
            <li key={x.key}>
              <button type="button" onClick={() => setI(j)} className={cx("w-full rounded-2xl border p-3 text-left transition-colors", j === i ? "border-teal-brand bg-white shadow-soft" : "border-transparent hover:bg-white/60")} aria-current={j === i ? "step" : undefined}>
                <p className="font-semibold text-navy">
                  <span aria-hidden>{x.emoji}</span> {x.title}
                </p>
                {j === i && <p className="mt-0.5 text-sm text-muted">{x.text}</p>}
                {j === i && (
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-sand-2">
                    <span key={`${i}-${playing}`} className={cx("block h-full bg-teal-brand", playing ? "eg-progress" : "w-0")} style={{ animationDuration: `${DURATION}ms` }} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setPlaying((p) => !p)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
          {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />} {playing ? "Pausar" : "Reproducir"}
        </button>
      </div>
    </div>
  );
}
