import { expect, test } from "@playwright/test";
import { completeBeachIntake } from "./helpers";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe("Panel de la agencia", () => {
  test.skip(!email || !password, "Definí E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para probar el panel");

  test("edición manual, presupuesto con cotizaciones manuales, publicación y exportaciones", async ({ page, browser }) => {
    const client = await browser.newContext();
    await completeBeachIntake(await client.newPage());
    await client.close();

    await page.goto("/admin/login");
    await page.locator("#email").fill(email!);
    await page.locator("#password").fill(password!);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL("**/admin");
    await page.goto("/admin/proyectos");
    const href = (await page.locator('a:has-text("VIO-")').first().getAttribute("href"))!;

    await page.goto(`${href}?tab=itinerario`);
    const nights = page.locator('input[aria-label="Noches"]').first();
    const before = Number(await nights.inputValue());
    await nights.fill(String(before + 1));
    await page.getByRole("button", { name: "Noches" }).first().click();
    await expect(page.locator('input[aria-label="Noches"]').first()).toHaveValue(String(before + 1));
    await expect(page.locator('[aria-label="Bloqueada"]').first()).toBeVisible();

    await page.goto(`${href}?tab=presupuesto`);
    await page.getByRole("button", { name: "Nuevo presupuesto" }).click();
    await page.locator('input[aria-label="Importe unitario"]').first().fill("1000");
    await page.getByRole("button", { name: "Agregar línea" }).first().click();
    await page.locator('input[aria-label="Margen"]').first().fill("10");
    await page.getByRole("button", { name: "Guardar presupuesto" }).first().click();
    await expect(page.getByText("USD 1.100,00").first()).toBeVisible();

    await page.goto(href);
    const publish = page.getByRole("button", { name: /Aprobar y publicar/ });
    if (await publish.count()) await publish.click();
    await expect(page.getByText(/El cliente ve la versión/)).toBeVisible();

    for (const f of ["json", "csv", "xlsx"]) {
      const r = await page.request.get(`${href}/export/${f}`);
      expect(r.status()).toBe(200);
    }
  });
});
