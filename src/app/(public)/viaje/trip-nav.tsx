"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const TABS = [
  ["/viaje", "Alternativas"],
  ["/viaje/comparar", "Comparar"],
  ["/viaje/itinerario", "Itinerario"],
  ["/viaje/solicitar", "Compartir y cotizar"],
] as const;

export function TripNav() {
  const path = usePathname();
  return (
    <nav aria-label="Secciones de tu viaje" className="-mb-px mt-6 flex gap-1 overflow-x-auto scrollbar-none">
      {TABS.map(([href, label]) => {
        const active = path === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cx("shrink-0 border-b-2 px-3 py-3 text-sm font-semibold", active ? "border-teal-brand text-navy" : "border-transparent text-muted hover:text-navy")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
