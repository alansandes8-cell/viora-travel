"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { cx } from "@/components/ui";

/** Evento de instalación de Chrome/Android (no existe en Safari). */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// El navegador avisa una sola vez, temprano: se guarda acá para usarlo cuando la persona toque «Instalar».
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Registra el service worker y escucha el aviso de instalación. Va una vez en el layout raíz. */
export function PwaSetup() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallEvent;
      emit();
    };
    const onInstalled = () => {
      deferred = null;
      emit();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

type Platform = "installed" | "ios" | "prompt" | "other";

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function detect(): Platform {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return deferred ? "prompt" : "other";
}

export function usePlatform(): Platform | null {
  return useSyncExternalStore(subscribe, detect, () => null);
}

/** Botón «Instalar la app». En iPhone muestra los pasos (Safari no permite instalar con un botón). */
export function InstallButton({ className, label = "Instalar la app" }: { className?: string; label?: string }) {
  const platform = usePlatform();
  const [help, setHelp] = useState(false);
  if (!platform || platform === "installed") return null;
  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      emit();
    } else setHelp(true);
  };
  return (
    <>
      <button type="button" onClick={onClick} className={cx("inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-navy px-5 py-2.5 font-semibold text-white hover:bg-navy/90", className)}>
        <Download className="h-4 w-4" aria-hidden /> {label}
      </button>
      {help && <InstallHelp ios={platform === "ios"} onClose={() => setHelp(false)} />}
    </>
  );
}

export function InstallHelp({ ios, onClose }: { ios: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="install-title" className="text-xl font-semibold">
            Instalá VIORA en tu celu
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-1 hover:bg-sand-2">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <InstallSteps ios={ios} />
      </div>
    </div>
  );
}

export function InstallSteps({ ios }: { ios: boolean }) {
  return ios ? (
    <ol className="mt-4 space-y-3 text-sm">
      <li className="flex gap-3">
        <Step n={1} /> <span>Abrí esta página en <b>Safari</b>.</span>
      </li>
      <li className="flex gap-3">
        <Step n={2} />
        <span>
          Tocá <b>Compartir</b> <Share className="inline h-4 w-4 align-[-2px]" aria-label="(ícono de compartir)" /> abajo en la pantalla.
        </span>
      </li>
      <li className="flex gap-3">
        <Step n={3} />
        <span>
          Elegí <b>Agregar a inicio</b> <SquarePlus className="inline h-4 w-4 align-[-2px]" aria-hidden /> y confirmá con <b>Agregar</b>.
        </span>
      </li>
    </ol>
  ) : (
    <ol className="mt-4 space-y-3 text-sm">
      <li className="flex gap-3">
        <Step n={1} /> <span>Abrí esta página en <b>Chrome</b>.</span>
      </li>
      <li className="flex gap-3">
        <Step n={2} /> <span>Tocá el menú <b>⋮</b> arriba a la derecha.</span>
      </li>
      <li className="flex gap-3">
        <Step n={3} /> <span>Elegí <b>Instalar app</b> (o <b>Agregar a la pantalla principal</b>).</span>
      </li>
    </ol>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-brand text-xs font-bold text-white">{n}</span>;
}

/** Aviso discreto en celulares que todavía no tienen la app. Se puede cerrar y no vuelve a aparecer. */
export function InstallBanner() {
  const platform = usePlatform();
  const [closed, setClosed] = useState(false);
  const [help, setHelp] = useState(false);
  const dismissed = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem("viora-install-dismissed") === "1";
      } catch {
        return false;
      }
    },
    () => true,
  );
  if (closed || dismissed || !platform || platform === "installed" || platform === "other") return null;
  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem("viora-install-dismissed", "1");
    } catch {}
  };
  return (
    <div className="no-print fixed bottom-3 left-3 right-20 z-40 flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-soft sm:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
      <p className="flex-1 text-sm leading-tight">
        <b className="block text-navy">Tené VIORA en tu celu</b>
        <span className="text-muted">Tu viaje a un toque, como una app.</span>
      </p>
      <button
        type="button"
        className="rounded-full bg-navy px-3.5 py-2 text-sm font-semibold text-white"
        onClick={async () => {
          if (deferred) {
            await deferred.prompt();
            deferred = null;
            emit();
          } else setHelp(true);
        }}
      >
        Instalar
      </button>
      <button type="button" onClick={close} aria-label="No mostrar más" className="rounded-full p-1 text-muted hover:bg-sand-2">
        <X className="h-4 w-4" aria-hidden />
      </button>
      {help && <InstallHelp ios={platform === "ios"} onClose={() => setHelp(false)} />}
    </div>
  );
}
