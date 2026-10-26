import type { Metadata } from "next";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Términos de uso" };

export default function TerminosPage() {
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-semibold">Términos de uso</h1>
      <p className="mt-2 text-sm text-muted">Texto base a revisar por un asesor legal antes de la publicación definitiva.</p>
      <div className="mt-8 space-y-4 text-[15px] leading-relaxed">
        <p>Las propuestas que genera esta plataforma son orientativas. Se basan en tus respuestas, en información general de destinos y en estimaciones, y no constituyen una cotización, una reserva ni una oferta comercial.</p>
        <p>El clima indicado corresponde a condiciones habituales de cada época y no es un pronóstico. Las duraciones de traslados son estimaciones de referencia. Horarios, disponibilidad, tarifas y condiciones deben confirmarse con los proveedores antes de reservar.</p>
        <p>La información sobre requisitos de ingreso es una guía para verificar en fuentes oficiales: depende de la nacionalidad, el tipo de pasaporte, la residencia, las escalas y las fechas, y VIORA TRAVEL no emite garantías migratorias.</p>
        <p>Los puntajes de compatibilidad son recomendaciones orientativas del sistema y no garantizan la satisfacción con el viaje.</p>
        <p>Las imágenes y videos pertenecen a sus autores y se muestran con su atribución y según las condiciones de cada proveedor.</p>
      </div>
    </Container>
  );
}
