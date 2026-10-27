"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

const TEXT = "Te paso la app de VIORA TRAVEL para planificar tu viaje:";

/** Compartir la app: usa el menú del celular si existe; si no, abre WhatsApp. */
export function ShareApp({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "VIORA TRAVEL", text: TEXT, url });
        return;
      } catch {
        return; // la persona canceló
      }
    }
    try {
      await navigator.clipboard.writeText(`${TEXT} ${url}`);
      setCopied(true);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${TEXT} ${url}`)}`, "_blank", "noopener");
    }
  };
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 font-semibold text-navy hover:bg-sand-2">
      <Share2 className="h-4 w-4" aria-hidden /> {copied ? "¡Link copiado!" : "Compartir"}
    </button>
  );
}
