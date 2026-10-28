import { expect, test } from "@playwright/test";
import { completeBeachIntake, MONEY_VISIBLE } from "./helpers";

test.describe("Experiencia del cliente", () => {
  test("cuestionario → tres alternativas → itinerario → cambio → enlace compartido sin precios", async ({ page, browser }) => {
    await completeBeachIntake(page);
    await expect(page.getByRole("heading", { name: "Tus tres alternativas" })).toBeVisible();
    await expect(page.getByText(/Alternativa [ABC]/)).toHaveCount(3);
    expect(await page.locator("body").innerText()).not.toMatch(MONEY_VISIBLE);

    await page.goto("/viaje/comparar");
    await expect(page.getByText("Comparación detallada")).toBeVisible();

    await page.goto("/viaje/itinerario");
    await expect(page.getByText("Día por día")).toBeVisible();
    // Mapa: interactivo o, si no hay teselas, el esquema SVG con la ruta.
    await expect(page.locator('[aria-label="Mapa de la ruta"], svg[aria-label^="Ruta:"]').first()).toBeVisible({ timeout: 15000 });

    await page.locator("#change").fill("Quiero un ritmo más tranquilo");
    await page.getByRole("button", { name: /Aplicar cambio/ }).click();
    await expect(page.getByText(/actualizamos tu itinerario|Registramos tu pedido/)).toBeVisible();

    await page.goto("/viaje/solicitar");
    await page.getByRole("button", { name: /Crear enlace privado/ }).click();
    const url = await page.locator('input[aria-label="Enlace privado"]').inputValue();
    expect(url).toContain("/p/");

    const other = await browser.newContext();
    const p2 = await other.newPage();
    const res = await p2.goto(url);
    expect(res?.status()).toBe(200);
    expect(await p2.locator("body").innerText()).not.toMatch(MONEY_VISIBLE);
    const html = await res!.text();
    expect(html).not.toContain("4321");
    expect(html).not.toMatch(/budget_hints|marginPercent|unitAmount|price_observations/);
    await other.close();
  });

  test("solicitud de cotización: no afirma que se envió un email si no está configurado", async ({ page }) => {
    await completeBeachIntake(page);
    await page.goto("/viaje/solicitar");
    await page.locator("#qn").fill("Cliente de Prueba");
    await page.locator("#qe").fill("cliente@example.com");
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: /Solicitar propuesta personalizada/ }).click();
    await expect(page.getByText("Registramos tu solicitud.")).toBeVisible();
    if (!process.env.SMTP_HOST) await expect(page.getByText(/quedó guardado en el panel/)).toBeVisible();
  });

  test("Mis viajes: empezar de cero guarda el viaje anterior y permite volver a él", async ({ page }) => {
    await completeBeachIntake(page);
    await page.getByRole("button", { name: "+ Planificar otro viaje" }).click();
    await page.waitForURL("**/planificar");
    // Cuestionario limpio: ningún estilo marcado.
    await expect(page.getByRole("button", { name: /Relax y playa/ })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: /Eurotrip/ }).click();
    await expect(page.getByText("· Guardado")).toBeVisible({ timeout: 10000 });

    await page.goto("/viajes");
    await expect(page.getByRole("heading", { name: "Mis viajes" })).toBeVisible();
    await expect(page.getByText("Con propuesta")).toHaveCount(1);
    await expect(page.getByText("Borrador", { exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Ver propuesta" }).click();
    await page.waitForURL("**/viaje");
    await expect(page.getByRole("heading", { name: "Tus tres alternativas" })).toBeVisible();

    // «Empezar de cero» desde el cuestionario también limpia todo.
    await page.goto("/planificar");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /Empezar de cero/ }).click();
    await expect(page.getByRole("heading", { name: "¿Qué tipo de viaje soñás?" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Relax y playa/ })).toHaveAttribute("aria-pressed", "false");
  });

  test("propuesta en celular @mobile", async ({ page }) => {
    await completeBeachIntake(page);
    await page.goto("/viaje/comparar");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
