import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { VerificationStatus } from "@/core/types";
import { VERIFICATION_LABELS } from "@/core/types";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export const ACCENTS = {
  teal: { text: "text-teal-brand", bg: "bg-teal-brand", soft: "bg-teal-brand/10", border: "border-teal-brand", ring: "ring-teal-brand" },
  orange: { text: "text-orange-brand", bg: "bg-orange-brand", soft: "bg-orange-brand/12", border: "border-orange-brand", ring: "ring-orange-brand" },
  coral: { text: "text-coral-brand", bg: "bg-coral-brand", soft: "bg-coral-brand/10", border: "border-coral-brand", ring: "ring-coral-brand" },
  purple: { text: "text-purple-brand", bg: "bg-purple-brand", soft: "bg-purple-brand/10", border: "border-purple-brand", ring: "ring-purple-brand" },
  cyan: { text: "text-cyan-brand", bg: "bg-cyan-brand", soft: "bg-cyan-brand/10", border: "border-cyan-brand", ring: "ring-cyan-brand" },
} as const;
export type Accent = keyof typeof ACCENTS;
export const ACCENT_ORDER: Accent[] = ["teal", "orange", "coral", "purple", "cyan"];

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

/** Logo horizontal (proporción 1146 × 446). `size` es el ancho en píxeles. */
export function Logo({ size = 160, className }: { size?: number; className?: string }) {
  return <Image src="/brand/viora-logo.webp" alt="VIORA TRAVEL" width={size} height={Math.round((size * 446) / 1146)} priority className={cx("h-auto", className)} />;
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-navy text-white hover:bg-navy/90 shadow-soft",
  secondary: "bg-white text-navy border border-line hover:border-navy/30",
  ghost: "text-navy hover:bg-navy/5",
  danger: "bg-danger text-white hover:bg-danger/90",
  whatsapp: "bg-[#1f9d55] text-white hover:bg-[#1a8a4a]",
};
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-11";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: BtnVariant }) {
  return <button className={cx(btnBase, BTN[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: BtnVariant }) {
  return <Link className={cx(btnBase, BTN[variant], className)} {...props} />;
}

export function Card({ children, className, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-[var(--radius-card)] border border-line bg-surface shadow-soft", className)} {...rest}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | Accent | "success" | "warning" | "danger"; className?: string }) {
  const tones: Record<string, string> = {
    neutral: "bg-sand-2 text-navy",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    teal: "bg-teal-brand/12 text-teal-brand",
    orange: "bg-orange-brand/15 text-[#a8640a]",
    coral: "bg-coral-brand/12 text-[#c43a3f]",
    purple: "bg-purple-brand/12 text-purple-brand",
    cyan: "bg-cyan-brand/12 text-[#0f7f9e]",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

const VERIF_TONE: Record<VerificationStatus, "success" | "teal" | "neutral" | "purple" | "warning" | "danger"> = {
  verified_current: "success",
  official_general: "teal",
  estimate: "neutral",
  ai_recommendation: "purple",
  pending: "warning",
  unavailable: "danger",
};

export function VerificationTag({ status, className }: { status: VerificationStatus; className?: string }) {
  return (
    <Badge tone={VERIF_TONE[status]} className={className}>
      {VERIFICATION_LABELS[status]}
    </Badge>
  );
}

export function SectionTitle({ eyebrow, title, intro, accent = "teal" }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; accent?: Accent }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className={cx("mb-2 text-sm font-bold uppercase tracking-wider", ACCENTS[accent].text)}>{eyebrow}</p>}
      <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
      {intro && <p className="mt-3 text-muted">{intro}</p>}
    </div>
  );
}

export function Meter({ value, max = 10, accent = "teal", label }: { value: number; max?: number; accent?: Accent; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-sand-2">
        <div className={cx("h-full rounded-full", ACCENTS[accent].bg)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CompatibilityRing({ value, size = 64 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 80 ? "var(--color-teal-brand)" : value >= 65 ? "var(--color-cyan-brand)" : "var(--color-orange-brand)";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} title="Compatibilidad orientativa con tu perfil">
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-sand-2)" strokeWidth={6} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="absolute font-display text-lg font-semibold text-navy">{value}</span>
    </div>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 p-8 text-center">
      {icon && <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sand-2 text-navy">{icon}</div>}
      <p className="font-display text-lg text-navy">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children, className }: { tone?: "info" | "warning" | "success" | "danger"; children: ReactNode; className?: string }) {
  const tones = {
    info: "border-cyan-brand/30 bg-cyan-brand/5 text-navy",
    warning: "border-warning/30 bg-warning/5 text-[#7c3f06]",
    success: "border-success/30 bg-success/5 text-success",
    danger: "border-danger/30 bg-danger/5 text-danger",
  };
  return <div className={cx("rounded-2xl border px-4 py-3 text-sm", tones[tone], className)}>{children}</div>;
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-cyan-brand focus:outline-none focus:ring-2 focus:ring-cyan-brand/20 min-h-11";

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
