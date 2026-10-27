import type { ClientProposal } from "@/core/sanitize";
import { cx } from "@/components/ui";

const BAR = ["bg-teal-brand", "bg-orange-brand", "bg-coral-brand", "bg-purple-brand", "bg-cyan-brand"];

/** «Tu perfil viajero»: resumen lúdico y fiel a las respuestas (sale del mismo perfil que usa el motor). */
export function PersonaCard({ persona, className }: { persona: ClientProposal["persona"]; className?: string }) {
  return (
    <section aria-label="Tu perfil viajero" className={cx("grid gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft sm:grid-cols-[auto_1fr] sm:items-center", className)}>
      <div className="pop flex h-20 w-20 items-center justify-center rounded-full bg-[conic-gradient(var(--color-teal-brand),var(--color-cyan-brand),var(--color-purple-brand),var(--color-coral-brand),var(--color-orange-brand),var(--color-teal-brand))] text-4xl shadow-[inset_0_0_0_6px_white]" aria-hidden>
        {persona.emoji}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-teal-brand">Tu perfil viajero</p>
        <h2 className="mt-1 text-2xl font-semibold">{persona.name}</h2>
        <p className="mt-1 text-muted">{persona.tagline}</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-5">
        {persona.traits.map((t, i) => (
          <li key={t.label}>
            <span className="text-xs font-bold text-navy">{t.label}</span>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand-2">
              <div className={cx("grow-x h-full rounded-full", BAR[i % BAR.length])} style={{ width: `${Math.max(4, t.value)}%`, animationDelay: `${i * 150}ms` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
