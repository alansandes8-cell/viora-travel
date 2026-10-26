import Link from "next/link";
import { BookOpen, LayoutDashboard, LogOut, Settings, Users, Briefcase } from "lucide-react";
import { Logo } from "@/components/ui";
import { requireStaff } from "@/server/auth/session";
import { logoutAction } from "../login/actions";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const items = [
    { href: "/admin", label: "Inicio", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/admin/proyectos", label: "Proyectos", icon: <Briefcase className="h-4 w-4" /> },
    { href: "/admin/clientes", label: "Clientes", icon: <Users className="h-4 w-4" /> },
    { href: "/admin/biblioteca", label: "Biblioteca", icon: <BookOpen className="h-4 w-4" /> },
    { href: "/admin/ajustes", label: "Ajustes", icon: <Settings className="h-4 w-4" /> },
  ];
  return (
    <div className="min-h-screen bg-[#f6f4ef] lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r no-print">
        <div className="flex items-center justify-between px-4 py-3 lg:block lg:py-5">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo size={64} className="w-16" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Panel</span>
          </Link>
          <form action={logoutAction} className="lg:hidden">
            <button className="rounded-full p-2 text-muted hover:bg-sand-2" aria-label="Salir">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
        <AdminNav items={items} />
        <div className="hidden px-4 py-6 text-xs text-muted lg:block">
          <p className="font-semibold text-navy">{staff.name}</p>
          <p>{staff.email}</p>
          <p className="capitalize">Rol: {staff.role === "owner" ? "propietario" : staff.role === "agent" ? "agente" : "solo lectura"}</p>
          <form action={logoutAction} className="mt-3">
            <button className="inline-flex items-center gap-1 font-semibold text-navy hover:underline">
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-6 sm:px-8">{children}</div>
    </div>
  );
}
