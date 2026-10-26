import { expect, test } from "@playwright/test";
import { completeBeachIntake } from "./helpers";

test.describe("Fallas de proveedores externos", () => {
  test("imágenes que no cargan muestran un reemplazo y la página sigue funcionando", async ({ page }) => {
    await page.route(/(unsplash|pexels|wikimedia|ytimg)/, (r) => r.abort());
    await completeBeachIntake(page);
    await expect(page.getByRole("heading", { name: "Tus tres alternativas" })).toBeVisible();
    await page.goto("/viaje/itinerario");
    await expect(page.getByText("Día por día")).toBeVisible();
  });

  test("el mapa cae al esquema si el proveedor de teselas falla", async ({ page }) => {
    await page.route(/openfreemap|tiles/, (r) => r.abort());
    await completeBeachIntake(page);
    await page.goto("/viaje/itinerario");
    await expect(page.locator('svg[aria-label^="Ruta:"]')).toBeVisible({ timeout: 20000 });
  });
});
