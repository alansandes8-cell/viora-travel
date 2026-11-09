import { expect, test } from "@playwright/test";
import path from "node:path";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe("Mi viaje (clientes que compraron)", () => {
  test.skip(!email || !password, "Definí E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD");

  test("la agencia carga el viaje y el cliente lo ve con su contraseña; nadie más accede", async ({ page, browser }) => {
    test.setTimeout(240_000);
    const stamp = Date.now();
    const clientEmail = `cliente${stamp}@prueba.local`;
    // 1. Un cliente real entra por un pedido de cotización.
    await page.goto("/vuelos?de=EZE&a=FCO&ida=2030-05-14&vuelta=2030-06-08&ad=2");
    const f = page.locator("[data-quote-form]");
    await f.locator('input[name="name"]').fill(`Lucía Prueba ${stamp}`);
    await f.locator('input[name="email"]').fill(clientEmail);
    await f.locator('input[name="consent"]').check();
    await f.getByRole("button").click();
    await expect(page.getByText("Ya tenemos tu pedido")).toBeVisible();

    // 2. La agencia crea el viaje vendido.
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);
    await page.getByRole("button", { name: /Ingresar|Entrar/ }).click();
    await page.waitForURL("**/admin");
    await page.goto("/admin/clientes");
    await page.getByRole("link", { name: `Lucía Prueba ${stamp}` }).click();
    await page.locator('input[name="subtitle"]').fill("Europa 2030");
    await page.locator('input[name="startDate"]').fill("2030-05-14");
    await page.locator('input[name="endDate"]').fill("2030-05-20");
    await page.locator('input[name="coverPlace"]').fill("Colosseum");
    await page.getByRole("button", { name: "Crear viaje" }).click();
    await page.waitForURL(/\/admin\/viajes\/[0-9a-f-]{36}$/);
    const tripUrl = page.url();

    // Hotel
    await page.getByRole("button", { name: /Agregar vuelo, hotel/ }).click();
    await page.locator('input[name="title"]').last().fill("Hotel Roma Termini");
    await page.locator('input[name="startDate"]').last().fill("2030-05-15");
    await page.locator('input[name="startTime"]').last().fill("13:00");
    await page.locator('input[name="endDate"]').last().fill("2030-05-17");
    await page.locator('input[name="endTime"]').last().fill("11:00");
    await page.locator('input[name="place"]').last().fill("Roma");
    await page.locator('select[name="breakfast"]').last().selectOption("no");
    await page.locator('input[name="price"]').last().fill("266");
    await page.getByRole("button", { name: "Agregar servicio" }).click();
    await expect(page.getByText("🏨 Hotel Roma Termini").first()).toBeVisible();
    // Vuelo
    await page.getByRole("button", { name: /Agregar vuelo, hotel/ }).click();
    await page.locator('select[name="kind"]').last().selectOption("flight");
    await page.locator('input[name="title"]').last().fill("Buenos Aires → Roma");
    await page.locator('input[name="startDate"]').last().fill("2030-05-14");
    await page.locator('input[name="startTime"]').last().fill("22:35");
    await page.getByRole("button", { name: "Agregar servicio" }).click();
    await expect(page.getByText("✈️ Buenos Aires → Roma").first()).toBeVisible();

    // Voucher del vuelo
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "voucher-prueba.pdf"));
    await page.locator('select[name="itemId"]').selectOption({ label: "✈️ Buenos Aires → Roma" });
    await page.getByRole("button", { name: "Subir" }).click();
    await expect(page.getByText("Voucher subido.")).toBeVisible();
    await expect(page.getByRole("link", { name: /voucher-prueba\.pdf/ })).toBeVisible();

    // Plan: el día 2 ya tiene «Roma» por el hotel; se agrega una actividad.
    await page.getByRole("button", { name: /Día 2 · .* 15\/5/ }).click();
    await page.getByRole("button", { name: "Agregar actividad" }).click();
    await page.locator('input[type="time"]').last().fill("10:00");
    await page.getByPlaceholder("Free tour por Roma").last().fill("Free tour por Roma");
    await page.getByRole("button", { name: "Guardar plan" }).click();
    await expect(page.getByText("Plan guardado.")).toBeVisible();

    // Publicar y dar acceso
    await page.locator('select[name="status"]').selectOption("published");
    await page.getByRole("button", { name: "Guardar datos del viaje" }).click();
    await expect(page.getByText("Guardado.")).toBeVisible();
    await page.getByRole("button", { name: /Dar acceso y generar enlace/ }).click();
    const link = (await page.locator("span.font-mono").first().innerText()).trim();
    expect(link).toMatch(/\/acceder\/clave\/[\w-]+$/);

    // 3. El cliente elige su contraseña y ve su viaje.
    const ctx = await browser.newContext();
    const c = await ctx.newPage();
    await c.goto(new URL(link).pathname);
    await expect(c.getByText(clientEmail)).toBeVisible();
    await c.locator('input[name="password"]').fill("Viaje2030ok");
    await c.locator('input[name="confirm"]').fill("Viaje2030ok");
    await c.getByRole("button", { name: "Guardar y ver mi viaje" }).click();
    await c.waitForURL(/\/mi-viaje\/[0-9a-f-]{36}$/);
    const myTripPath = new URL(c.url()).pathname;
    await expect(c.getByRole("heading", { name: "Plan de viaje" })).toBeVisible();
    await expect(c.getByText("EUROPA 2030", { exact: false })).toBeVisible();
    await expect(c.getByText("Hotel Roma Termini").first()).toBeVisible();
    await expect(c.getByText("US$ 266")).toBeVisible();
    await expect(c.getByText("Free tour por Roma", { exact: true })).toBeVisible();
    const voucher = c.getByRole("link", { name: "✈️ Voucher del vuelo" });
    const href = await voucher.getAttribute("href");
    const res = await c.request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    // El enlace de activación no sirve dos veces.
    await c.goto(new URL(link).pathname);
    await expect(c.getByText("El enlace venció o ya se usó")).toBeVisible();

    // 4. Sin sesión no se ve nada; otro visitante no puede abrir ni el viaje ni el voucher.
    const stranger = await browser.newContext();
    const s = await stranger.newPage();
    expect((await s.request.get(href!)).status()).toBe(401);
    await s.goto(myTripPath);
    await expect(s).toHaveURL(/\/acceder$/);
    await s.locator('input[name="email"]').fill(clientEmail);
    await s.locator('input[name="password"]').fill("otra-clave-123");
    await s.getByRole("button", { name: "Entrar a Mi viaje" }).click();
    await expect(s.getByText("Email o contraseña incorrectos.")).toBeVisible();
    // Con la contraseña correcta, entra.
    await s.locator('input[name="password"]').fill("Viaje2030ok");
    await s.getByRole("button", { name: "Entrar a Mi viaje" }).click();
    await s.waitForURL(/\/mi-viaje\/[0-9a-f-]{36}$/);
    await page.goto(tripUrl);
  });
});
