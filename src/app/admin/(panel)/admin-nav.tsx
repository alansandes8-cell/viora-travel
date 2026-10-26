"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export function AdminNav({ items }: { items: { href: string; label: string; icon: React.ReactNode }[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 scrollbar-none lg:flex-col lg:pb-0">
      {items.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={cx("flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold", active ? "bg-navy text-white" : "text-navy hover:bg-sand-2")}>
            {i.icon}
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
