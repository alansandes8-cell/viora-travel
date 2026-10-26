import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { agency } from "@/server/settings";

export const metadata: Metadata = { title: "Privacidad y datos personales" };

export default function PrivacidadPage() {
  const email = agency.email();
  return (
    <Container className="prose-viora max-w-3xl py-12">
      <h1 className="text-3xl font-semibold">Privacidad y datos personales</h1>
      <p className="mt-2 text-sm text-muted">Texto base a revisar por un asesor legal antes de la publicación definitiva.</p>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">Quién es responsable</h2>
          <p>VIORA TRAVEL es responsable del tratamiento de los datos que nos compartís a través de esta plataforma{email ? ` (contacto: ${email})` : ""}.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Qué datos usamos y para qué</h2>
          <ul className="list-disc pl-5">
            <li>Respuestas del cuestionario (preferencias de viaje, fechas, cantidad y edades de viajeros, destinos conocidos): para diseñar tu propuesta.</li>
            <li>Datos de contacto (nombre, email, teléfono), solo si los dejás: para que un asesor te contacte sobre ese viaje.</li>
            <li>Datos técnicos mínimos (cookie de sesión del viaje, dirección IP para prevenir abusos).</li>
          </ul>
          <p className="mt-2">No pedimos datos sensibles ni documentación personal en esta etapa. No vendemos tus datos.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Cuánto tiempo los guardamos</h2>
          <p>Los borradores sin datos de contacto se eliminan automáticamente a los 90 días. Los proyectos con contacto se conservan mientras dure la relación comercial y el plazo legal aplicable; luego se anonimizan.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Tus derechos</h2>
          <p>
            Podés solicitar el acceso, la rectificación, la actualización o la supresión de tus datos escribiéndonos{email ? ` a ${email}` : ""}. Conforme a la Ley 25.326 de Protección de Datos Personales, la Agencia de Acceso a la Información Pública es el órgano de control y atiende denuncias y reclamos relacionados con el incumplimiento de las normas sobre protección de datos personales.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Servicios de terceros</h2>
          <p>Para mostrarte imágenes, videos y mapas usamos proveedores externos (por ejemplo, bancos de imágenes, YouTube y proveedores de mapas), que pueden recibir datos técnicos de tu navegador al cargar ese contenido. Si se habilita la asistencia de inteligencia artificial, las respuestas del cuestionario se procesan con ese proveedor para redactar la propuesta, sin datos de contacto.</p>
        </section>
      </div>
    </Container>
  );
}
