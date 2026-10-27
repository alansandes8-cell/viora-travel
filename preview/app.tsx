/**
 * Vista previa de VIORA TRAVEL que corre completa en el navegador.
 * Usa el mismo motor del producto (src/core): perfil, preguntas inteligentes, alternativas,
 * puntajes, itinerario, validaciones, pedidos de cambio y vista saneada del cliente.
 * No tiene base de datos, panel real ni integraciones externas (imágenes, IA, email).
 */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { BUDGET_TIER_DEFS, LODGING_EMOJI, MONTHS_ES, PARTY_EMOJI, PRIORITY_DEFS, TRIP_STYLE_DEFS } from "@/core/catalog";
import { THIS_OR_THAT, travelerPersona, type Persona } from "@/core/game";
import { Postcard } from "@/components/postcard";
import { applyChanges, parseChangeRequest } from "@/core/changes";
import { KNOWN_CONNECTIONS, SEED_DESTINATIONS } from "@/core/library";
import { generatePlan, selectAlternative } from "@/core/plan";
import { buildProfile } from "@/core/profile";
import { pickSmartQuestions } from "@/core/questions";
import { mainStop, toClientProposal, type ClientProposal } from "@/core/sanitize";
import { whatsappSummary } from "@/core/summary";
import { CRITERIA, CRITERIA_LABELS, VERIFICATION_LABELS, type IntakeAnswers, type PlanDocument, type Priority, type TripStyle } from "@/core/types";

declare const LOGO_SRC: string;

const ctx = { library: SEED_DESTINATIONS, connections: KNOWN_CONNECTIONS };
const { useState, useMemo } = React;

const EMPTY: IntakeAnswers = {
  tripStyles: [],
  dreamText: "",
  dates: { mode: "month", months: [], flexibilityDays: 7 },
  origin: { city: "Buenos Aires", country: "Argentina" },
  party: { type: "couple", adults: 2, childrenAges: [] },
  budget: { tier: "moderate" },
  priorities: { selected: [], ranking: [], mustHave: [] },
  history: { visited: [], loved: [], wouldNotReturn: [], pending: [], avoid: [] },
  stay: { lodgingTypes: [], transport: ["plane", "train", "private_transfer"] },
  extra: {},
};

const EXAMPLE: IntakeAnswers = {
  ...EMPTY,
  tripStyles: ["beach_relax"],
  dreamText: "Quiero pasar 14 días descansando en una playa paradisíaca, con arena blanca, agua turquesa y buena gastronomía",
  dates: { mode: "month", months: [2], nights: 14, flexibilityDays: 7 },
  priorities: { selected: ["rest", "few_hotel_changes", "eat_well"], ranking: ["rest", "few_hotel_changes", "eat_well"], mustHave: ["few_hotel_changes"] },
};

type View = "home" | "wizard" | "reveal" | "trip";
type Tab = "alternativas" | "comparar" | "itinerario" | "compartir" | "agencia";

function toggle<T>(l: T[], v: T): T[] {
  return l.includes(v) ? l.filter((x) => x !== v) : [...l, v];
}

function App() {
  const [view, setView] = useState<View>("trip");
  const [answers, setAnswers] = useState<IntakeAnswers>(EXAMPLE);
  const [doc, setDoc] = useState<PlanDocument>(() => generatePlan(EXAMPLE, ctx));
  const [tab, setTab] = useState<Tab>("alternativas");
  const [isExample, setIsExample] = useState(true);
  const proposal = useMemo(() => toClientProposal(doc, "preliminary"), [doc]);

  const start = () => {
    setAnswers(EMPTY);
    setView("wizard");
    window.scrollTo(0, 0);
  };
  const finish = (a: IntakeAnswers) => {
    setAnswers(a);
    setDoc(generatePlan(a, ctx));
    setIsExample(false);
    setTab("alternativas");
    setView("reveal");
    window.scrollTo(0, 0);
  };
  const persona = useMemo(() => travelerPersona(buildProfile(answers, SEED_DESTINATIONS)), [answers]);

  return (
    <>
      <header className="top">
        <div className="wrap top-in">
          <button className="logo-btn" onClick={() => setView("home")} aria-label="Inicio">
            <img src={LOGO_SRC} alt="VIORA TRAVEL" width={64} height={64} />
          </button>
          <nav className="top-nav">
            {doc && (
              <button className={view === "trip" ? "link on" : "link"} onClick={() => setView("trip")}>
                Mi viaje
              </button>
            )}
            <button className="btn" onClick={start}>
              Planificar
            </button>
          </nav>
        </div>
      </header>
      <div className="preview-note">
        <div className="wrap">
          <strong>Vista previa.</strong> El motor de recomendación es el real y corre en tu navegador. Las imágenes son ilustraciones: en la plataforma instalada se muestran fotos reales de cada destino. No incluye base de datos, panel de la agencia, IA ni envíos.
        </div>
      </div>
      {view === "home" && <Home onStart={start} onExample={() => setView("trip")} />}
      {view === "wizard" && <Wizard initial={answers} onDone={finish} onCancel={() => setView("trip")} />}
      {view === "reveal" && (
        <Reveal
          persona={persona}
          onContinue={() => {
            setView("trip");
            window.scrollTo(0, 0);
          }}
        />
      )}
      {view === "trip" && (
        <Trip
          doc={doc}
          proposal={proposal}
          answers={answers}
          tab={tab}
          setTab={setTab}
          isExample={isExample}
          persona={persona}
          onChange={setDoc}
          onRestart={start}
        />
      )}
      <footer className="foot">
        <div className="wrap">VIORA TRAVEL · Viajá. Viví. Recordá.</div>
      </footer>
    </>
  );
}

