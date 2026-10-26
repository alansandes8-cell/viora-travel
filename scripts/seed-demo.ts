/**
 * Datos de DEMOSTRACIÓN para desarrollo. Todos los proyectos quedan marcados is_demo = true,
 * se identifican con el prefijo DEMO y no se muestran en el panel salvo que se active el filtro.
 * Uso: pnpm demo:seed   (no ejecutar en producción)
 */
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { generatePlan } from "../src/core/plan";
import { KNOWN_CONNECTIONS, SEED_DESTINATIONS } from "../src/core/library";
import { toClientProposal } from "../src/core/sanitize";
import type { IntakeAnswers } from "../src/core/types";

if (process.env.NODE_ENV === "production") {
  console.error("No se cargan datos de demostración en producción.");
  process.exit(1);
}

const base = {
  origin: { city: "Buenos Aires", country: "Argentina" },
  history: { visited: [], loved: [], wouldNotReturn: [], pending: [], avoid: [] },
  stay: { lodgingTypes: [], transport: ["plane", "train"] },
  extra: {},
} as const;

const demos: { name: string; answers: IntakeAnswers }[] = [
  {
    name: "DEMO · Playa en febrero",
    answers: { ...base, tripStyles: ["beach_relax"], dreamText: "14 días de playa con agua turquesa y buena comida", dates: { mode: "month", months: [2], nights: 14 }, party: { type: "couple", adults: 2, childrenAges: [] }, budget: { tier: "moderate" }, priorities: { selected: ["rest", "few_hotel_changes"], ranking: ["rest"], mustHave: [] } } as unknown as IntakeAnswers,
  },
  {
    name: "DEMO · Primer Eurotrip",
    answers: { ...base, tripStyles: ["eurotrip", "culture_history"], dates: { mode: "exact", departure: "2027-05-03", return: "2027-05-24" }, party: { type: "couple", adults: 2, childrenAges: [] }, budget: { tier: "moderate" }, priorities: { selected: ["historic_sites", "eat_well"], ranking: [], mustHave: [] } } as unknown as IntakeAnswers,
  },
  {
    name: "DEMO · Familia a Orlando",
    answers: { ...base, tripStyles: ["family", "theme_parks"], dates: { mode: "month", months: [7], nights: 10 }, party: { type: "family", adults: 2, childrenAges: [6, 10] }, budget: { tier: "comfort" }, priorities: { selected: ["comfort"], ranking: [], mustHave: [] } } as unknown as IntakeAnswers,
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  for (const [i, d] of demos.entries()) {
    const code = `DEMO-${String(i + 1).padStart(4, "0")}`;
    const exists = await pool.query("SELECT 1 FROM trip_projects WHERE code = $1", [code]);
    if (exists.rowCount) continue;
    const doc = generatePlan(d.answers, { library: SEED_DESTINATIONS, connections: KNOWN_CONNECTIONS });
    const alt = doc.alternatives[0];
    const p = await pool.query(
      `INSERT INTO trip_projects (code, name, status_key, is_demo, destination_summary, travelers, budget_tier) VALUES ($1,$2,'new',true,$3,$4,$5) RETURNING id`,
      [code, d.name, alt?.stops.map((s) => s.name).join(" · "), doc.profile.travelers, doc.profile.budgetTier],
    );
    const pid = p.rows[0].id;
    const v = await pool.query(`INSERT INTO plan_versions (project_id, number, author_kind, reason, document) VALUES ($1,1,'engine','Datos de demostración',$2) RETURNING id`, [pid, JSON.stringify(doc)]);
    const content = toClientProposal(doc, "preliminary");
    await pool.query(`INSERT INTO client_snapshots (project_id, version_id, kind, content, content_hash) VALUES ($1,$2,'client_proposal',$3,$4)`, [pid, v.rows[0].id, JSON.stringify(content), createHash("sha256").update(JSON.stringify(content)).digest("hex")]);
    await pool.query(`UPDATE trip_projects SET current_version_id = $2, published_version_id = $2 WHERE id = $1`, [pid, v.rows[0].id]);
    await pool.query(`INSERT INTO intake_sessions (project_id, token_hash, answers, status, expires_at) VALUES ($1,$2,$3,'submitted', now() + interval '30 days')`, [pid, createHash("sha256").update(`demo-${code}`).digest("hex"), JSON.stringify(d.answers)]);
    console.log(`✓ ${code} ${d.name}`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
