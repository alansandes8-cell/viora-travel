"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  Check,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import {
  BUDGET_TIER_DEFS,
  LODGING_EMOJI,
  LODGING_LABELS,
  MONTHS_ES,
  PARTY_EMOJI,
  PRIORITY_DEFS,
  TRANSPORT_EMOJI,
  TRANSPORT_LABELS,
  TRIP_STYLE_DEFS,
} from "@/core/catalog";
import { THIS_OR_THAT } from "@/core/game";
import type { SmartQuestion } from "@/core/questions";
import type { IntakeAnswers, LodgingType, PartyType, Priority, TransportMode, TripStyle } from "@/core/types";
import { ACCENTS, Button, Field, Notice, cx, inputClass } from "@/components/ui";
import { applyReading } from "@/core/dream";
import { PlaceSearch } from "@/components/place-search";
import { interpretDreamAction, newTripDraftAction, saveDraftAction, smartQuestionsAction, submitAction } from "./actions";

const STEPS = [
  { key: "style", emoji: "✈️", title: "¿Qué tipo de viaje soñás?", subtitle: "Elegí uno o varios estilos, o contalo con tus palabras." },
  { key: "game", emoji: "🎲", title: "¿Esto o aquello?", subtitle: "Elegí rápido, sin pensarlo mucho. Si te gustan los dos, tocá «¡Los dos!». Es opcional." },
  { key: "dates", emoji: "📅", title: "¿Cuándo querés viajar?", subtitle: "Si todavía no tenés fechas, no pasa nada: exploramos temporadas." },
  { key: "origin", emoji: "🛫", title: "¿Desde dónde salís?", subtitle: "Nos ayuda a estimar tiempos de vuelo y conexiones." },
  { key: "party", emoji: "👥", title: "¿Con quién viajás?", subtitle: "Solo lo necesario para adaptar el plan." },
  { key: "budget", emoji: "👛", title: "¿Cuál es tu presupuesto?", subtitle: "Es una orientación inicial, no una cotización." },
  { key: "priorities", emoji: "⭐", title: "¿Qué cosas son importantes para vos?", subtitle: "Elegí, ordená y marcá lo indispensable." },
  { key: "history", emoji: "🗺️", title: "¿Qué destinos ya conocés?", subtitle: "Así evitamos recomendarte lo mismo de siempre." },
  { key: "stay", emoji: "🛏️", title: "Alojamiento y traslados", subtitle: "Contanos cómo te gusta viajar." },
  { key: "smart", emoji: "💬", title: "Unas últimas preguntas", subtitle: "Solo las que pueden cambiar la recomendación." },
] as const;

const DEFAULTS: IntakeAnswers = {
  tripStyles: [],
  dreamText: "",
  dates: { mode: "month", months: [], flexibilityDays: 7 },
  origin: { city: "Buenos Aires", country: "Argentina", flightPref: "few_stops" },
  party: { type: "couple", adults: 2, childrenAges: [], mobility: "none" },
  budget: { tier: "moderate", per: "person", includes: { flights: true, lodging: true }, flexibility: "some" },
  priorities: { selected: [], ranking: [], mustHave: [] },
  history: { visited: [], loved: [], wouldNotReturn: [], pending: [], avoid: [] },
  stay: { lodgingTypes: [], transport: ["plane", "train", "private_transfer"], lodgingPriority: "location" },
  extra: {},
};

function merge(initial: Partial<IntakeAnswers> | null): IntakeAnswers {
  if (!initial) return DEFAULTS;
  return {
    ...DEFAULTS,
    ...initial,
    dates: { ...DEFAULTS.dates, ...initial.dates },
    origin: { ...DEFAULTS.origin, ...initial.origin },
    party: { ...DEFAULTS.party, ...initial.party },
    budget: { ...DEFAULTS.budget, ...initial.budget },
    priorities: { ...DEFAULTS.priorities, ...initial.priorities },
    history: { ...DEFAULTS.history, ...initial.history },
    stay: { ...DEFAULTS.stay, ...initial.stay },
    extra: { ...(initial.extra ?? {}) },
  };
}

type StepKey = (typeof STEPS)[number]["key"];
type AirportOption = { iata: string; name: string; city: string; country: string; lat: number; lng: number };
type PlaceOption = { kind: "city" | "country"; label: string; detail?: string };

/** Paso del cuestionario al que pertenece un campo (p. ej. «dates.return» → «dates»). */
function stepOfField(path: string): StepKey {
  const [head, sub] = path.split(".");
  if (head === "tripStyles" || head === "dreamText" || head === "style") return "style";
  if (head === "nights") return "dates";
  if (head === "extra") return sub?.startsWith("tot_") ? "game" : "smart";
  return (STEPS.find((s) => s.key === head)?.key ?? "smart") as StepKey;
}

/** Clave de error que muestra cada campo del formulario. */
function displayKey(path: string): string {
  if (path === "dates.nights") return "nights";
  return stepOfField(path);
}

/** Los mensajes técnicos de la validación del servidor se reemplazan por uno claro. */
function friendly(message: string, step: StepKey): string {
  if (!/\b(expected|invalid|must|too (big|small|long|short)|required)\b/i.test(message)) return message;
  return `Hay un dato para corregir en «${STEPS.find((s) => s.key === step)?.title ?? "este paso"}».`;
}

