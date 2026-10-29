import { expect, test } from "@playwright/test";
import { completeBeachIntake, MONEY_VISIBLE, textWithoutDailySpend } from "./helpers";

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
    expect(await textWithoutDailySpend(p2)).not.toMatch(MONEY_VISIBLE);
    // Los gastos diarios orientativos sí se muestran, sin el presupuesto que indicó el cliente.
    await expect(p2.locator("[data-daily-spend]").filter({ hasText: "Gastos diarios" })).toContainText("por día");
    await expect(p2.locator("[data-daily-spend]").filter({ hasText: "Costo aproximado" })).toContainText("Total estimado por persona");
    for (const t of await p2.locator("[data-daily-spend]").allInnerTexts()) expect(t).not.toMatch(/4321|4\.321/);
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

  test("texto libre: «21 días en Italia» lleva directo a propuestas solo de Italia", async ({ page }) => {
    await page.goto("/planificar");
    await page.locator("#dream").fill("Tengo 21 días en Italia y quiero que me recomiendes las mejores ciudades");
    await expect(page.getByText("Esto es lo que entendimos")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("📍 Italia")).toBeVisible();
    await page.getByRole("button", { name: /Ver mis propuestas ahora/ }).click();
    await page.waitForURL("**/viaje", { timeout: 30000 });
    const text = await page.locator("main").innerText();
    expect(text).toMatch(/Roma|Florencia|Venecia|Milán|Cinque Terre|Amalfitana|Sicilia/);
    expect(text).not.toMatch(/Punta Cana|Curazao|Río de Janeiro|Cancún/);
  });

  test("buscador de aeropuertos en «¿Desde dónde salís?»", async ({ page }) => {
    await page.goto("/planificar");
    await page.getByRole("button", { name: /Relax y playa/ }).click();
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Siguiente" }).click();
    await page.locator("#origin-search").fill("montev");
    await page.getByRole("option", { name: /Montevideo/ }).first().click();
    await expect(page.getByText(/Salís desde/)).toContainText("Montevideo");
  });

  test("PDF real de la propuesta", async ({ page }) => {
    await completeBeachIntake(page);
    const res = await page.request.get("/viaje/pdf", { maxRedirects: 0, timeout: 90000 });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    expect((await res.body()).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("Viorita toma los datos con consentimiento y responde", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir chat con Viorita" }).click();
    const chat = page.getByRole("dialog", { name: "Chat con Viorita" });
    await chat.locator('input[name="name"]').fill("Ana Prueba");
    await chat.locator('input[name="phone"]').fill("+54 9 11 1234 5678");
    await chat.locator('textarea[name="message"]').fill("Quiero ir a Japón en abril");
    await chat.getByRole("button", { name: "Empezar a chatear" }).click();
    await expect(chat.getByText("Necesitamos tu permiso para contactarte.").or(chat.locator("input:invalid"))).toHaveCount(1);
    await chat.locator('input[name="consent"]').check();
    await chat.getByRole("button", { name: "Empezar a chatear" }).click();
    await expect(chat.getByText("Quiero ir a Japón en abril")).toBeVisible();
    await expect(chat.locator("p").filter({ hasText: /Ana/ }).last()).toBeVisible({ timeout: 30000 });
    await chat.getByLabel("Mensaje para Viorita").fill("¿Qué me recomendás?");
    await chat.getByRole("button", { name: "Enviar" }).click();
    await expect(chat.getByText("¿Qué me recomendás?")).toBeVisible();
  });

  test("propuesta en celular @mobile", async ({ page }) => {
    await completeBeachIntake(page);
    await page.goto("/viaje/comparar");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
