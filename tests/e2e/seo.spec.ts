import { expect, test } from "@playwright/test";

test.describe("SEO", () => {
  test("robots y sitemap: públicas sí, privadas no", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap:");
    const map = await (await request.get("/sitemap.xml")).text();
    expect(map).toContain("/destinos/roma");
    expect(map).toContain("/paquetes/");
    expect(map).not.toContain("/admin");
  });

  test("guía de destino: título, canónica, datos estructurados y una sola h1", async ({ page }) => {
    await page.goto("/destinos/roma");
    await expect(page).toHaveTitle(/Viajar a Roma desde Argentina/);
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/\/destinos\/roma$/);
    await expect(page.locator("h1")).toHaveCount(1);
    const types = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.flatMap((e) => [JSON.parse(e.textContent ?? "{}")].flat().map((x) => x["@type"])));
    expect(types).toEqual(expect.arrayContaining(["TravelAgency", "TouristDestination", "FAQPage", "BreadcrumbList"]));
    await expect(page.getByRole("heading", { name: /¿Cuánto cuesta viajar a Roma\?/ })).toBeVisible();
  });

  test("páginas privadas no se indexan", async ({ page }) => {
    await page.goto("/viajes");
    expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
  });

  test("todas las guías responden", async ({ request }) => {
    const map = await (await request.get("/sitemap.xml")).text();
    const urls = [...map.matchAll(/<loc>[^<]*?(\/destinos\/[a-z0-9-]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(50);
    for (const u of urls) expect((await request.get(u)).status(), u).toBe(200);
  });
});
