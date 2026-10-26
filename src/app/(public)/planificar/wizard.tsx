"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Baby,
  Building2,
  Check,
  Compass,
  Gem,
  Heart,
  Landmark,
  Loader2,
  Mountain,
  Palmtree,
  Plus,
  Route,
  Ship,
  ShoppingBag,
  Sparkles,
  Star,
  Tent,
  TrainFront,
  User,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
  Castle,
  Globe2,
} from "lucide-react";
import {
  BUDGET_TIER_DEFS,
  LODGING_LABELS,
  MONTHS_ES,
  ORIGIN_CITIES,
  PRIORITY_DEFS,
  TRANSPORT_LABELS,
  TRIP_STYLE_DEFS,
} from "@/core/catalog";
import type { SmartQuestion } from "@/core/questions";
import type { IntakeAnswers, LodgingType, PartyType, Priority, TransportMode, TripStyle } from "@/core/types";
import { ACCENTS, Button, Field, Notice, cx, inputClass } from "@/components/ui";
import { saveDraftAction, smartQuestionsAction, submitAction } from "./actions";

const STYLE_ICONS: Record<TripStyle, typeof Palmtree> = {
  beach_relax: Palmtree,
  eurotrip: TrainFront,
  big_cities: Building2,
  nature_adventure: Mountain,
  romantic: Heart,
  honeymoon: Gem,
  family: Baby,
  theme_parks: Castle,
  culture_history: Landmark,
  gastronomy: UtensilsCrossed,
  luxury: Star,
  backpacker: Tent,
  cruise: Ship,
  shopping: ShoppingBag,
  exotic: Globe2,
  road_trip: Route,
  mixed: Sparkles,
  discover: Compass,
};

