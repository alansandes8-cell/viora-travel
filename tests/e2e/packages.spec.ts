import { expect, test } from "@playwright/test";

test.describe("Paquetes armados", () => {
  test("la portada ofrece los dos caminos y el catálogo filtra por experiencia", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Planificá tu viaje/ })).toBeVisible();
    await page.getByRole("link", { name: /Ver paquetes armados/ }).click();
    await page.waitForURL("**/paquetes");
    await expect(page.getByRole("heading", { name: "Paquetes armados" })).toBeVisible();
    await page.getByRole("navigation", { name: "Experiencias" }).getByRole("link", { name: /Disney/ }).click();
    await page.waitForURL("**/paquetes?cat=disney");
    await expect(page.getByRole("heading", { name: "Disney + Miami" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Praga/ })).toHaveCount(0);
    await page.getByRole("heading", { name: "Disney + Miami" }).click();
    await page.waitForURL("**/paquetes/disney-y-miami");
    await expect(page.getByRole("heading", { name: /Recorrido · 10 noches/ })).toBeVisible();
    await expect(page.locator("aside").getByText(/Consultá el precio|Desde/).first()).toBeVisible();
    if (process.env.AGENCY_WHATSAPP) await expect(page.getByRole("link", { name: /Consultar por WhatsApp/ })).toHaveAttribute("href", /wa\.me/);
  });

  test("un paquete inexistente o con slug raro da 404", async ({ page }) => {
    expect((await page.goto("/paquetes/no-existe"))?.status()).toBe(404);
    expect((await page.goto("/paquetes/..%2Fadmin"))?.status()).toBe(404);
  });
});
