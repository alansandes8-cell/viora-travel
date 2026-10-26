"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, Loader2, MessageCircle, Smartphone } from "lucide-react";
import { Button, Notice, inputClass } from "@/components/ui";

export function ShareTools({ shareAction, resumeAction, summary }: { shareAction: () => Promise<{ ok: boolean; url?: string; error?: string }>; resumeAction: () => Promise<string | null>; summary: string }) {
  const [share, setShare] = useState<{ url?: string; error?: string } | null>(null);
  const [resume, setResume] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* el usuario puede copiar manualmente */
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => start(async () => setShare(await shareAction()))}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Crear enlace privado
        </Button>
        <a href="/viaje/pdf" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:border-navy/30">
          Descargar PDF
        </a>
        <a href={`https://wa.me/?text=${encodeURIComponent(summary + (share?.url ? `\n\n${share.url}` : ""))}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1f9d55] px-5 py-2.5 text-sm font-semibold text-white">
          <MessageCircle className="h-4 w-4" aria-hidden /> Compartir por WhatsApp
        </a>
      </div>
      {share?.url && (
        <div className="space-y-2">
          <p className="text-sm text-muted">Enlace de solo lectura, sin precios. Vence automáticamente y la agencia puede revocarlo.</p>
          <div className="flex gap-2">
            <input readOnly className={inputClass} value={share.url} onFocus={(e) => e.target.select()} aria-label="Enlace privado" />
            <Button variant="secondary" onClick={() => copy(share.url!, "share")} aria-label="Copiar enlace">
              <Copy className="h-4 w-4" /> {copied === "share" ? "Copiado" : ""}
            </Button>
          </div>
        </div>
      )}
      {share?.error && <Notice tone="danger">{share.error}</Notice>}
      <div className="border-t border-line pt-4">
        <Button variant="ghost" onClick={() => start(async () => setResume(await resumeAction()))}>
          <Smartphone className="h-4 w-4" /> Continuar en otro dispositivo
        </Button>
        {resume && (
          <div className="mt-2 space-y-2">
            <Notice tone="warning">Este enlace permite ver y modificar tu viaje: no lo compartas con otras personas.</Notice>
            <div className="flex gap-2">
              <input readOnly className={inputClass} value={resume} onFocus={(e) => e.target.select()} aria-label="Enlace para continuar" />
              <Button variant="secondary" onClick={() => copy(resume, "resume")}>
                <Copy className="h-4 w-4" /> {copied === "resume" ? "Copiado" : ""}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
