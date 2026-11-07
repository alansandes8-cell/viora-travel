import { expect, test } from "@playwright/test";

test.describe("Buscador de vuelos, hoteles y actividades", () => {
  test("vuelos: busca con el formulario, muestra estimado y toma el pedido", async ({ page }) => {
    await page.goto("/vuelos");
    await page.fill("#vuelo-destino", "madrid");
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Buscar vuelos" }).click();
    await page.waitForURL(/a=MAD/);
    const res = page.locator("#resultados");
    await expect(res.getByText("La recomendada")).toBeVisible();
    await expect(res.getByText(/US\$ \d/).first()).toBeVisible();
    await expect(res.getByText(/No son una cotización/)).toBeVisible();
    const f = page.locator("[data-quote-form]");
    await f.locator('input[name="name"]').fill("Prueba Vuelos");
    await f.locator('input[name="phone"]').fill("+54 9 11 5555 5555");
    await f.locator('input[name="consent"]').check();
    await f.getByRole("button", { name: "Quiero mi cotización" }).click();
    await expect(page.getByText("Ya tenemos tu pedido")).toBeVisible();
  });

  test("hoteles: tres categorías con precio por noche y zonas", async ({ page }) => {
    await page.goto("/hoteles?ciudad=Roma&pais=Italia&entrada=2030-03-10&salida=2030-03-17&hu=2&est=4");
    await expect(page.getByText(/por noche/)).toHaveCount(3);
    await expect(page.getByText(/Total 7 noches/).first()).toBeVisible();
  });

  test("actividades: elegir actividades suma el estimado @mobile", async ({ page }) => {
    await page.goto("/actividades?destino=paris&pe=2");
    await page.getByRole("button", { name: /Louvre/ }).click();
    await expect(page.getByText(/1 elegidas/)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("opiniones: el formulario público queda pendiente de aprobación", async ({ page }) => {
    await page.goto("/opinar");
    await page.locator('input[name="name"]').fill("Prueba O.");
    await page.locator('input[name="trip"]').fill("Brasil");
    await page.locator('textarea[name="text"]').fill("Todo excelente, nos ayudaron con cada detalle del viaje.");
    await page.locator('input[name="consent"]').check();
    await page.getByRole("button", { name: "Enviar mi opinión" }).click();
    await expect(page.getByText("¡Gracias de corazón!")).toBeVisible();
    // No se publica sola: no aparece en la home hasta que la agencia la aprueba.
    await page.goto("/");
    await expect(page.getByText("Todo excelente, nos ayudaron")).toHaveCount(0);
  });
});