// ───────────────────────── Portada ─────────────────────────

function Home({ onStart, onExample }: { onStart: () => void; onExample: () => void }) {
  return (
    <main className="wrap home">
      <section className="hero">
        <div>
          <p className="eyebrow teal">Planificación de viajes a tu medida</p>
          <h1>
            Contanos tu viaje soñado.
            <span className="teal"> Lo diseñamos con vos.</span>
          </h1>
          <p className="lead">Aunque todavía no sepas adónde ir: respondé unas preguntas y recibí tres alternativas pensadas para vos, con itinerario y el acompañamiento de un asesor.</p>
          <div className="row">
            <button className="btn big" onClick={onStart}>
              Empezar a planificar
            </button>
            <button className="btn ghost" onClick={onExample}>
              Ver el ejemplo
            </button>
          </div>
        </div>
        <img className="hero-logo" src={LOGO_SRC} alt="" />
      </section>
      <h2>¿Qué tipo de viaje te imaginás?</h2>
      <div className="tiles">
        {TRIP_STYLE_DEFS.slice(0, 8).map((s) => (
          <button key={s.id} className={`tile acc-${s.accent}`} onClick={onStart}>
            <span className="tile-emoji" aria-hidden="true">{s.emoji}</span>
            <span className="tile-title">{s.label}</span>
            <span className="tile-hint">{s.hint}</span>
          </button>
        ))}
      </div>
    </main>
  );
}

// ───────────────────────── Cuestionario ─────────────────────────

const STEPS: { key: string; label: string; emoji: string }[] = [
  { key: "style", label: "Tipo de viaje", emoji: "✈️" },
  { key: "game", label: "¿Esto o aquello?", emoji: "🎲" },
  { key: "when", label: "Cuándo", emoji: "📅" },
  { key: "origin", label: "Desde dónde", emoji: "🛫" },
  { key: "party", label: "Con quién", emoji: "👥" },
  { key: "budget", label: "Presupuesto", emoji: "👛" },
  { key: "priorities", label: "Prioridades", emoji: "⭐" },
  { key: "history", label: "Destinos conocidos", emoji: "🗺️" },
  { key: "stay", label: "Alojamiento y traslados", emoji: "🛏️" },
  { key: "last", label: "Últimas preguntas", emoji: "💬" },
];
const LAST = STEPS.length - 1;

/** Pasaporte: cada paso completado suma un sello. */
function Passport({ step }: { step: number }) {
  return (
    <ol className="passport" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
      {STEPS.map((s, i) => (
        <li key={s.key} className={i < step ? "done" : i === step ? "now" : ""} title={s.label}>
          <span aria-hidden="true">{i < step ? s.emoji : i + 1}</span>
        </li>
      ))}
    </ol>
  );
}

