/**
 * Crea (o actualiza) un usuario del panel.
 * Uso: pnpm admin:create --email vos@dominio.com --name "Tu nombre" [--role owner]
 * La contraseña se toma de ADMIN_PASSWORD o se genera una aleatoria y se muestra una sola vez.
 */
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { hashPassword, passwordProblems } from "../src/server/auth/password";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.toLowerCase().trim();
  const name = arg("name") ?? "Administrador";
  const role = arg("role") ?? "owner";
  if (!email || !email.includes("@")) throw new Error("Indicá --email");
  if (!["owner", "agent", "viewer"].includes(role)) throw new Error("Rol inválido");
  let password = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = randomBytes(12).toString("base64url") + "7a";
    generated = true;
  }
  const problems = passwordProblems(password);
  if (problems.length) throw new Error(problems.join(" "));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(
    `INSERT INTO staff_users (email, name, password_hash, role) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, active = true, failed_attempts = 0, locked_until = NULL`,
    [email, name, await hashPassword(password), role],
  );
  await pool.end();
  console.log(`✓ Usuario ${email} (${role}) listo.`);
  if (generated) console.log(`  Contraseña generada (guardala ahora, no se vuelve a mostrar): ${password}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