const STEPS = [
  { key: "style", title: "¿Qué tipo de viaje soñás?", subtitle: "Elegí uno o varios estilos, o contalo con tus palabras." },
  { key: "dates", title: "¿Cuándo querés viajar?", subtitle: "Si todavía no tenés fechas, no pasa nada: exploramos temporadas." },
  { key: "origin", title: "¿Desde dónde salís?", subtitle: "Nos ayuda a estimar tiempos de vuelo y conexiones." },
  { key: "party", title: "¿Con quién viajás?", subtitle: "Solo lo necesario para adaptar el plan." },
  { key: "budget", title: "¿Cuál es tu presupuesto?", subtitle: "Es una orientación inicial, no una cotización." },
  { key: "priorities", title: "¿Qué cosas son importantes para vos?", subtitle: "Elegí, ordená y marcá lo indispensable." },
  { key: "history", title: "¿Qué destinos ya conocés?", subtitle: "Así evitamos recomendarte lo mismo de siempre." },
  { key: "stay", title: "Alojamiento y traslados", subtitle: "Contanos cómo te gusta viajar." },
  { key: "smart", title: "Unas últimas preguntas", subtitle: "Solo las que pueden cambiar la recomendación." },
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

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

const LOADING_MESSAGES = ["Analizando tu perfil de viajero…", "Comparando destinos y temporadas…", "Evaluando logística y tiempos de traslado…", "Armando el itinerario día por día…", "Revisando que todo sea coherente…"];

export function Wizard({
  initial,
  initialStep,
  preselect,
  suggestions,
  hasProposal,
}: {
  initial: Partial<IntakeAnswers> | null;
  initialStep: number;
  preselect?: TripStyle;
  suggestions: string[];
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
    if (STEPS[step + 1]?.key === "smart") setQuestions(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function submit() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitError(null);
    const amount = Number(budgetAmount.amount.replace(/\./g, "").replace(",", "."));
    const budget = amount > 0 ? { amount, currency: budgetAmount.currency, per: budgetAmount.per } : undefined;
    const payload: IntakeAnswers = {
      ...a,
      dates: a.dates.mode === "exact" ? { ...a.dates, months: undefined, nights: undefined } : { ...a.dates, departure: undefined, return: undefined },
      party: { ...a.party, childrenAges: a.party.type === "family" || a.party.childrenAges.length ? a.party.childrenAges : [] },
    };
    startSubmit(async () => {
      const r = await submitAction(payload, budget);
      if (r.ok) router.push("/viaje");
      else {
        setSubmitError(r.error);
        if (r.fields) setErrors(r.fields);
      }
    });
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const S = STEPS[step];

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
      {hasProposal && (
        <Notice className="mb-4">
          Ya tenés una propuesta generada. Si cambiás tus respuestas, vamos a recalcularla y guardar una nueva versión.{" "}
          <a href="/viaje" className="font-semibold underline">
            Ver mi propuesta
          </a>
        </Notice>
      )}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-muted">
          <span>
            Paso {step + 1} de {STEPS.length}
          </span>
          <span aria-live="polite">{saved === "saving" ? "Guardando…" : saved === "saved" ? "Guardado" : saved === "error" ? "No se pudo guardar" : ""}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sand-2" aria-hidden>
          <div className="h-full rounded-full bg-teal-brand transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold outline-none sm:text-4xl">
        {S.title}
      </h1>
      <p className="mt-2 text-muted">{S.subtitle}</p>

      <div className="mt-8 fade-in" key={S.key}>
        {S.key === "style" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TRIP_STYLE_DEFS.map((s) => {
                const Icon = STYLE_ICONS[s.id];
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
                    <span className={cx("flex h-10 w-10 items-center justify-center rounded-xl", ACCENTS[s.accent].soft, ACCENTS[s.accent].text)}>
                      <Icon className="h-5 w-5" aria-hidden />
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
                  <input id="dep" type="date" className={inputClass} value={a.dates.departure ?? ""} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set("dates", { ...a.dates, departure: e.target.value })} />
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
            <Field label="Flexibilidad de fechas">
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
            <Field label="Ciudad de salida" htmlFor="city" error={errors.origin}>
              <select
                id="city"
                className={inputClass}
                value={ORIGIN_CITIES.some((c) => c.city === a.origin.city) ? a.origin.city : "__other"}
                onChange={(e) => {
                  const c = ORIGIN_CITIES.find((x) => x.city === e.target.value);
                  set("origin", c ? { ...a.origin, city: c.city, country: c.country, airport: undefined } : { ...a.origin, city: "", country: "" });
                }}
              >
                {ORIGIN_CITIES.map((c) => (
                  <option key={c.city} value={c.city}>
                    {c.city}, {c.country} ({c.airports.join(" / ")})
                  </option>
                ))}
                <option value="__other">Otra ciudad…</option>
              </select>
            </Field>
            {!ORIGIN_CITIES.some((c) => c.city === a.origin.city) && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Ciudad" htmlFor="ocity">
                  <input id="ocity" className={inputClass} value={a.origin.city} onChange={(e) => set("origin", { ...a.origin, city: e.target.value })} />
                </Field>
                <Field label="País" htmlFor="ocountry">
                  <input id="ocountry" className={inputClass} value={a.origin.country} onChange={(e) => set("origin", { ...a.origin, country: e.target.value })} />
                </Field>
                <Field label="Aeropuerto (código)" hint="Opcional, ej.: COR" htmlFor="oair">
                  <input id="oair" maxLength={3} className={inputClass} value={a.origin.airport ?? ""} onChange={(e) => set("origin", { ...a.origin, airport: e.target.value.toUpperCase() })} />
                </Field>
              </div>
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
                  ["solo", "Solo", User],
                  ["couple", "En pareja", Heart],
                  ["friends", "Con amigos", Users],
                  ["family", "En familia", Baby],
                  ["group", "Grupo organizado", Users],
                  ["other", "Otro", Sparkles],
                ] as [PartyType, string, typeof User][]
              ).map(([v, l, Icon]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={a.party.type === v}
                  onClick={() => set("party", { ...a.party, type: v, adults: v === "solo" ? 1 : v === "couple" ? 2 : Math.max(a.party.adults, 2) })}
                  className={cx("flex items-center gap-3 rounded-2xl border bg-white p-4 text-left", a.party.type === v ? "border-2 border-coral-brand shadow-soft" : "border-line")}
                >
                  <Icon className="h-5 w-5 text-coral-brand" aria-hidden />
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
            <div className="grid gap-3 sm:grid-cols-2">
              {BUDGET_TIER_DEFS.map((t) => (
                <button key={t.id} type="button" aria-pressed={a.budget.tier === t.id} onClick={() => set("budget", { ...a.budget, tier: t.id })} className={cx("flex items-start gap-3 rounded-2xl border bg-white p-4 text-left", a.budget.tier === t.id ? "border-2 border-orange-brand shadow-soft" : "border-line")}>
                  <Wallet className="mt-0.5 h-5 w-5 text-orange-brand" aria-hidden />
                  <span>
                    <span className="block font-semibold text-navy">{t.label}</span>
                    <span className="text-sm text-muted">{t.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <Notice>El nivel se interpreta según la región y la duración: un mismo monto rinde distinto en el Caribe, en Brasil o en Europa. Esta información es solo para orientar la propuesta.</Notice>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Monto aproximado (opcional)" hint="Solo lo ve el equipo de VIORA." htmlFor="amount" error={errors.budget}>
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
                    {p.label}
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
                        <span className="flex-1 text-sm font-semibold text-navy">{def.label}</span>
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
            <TagInput label="Lugares que ya visitaste" hint="Ciudades, países o regiones." values={a.history.visited} onChange={(v) => set("history", { ...a.history, visited: v })} suggestions={suggestions} />
            <TagInput label="Los que más te gustaron" values={a.history.loved} onChange={(v) => set("history", { ...a.history, loved: v })} suggestions={a.history.visited.length ? a.history.visited : suggestions} />
            <TagInput label="Lugares a los que no volverías" values={a.history.wouldNotReturn} onChange={(v) => set("history", { ...a.history, wouldNotReturn: v })} suggestions={suggestions} />
            <TagInput label="Destinos pendientes que te gustaría conocer" values={a.history.pending} onChange={(v) => set("history", { ...a.history, pending: v })} suggestions={suggestions} />
            <TagInput label="Lugares que preferís evitar" values={a.history.avoid} onChange={(v) => set("history", { ...a.history, avoid: v })} suggestions={suggestions} />
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
                      {LODGING_LABELS[k]}
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
                      {TRANSPORT_LABELS[k]}
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

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Atrás
          </Button>
          {Object.keys(errors).length > 0 && <p className="hidden text-sm font-semibold text-danger sm:block">Revisá lo marcado</p>}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Siguiente <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={submit} disabled={questions === null}>
              Ver mis alternativas <Sparkles className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TagInput({ label, hint, values, onChange, suggestions }: { label: string; hint?: string; values: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState("");
  const id = useMemo(() => `t-${label.replace(/\W/g, "").slice(0, 12)}`, [label]);
  const add = () => {
    const v = text.trim();
    if (v && !values.includes(v) && values.length < 40) onChange([...values, v]);
    setText("");
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
        <input
          id={id}
          list={`${id}-list`}
          className="min-w-40 flex-1 bg-transparent px-1 py-1.5 text-[15px] outline-none"
          value={text}
          maxLength={80}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder="Escribí y presioná Enter"
        />
        <datalist id={`${id}-list`}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
    </Field>
  );
}
