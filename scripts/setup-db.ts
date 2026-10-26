/**
 * Prepara la base de datos: migraciones, rol público restringido y datos iniciales.
 * Uso: pnpm db:setup   (requiere DATABASE_URL; para crear el rol público, PUBLIC_DB_PASSWORD
 * y que el usuario de DATABASE_URL tenga permiso CREATEROLE, o ejecutarlo con DATABASE_ADMIN_URL).
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { SEED_DESTINATIONS } from "../src/core/library";
import { BASE_WEIGHTS } from "../src/core/catalog";

const STATUSES = [
  ["new", "Nuevo", 1, false, "sky"],
  ["planning", "En planificación", 2, false, "violet"],
  ["research", "Pendiente de investigación", 3, false, "amber"],
  ["proposal_ready", "Propuesta preparada", 4, false, "teal"],
  ["sent", "Enviado al cliente", 5, false, "cyan"],
  ["quoting", "En cotización", 6, false, "orange"],
  ["waiting", "Esperando respuesta", 7, false, "slate"],
  ["confirmed", "Confirmado", 8, true, "green"],
  ["closed", "Cerrado", 9, true, "slate"],
  ["cancelled", "Cancelado", 10, true, "rose"],
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  const adminUrl = process.env.DATABASE_ADMIN_URL ?? url;
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  console.log("→ Ejecutando migraciones…");
  await migrate(db, { migrationsFolder: "./drizzle" });

  const appUser = new URL(url).username;
  const publicPassword = process.env.PUBLIC_DB_PASSWORD;
  if (publicPassword) {
    console.log("→ Configurando rol público restringido (viora_public)…");
    const admin = new Pool({ connectionString: adminUrl });
    const pw = publicPassword.replace(/'/g, "''");
    await admin.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'viora_public') THEN
        CREATE ROLE viora_public LOGIN PASSWORD '${pw}';
      ELSE
        ALTER ROLE viora_public LOGIN PASSWORD '${pw}';
      END IF;
    END $$;`);
    await admin.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM viora_public;
      REVOKE ALL ON SCHEMA internal FROM viora_public;
      REVOKE ALL ON ALL TABLES IN SCHEMA internal FROM viora_public;
      GRANT USAGE ON SCHEMA public TO viora_public;
      GRANT SELECT ON client_snapshots, media_assets, media_queries TO viora_public;
      GRANT SELECT (id, project_id, snapshot_id, kind, token_hash, expires_at, revoked_at) ON share_links TO viora_public;
      GRANT UPDATE (last_access_at, access_count) ON share_links TO viora_public;
      GRANT SELECT (id, project_id, token_hash, step, status, expires_at) ON intake_sessions TO viora_public;`);
    if (appUser) await admin.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${appUser}" IN SCHEMA internal REVOKE ALL ON TABLES FROM PUBLIC;`).catch(() => {});
    await admin.end();
  } else {
    console.log("! PUBLIC_DB_PASSWORD no definida: no se creó el rol público restringido (obligatorio en producción).");
  }

  console.log("→ Cargando estados, ajustes y biblioteca de destinos…");
  for (const [key, label, sort, isFinal, color] of STATUSES) {
    await pool.query(
      `INSERT INTO project_statuses (key, label, sort, is_final, color) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (key) DO NOTHING`,
      [key, label, sort, isFinal, color],
    );
  }
  const defaults: Record<string, unknown> = {
    scoring_weights: BASE_WEIGHTS,
    share_link_days: 90,
    draft_retention_days: 90,
    ai_daily_limit: 200,
    generations_per_ip_per_hour: 15,
  };
  for (const [k, v] of Object.entries(defaults)) {
    await pool.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [k, JSON.stringify(v)]);
  }
  for (const d of SEED_DESTINATIONS) {
    // Solo actualiza destinos de semilla; los editados por la agencia (source=agent) se respetan.
    await pool.query(
      `INSERT INTO destinations (id, data, source) VALUES ($1, $2, 'seed')
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now() WHERE destinations.source = 'seed'`,
      [d.id, JSON.stringify(d)],
    );
  }
  await pool.end();
  console.log("✓ Base de datos lista.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
