import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __vioraApp?: DB; __vioraPublic?: DB; __vioraPublicIsolated?: boolean };

function make(url: string): DB {
  const pool = new Pool({ connectionString: url, max: 10 });
  return drizzle(pool, { schema });
}

/** Conexión principal (rol de la aplicación). Solo para código de servidor. */
export function db(): DB {
  if (!globalForDb.__vioraApp) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL no está configurada.");
    globalForDb.__vioraApp = make(url);
  }
  return globalForDb.__vioraApp;
}

/**
 * Conexión de solo lectura para páginas públicas, con un rol de Postgres que NO tiene
 * acceso al esquema `internal`. Aunque hubiera un error de código, no puede leer precios.
 */
export function publicDb(): DB {
  if (!globalForDb.__vioraPublic) {
    const url = process.env.DATABASE_URL_PUBLIC;
    if (!url) {
      if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL_PUBLIC es obligatoria en producción.");
      console.warn("[viora] DATABASE_URL_PUBLIC no configurada: en desarrollo se usa la conexión principal.");
      globalForDb.__vioraPublicIsolated = false;
      globalForDb.__vioraPublic = db();
    } else {
      globalForDb.__vioraPublicIsolated = true;
      globalForDb.__vioraPublic = make(url);
    }
  }
  return globalForDb.__vioraPublic;
}

export function publicDbIsolated(): boolean {
  publicDb();
  return !!globalForDb.__vioraPublicIsolated;
}

export { schema };
