"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { MediaItem } from "@/server/integrations/media";
import type { DestinationKind } from "@/core/types";
import { Postcard } from "@/components/postcard";

type Img = Pick<MediaItem, "url" | "thumbUrl" | "title" | "attribution" | "sourceUrl" | "authorUrl" | "author" | "license" | "provider">;

/**
 * Imagen con atribución y reemplazo ante errores. Se usa <img> (no el optimizador de Next)
 * porque algunos proveedores, como Unsplash, exigen enlazar sus URLs originales.
 */
export function SmartImage({
  image,
  alt,
  className,
  fallbackLabel,
  showCredit = true,
  eager = false,
  thumb = false,
  fallback,
  kind,
}: {
  image?: Img | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  showCredit?: boolean;
  eager?: boolean;
  thumb?: boolean;
  fallback?: React.ReactNode;
  /** Si no hay foto, se muestra una postal ilustrada de este tipo de paisaje (rotulada «Ilustración»). */
  kind?: DestinationKind;
}) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    const fb = fallback ?? (kind ? <Postcard name={fallbackLabel ?? alt} kind={kind} className="h-full w-full" /> : null);
    if (fb) {
      return (
        <div className={`relative overflow-hidden ${className ?? ""}`} role="img" aria-label={alt}>
          {fb}
        </div>
      );
    }
    return (
      <div className={`relative flex items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#e7f6f4,#f4efe6)] ${className ?? ""}`} role="img" aria-label={alt}>
        <div className="flex flex-col items-center gap-2 px-4 text-center text-navy/60">
          <ImageOff className="h-6 w-6" aria-hidden />
          <span className="font-display text-base">{fallbackLabel ?? alt}</span>
        </div>
      </div>
    );
  }
  const src = thumb && image.thumbUrl ? image.thumbUrl : image.url;
  return (
    <figure className={`group relative overflow-hidden bg-sand-2 ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={image.title || alt} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      {showCredit && image.attribution && (
        <figcaption className="absolute bottom-0 right-0 max-w-full truncate rounded-tl-lg bg-black/45 px-2 py-0.5 text-[10px] text-white/90">
          {image.sourceUrl ? (
            <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {image.attribution}
            </a>
          ) : (
            image.attribution
          )}
        </figcaption>
      )}
    </figure>
  );
}
