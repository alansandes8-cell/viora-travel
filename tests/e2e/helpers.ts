import { expect, type Page } from "@playwright/test";

/** Completa el cuestionario con un viaje de playa de 14 noches. */
export async function completeBeachIntake(page: Page) {
  await page.goto("/planificar");
  await page.getByRole("button", { name: /Relax y playa/ }).click();
  await page.locator("#dream").fill("Quiero 14 días descansando en una playa con agua turquesa y buena gastronomía");
  await page.getByRole("button", { name: "Siguiente" }).click();
  // «¿Esto o aquello?»
  await page.getByRole("button", { name: "Playa", exact: true }).click();
  await page.getByRole("button", { name: "Ritmo lento", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "febrero" }).click();
  await page.locator("#nights").fill("14");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Siguiente" }).click();
  await page.locator("#amount").fill("4321");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Descansar", exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("button", { name: /Ver mis alternativas/ })).toBeEnabled({ timeout: 15000 });
  await page.getByRole("button", { name: /Ver mis alternativas/ }).click();
  await page.waitForURL("**/viaje", { timeout: 30000 });
}

/** Patrón de importes visibles: no debe aparecer en vistas del cliente. */
export const MONEY_VISIBLE = /(US\$|U\$S|USD|ARS|EUR|€)\s?\d|\$\s?\d{2,}|4321|4\.321/;

/** Texto visible de la página SIN la tarjeta de gastos diarios orientativos (única excepción pedida por la agencia). */
export async function textWithoutDailySpend(page: Page): Promise<string> {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll<HTMLElement>("[data-daily-spend]")];
    cards.forEach((n) => (n.style.display = "none"));
    const text = document.body.innerText;
    cards.forEach((n) => (n.style.display = ""));
    return text;
  });
}
