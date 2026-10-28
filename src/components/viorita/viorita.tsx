"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Send, X } from "lucide-react";
import { cx } from "@/components/ui";
import { sendVioritaAction, startVioritaAction, vioritaStateAction } from "./actions";

type Msg = { role: "user" | "assistant"; content: string };

const HELLO = "¡Hola! Soy Viorita 👋 ¿Te ayudo a planear tu próximo viaje?";

/** Asistente flotante: abajo a la derecha. Toma nombre, email y WhatsApp (con permiso) y responde con IA. */
export function Viorita() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
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
    }, 7000);
    vioritaStateAction()
      .then((s) => {
        if (!alive) return;
        setStarted(s.started);
        setMessages(s.messages);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  const close = () => {
    setOpen(false);
    setTeaser(false);
    try {
      sessionStorage.setItem("viorita-teaser", "1");
    } catch {}
  };

  const begin = (fd: FormData) => {
    setError(null);
    start(async () => {
      const r = await startVioritaAction({
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        consent: fd.get("consent") === "on",
        message: fd.get("message"),
        page: path,
      });
      if (!r.ok) return setError(r.error);
      setStarted(true);
      setMessages(r.state.messages);
    });
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: t }]);
    start(async () => {
      const r = await sendVioritaAction(t);
      if (!r.ok) return setError(r.error ?? "No pudimos enviar tu mensaje.");
      setMessages((m) => [...m, { role: "assistant", content: r.reply! }]);
    });
  };

  return (
    <div className={cx("no-print fixed right-3 z-50 flex flex-col items-end gap-2 sm:right-5", aboveNav ? "bottom-24" : "bottom-4 sm:bottom-5")}>
      {open && (
        <section role="dialog" aria-label="Chat con Viorita" className="flex max-h-[min(75vh,620px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-lift">
          <header className="flex items-center gap-3 bg-navy px-4 py-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl" aria-hidden>
              🤖
            </span>
            <div className="flex-1">
              <p className="font-display text-lg leading-tight text-white">Viorita</p>
              <p className="text-xs text-white/80">Asistente de VIORA TRAVEL</p>
            </div>
            <button type="button" onClick={close} aria-label="Cerrar chat" className="rounded-full p-1.5 hover:bg-white/15">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-sand p-4 text-sm">
            <Bubble role="assistant">{HELLO}</Bubble>
            {!started && loaded ? (
              <form action={begin} className="space-y-2 rounded-2xl bg-white p-3 shadow-soft">
                <p className="text-sm text-navy">Para que un asesor pueda seguir tu consulta, dejame tus datos:</p>
                <input name="name" required maxLength={80} placeholder="Tu nombre" autoComplete="name" className="w-full rounded-xl border border-line px-3 py-2" />
                <input name="email" type="email" maxLength={120} placeholder="Email" autoComplete="email" className="w-full rounded-xl border border-line px-3 py-2" />
                <input name="phone" type="tel" maxLength={30} placeholder="WhatsApp (ej.: +54 9 11 1234 5678)" autoComplete="tel" className="w-full rounded-xl border border-line px-3 py-2" />
                <textarea name="message" required maxLength={800} rows={2} placeholder="¿En qué te puedo ayudar?" className="w-full rounded-xl border border-line px-3 py-2" />
                <label className="flex items-start gap-2 text-xs text-muted">
                  <input name="consent" type="checkbox" required className="mt-0.5" /> Acepto que VIORA TRAVEL me contacte por email o WhatsApp sobre mi consulta (ver{" "}
                  <a href="/privacidad" className="underline">
                    privacidad
                  </a>
                  ).
                </label>
                <button type="submit" disabled={pending} className="w-full rounded-full bg-navy px-4 py-2.5 font-semibold text-white disabled:opacity-60">
                  {pending ? "Enviando…" : "Empezar a chatear"}
                </button>
              </form>
            ) : (
              messages.map((m, i) => (
                <Bubble key={i} role={m.role}>
                  {m.content}
                </Bubble>
              ))
            )}
            {pending && started && <Bubble role="assistant">Escribiendo…</Bubble>}
            {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-danger">{error}</p>}
            <div ref={endRef} />
          </div>
          {started && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t border-line p-2"
            >
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={800} placeholder="Escribí tu mensaje…" aria-label="Mensaje para Viorita" className="flex-1 rounded-full border border-line px-4 py-2 text-sm" />
              <button type="submit" disabled={pending || !text.trim()} aria-label="Enviar" className="rounded-full bg-teal-brand p-2.5 text-white disabled:opacity-50">
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </form>
          )}
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

function Bubble({ role, children }: { role: Msg["role"]; children: React.ReactNode }) {
  return (
    <div className={cx("flex", role === "user" ? "justify-end" : "justify-start")}>
      <p className={cx("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2", role === "user" ? "rounded-br-sm bg-teal-brand text-white" : "rounded-bl-sm bg-white text-ink shadow-soft")}>{children}</p>
    </div>
  );
}
