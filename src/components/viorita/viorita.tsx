"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, X } from "lucide-react";
import { cx } from "@/components/ui";
import { askVioritaAction, sendVioritaAction, startVioritaAction, vioritaStateAction } from "./actions";

type Msg = { role: "user" | "assistant"; content: string };
type StepKey = "destino" | "cuando" | "quienes" | "presupuesto";

const HELLO = "¡Hola! Soy Viorita 👋 ¿Te ayudo a armar tu próximo viaje?";

/** Charla guiada: una pregunta por vez, con respuestas rápidas y opción de escribir. */
const STEPS: { key: StepKey; ask: string; chips: string[] }[] = [
  {
    key: "destino",
    ask: "¡Arranquemos! ¿A dónde te gustaría viajar? Si todavía no sabés, ¡te ayudo a elegir! ✈️",
    chips: ["🏖️ Caribe y playas", "🇪🇺 Europa", "🏰 Disney / Orlando", "🇺🇸 Estados Unidos", "🇧🇷 Brasil", "🏔️ Argentina", "🌏 Asia", "🤔 No sé todavía"],
  },
  { key: "cuando", ask: "¿Y cuándo te gustaría viajar? 📅", chips: ["Este verano (dic–mar)", "Vacaciones de invierno", "Semana Santa", "En unos meses", "Todavía no sé"] },
  { key: "quienes", ask: "¿Con quién viajás?", chips: ["Solo/a", "En pareja 💑", "En familia con chicos", "Con amigos", "En grupo grande"] },
  { key: "presupuesto", ask: "Última: ¿tenés un presupuesto aproximado por persona? (así te proponemos algo realista)", chips: ["Hasta US$ 1.500", "US$ 1.500 – 3.000", "US$ 3.000 – 5.000", "Más de US$ 5.000", "Prefiero que me asesoren"] },
];

const REACTION: Record<string, string> = {
  "🏖️ Caribe y playas": "¡Playa! 🌴 Hay opciones increíbles según la época: Caribe mexicano, Punta Cana, Aruba, Brasil…",
  "🇪🇺 Europa": "¡Europa! ✨ Y si viajás con un paquete de VIORA, te incluimos la app Europa Go: traductor, mapas sin internet, ubicaciones clave y planificador de gastos.",
  "🏰 Disney / Orlando": "¡Disney! 🏰 Parques, outlets y mucha magia. Te ayudamos con entradas, días y el orden ideal de parques.",
  "🇺🇸 Estados Unidos": "¡Estados Unidos! 🗽 Nueva York, Miami, Orlando, la costa oeste… hay para todos los gustos.",
  "🇧🇷 Brasil": "¡Brasil! 🇧🇷 Playas, caipirinhas y buena onda, cerquita y con muchas opciones.",
  "🏔️ Argentina": "¡Argentina tiene lugares de película! 🏔️ Patagonia, glaciares, Norte, Cataratas…",
  "🌏 Asia": "¡Asia! 🌏 Un viaje inolvidable: Japón, Tailandia, Bali… lo armamos con todo el detalle.",
  "🤔 No sé todavía": "¡Ningún problema! Para eso estamos 😊 Con lo que me cuentes te sugerimos destinos ideales.",
};

const DEST_PLAIN = (s: string) => s.replace(/^[^\p{L}]+/u, "").trim();

