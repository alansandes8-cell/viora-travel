import { FileSpreadsheet, FileText, FileJson, ListChecks, Eye } from "lucide-react";
import { Panel } from "@/components/admin/bits";

export function TabInformes({ id }: { id: string }) {
  const items = [
    { href: `/admin/proyectos/${id}/informe`, label: "Informe interno (vista web)", icon: Eye, desc: "Resumen ejecutivo, análisis de destinos, itinerario, componentes, control de información y próximos pasos." },
    { href: `/admin/proyectos/${id}/export/pdf`, label: "Informe interno en PDF", icon: FileText, desc: "Incluye fuentes, fechas de consulta y estado de verificación." },
    { href: `/admin/proyectos/${id}/export/xlsx`, label: "Hoja de cálculo para presupuestar", icon: FileSpreadsheet, desc: "Resumen, itinerario, componentes, consultas económicas, presupuesto y fuentes." },
    { href: `/admin/proyectos/${id}/export/csv`, label: "Lista de servicios por cotizar (CSV)", icon: ListChecks, desc: "Para compartir con proveedores u operadores." },
    { href: `/admin/proyectos/${id}/export/json`, label: "Documento estructurado (JSON)", icon: FileJson, desc: "Versión actual completa del plan para consulta o integración." },
    { href: `/admin/proyectos/${id}/vista-cliente`, label: "Vista previa del informe del cliente", icon: Eye, desc: "Exactamente lo que ve el cliente en la versión publicada (sin precios)." },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((i) => (
        <a key={i.href} href={i.href} className="block">
          <Panel className="h-full transition-shadow hover:shadow-soft">
            <p className="flex items-center gap-2 font-semibold text-navy">
              <i.icon className="h-5 w-5 text-teal-brand" aria-hidden /> {i.label}
            </p>
            <p className="mt-1 text-sm text-muted">{i.desc}</p>
          </Panel>
        </a>
      ))}
    </div>
  );
}
