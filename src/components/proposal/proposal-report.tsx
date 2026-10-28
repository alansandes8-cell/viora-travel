import { CheckCircle2, Sparkles } from "lucide-react";
import type { ClientProposal } from "@/core/sanitize";
import type { MediaItem } from "@/server/integrations/media";
import { SmartImage } from "@/components/media/smart-image";
import { Badge, Card, CompatibilityRing, Logo, Notice } from "@/components/ui";
import { ItineraryView } from "./itinerary-view";

/** Informe para el cliente: inspirador, visual y SIN precios (recibe solo la vista saneada). */
export function ProposalReport({
  proposal: p,
  media,
  printMode = false,
  footer,
}: {
  proposal: ClientProposal;
  media: { stopImages: Record<string, MediaItem[]>; videos: MediaItem[]; videosConfigured: boolean; cover?: MediaItem | null };
  printMode?: boolean;
  footer?: React.ReactNode;
}) {
  const alt = p.alternatives.find((a) => a.id === p.selectedAlternativeId) ?? p.alternatives[0];
  const firstStop = p.itinerary?.stops[0];
  const cover = media.cover ?? (firstStop ? media.stopImages[firstStop.id]?.[0] : null);
  return (
    <article className="space-y-12">
      <header className="avoid-break">
        <div className="flex items-center justify-between gap-4">
          <Logo size={printMode ? 170 : 140} />
          <Badge tone={p.status === "reviewed" ? "success" : "orange"}>{p.status === "reviewed" ? "Revisada por VIORA" : "Propuesta preliminar"}</Badge>
        </div>
        <div className="relative mt-6 overflow-hidden rounded-[2rem]">
          <SmartImage image={cover} alt={alt?.title ?? p.title} eager className="aspect-[16/8] w-full" fallbackLabel={alt?.title ?? p.title} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{p.title}</h1>
            <p className="mt-2 max-w-2xl text-white/85">{p.concept}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2 avoid-break">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Lo que buscás</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {p.preferences.map((x) => (
              <div key={x.label} className="flex justify-between gap-4">
                <dt className="text-muted">{x.label}</dt>
                <dd className="text-right font-semibold text-navy">{x.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        {alt && (
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-brand">Alternativa recomendada</p>
                <h2 className="mt-1 text-xl font-semibold">{alt.title}</h2>
              </div>
              <CompatibilityRing value={alt.compatibility} size={56} />
            </div>
            <p className="mt-3 text-sm">{alt.mainReason}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {alt.pros.slice(0, 4).map((x) => (
                <li key={x} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-brand" aria-hidden /> {x}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {alt.labels.map((l) => (
                <Badge key={l} tone="teal">
                  {l}
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </section>

      {p.alternatives.length > 1 && (
        <section className="avoid-break">
          <h2 className="text-xl font-semibold">Otras alternativas evaluadas</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {p.alternatives
              .filter((a) => a.id !== alt?.id)
              .map((a) => (
                <Card key={a.id} className="p-4">
                  <p className="font-semibold text-navy">{a.title}</p>
                  <p className="text-xs text-muted">{a.labels.join(" · ")} · compatibilidad {a.compatibility}</p>
                  <p className="mt-2 text-sm text-muted">{a.mainReason}</p>
                </Card>
              ))}
          </div>
        </section>
      )}

      <ItineraryView proposal={p} stopImages={media.stopImages} videos={media.videos} videosConfigured={media.videosConfigured} printMode={printMode} />

      <section className="avoid-break rounded-[2rem] bg-navy p-8 text-white">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <Sparkles className="h-5 w-5 text-orange-brand" aria-hidden /> Próximos pasos
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-white/90">
          {p.nextSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {footer}
      </section>
      <Notice>{p.disclaimer}</Notice>
    </article>
  );
}