export function Viorita() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: HELLO },
    { role: "assistant", content: STEPS[0].ask },
  ]);
  const [step, setStep] = useState(0); // 0..3 preguntas, 4 = oferta, 5 = datos de contacto
  const [trip, setTrip] = useState<Partial<Record<StepKey, string>>>({});
  const [ai, setAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const aboveNav = path?.startsWith("/planificar");

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      try {
        if (!sessionStorage.getItem("viorita-teaser")) setTeaser(true);
      } catch {
        setTeaser(true);
      }
    }, 9000);
    vioritaStateAction()
      .then((s) => {
        if (!alive) return;
        setAi(s.ai);
        if (s.started) {
          setStarted(true);
          setMessages(s.messages);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open, step, pending]);

  const close = () => {
    setOpen(false);
    setTeaser(false);
    try {
      sessionStorage.setItem("viorita-teaser", "1");
    } catch {}
  };

  const say = (...m: Msg[]) => setMessages((x) => [...x, ...m]);

  const answer = (value: string) => {
    const s = STEPS[step];
    if (!s) return;
    const next = { ...trip, [s.key]: s.key === "destino" ? DEST_PLAIN(value) : value };
    setTrip(next);
    const out: Msg[] = [{ role: "user", content: value }];
    if (s.key === "destino") out.push({ role: "assistant", content: REACTION[value] ?? `¡${DEST_PLAIN(value)}! Me encanta 😍` });
    if (step + 1 < STEPS.length) out.push({ role: "assistant", content: STEPS[step + 1].ask });
    else
      out.push({
        role: "assistant",
        content: `¡Genial! Entonces: ${Object.values(next).join(" · ")}. 🙌\n\nHacer un viaje puede ser complicado, pero acompañado es mucho más fácil: dejanos tu idea y un asesor de VIORA te arma un presupuesto personalizado, sin compromiso.`,
      });
    say(...out);
    setStep(step + 1);
  };

  const ask = (q: string) => {
    say({ role: "user", content: q });
    const history = messages.slice(-10);
    start(async () => {
      const r = await askVioritaAction(history, q);
      if (!r.ok) return setError(r.error ?? "No pude responder ahora.");
      say({ role: "assistant", content: r.reply! });
    });
  };

  const onText = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    setError(null);
    if (started) {
      say({ role: "user", content: t });
      start(async () => {
        const r = await sendVioritaAction(t);
        if (!r.ok) return setError(r.error ?? "No pudimos enviar tu mensaje.");
        say({ role: "assistant", content: r.reply! });
      });
    } else if (step < STEPS.length && !(ai && /\?\s*$/.test(t))) answer(t);
    else ask(t);
  };

  const begin = (fd: FormData) => {
    setError(null);
    const tripLabels: Record<string, string> = {};
    if (trip.destino) tripLabels.destino = trip.destino;
    if (trip.cuando) tripLabels.cuando = trip.cuando;
    if (trip.quienes) tripLabels.quienes = trip.quienes;
    if (trip.presupuesto) tripLabels.presupuesto = trip.presupuesto;
    const extra = String(fd.get("message") ?? "").trim();
    const message = [`Quiero un presupuesto personalizado: ${Object.values(tripLabels).join(" · ") || "viaje a definir"}.`, extra].filter(Boolean).join(" ");
    start(async () => {
      const r = await startVioritaAction({ name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"), consent: fd.get("consent") === "on", message, page: path, trip: tripLabels });
      if (!r.ok) return setError(r.error);
      setStarted(true);
      setMessages((m) => [...m, { role: "assistant", content: r.state.messages[r.state.messages.length - 1]?.content ?? "¡Gracias! Un asesor te escribe a la brevedad." }]);
    });
  };

  const chips = !started && step < STEPS.length ? STEPS[step].chips : null;

  return (
    <div className={cx("no-print fixed right-3 z-50 flex flex-col items-end gap-2 sm:right-5", aboveNav ? "bottom-24" : "bottom-4 sm:bottom-5")}>
      {open && (
        <section role="dialog" aria-label="Chat con Viorita" className="flex max-h-[min(78vh,640px)] w-[min(92vw,390px)] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-lift">
          <header className="flex items-center gap-3 bg-navy px-4 py-3 text-white">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl" aria-hidden>
              🤖
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-teal-brand ring-2 ring-navy" />
            </span>
            <div className="flex-1">
              <p className="font-display text-lg leading-tight text-white">Viorita</p>
              <p className="text-xs text-white/80">Asistente de VIORA TRAVEL · en línea</p>
            </div>
            <button type="button" onClick={close} aria-label="Cerrar chat" className="rounded-full p-1.5 hover:bg-white/15">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-sand p-4 text-sm" aria-live="polite">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.content}
              </Bubble>
            ))}
            {pending && <Typing />}
            {chips && !pending && (
              <div className="flex flex-wrap gap-1.5" data-viorita-chips>
                {chips.map((c) => (
                  <button key={c} type="button" onClick={() => answer(c)} className="rounded-full border border-navy/20 bg-white px-3 py-1.5 text-[13px] font-semibold text-navy shadow-soft hover:border-navy">
                    {c}
                  </button>
                ))}
              </div>
            )}
            {!started && step === STEPS.length && (
              <div className="grid gap-2">
                <button type="button" onClick={() => setStep(STEPS.length + 1)} className="rounded-full bg-coral-brand px-4 py-2.5 font-semibold text-white shadow-soft">
                  ¡Sí, quiero mi presupuesto! 🙌
                </button>
                <Link href="/planificar" onClick={close} className="rounded-full border border-navy/20 bg-white px-4 py-2 text-center font-semibold text-navy">
                  Prefiero armarlo yo en la web
                </Link>
              </div>
            )}
            {!started && step > STEPS.length && (
              <form action={begin} className="space-y-2 rounded-2xl bg-white p-3 shadow-soft">
                <p className="text-sm text-navy">¡Buenísimo! ¿Cómo te llamás y por dónde te escribimos?</p>
                <input name="name" required maxLength={80} placeholder="Tu nombre" autoComplete="name" className="w-full rounded-xl border border-line px-3 py-2" />
                <input name="phone" type="tel" maxLength={30} placeholder="WhatsApp (ej.: +54 9 11 1234 5678)" autoComplete="tel" className="w-full rounded-xl border border-line px-3 py-2" />
                <input name="email" type="email" maxLength={120} placeholder="Email (opcional si dejás WhatsApp)" autoComplete="email" className="w-full rounded-xl border border-line px-3 py-2" />
                <textarea name="message" maxLength={500} rows={2} placeholder="¿Algo más? (opcional)" className="w-full rounded-xl border border-line px-3 py-2" />
                <label className="flex items-start gap-2 text-xs text-muted">
                  <input name="consent" type="checkbox" required className="mt-0.5" />
                  <span>
                    Acepto que VIORA TRAVEL me contacte por email o WhatsApp sobre mi viaje (ver{" "}
                    <a href="/privacidad" className="underline">
                      privacidad
                    </a>
                    ).
                  </span>
                </label>
                <button type="submit" disabled={pending} className="w-full rounded-full bg-navy px-4 py-2.5 font-semibold text-white disabled:opacity-60">
                  {pending ? "Enviando…" : "Enviar mi idea de viaje"}
                </button>
              </form>
            )}
            {!started && step < STEPS.length && step > 0 && (
              <button type="button" onClick={() => setStep(STEPS.length + 1)} className="block text-xs font-semibold text-navy underline">
                Saltear y hablar con un asesor
              </button>
            )}
            {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-danger">{error}</p>}
            <div ref={endRef} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onText();
            }}
            className="flex items-center gap-2 border-t border-line p-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={600}
              placeholder={started ? "Escribí tu mensaje…" : step < STEPS.length ? "O escribí tu respuesta…" : "¿Tenés alguna pregunta?"}
              aria-label="Mensaje para Viorita"
              className="min-w-0 flex-1 rounded-full border border-line px-4 py-2 text-[16px] sm:text-sm"
            />
            <button type="submit" disabled={pending || !text.trim()} aria-label="Enviar" className="rounded-full bg-teal-brand p-2.5 text-white disabled:opacity-50">
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </section>
      )}
      {!open && teaser && (
        <button type="button" onClick={() => setOpen(true)} className="pop max-w-64 rounded-2xl rounded-br-sm border border-line bg-white px-4 py-3 text-left text-sm text-navy shadow-lift">
          {HELLO}
        </button>
      )}
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? "Cerrar chat con Viorita" : "Abrir chat con Viorita"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-2xl text-white shadow-lift transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" aria-hidden /> : <span aria-hidden>💬</span>}
      </button>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex justify-start" aria-label="Viorita está escribiendo">
      <p className="flex gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-3 shadow-soft">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </p>
    </div>
  );
}

function Bubble({ role, children }: { role: Msg["role"]; children: React.ReactNode }) {
  return (
    <div className={cx("flex", role === "user" ? "justify-end" : "justify-start")}>
      <p className={cx("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2", role === "user" ? "rounded-br-sm bg-teal-brand text-white" : "rounded-bl-sm bg-white text-ink shadow-soft")}>{children}</p>
    </div>
  );
}
