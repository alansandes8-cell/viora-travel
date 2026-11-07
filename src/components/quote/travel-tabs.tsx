import Link from "next/link";
import { BedDouble, Luggage, Plane, Sparkles, Ticket } from "lucide-react";
import { cx } from "@/components/ui";

export const TRAVEL_TABS = [
  { id: "paquetes", href: "/paquetes", label: "Paquetes", icon: Luggage },
  { id: "vuelos", href: "/vuelos", label: "Vuelos", icon: Plane },
  { id: "hoteles", href: "/hoteles", label: "Hoteles", icon: BedDouble },
  { id: "actividades", href: "/actividades", label: "Actividades", icon: Ticket },
  { id: "medida", href: "/planificar", label: "A tu medida", icon: Sparkles },
] as const;

/** Pestañas del buscador: paquetes, vuelos, hoteles, actividades y viaje a medida. */
export function TravelTabs({ active, className }: { active: (typeof TRAVEL_TABS)[number]["id"]; className?: string }) {
  return (
    <nav aria-label="¿Qué buscás?" className={cx("-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0", className)}>
      <ul className="flex w-max gap-1 rounded-2xl border border-line bg-white p-1 shadow-soft">
        {TRAVEL_TABS.map(({ id, href, label, icon: Icon }) => (
          <li key={id}>
            <Link
              href={href}
              aria-current={id === active ? "page" : undefined}
              className={cx(
                "flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors sm:px-4",
                id === active ? "bg-navy text-white" : "text-navy hover:bg-navy/5",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