const FLEX_HELP: Record<number, string> = {
  0: "Viajás exactamente en esas fechas.",
  3: "Podés salir y volver hasta 3 días antes o después de lo que indicaste.",
  7: "Podés mover la salida y la vuelta hasta una semana para un lado o para el otro.",
  30: "Te sirve cualquier semana dentro del mes anterior o posterior.",
  120: "Te adaptás a la mejor época: te sugerimos cuándo conviene ir.",
};

/** «2026-03-10» ± días → «7/3». */
function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

const LOADING_MESSAGES = ["Analizando tu perfil de viajero…", "Comparando destinos y temporadas…", "Evaluando logística y tiempos de traslado…", "Armando el itinerario día por día…", "Revisando que todo sea coherente…"];

export function Wizard({
  initial,
  initialStep,
  preselect,
  hasProposal,
}: {
  initial: Partial<IntakeAnswers> | null;
  initialStep: number;
  preselect?: TripStyle;
  hasProposal: boolean;
}) {
  const router = useRouter();
  const [a, setA] = useState<IntakeAnswers>(() => {
    const m = merge(initial);
    if (preselect && !m.tripStyles.includes(preselect)) m.tripStyles = [...m.tripStyles, preselect];
    return m;
  });
  const [step, setStep] = useState(() => Math.min(Math.max(0, initialStep), STEPS.length - 1));
  const [budgetAmount, setBudgetAmount] = useState<{ amount: string; currency: "USD" | "ARS" | "EUR"; per: "person" | "group" }>({ amount: "", currency: "USD", per: "person" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [questions, setQuestions] = useState<SmartQuestion[] | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [proposalExists, setProposalExists] = useState(hasProposal);
  const [resetting, startReset] = useTransition();
  const [reading, setReading] = useState<Awaited<ReturnType<typeof interpretDreamAction>>>(null);
  const [readingFor, setReadingFor] = useState("");
  const [reading_, startReading] = useTransition();
  // Hasta dónde llegó: se puede volver a cualquier paso ya visitado tocando su sello.
  const [maxReached, setMaxReached] = useState(() => Math.min(Math.max(0, initialStep), STEPS.length - 1));
  if (step > maxReached) setMaxReached(step);

  // Interpreta el texto libre mientras la persona escribe (con una pequeña espera).
  const dreamText = a.dreamText ?? "";
  useEffect(() => {
    if (STEPS[step].key !== "style" || dreamText.trim().length < 15 || dreamText === readingFor) return;
    const t = setTimeout(() => {
      startReading(async () => {
        setReading(await interpretDreamAction(dreamText).catch(() => null));
        setReadingFor(dreamText);
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [dreamText, step, readingFor]);
  const firstRender = useRef(true);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Autoguardado con espera (no se envía el monto del presupuesto: viaja solo al final).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaved("saving");
    const t = setTimeout(async () => {
      try {
        const r = await saveDraftAction(a, step);
        setSaved(r.ok ? "saved" : "error");
      } catch {
        setSaved("error");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [a, step]);

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (STEPS[step].key !== "smart") return;
    let active = true;
    smartQuestionsAction(a)
      .then((q) => active && setQuestions(q))
      .catch(() => active && setQuestions([]));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (!submitting) return;
    const t = setInterval(() => setLoadingMsg((m) => (m + 1) % LOADING_MESSAGES.length), 1400);
    return () => clearInterval(t);
  }, [submitting]);

  const set = <K extends keyof IntakeAnswers>(k: K, v: IntakeAnswers[K]) => setA((prev) => ({ ...prev, [k]: v }));
  const nightsFromDates = useMemo(() => {
    if (a.dates.mode !== "exact" || !a.dates.departure || !a.dates.return) return null;
    return Math.round((Date.parse(a.dates.return) - Date.parse(a.dates.departure)) / 86400000);
  }, [a.dates]);

  function validate(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    const key = STEPS[s].key;
    if (key === "style" && !a.tripStyles.length && (a.dreamText ?? "").trim().length < 10) e.style = "Elegí al menos un estilo o describí tu idea.";
    if (key === "dates") {
      if (a.dates.mode === "exact") {
        if (!a.dates.departure || !a.dates.return) e.dates = "Indicá la fecha de salida y la de regreso.";
        else if (nightsFromDates !== null && nightsFromDates <= 0) e.dates = "La fecha de regreso debe ser posterior a la de salida.";
        else if (a.dates.departure < new Date().toISOString().slice(0, 10)) e.dates = "La fecha de salida ya pasó.";
      }
      if (a.dates.nights !== undefined && (a.dates.nights < 1 || a.dates.nights > 90)) e.nights = "Entre 1 y 90 noches.";
    }
    if (key === "origin" && (a.origin.city.trim().length < 2 || a.origin.country.trim().length < 2)) e.origin = "Indicá ciudad y país de salida.";
    if (key === "party") {
      if (a.party.adults < 1) e.party = "Al menos un adulto.";
      if (a.party.childrenAges.some((x) => Number.isNaN(x) || x < 0 || x > 17)) e.party = "Revisá las edades de los chicos (0 a 17).";
    }
    if (key === "budget" && budgetAmount.amount && !(Number(budgetAmount.amount.replace(",", ".")) > 0)) e.budget = "Ingresá un monto válido o dejalo vacío.";
    return e;
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    // Lo entendido del texto libre completa los pasos siguientes (sin pisar lo ya elegido).
    if (STEPS[step].key === "style" && reading && readingFor === dreamText) setA((prev) => applyReading(prev, reading.reading));
    if (STEPS[step + 1]?.key === "smart") setQuestions(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  /** Lleva al primer paso con errores (los marca en el pasaporte y arriba del paso). */
  function showErrors(e: Record<string, string>) {
    setErrors(e);
    const steps = Object.keys(e).map(stepOfField);
    const first = STEPS.findIndex((s) => steps.includes(s.key));
    if (first >= 0 && first !== step) setStep(first);
  }

  function startOver() {
    const started = proposalExists || a.tripStyles.length > 0 || (a.dreamText ?? "").trim().length > 0 || step > 0;
    if (started && !window.confirm("¿Empezar un viaje nuevo desde cero?\n\nTu viaje actual queda guardado en «Mis viajes».")) return;
    startReset(async () => {
      await newTripDraftAction();
      firstRender.current = true; // no guardar el formulario vacío como un viaje nuevo
      setA(DEFAULTS);
      setBudgetAmount({ amount: "", currency: "USD", per: "person" });
      setErrors({});
      setSubmitError(null);
      setQuestions(null);
      setProposalExists(false);
      setSaved("idle");
      setStep(0);
      setMaxReached(0);
    });
  }

  function submit(override?: IntakeAnswers) {
    const src = override ?? a;
    // Antes de enviar se revisan TODOS los pasos, no solo el último.
    const e = STEPS.reduce<Record<string, string>>((acc, _, i) => ({ ...acc, ...validate(i) }), {});
    if (Object.keys(e).length) return showErrors(e);
    setErrors({});
    setSubmitError(null);
    const amount = Number(budgetAmount.amount.replace(/\./g, "").replace(",", "."));
    const budget = amount > 0 ? { amount, currency: budgetAmount.currency, per: budgetAmount.per } : undefined;
    const payload: IntakeAnswers = {
      ...src,
      dates: src.dates.mode === "exact" ? { ...src.dates, months: undefined, nights: undefined } : { ...src.dates, departure: undefined, return: undefined },
      party: { ...src.party, childrenAges: src.party.type === "family" || src.party.childrenAges.length ? src.party.childrenAges : [] },
    };
    startSubmit(async () => {
      const r = await submitAction(payload, budget);
      if (r.ok) router.push("/viaje");
      else {
        setSubmitError(r.error);
        if (r.fields) {
          const mapped: Record<string, string> = {};
          for (const [path, msg] of Object.entries(r.fields)) mapped[displayKey(path)] ??= friendly(msg, stepOfField(path));
          showErrors(mapped);
        }
      }
    });
  }

  const S = STEPS[step];
  const errorSteps = new Set(Object.keys(errors).map(stepOfField));
  const stepErrors = Object.entries(errors).filter(([k]) => stepOfField(k) === S.key);

  if (submitting) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center" role="status" aria-live="polite">
        <Loader2 className="h-10 w-10 animate-spin text-teal-brand" aria-hidden />
        <h1 className="mt-6 text-2xl font-semibold">Estamos diseñando tu viaje</h1>
        <p className="mt-2 text-muted">{LOADING_MESSAGES[loadingMsg]}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 sm:px-6">
      {proposalExists && (
        <Notice className="mb-4">
          Ya tenés una propuesta generada. Si cambiás tus respuestas, vamos a recalcularla y guardar una nueva versión.{" "}
          <a href="/viaje" className="font-semibold underline">
            Ver mi propuesta
          </a>{" "}
          o{" "}
          <button type="button" onClick={startOver} className="font-semibold underline">
            empezá un viaje nuevo
          </button>
          .
        </Notice>
      )}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted">
          <span>
            Paso {step + 1} de {STEPS.length}
            <span aria-live="polite" className="ml-2 font-normal">
              {saved === "saving" ? "· Guardando…" : saved === "saved" ? "· Guardado" : saved === "error" ? "· No se pudo guardar" : ""}
            </span>
          </span>
          <button type="button" onClick={startOver} disabled={resetting} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-sand-2 disabled:opacity-50">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {resetting ? "Limpiando…" : "Empezar de cero"}
          </button>
        </div>
        <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Pasos del cuestionario">
          {STEPS.map((x, i) => (
            <li key={x.key}>
              <button
                type="button"
                title={i <= maxReached ? `Ir a: ${x.title}` : x.title}
                aria-label={`Paso ${i + 1}: ${x.title}`}
                aria-current={i === step ? "step" : undefined}
                disabled={i > maxReached || i === step}
                onClick={() => {
                  if (STEPS[i].key === "smart") setQuestions(null);
                  setStep(i);
                }}
                className={cx(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-transform enabled:hover:scale-110 disabled:cursor-default sm:h-8 sm:w-8",
                  errorSteps.has(x.key)
                    ? "border-danger bg-danger/10 text-danger"
                    : i < step
                      ? "stamp -rotate-6 border-teal-brand bg-teal-brand/10 text-base"
                      : i === step
                        ? "border-teal-brand bg-white text-teal-brand"
                        : i <= maxReached
                          ? "border-teal-brand bg-teal-brand/10 text-base"
                          : "border-dashed border-line bg-white text-muted",
                )}
              >
                {errorSteps.has(x.key) ? "!" : i !== step && i <= maxReached ? x.emoji : i + 1}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold outline-none sm:text-4xl">
        {S.title}
      </h1>
      <p className="mt-2 text-muted">{S.subtitle}</p>
      {stepErrors.length > 0 && (
        <Notice tone="danger" className="mt-4">
          <b>Revisá este paso:</b> {stepErrors.map(([, m]) => m).join(" ")}
        </Notice>
      )}

      <div className="mt-8 fade-in" key={S.key}>
        {S.key === "style" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TRIP_STYLE_DEFS.map((s) => {
                const on = a.tripStyles.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("tripStyles", toggle(a.tripStyles, s.id))}
                    className={cx(
                      "relative flex flex-col items-start gap-2 rounded-2xl border bg-white p-4 text-left transition-all",
                      on ? cx("border-2 shadow-soft", ACCENTS[s.accent].border) : "border-line hover:border-navy/30",
                    )}
                  >
                    <span className={cx("flex h-11 w-11 items-center justify-center rounded-xl text-2xl", ACCENTS[s.accent].soft, on && "pop")} aria-hidden>
                      {s.emoji}
                    </span>
                    <span className="font-display text-[15px] font-semibold leading-tight text-navy">{s.label}</span>
                    <span className="text-xs text-muted">{s.hint}</span>
                    {on && <Check className={cx("absolute right-3 top-3 h-5 w-5", ACCENTS[s.accent].text)} aria-hidden />}
                  </button>
                );
              })}
            </div>
            <Field label="O contanos tu idea con tus palabras" hint="Por ejemplo: «Quiero 14 días de playa con agua turquesa y buena comida» o «Ya conozco Madrid y Roma, quiero algo distinto»." htmlFor="dream" error={errors.style}>
              <textarea id="dream" rows={4} maxLength={1500} className={inputClass} value={a.dreamText ?? ""} onChange={(e) => set("dreamText", e.target.value)} placeholder="Imaginá tu viaje ideal…" />
            </Field>
            {(reading_ || (reading && readingFor === dreamText && reading.chips.length > 0)) && (
              <div className="rounded-2xl border border-teal-brand/40 bg-teal-brand/5 p-4" aria-live="polite">
                {reading_ && !reading ? (
                  <p className="text-sm text-muted">✨ Leyendo tu idea…</p>
                ) : reading ? (
                  <>
                    <p className="text-sm font-semibold text-navy">✨ Esto es lo que entendimos:</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {reading.chips.map((c) => (
                        <span key={c} className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-navy shadow-soft">
                          {c}
                        </span>
                      ))}
                    </div>
                    {reading.enough ? (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Button onClick={() => submit(applyReading(a, reading.reading))}>
                          Ver mis propuestas ahora <Sparkles className="h-4 w-4" aria-hidden />
                        </Button>
                        <span className="text-sm text-muted">o tocá «Siguiente» para afinar con más preguntas (opcional).</span>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted">Contanos un poco más (adónde o qué tipo de viaje) o seguí con las preguntas.</p>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        )}

        {S.key === "game" && (
          <div className="space-y-3">
            {THIS_OR_THAT.map((q) => {
              const cur = a.extra[q.id];
              const pick = (v: string) => set("extra", { ...a.extra, [q.id]: cur === v ? "" : v });
              const opt = (side: "a" | "b") => {
                const o = q[side];
                const on = cur === side;
                return (
                  <button type="button" aria-pressed={on} onClick={() => pick(side)} className={cx("flex flex-col items-center gap-1 rounded-2xl border bg-white p-3 text-center font-semibold text-navy transition-transform active:scale-95", on ? "border-2 border-teal-brand bg-teal-brand/10 shadow-soft" : "border-line")}>
                    <span className={cx("text-3xl leading-none", on && "pop")} aria-hidden>
                      {o.emoji}
                    </span>
                    {o.label}
                  </button>
                );
              };
              return (
                <div key={q.id} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                  {opt("a")}
                  <button type="button" aria-pressed={cur === "both"} onClick={() => pick("both")} className={cx("col-span-2 row-start-2 justify-self-center rounded-full border px-3 py-1 text-xs font-bold sm:col-span-1 sm:row-start-1 sm:col-start-2", cur === "both" ? "border-purple-brand bg-purple-brand text-white" : "border-line bg-sand-2 text-muted")}>
                    ¡Los dos!
                  </button>
                  {opt("b")}
                </div>
              );
            })}
            <p className="text-sm text-muted">
              {THIS_OR_THAT.filter((q) => a.extra[q.id]).length} de {THIS_OR_THAT.length} respondidas
            </p>
          </div>
        )}

        {S.key === "dates" && (
          <div className="space-y-6">
            <div className="inline-flex flex-wrap gap-2 rounded-2xl bg-sand-2 p-1" role="tablist" aria-label="Tipo de fecha">
              {(
                [
                  ["exact", "Tengo fechas"],
                  ["month", "Sé el mes o la temporada"],
                  ["unknown", "Todavía no sé"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" role="tab" aria-selected={a.dates.mode === v} onClick={() => set("dates", { ...a.dates, mode: v })} className={cx("rounded-xl px-4 py-2 text-sm font-semibold", a.dates.mode === v ? "bg-white text-navy shadow-soft" : "text-muted")}>
                  {l}
                </button>
              ))}
            </div>
            {a.dates.mode === "exact" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Salida" htmlFor="dep">
                  <input id="dep" type="date" className={inputClass} value={a.dates.departure ?? ""} min={new Date().toISOString().slice(0, 10)} onChange={(e) => {
                      const departure = e.target.value;
                      // Regreso sugerido con la misma duración (o una semana), para no buscarlo desde cero en el calendario.
                      const keep = a.dates.departure && a.dates.return && a.dates.return > a.dates.departure ? Math.round((Date.parse(a.dates.return) - Date.parse(a.dates.departure)) / 86400000) : a.dates.nights || 7;
                      const moveReturn = departure && (!a.dates.return || a.dates.return <= departure || !!a.dates.departure);
                      set("dates", { ...a.dates, departure, return: moveReturn ? new Date(Date.parse(departure) + keep * 86400000).toISOString().slice(0, 10) : a.dates.return });
                    }}
                  />
                </Field>
                <Field label="Regreso" htmlFor="ret">
                  <input id="ret" type="date" className={inputClass} value={a.dates.return ?? ""} min={a.dates.departure} onChange={(e) => set("dates", { ...a.dates, return: e.target.value })} />
                </Field>
                {nightsFromDates !== null && nightsFromDates > 0 && <p className="text-sm text-muted sm:col-span-2">{nightsFromDates} noches de viaje.</p>}
              </div>
            )}
            {a.dates.mode === "month" && (
              <Field label="¿En qué meses podrías viajar?" hint="Podés elegir varios.">
                <div className="flex flex-wrap gap-2">
                  {MONTHS_ES.map((m, i) => {
                    const on = a.dates.months?.includes(i + 1);
                    return (
                      <button key={m} type="button" aria-pressed={on} onClick={() => set("dates", { ...a.dates, months: toggle(a.dates.months ?? [], i + 1).sort((x, y) => x - y) })} className={cx("rounded-full border px-3.5 py-2 text-sm font-semibold capitalize", on ? "border-teal-brand bg-teal-brand text-white" : "border-line bg-white text-navy")}>
                        {m}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
            {a.dates.mode !== "exact" && (
              <Field label="¿Cuántas noches te gustaría viajar?" hint="Si no lo sabés, dejalo vacío y te sugerimos una duración." htmlFor="nights" error={errors.nights}>
                <input id="nights" type="number" min={1} max={90} inputMode="numeric" className={cx(inputClass, "max-w-40")} value={a.dates.nights ?? ""} onChange={(e) => set("dates", { ...a.dates, nights: e.target.value ? Number(e.target.value) : undefined })} />
              </Field>
            )}
            <Field
              label="Flexibilidad de fechas"
              hint="¿Cuánto podrías mover el viaje? Indica cuántos días antes o después de lo elegido podrías salir y volver. Con más flexibilidad suele ser más fácil conseguir mejores vuelos, precios y clima."
            >
              <div className="flex flex-wrap gap-2">
                {[
                  [0, "Fechas fijas"],
                  [3, "± 3 días"],
                  [7, "± 1 semana"],
                  [30, "± 1 mes"],
                  [120, "Totalmente flexible"],
                ].map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={a.dates.flexibilityDays === v} onClick={() => set("dates", { ...a.dates, flexibilityDays: v as number })} className={cx("rounded-full border px-3.5 py-2 text-sm font-semibold", a.dates.flexibilityDays === v ? "border-navy bg-navy text-white" : "border-line bg-white text-navy")}>
                    {l}
                  </button>
                ))}
              </div>
              {a.dates.flexibilityDays !== undefined && FLEX_HELP[a.dates.flexibilityDays] && (
                <p className="mt-2 rounded-xl bg-sand-2 px-3 py-2 text-sm text-navy">
                  💡 {FLEX_HELP[a.dates.flexibilityDays]}
                  {a.dates.mode === "exact" && a.dates.departure && a.dates.flexibilityDays > 0 && a.dates.flexibilityDays <= 30 && (
                    <> Por ejemplo: salida entre el {shiftDate(a.dates.departure, -a.dates.flexibilityDays)} y el {shiftDate(a.dates.departure, a.dates.flexibilityDays)}.</>
                  )}
                </p>
              )}
            </Field>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!a.dates.canExtend} onChange={(e) => set("dates", { ...a.dates, canExtend: e.target.checked })} /> Podría extender el viaje
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!a.dates.canShorten} onChange={(e) => set("dates", { ...a.dates, canShorten: e.target.checked })} /> Podría acortarlo
              </label>
            </div>
            {errors.dates && <p className="text-sm font-semibold text-danger">{errors.dates}</p>}
          </div>
        )}

        {S.key === "origin" && (
          <div className="space-y-6">
            <Field label="Ciudad o aeropuerto de salida" hint="Escribí la ciudad, el país o el código del aeropuerto (por ejemplo: Córdoba, Montevideo o EZE)." htmlFor="origin-search" error={errors.origin}>
              <div className="rounded-xl border border-line bg-white px-2 py-1">
                <PlaceSearch<AirportOption>
                  tipo="aeropuertos"
                  id="origin-search"
                  placeholder="Buscá tu aeropuerto…"
                  keyOf={(x) => x.iata}
                  render={(x) => (
                    <span className="flex items-baseline gap-2">
                      <b className="text-navy">{x.city}</b>
                      <span className="rounded bg-sand-2 px-1.5 text-xs font-bold text-navy">{x.iata}</span>
                      <span className="truncate text-muted">
                        {x.name} · {x.country}
                      </span>
                    </span>
                  )}
                  onPick={(x) => set("origin", { ...a.origin, city: x.city, country: x.country, airport: x.iata, lat: x.lat, lng: x.lng })}
                />
              </div>
            </Field>
            {a.origin.city && (
              <p className="flex flex-wrap items-center gap-2 rounded-xl bg-sand-2 px-3 py-2 text-sm text-navy">
                ✈️ Salís desde <b>{a.origin.city}</b>
                {a.origin.airport ? <span className="rounded bg-white px-1.5 text-xs font-bold">{a.origin.airport}</span> : null}
                <span className="text-muted">· {a.origin.country}</span>
              </p>
            )}
            <Field label="Vuelos">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["direct", "Prefiero directos"],
                    ["few_stops", "Pocas escalas"],
                    ["any", "Me da igual si ahorra"],
                  ] as const
                ).map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={a.origin.flightPref === v} onClick={() => set("origin", { ...a.origin, flightPref: v })} className={cx("rounded-full border px-3.5 py-2 text-sm font-semibold", a.origin.flightPref === v ? "border-navy bg-navy text-white" : "border-line bg-white text-navy")}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!a.origin.altAirportOk} onChange={(e) => set("origin", { ...a.origin, altAirportOk: e.target.checked })} /> Puedo salir de otro aeropuerto
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!a.origin.longLayoverOk} onChange={(e) => set("origin", { ...a.origin, longLayoverOk: e.target.checked })} /> Tolero escalas largas
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={a.origin.overnightOk !== false} onChange={(e) => set("origin", { ...a.origin, overnightOk: e.target.checked })} /> Puedo volar de noche
              </label>
            </div>
          </div>
        )}

        {S.key === "party" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(
                [
                  ["solo", "Solo"],
                  ["couple", "En pareja"],
                  ["friends", "Con amigos"],
                  ["family", "En familia"],
                  ["group", "Grupo organizado"],
                  ["other", "Otro"],
                ] as [PartyType, string][]
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={a.party.type === v}
                  onClick={() => set("party", { ...a.party, type: v, adults: v === "solo" ? 1 : v === "couple" ? 2 : Math.max(a.party.adults, 2) })}
                  className={cx("flex items-center gap-3 rounded-2xl border bg-white p-4 text-left", a.party.type === v ? "border-2 border-coral-brand shadow-soft" : "border-line")}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {PARTY_EMOJI[v]}
                  </span>
                  <span className="font-semibold text-navy">{l}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Adultos" htmlFor="adults">
                <input id="adults" type="number" min={1} max={40} className={inputClass} value={a.party.adults} onChange={(e) => set("party", { ...a.party, adults: Math.max(1, Number(e.target.value) || 1) })} />
              </Field>
              <Field label="Menores" hint="Agregá cada uno con su edad.">
                <div className="flex flex-wrap items-center gap-2">
                  {a.party.childrenAges.map((age, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full border border-line bg-white pl-3 pr-1">
                      <input
                        aria-label={`Edad del menor ${i + 1}`}
                        type="number"
                        min={0}
                        max={17}
                        className="w-12 bg-transparent py-1.5 text-sm outline-none"
                        value={age}
                        onChange={(e) => {
                          const ages = [...a.party.childrenAges];
                          ages[i] = Number(e.target.value);
                          set("party", { ...a.party, childrenAges: ages });
                        }}
                      />
                      <span className="text-xs text-muted">años</span>
                      <button type="button" aria-label="Quitar" className="rounded-full p-1 hover:bg-sand-2" onClick={() => set("party", { ...a.party, childrenAges: a.party.childrenAges.filter((_, j) => j !== i) })}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  <button type="button" onClick={() => set("party", { ...a.party, childrenAges: [...a.party.childrenAges, 8] })} className="inline-flex items-center gap-1 rounded-full border border-dashed border-navy/30 px-3 py-1.5 text-sm font-semibold text-navy">
                    <Plus className="h-4 w-4" /> Agregar
                  </button>
                </div>
              </Field>
            </div>
            <Field label="¿Alguien tiene movilidad reducida o necesidades de accesibilidad?" htmlFor="mob">
              <select id="mob" className={inputClass} value={a.party.mobility ?? "none"} onChange={(e) => set("party", { ...a.party, mobility: e.target.value as "none" | "reduced" | "wheelchair" })}>
                <option value="none">No</option>
                <option value="reduced">Sí, conviene caminar poco</option>
                <option value="wheelchair">Sí, silla de ruedas</option>
              </select>
            </Field>
            {errors.party && <p className="text-sm font-semibold text-danger">{errors.party}</p>}
          </div>
        )}

        {S.key === "budget" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="¿Con qué presupuesto contás?" hint="Aproximado y opcional. Solo lo ve el equipo de VIORA para ajustar la propuesta." htmlFor="amount" error={errors.budget}>
                <input id="amount" inputMode="decimal" className={inputClass} value={budgetAmount.amount} onChange={(e) => setBudgetAmount({ ...budgetAmount, amount: e.target.value.replace(/[^\d.,]/g, "") })} placeholder="Ej.: 3000" />
              </Field>
              <Field label="Moneda" htmlFor="cur">
                <select id="cur" className={inputClass} value={budgetAmount.currency} onChange={(e) => setBudgetAmount({ ...budgetAmount, currency: e.target.value as "USD" | "ARS" | "EUR" })}>
                  <option value="USD">Dólares</option>
                  <option value="ARS">Pesos argentinos</option>
                  <option value="EUR">Euros</option>
                </select>
              </Field>
              <Field label="El monto es" htmlFor="per">
                <select id="per" className={inputClass} value={budgetAmount.per} onChange={(e) => setBudgetAmount({ ...budgetAmount, per: e.target.value as "person" | "group" })}>
                  <option value="person">Por persona</option>
                  <option value="group">Para todo el grupo</option>
                </select>
              </Field>
            </div>
            <p className="text-sm font-semibold text-navy">¿Qué nivel de viaje buscás?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {BUDGET_TIER_DEFS.map((t) => (
                <button key={t.id} type="button" aria-pressed={a.budget.tier === t.id} onClick={() => set("budget", { ...a.budget, tier: t.id })} className={cx("flex items-start gap-3 rounded-2xl border bg-white p-4 text-left", a.budget.tier === t.id ? "border-2 border-orange-brand shadow-soft" : "border-line")}>
                  <span className="text-2xl leading-none" aria-hidden>
                    {t.emoji}
                  </span>
                  <span>
                    <span className="block font-semibold text-navy">{t.label}</span>
                    <span className="text-sm text-muted">{t.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <Notice>El nivel se interpreta según la región y la duración: un mismo monto rinde distinto en el Caribe, en Brasil o en Europa. Esta información es solo para orientar la propuesta.</Notice>
            <Field label="¿Qué debería incluir?">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["flights", "Vuelos internacionales"],
                    ["lodging", "Alojamiento"],
                    ["meals", "Comidas"],
                    ["activities", "Excursiones y entradas"],
                    ["transport", "Transporte interno"],
                    ["insurance", "Seguro de viaje"],
                  ] as const
                ).map(([k, l]) => {
                  const on = !!a.budget.includes?.[k];
                  return (
                    <button key={k} type="button" aria-pressed={on} onClick={() => set("budget", { ...a.budget, includes: { ...a.budget.includes, [k]: !on } })} className={cx("rounded-full border px-3.5 py-2 text-sm font-semibold", on ? "border-teal-brand bg-teal-brand/10 text-teal-brand" : "border-line bg-white text-navy")}>
                      {on && <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden />}
                      {l}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="¿Tenés flexibilidad para mejorar la experiencia?" htmlFor="flex">
              <select id="flex" className={inputClass} value={a.budget.flexibility ?? "some"} onChange={(e) => set("budget", { ...a.budget, flexibility: e.target.value as "none" | "some" | "high" })}>
                <option value="none">No, es un tope</option>
                <option value="some">Algo, si vale la pena</option>
                <option value="high">Sí, bastante</option>
              </select>
            </Field>
          </div>
        )}

        {S.key === "priorities" && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {PRIORITY_DEFS.map((p) => {
                const on = a.priorities.selected.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const selected = toggle(a.priorities.selected, p.id);
                      set("priorities", {
                        selected,
                        ranking: on ? a.priorities.ranking.filter((x) => x !== p.id) : [...a.priorities.ranking, p.id],
                        mustHave: a.priorities.mustHave.filter((x) => selected.includes(x)),
                      });
                    }}
                    className={cx("rounded-full border px-3.5 py-2 text-sm font-semibold", on ? "border-purple-brand bg-purple-brand text-white" : "border-line bg-white text-navy")}
                  >
                    <span aria-hidden>{p.emoji}</span> {p.label}
                  </button>
                );
              })}
            </div>
            {a.priorities.ranking.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-navy">Ordená tus prioridades (la primera es la más importante) y marcá hasta 3 indispensables:</p>
                <ol className="space-y-2">
                  {a.priorities.ranking.map((id, i) => {
                    const def = PRIORITY_DEFS.find((p) => p.id === id)!;
                    const must = a.priorities.mustHave.includes(id);
                    const move = (dir: -1 | 1) => {
                      const r = [...a.priorities.ranking];
                      const j = i + dir;
                      if (j < 0 || j >= r.length) return;
                      [r[i], r[j]] = [r[j], r[i]];
                      set("priorities", { ...a.priorities, ranking: r });
                    };
                    return (
                      <li key={id} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2">
                        <span className="w-6 font-display text-lg text-purple-brand">{i + 1}</span>
                        <span className="flex-1 text-sm font-semibold text-navy">
                          <span aria-hidden>{def.emoji}</span> {def.label}
                        </span>
                        <button
                          type="button"
                          aria-pressed={must}
                          disabled={!must && a.priorities.mustHave.length >= 3}
                          onClick={() => set("priorities", { ...a.priorities, mustHave: toggle(a.priorities.mustHave, id as Priority) })}
                          className={cx("rounded-full px-2.5 py-1 text-xs font-bold disabled:opacity-40", must ? "bg-coral-brand text-white" : "bg-sand-2 text-navy")}
                        >
                          {must ? "Indispensable" : "Marcar indispensable"}
                        </button>
                        <button type="button" aria-label="Subir" onClick={() => move(-1)} className="rounded-lg p-1.5 hover:bg-sand-2">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button type="button" aria-label="Bajar" onClick={() => move(1)} className="rounded-lg p-1.5 hover:bg-sand-2">
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        )}

        {S.key === "history" && (
          <div className="space-y-6">
            <TagInput label="Lugares que ya visitaste" hint="Ciudades, países o regiones." values={a.history.visited} onChange={(v) => set("history", { ...a.history, visited: v })} />
            <TagInput label="Los que más te gustaron" values={a.history.loved} onChange={(v) => set("history", { ...a.history, loved: v })} />
            <TagInput label="Lugares a los que no volverías" values={a.history.wouldNotReturn} onChange={(v) => set("history", { ...a.history, wouldNotReturn: v })} />
            <TagInput label="Destinos pendientes que te gustaría conocer" values={a.history.pending} onChange={(v) => set("history", { ...a.history, pending: v })} />
            <TagInput label="Lugares que preferís evitar" values={a.history.avoid} onChange={(v) => set("history", { ...a.history, avoid: v })} />
            <Field label="¿Qué experiencias te gustaría repetir?" htmlFor="repeat">
              <input id="repeat" className={inputClass} maxLength={400} value={a.history.repeatExperiences ?? ""} onChange={(e) => set("history", { ...a.history, repeatExperiences: e.target.value })} placeholder="Ej.: navegar, comer en mercados, hacer trekking…" />
            </Field>
            {!a.history.visited.length && <p className="text-sm text-muted">¿Es tu primer gran viaje? Perfecto: armamos una primera experiencia desde cero.</p>}
          </div>
        )}

        {S.key === "stay" && (
          <div className="space-y-6">
            <Field label="Tipo de alojamiento que preferís" hint="Podés elegir varios.">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(LODGING_LABELS) as LodgingType[]).map((k) => {
                  const on = a.stay.lodgingTypes.includes(k);
                  return (
                    <button key={k} type="button" aria-pressed={on} onClick={() => set("stay", { ...a.stay, lodgingTypes: toggle(a.stay.lodgingTypes, k) })} className={cx("rounded-full border px-3.5 py-2 text-sm font-semibold", on ? "border-cyan-brand bg-cyan-brand text-white" : "border-line bg-white text-navy")}>
                      <span aria-hidden>{LODGING_EMOJI[k]}</span> {LODGING_LABELS[k]}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Medios de transporte que te resultan cómodos">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TRANSPORT_LABELS) as TransportMode[]).map((k) => {
                  const on = a.stay.transport.includes(k);
                  return (
                    <button key={k} type="button" aria-pressed={on} onClick={() => set("stay", { ...a.stay, transport: toggle(a.stay.transport, k) })} className={cx("rounded-full border px-3.5 py-2 text-sm font-semibold", on ? "border-cyan-brand bg-cyan-brand text-white" : "border-line bg-white text-navy")}>
                      <span aria-hidden>{TRANSPORT_EMOJI[k]}</span> {TRANSPORT_LABELS[k]}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="En el alojamiento, ¿qué priorizás?" htmlFor="lp">
              <select id="lp" className={inputClass} value={a.stay.lodgingPriority ?? "location"} onChange={(e) => set("stay", { ...a.stay, lodgingPriority: e.target.value as IntakeAnswers["stay"]["lodgingPriority"] })}>
                <option value="price">Precio</option>
                <option value="location">Ubicación</option>
                <option value="comfort">Comodidad</option>
                <option value="views">Vistas</option>
                <option value="services">Servicios (pileta, spa, etc.)</option>
                <option value="experience">Que sea una experiencia en sí</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!a.stay.noCarRental} onChange={(e) => set("stay", { ...a.stay, noCarRental: e.target.checked })} /> No quiero alquilar auto
            </label>
          </div>
        )}

        {S.key === "smart" && (
          <div className="space-y-6">
            {questions === null && (
              <p className="flex items-center gap-2 text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Pensando qué más necesitamos saber…
              </p>
            )}
            {questions?.length === 0 && <Notice tone="success">¡Listo! Con lo que nos contaste ya podemos armar tus alternativas.</Notice>}
            {questions?.map((q) => {
              const cur = a.extra[q.id];
              return (
                <Field key={q.id} label={q.text} hint={q.hint}>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((o) => {
                      const on = q.multi ? Array.isArray(cur) && cur.includes(o.value) : cur === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          aria-pressed={on}
                          onClick={() => {
                            const value = q.multi ? toggle(Array.isArray(cur) ? cur : [], o.value) : o.value;
                            set("extra", { ...a.extra, [q.id]: value });
                          }}
                          className={cx("rounded-full border px-3.5 py-2 text-sm font-semibold", on ? "border-teal-brand bg-teal-brand text-white" : "border-line bg-white text-navy")}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              );
            })}
            {submitError && <Notice tone="danger">{submitError}</Notice>}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Atrás
          </Button>
          {Object.keys(errors).length > 0 && <p className="hidden text-sm font-semibold text-danger sm:block">Revisá lo marcado en rojo</p>}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Siguiente <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={() => submit()} disabled={questions === null}>
              Ver mis alternativas <Sparkles className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TagInput({ label, hint, values, onChange }: { label: string; hint?: string; values: string[]; onChange: (v: string[]) => void }) {
  const id = useMemo(() => `t-${label.replace(/\W/g, "").slice(0, 12)}`, [label]);
  const add = (raw: string) => {
    const v = raw.trim();
    if (v && !values.includes(v) && values.length < 40) onChange([...values, v]);
  };
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-sand-2 py-1 pl-3 pr-1 text-sm font-semibold text-navy">
            {v}
            <button type="button" aria-label={`Quitar ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="rounded-full p-1 hover:bg-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <PlaceSearch<PlaceOption>
          tipo="lugares"
          id={id}
          className="min-w-40 flex-1"
          placeholder={values.length ? "Agregá otro…" : "Empezá a escribir una ciudad o país…"}
          keyOf={(x) => `${x.kind}:${x.label}:${x.detail ?? ""}`}
          render={(x) => (
            <span>
              <b className="text-navy">{x.label}</b> <span className="text-muted">· {x.kind === "country" ? "País" : x.detail}</span>
            </span>
          )}
          onPick={(x) => add(x.label)}
          onEnterText={add}
        />
      </div>
    </Field>
  );
}