function Wizard({ initial, onDone, onCancel }: { initial: IntakeAnswers; onDone: (a: IntakeAnswers) => void; onCancel: () => void }) {
  const [a, setA] = useState<IntakeAnswers>(initial);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const set = <K extends keyof IntakeAnswers>(k: K, v: IntakeAnswers[K]) => setA((p) => ({ ...p, [k]: v }));
  const key = STEPS[step].key;
  const questions = useMemo(() => (key === "last" ? pickSmartQuestions(buildProfile(a, SEED_DESTINATIONS), a) : []), [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    if (key === "style" && !a.tripStyles.length && (a.dreamText ?? "").trim().length < 10) return setErr("Elegí al menos un estilo o describí tu idea.");
    if (key === "when" && a.dates.mode === "exact" && (!a.dates.departure || !a.dates.return || a.dates.return <= a.dates.departure)) return setErr("Revisá las fechas de salida y regreso.");
    setErr("");
    if (step < LAST) {
      setStep(step + 1);
      window.scrollTo(0, 0);
    } else onDone(a);
  };

  return (
    <main className="wrap wizard">
      <div className="progress-head">
        <span>
          {STEPS[step].emoji} Paso {step + 1} de {STEPS.length} · {STEPS[step].label}
        </span>
        <button className="link" onClick={onCancel}>
          Cancelar
        </button>
      </div>
      <Passport step={step} />

      {key === "style" && (
        <section className="step">
          <h1>¿Qué tipo de viaje soñás?</h1>
          <div className="choice-grid">
            {TRIP_STYLE_DEFS.map((s) => (
              <button key={s.id} className={`choice acc-${s.accent} ${a.tripStyles.includes(s.id) ? "on" : ""}`} aria-pressed={a.tripStyles.includes(s.id)} onClick={() => set("tripStyles", toggle<TripStyle>(a.tripStyles, s.id))}>
                <span className="choice-emoji" aria-hidden="true">{s.emoji}</span>
                <b>{s.label}</b>
                <small>{s.hint}</small>
              </button>
            ))}
          </div>
          <label className="field">
            <span>O contalo con tus palabras</span>
            <textarea id="dream" rows={3} value={a.dreamText} onChange={(e) => set("dreamText", e.target.value)} placeholder="Ej.: ya conozco Madrid y Roma, quiero algo distinto durante 15 días" />
          </label>
        </section>
      )}

      {key === "game" && (
        <section className="step">
          <h1>¿Esto o aquello?</h1>
          <p className="muted">Elegí rápido, sin pensar mucho. Si te gustan los dos, tocá «¡Los dos!».</p>
          <div className="tot-list">
            {THIS_OR_THAT.map((q) => {
              const cur = a.extra[q.id];
              const pick = (v: string) => set("extra", { ...a.extra, [q.id]: cur === v ? "" : v });
              return (
                <div key={q.id} className="tot">
                  <button className={`tot-opt ${cur === "a" ? "on" : ""}`} aria-pressed={cur === "a"} onClick={() => pick("a")}>
                    <span className="tot-emoji" aria-hidden="true">{q.a.emoji}</span>
                    {q.a.label}
                  </button>
                  <button className={`tot-both ${cur === "both" ? "on" : ""}`} aria-pressed={cur === "both"} onClick={() => pick("both")}>
                    ¡Los dos!
                  </button>
                  <button className={`tot-opt ${cur === "b" ? "on" : ""}`} aria-pressed={cur === "b"} onClick={() => pick("b")}>
                    <span className="tot-emoji" aria-hidden="true">{q.b.emoji}</span>
                    {q.b.label}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="muted small">
            {THIS_OR_THAT.filter((q) => a.extra[q.id]).length} de {THIS_OR_THAT.length} respondidas · es opcional
          </p>
        </section>
      )}

      {key === "when" && (
        <section className="step">
          <h1>¿Cuándo querés viajar?</h1>
          <div className="seg">
            {(
              [
                ["exact", "Tengo fechas"],
                ["month", "Sé el mes"],
                ["unknown", "Todavía no sé"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} className={a.dates.mode === v ? "on" : ""} onClick={() => set("dates", { ...a.dates, mode: v })}>
                {l}
              </button>
            ))}
          </div>
          {a.dates.mode === "exact" && (
            <div className="two">
              <label className="field">
                <span>Salida</span>
                <input id="dep" type="date" value={a.dates.departure ?? ""} onChange={(e) => set("dates", { ...a.dates, departure: e.target.value })} />
              </label>
              <label className="field">
                <span>Regreso</span>
                <input id="ret" type="date" value={a.dates.return ?? ""} onChange={(e) => set("dates", { ...a.dates, return: e.target.value })} />
              </label>
            </div>
          )}
          {a.dates.mode === "month" && (
            <div className="chips">
              {MONTHS_ES.map((m, i) => (
                <button key={m} className={a.dates.months?.includes(i + 1) ? "chip on" : "chip"} onClick={() => set("dates", { ...a.dates, months: toggle(a.dates.months ?? [], i + 1).sort((x, y) => x - y) })}>
                  {m}
                </button>
              ))}
            </div>
          )}
          {a.dates.mode !== "exact" && (
            <label className="field narrow">
              <span>¿Cuántas noches?</span>
              <input id="nights" type="number" min={1} max={90} value={a.dates.nights ?? ""} onChange={(e) => set("dates", { ...a.dates, nights: e.target.value ? Number(e.target.value) : undefined })} />
            </label>
          )}
          <div className="chips">
            {[
              [0, "Fechas fijas"],
              [7, "± 1 semana"],
              [30, "± 1 mes"],
              [120, "Totalmente flexible"],
            ].map(([v, l]) => (
              <button key={v} className={a.dates.flexibilityDays === v ? "chip on" : "chip"} onClick={() => set("dates", { ...a.dates, flexibilityDays: v as number })}>
                {l}
              </button>
            ))}
          </div>
        </section>
      )}

      {key === "origin" && (
        <section className="step">
          <h1>¿Desde dónde salís?</h1>
          <div className="two">
            <label className="field">
              <span>Ciudad</span>
              <input id="city" value={a.origin.city} onChange={(e) => set("origin", { ...a.origin, city: e.target.value })} />
            </label>
            <label className="field">
              <span>País</span>
              <input id="country" value={a.origin.country} onChange={(e) => set("origin", { ...a.origin, country: e.target.value })} />
            </label>
          </div>
          <p className="muted">Ciudades con tiempos de vuelo estimados: Buenos Aires, Córdoba, Rosario, Mendoza, Montevideo, Santiago, San Pablo y otras.</p>
        </section>
      )}

      {key === "party" && (
        <section className="step">
          <h1>¿Con quién viajás?</h1>
          <div className="chips">
            {(
              [
                ["solo", "Solo"],
                ["couple", "En pareja"],
                ["friends", "Con amigos"],
                ["family", "En familia"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} className={a.party.type === v ? "chip on" : "chip"} onClick={() => set("party", { ...a.party, type: v, adults: v === "solo" ? 1 : Math.max(2, a.party.adults) })}>
                {PARTY_EMOJI[v]} {l}
              </button>
            ))}
          </div>
          <div className="two">
            <label className="field">
              <span>Adultos</span>
              <input id="adults" type="number" min={1} value={a.party.adults} onChange={(e) => set("party", { ...a.party, adults: Math.max(1, Number(e.target.value) || 1) })} />
            </label>
            <label className="field">
              <span>Edades de menores (separadas por coma)</span>
              <input
                id="kids"
                placeholder="Ej.: 6, 10"
                defaultValue={a.party.childrenAges.join(", ")}
                onChange={(e) =>
                  set("party", {
                    ...a.party,
                    childrenAges: e.target.value
                      .split(",")
                      .map((x) => parseInt(x, 10))
                      .filter((x) => x >= 0 && x <= 17),
                  })
                }
              />
            </label>
          </div>
        </section>
      )}

      {key === "budget" && (
        <section className="step">
          <h1>¿Cuál es tu presupuesto?</h1>
          <p className="muted">Es una orientación, no una cotización. Se interpreta según la región.</p>
          <div className="choice-grid">
            {BUDGET_TIER_DEFS.map((t) => (
              <button key={t.id} className={`choice acc-orange ${a.budget.tier === t.id ? "on" : ""}`} onClick={() => set("budget", { ...a.budget, tier: t.id })}>
                <span className="choice-emoji" aria-hidden="true">{t.emoji}</span>
                <b>{t.label}</b>
                <small>{t.hint}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {key === "priorities" && (
        <section className="step">
          <h1>¿Qué cosas son importantes para vos?</h1>
          <div className="chips">
            {PRIORITY_DEFS.map((p) => {
              const on = a.priorities.selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={on ? "chip on purple" : "chip"}
                  onClick={() => {
                    const selected = toggle<Priority>(a.priorities.selected, p.id);
                    set("priorities", { selected, ranking: selected, mustHave: a.priorities.mustHave.filter((x) => selected.includes(x)) });
                  }}
                >
                  {p.emoji} {p.label}
                </button>
              );
            })}
          </div>
          {a.priorities.selected.length > 0 && (
            <>
              <p className="muted">Marcá hasta 3 indispensables:</p>
              <div className="chips">
                {a.priorities.selected.map((id) => {
                  const must = a.priorities.mustHave.includes(id);
                  return (
                    <button key={id} className={must ? "chip on coral" : "chip"} disabled={!must && a.priorities.mustHave.length >= 3} onClick={() => set("priorities", { ...a.priorities, mustHave: toggle(a.priorities.mustHave, id) })}>
                      {must ? "★ " : `${PRIORITY_DEFS.find((p) => p.id === id)?.emoji} `}
                      {PRIORITY_DEFS.find((p) => p.id === id)?.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {key === "history" && (
        <section className="step">
          <h1>¿Qué destinos ya conocés?</h1>
          <p className="muted">Separados por coma. Así evitamos recomendarte lo mismo de siempre.</p>
          {(
            [
              ["visited", "Lugares que ya visitaste", "Madrid, París, Roma"],
              ["pending", "Destinos pendientes", "Japón, Cusco"],
              ["avoid", "Lugares que preferís evitar", ""],
            ] as const
          ).map(([k, l, ph]) => (
            <label key={k} className="field">
              <span>{l}</span>
              <input
                id={`h-${k}`}
                placeholder={ph}
                defaultValue={a.history[k].join(", ")}
                onChange={(e) =>
                  set("history", {
                    ...a.history,
                    [k]: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          ))}
        </section>
      )}

      {key === "stay" && (
        <section className="step">
          <h1>Alojamiento y traslados</h1>
          <div className="chips">
            {(
              [
                ["all_inclusive", "Resort all-inclusive"],
                ["boutique", "Boutique hotel"],
                ["mid_hotel", "Hotel categoría media"],
                ["apartment", "Departamento"],
                ["hostel", "Hostel"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} className={a.stay.lodgingTypes.includes(v) ? "chip on cyan" : "chip"} onClick={() => set("stay", { ...a.stay, lodgingTypes: toggle(a.stay.lodgingTypes, v) })}>
                {LODGING_EMOJI[v]} {l}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={!!a.stay.noCarRental} onChange={(e) => set("stay", { ...a.stay, noCarRental: e.target.checked })} /> No quiero alquilar auto
          </label>
        </section>
      )}

      {key === "last" && (
        <section className="step">
          <h1>Unas últimas preguntas</h1>
          <p className="muted">Solo las que pueden cambiar la recomendación, elegidas según tus respuestas.</p>
          {questions.length === 0 && <p className="note ok">Con lo que contaste ya podemos armar tus alternativas.</p>}
          {questions.map((q) => {
            const cur = a.extra[q.id];
            return (
              <div key={q.id} className="field">
                <span>{q.text}</span>
                <div className="chips">
                  {q.options.map((o) => {
                    const on = q.multi ? Array.isArray(cur) && cur.includes(o.value) : cur === o.value;
                    return (
                      <button key={o.value} className={on ? "chip on" : "chip"} onClick={() => set("extra", { ...a.extra, [q.id]: q.multi ? toggle(Array.isArray(cur) ? cur : [], o.value) : o.value })}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {err && <p className="note bad">{err}</p>}
      <div className="wizard-nav">
        <div className="wizard-nav-in">
          <button
            className="btn ghost"
            disabled={step === 0}
            onClick={() => {
              setStep(step - 1);
              window.scrollTo(0, 0);
            }}
          >
            Atrás
          </button>
          <button className="btn" onClick={next}>
            {step === LAST ? "Descubrir mi perfil ✨" : "Siguiente →"}
          </button>
        </div>
      </div>
    </main>
  );
}

// ───────────────────────── Propuesta ─────────────────────────

const ACC = ["teal", "orange", "coral", "purple", "cyan"];

function Trip({
  doc,
  proposal: p,
  answers,
  tab,
  setTab,
  isExample,
  persona,
  onChange,
  onRestart,
}: {
  doc: PlanDocument;
  proposal: ClientProposal;
  answers: IntakeAnswers;
  tab: Tab;
  setTab: (t: Tab) => void;
  isExample: boolean;
  persona: Persona;
  onChange: (d: PlanDocument) => void;
  onRestart: () => void;
}) {
  const choose = (id: string) => {
    const next = structuredClone(doc);
    selectAlternative(next, id, answers, ctx);
    onChange(next);
    setTab("itinerario");
    window.scrollTo(0, 0);
  };
  const tabs: [Tab, string][] = [
    ["alternativas", "Alternativas"],
    ["comparar", "Comparar"],
    ["itinerario", "Itinerario"],
    ["compartir", "Compartir"],
    ["agencia", "Lo que ve la agencia"],
  ];
  return (
    <main>
      <section className="trip-head">
        <div className="wrap">
          {isExample && (
            <p className="note info">
              Ejemplo cargado: «14 días de playa en febrero, en pareja». <button className="link inline" onClick={onRestart}>Diseñá tu propio viaje</button>
            </p>
          )}
          <p className="eyebrow orange">
            Propuesta preliminar{p.exploratory ? (p.travelMonths.length ? " · fechas exactas a confirmar" : " · exploratoria") : ""}
          </p>
          <h1>{p.title}</h1>
          <p className="lead">{p.concept}</p>
          <nav className="tabs" aria-label="Secciones">
            {tabs.map(([k, l]) => (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </nav>
        </div>
      </section>
      <div className="wrap trip-body">
        {tab === "alternativas" && (
          <>
            <PersonaCard persona={persona} compact />
            <Alternatives p={p} onChoose={choose} />
          </>
        )}
        {tab === "comparar" && <Compare p={p} onChoose={choose} />}
        {tab === "itinerario" && <Itinerary p={p} doc={doc} answers={answers} onChange={onChange} />}
        {tab === "compartir" && <Share p={p} />}
        {tab === "agencia" && <Agency doc={doc} />}
      </div>
    </main>
  );
}

// ───────────────────────── Juego: perfil viajero ─────────────────────────

const CONFETTI_COLORS = ["var(--teal)", "var(--orange)", "var(--coral)", "var(--purple)", "var(--cyan)"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.6,
        rot: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 === 0,
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((c, i) => (
        <i key={i} style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, background: c.color, transform: `rotate(${c.rot}deg)`, borderRadius: c.round ? "50%" : "2px" }} />
      ))}
    </div>
  );
}

function PersonaCard({ persona, compact = false }: { persona: Persona; compact?: boolean }) {
  return (
    <section className={`persona ${compact ? "compact" : ""}`} aria-label="Tu perfil viajero">
      <div className="persona-badge" aria-hidden="true">
        {persona.emoji}
      </div>
      <div className="persona-text">
        <p className="eyebrow teal">Tu perfil viajero</p>
        <h2>{persona.name}</h2>
        <p className="muted">{persona.tagline}</p>
      </div>
      <ul className="traits">
        {persona.traits.map((t, i) => (
          <li key={t.label}>
            <span>{t.label}</span>
            <div className="bar">
              <div className="grow" style={{ width: `${Math.max(4, t.value)}%`, background: CONFETTI_COLORS[i], animationDelay: `${0.15 * i}s` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Reveal({ persona, onContinue }: { persona: Persona; onContinue: () => void }) {
  return (
    <main className="wrap reveal">
      <Confetti />
      <p className="reveal-kicker">🎉 ¡Listo! Ya te conocemos un poco más</p>
      <PersonaCard persona={persona} />
      <p className="muted">Con este perfil armamos tres alternativas distintas, sin repetir los lugares que ya conocés.</p>
      <button className="btn big" onClick={onContinue}>
        Ver mis 3 alternativas →
      </button>
    </main>
  );
}

function Ring({ v }: { v: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" title="Compatibilidad orientativa con tu perfil">
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--teal)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform="rotate(-90 32 32)" />
      </svg>
      <span>{v}</span>
    </div>
  );
}

function Alternatives({ p, onChoose }: { p: ClientProposal; onChoose: (id: string) => void }) {
  if (!p.alternatives.length) return <p className="note bad">No encontramos alternativas para esa combinación en la biblioteca. En la plataforma, un asesor investiga opciones a medida.</p>;
  return (
    <>
      <div className="cards">
        {p.alternatives.map((a, i) => {
          const sel = p.selectedAlternativeId === a.id;
          return (
            <article key={a.id} className={`card alt acc-${ACC[i]} ${sel ? "sel" : ""}`}>
              <div className="alt-band">
                <Postcard name={mainStop(a)?.name ?? a.title} kind={mainStop(a)?.kind ?? "city"} className="alt-photo" title={false} />
                <div className="labels">
                  {a.labels.map((l) => (
                    <span key={l} className="pill">
                      {l}
                    </span>
                  ))}
                </div>
                <span className="alt-dest">{a.stops.map((s) => s.name).join(" · ")}</span>
                {a.stops.length > 1 && (
                  <div className="alt-thumbs">
                    {a.stops.filter((s) => s !== mainStop(a)).slice(0, 3).map((s) => (
                      <Postcard key={s.name} name={s.name} kind={s.kind} label={false} title={false} className="thumb" />
                    ))}
                  </div>
                )}
              </div>
              <div className="alt-body">
                <div className="alt-top">
                  <div>
                    <p className="eyebrow acc-text">Alternativa {String.fromCharCode(65 + i)}</p>
                    <h3>{a.title}</h3>
                    <p className="muted small">{a.stops.map((s) => `${s.name} · ${s.nights}n`).join(" → ")}</p>
                  </div>
                  <Ring v={a.compatibility} />
                </div>
                <p>{a.mainReason}</p>
                <dl className="facts">
                  <div>
                    <dt>Viaje</dt>
                    <dd>{a.travelHours ? `~${a.travelHours} h` : "a confirmar"}</dd>
                  </div>
                  <div>
                    <dt>Hoteles</dt>
                    <dd>{a.lodgingChanges === 0 ? "uno solo" : `${a.lodgingChanges + 1}`}</dd>
                  </div>
                  <div>
                    <dt>Tranquilidad</dt>
                    <dd>{a.tranquility}</dd>
                  </div>
                </dl>
                <ul className="pc">
                  {a.pros.slice(0, 3).map((x) => (
                    <li key={x} className="pro">
                      {x}
                    </li>
                  ))}
                  {a.cons.slice(0, 2).map((x) => (
                    <li key={x} className="con">
                      {x}
                    </li>
                  ))}
                </ul>
                <button className={sel ? "btn ghost full" : "btn full"} onClick={() => onChoose(a.id)}>
                  {sel ? "Elegida · ver itinerario" : "Elegir y ver itinerario"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="note info">{p.disclaimer}</p>
    </>
  );
}

function Compare({ p, onChoose }: { p: ClientProposal; onChoose: (id: string) => void }) {
  const rows: [string, (a: ClientProposal["alternatives"][number]) => string][] = [
    ["Motivo principal", (a) => a.mainReason],
    ["Perfil ideal", (a) => a.idealTraveler],
    ["Experiencia", (a) => a.experienceType],
    ["Viaje desde el origen", (a) => (a.travelHours ? `~${a.travelHours} h (estimación)` : "A confirmar")],
    ["Complejidad logística", (a) => a.logisticsComplexity],
    ["Clima habitual", (a) => a.climateNote],
    ["Actividades", (a) => a.activities.slice(0, 5).join(" · ")],
    ["Observaciones", (a) => a.warnings.join(" ") || "Sin observaciones relevantes para la época."],
  ];
  return (
    <div className="compare">
      {p.alternatives.map((a, i) => (
        <article key={a.id} className={`card cmp acc-${ACC[i]}`}>
          <div className="alt-top">
            <div>
              <p className="eyebrow acc-text">Alternativa {String.fromCharCode(65 + i)}</p>
              <h3>{a.title}</h3>
            </div>
            <Ring v={a.compatibility} />
          </div>
          <div className="labels">
            {a.labels.map((l) => (
              <span key={l} className="pill soft">
                {l}
              </span>
            ))}
          </div>
          <dl className="rows">
            {rows.map(([l, f]) => (
              <div key={l}>
                <dt>{l}</dt>
                <dd>{f(a)}</dd>
              </div>
            ))}
          </dl>
          <details>
            <summary>Puntaje por criterio</summary>
            <ul className="crit">
              {a.criteria.map((c) => (
                <li key={c.key}>
                  <div className="crit-head">
                    <span>{c.label}</span>
                    <span className="num">{c.value.toFixed(1)}</span>
                  </div>
                  <div className="bar">
                    <div style={{ width: `${c.value * 10}%` }} />
                  </div>
                  {c.factors.slice(0, 2).map((f) => (
                    <p key={f.text} className="factor">
                      {f.sign === "+" ? "▲" : "▼"} {f.text}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </details>
          {a.seasonal.length > 0 && (
            <div className="season">
              <b>Si podés mover las fechas</b>
              {a.seasonal.map((w) => (
                <p key={w.label}>
                  <span className="cap">{w.label}</span> · clima {w.climateScore.toFixed(1)}/10. <span className="muted">{w.hypothesis}</span>
                </p>
              ))}
            </div>
          )}
          <button className="btn full" onClick={() => onChoose(a.id)}>
            {p.selectedAlternativeId === a.id ? "Ver itinerario" : "Elegir esta alternativa"}
          </button>
        </article>
      ))}
    </div>
  );
}

function RouteSketch({ stops }: { stops: { name: string; lat: number | null; lng: number | null; nights: number }[] }) {
  const pts = stops.filter((s) => s.lat !== null && s.lng !== null) as { name: string; lat: number; lng: number; nights: number }[];
  if (!pts.length) return null;
  const W = 640;
  const H = 300;
  const pad = 70;
  const mid = ((Math.max(...pts.map((x) => x.lat)) + Math.min(...pts.map((x) => x.lat))) / 2) * (Math.PI / 180);
  const xs = pts.map((x) => x.lng * Math.cos(mid));
  const ys = pts.map((x) => x.lat);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 0.5);
  const sc = Math.min((W - pad * 2) / span, (H - pad * 2) / span);
  const ox = (W - (Math.max(...xs) - Math.min(...xs)) * sc) / 2;
  const oy = (H - (Math.max(...ys) - Math.min(...ys)) * sc) / 2;
  const xy = pts.map((x, i) => ({ ...x, x: ox + (xs[i] - Math.min(...xs)) * sc, y: H - (oy + (ys[i] - Math.min(...ys)) * sc) }));
  const colors = ["var(--teal)", "var(--orange)", "var(--coral)", "var(--purple)", "var(--cyan)"];
  return (
    <svg className="sketch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ruta: ${pts.map((x) => x.name).join(", ")}`}>
      <rect width={W} height={H} rx="18" fill="var(--map)" />
      <polyline points={xy.map((q) => `${q.x},${q.y}`).join(" ")} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="6 6" />
      {xy.map((q, i) => (
        <g key={q.name}>
          <circle cx={q.x} cy={q.y} r="14" fill={colors[i % 5]} stroke="var(--surface)" strokeWidth="3" />
          <text x={q.x} y={q.y + 4.5} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
            {i + 1}
          </text>
          <text x={q.x} y={q.y - 22} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">
            {q.name} · {q.nights}n
          </text>
        </g>
      ))}
    </svg>
  );
}

const EXAMPLES = ["Quiero menos ciudades", "Prefiero más días de playa", "Quiero un ritmo más tranquilo", "Prefiero hoteles céntricos"];

function Itinerary({ p, doc, answers, onChange }: { p: ClientProposal; doc: PlanDocument; answers: IntakeAnswers; onChange: (d: PlanDocument) => void }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const it = p.itinerary;
  if (!it) return <p className="note bad">Sin itinerario.</p>;
  const apply = () => {
    const parsed = parseChangeRequest(text, doc, SEED_DESTINATIONS);
    if (parsed.unmatched || parsed.conflicts.length || parsed.ops.some((o) => o.op === "recompute_alternatives")) {
      setMsg({ ok: false, lines: ["En la plataforma este pedido queda registrado para que un asesor lo revise (o lo interpreta la IA, si está activada)."] });
      return;
    }
    onChange(applyChanges(doc, parsed.ops, answers, ctx));
    setMsg({ ok: true, lines: parsed.explanation });
  };
  const stopName = (id: string) => it.stops.find((s) => s.id === id)?.name ?? "";
  return (
    <div className="itin">
      <div className="itin-top">
        <div className="card pad">
          <RouteSketch stops={it.stops} />
          <p className="muted small">Mapa esquemático. En la plataforma se muestra un mapa interactivo.</p>
        </div>
        <div className="stack">
          <h2>Ciudades y noches</h2>
          <ol className="stops">
            {it.stops.map((s, i) => (
              <li key={s.id}>
                <span className={`dot acc-${ACC[i % 5]}`}>{i + 1}</span>
                <div>
                  <b>{s.name}</b> <span className="muted">· {s.country}</span>
                  <p className="muted small">
                    {s.nights} noches{s.arrivalDate ? ` · ${s.arrivalDate} → ${s.departureDate}` : ""} · zona {s.lodgingZone}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {it.legs.length > 0 && (
            <>
              <h3>Traslados</h3>
              {it.legs.map((l) => (
                <p key={l.from + l.to} className="small">
                  <b>
                    {l.from} → {l.to}
                  </b>{" "}
                  <span className="muted">
                    en {l.mode}
                    {l.hours ? ` · ~${l.hours} h` : ""} · {l.status}
                  </span>
                </p>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="gallery">
        {it.stops.map((s) => (
          <figure key={s.id} className="card">
            <Postcard name={s.name} kind={s.kind} title={false} />
            <figcaption>
              <b>{s.name}</b> <span className="muted">· {s.nights} noches</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <h2>Día por día</h2>
      <div className="days">
        {it.days.map((d, i) => (
          <details key={d.n} className="day" open={i < 2}>
            <summary>
              <span className="day-n">
                <small>Día</small>
                {d.n}
              </span>
              <span className="day-t">
                <b>{d.title}</b>
                <small className="muted">
                  {d.date ? `${d.date} · ` : ""}
                  {stopName(d.stopId)}
                </small>
              </span>
            </summary>
            <div className="day-body">
              {d.logistics && <p className="muted">{d.logistics}</p>}
              {d.activities.map((x) => (
                <div key={x.name} className="act">
                  <b>{x.name}</b> <span className="tag">~{x.hours} h</span>
                  {x.booking === "required" && <span className="tag coral">Requiere reserva</span>}
                  {x.booking === "recommended" && <span className="tag orange">Reserva recomendada</span>}
                  <p className="muted">{x.why}</p>
                  {x.url && (
                    <a href={x.url} target="_blank" rel="noopener noreferrer">
                      Sitio oficial
                    </a>
                  )}
                </div>
              ))}
              <p>{d.freeTime}</p>
              {d.food && <p className="muted">{d.food}</p>}
              {d.rainPlan && <p className="muted">{d.rainPlan}</p>}
            </div>
          </details>
        ))}
      </div>

      <h2>Dónde alojarse</h2>
      <div className="cards two-col">
        {it.lodging.map((l) => (
          <div key={l.stopId} className="card pad">
            <p className="eyebrow">{stopName(l.stopId)}</p>
            <b>{l.category}</b>
            <p className="muted">
              Zona sugerida: <b>{l.zone}</b> — {l.zoneProfile}
            </p>
            <p className="small muted">El sistema no inventa hoteles: un asesor agrega opciones reales con su fuente y confirma disponibilidad.</p>
          </div>
        ))}
      </div>

      <div className="card pad change">
        <h2>¿Querés ajustar algo?</h2>
        <p className="muted">Pedilo con tus palabras. Se recalcula solo lo necesario y se conserva el resto.</p>
        <div className="chips">
          {EXAMPLES.map((e) => (
            <button key={e} className="chip" onClick={() => setText(e)}>
              {e}
            </button>
          ))}
        </div>
        <div className="change-row">
          <input id="change" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej.: quiero cambiar Roma por Florencia" />
          <button className="btn" disabled={text.trim().length < 4} onClick={apply}>
            Aplicar cambio
          </button>
        </div>
        {msg && (
          <div className={msg.ok ? "note ok" : "note info"}>
            {msg.ok && <b>Listo, actualizamos tu itinerario. </b>}
            {msg.lines.join(" ")}
          </div>
        )}
      </div>

      <div className="card pad">
        <h2>Documentación para verificar</h2>
        <p className="muted">Los requisitos dependen de tu nacionalidad, pasaporte y escalas. Consultalos siempre en fuentes oficiales; VIORA no emite garantías migratorias.</p>
        {p.entryRequirements.map((e) => (
          <p key={e.country}>
            <b>{e.country}:</b>{" "}
            {e.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="sep">
                {l.label}
              </a>
            ))}
          </p>
        ))}
        {!p.entryRequirements.length && <p className="muted">Viaje nacional.</p>}
      </div>
    </div>
  );
}

function Share({ p }: { p: ClientProposal }) {
  const text = whatsappSummary(p);
  const [copied, setCopied] = useState(false);
  return (
    <div className="share">
      <div className="card pad">
        <h2>Resumen para WhatsApp</h2>
        <p className="muted">Así se ve el resumen que el cliente comparte. No incluye precios.</p>
        <pre className="wa">{text}</pre>
        <button
          className="btn ghost"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          {copied ? "Copiado" : "Copiar texto"}
        </button>
      </div>
      <div className="card pad">
        <h2>En la plataforma, además</h2>
        <ul className="list">
          <li>Enlace privado de solo lectura, con vencimiento y revocable desde el panel.</li>
          <li>PDF con diseño de la marca, imágenes y mapa.</li>
          <li>Enlace para continuar en otro dispositivo.</li>
          <li>Formulario para pedir la propuesta personalizada, que aparece en el panel de la agencia y, si está configurado, llega por email.</li>
        </ul>
      </div>
    </div>
  );
}

function Agency({ doc }: { doc: PlanDocument }) {
  const pr = doc.profile;
  return (
    <div className="agency">
      <p className="note info">Este bloque muestra parte de lo que ve la agencia en el panel privado. En la plataforma real, el cliente nunca accede a esta información.</p>
      <div className="cards two-col">
        <div className="card pad">
          <h2>Declarado por el cliente</h2>
          <dl className="rows">
            {pr.declared.map((d) => (
              <div key={d.label}>
                <dt>{d.label}</dt>
                <dd>{d.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="card pad">
          <h2>Inferido por el sistema</h2>
          {pr.inferred.map((i) => (
            <div key={i.key} className="inf">
              <b>
                {i.label}: {i.value}
              </b>{" "}
              <span className="tag">confianza {i.confidence === "high" ? "alta" : i.confidence === "medium" ? "media" : "baja"}</span>
              <p className="muted small">{i.rationale}</p>
            </div>
          ))}
          {pr.missing.length > 0 && (
            <>
              <h3>Datos faltantes</h3>
              <ul className="list">
                {pr.missing.map((m) => (
                  <li key={m.key}>{m.label}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <div className="card pad">
        <h2>Puntajes y ponderaciones</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Criterio</th>
                <th className="num">Peso</th>
                {doc.alternatives.map((a, i) => (
                  <th key={a.id} className="num">
                    {String.fromCharCode(65 + i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRITERIA.map((c) => (
                <tr key={c}>
                  <td>{CRITERIA_LABELS[c]}</td>
                  <td className="num">{doc.weights[c]}</td>
                  {doc.alternatives.map((a) => (
                    <td key={a.id} className="num">
                      {a.scores[c].value.toFixed(1)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="total">
                <td>Compatibilidad</td>
                <td />
                {doc.alternatives.map((a) => (
                  <td key={a.id} className="num">
                    {a.compatibility}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        {doc.weightNotes.length > 0 && <p className="muted small">{doc.weightNotes.join(" ")}</p>}
      </div>
      <div className="cards two-col">
        <div className="card pad">
          <h2>Control de coherencia</h2>
          {doc.checks.length === 0 && <p className="muted">Sin errores ni advertencias.</p>}
          {doc.checks.map((c, i) => (
            <p key={i} className="small">
              <span className={`tag ${c.severity === "error" ? "coral" : c.severity === "warning" ? "orange" : ""}`}>{c.severity === "error" ? "Error" : c.severity === "warning" ? "Advertencia" : "Info"}</span> {c.message}
            </p>
          ))}
          <h3>Pendiente de confirmar</h3>
          <ul className="list">
            {doc.pendingInfo.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="card pad">
          <h2>Verificación de traslados</h2>
          {doc.itinerary?.legs.length ? (
            doc.itinerary.legs.map((l) => (
              <p key={l.id} className="small">
                <b>
                  {l.fromName} → {l.toName}
                </b>{" "}
                <span className="tag">{VERIFICATION_LABELS[l.duration.status]}</span>
                {l.operators.length > 0 && <span className="muted"> · {l.operators.map((o) => o.name).join(", ")}</span>}
              </p>
            ))
          ) : (
            <p className="muted">Destino único: sin traslados internos.</p>
          )}
          <p className="muted small">En el panel, el agente marca cada dato como verificado con su fuente y fecha, carga tarifas reales y arma el presupuesto con su margen.</p>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
