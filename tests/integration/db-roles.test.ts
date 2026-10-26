import { Pool } from "pg";
import { describe, expect, it } from "vitest";

/**
 * Verifica la separación real de datos: el rol público no puede leer el esquema interno
 * ni las tablas con datos del cliente o del proyecto. Requiere una base configurada.
 */
const url = process.env.DATABASE_URL_PUBLIC;
describe.skipIf(!url)("rol de base de datos público", () => {
  const q = async (sql: string) => {
    const pool = new Pool({ connectionString: url });
    try {
      return await pool.query(sql);
    } finally {
      await pool.end();
    }
  };
  it("no puede leer cotizaciones, precios ni notas internas", async () => {
    for (const t of ["internal.quotes", "internal.quote_lines", "internal.price_observations", "internal.notes", "internal.budget_hints"]) {
      await expect(q(`select * from ${t} limit 1`)).rejects.toThrow(/permission denied/);
    }
  });
  it("no puede leer proyectos, clientes ni respuestas del cuestionario", async () => {
    await expect(q("select * from trip_projects limit 1")).rejects.toThrow(/permission denied/);
    await expect(q("select * from clients limit 1")).rejects.toThrow(/permission denied/);
    await expect(q("select answers from intake_sessions limit 1")).rejects.toThrow(/permission denied/);
    await expect(q("select * from plan_versions limit 1")).rejects.toThrow(/permission denied/);
  });
  it("solo puede leer instantáneas saneadas y enlaces (sin escritura salvo contador)", async () => {
    await expect(q("select id from client_snapshots limit 1")).resolves.toBeTruthy();
    await expect(q("delete from client_snapshots")).rejects.toThrow(/permission denied/);
    await expect(q("update share_links set revoked_at = null")).rejects.toThrow(/permission denied/);
  });
});
