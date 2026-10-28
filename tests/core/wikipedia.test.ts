import { describe, expect, it } from "vitest";
import { wikipediaImages } from "@/server/integrations/wikipedia";

const info = (title: string, w: number, h: number, license = "CC BY-SA 4.0") => ({
  title: `File:${title}`,
  imageinfo: [{ url: `https://upload.wikimedia.org/${title}`, thumburl: `https://upload.wikimedia.org/thumb/${title}`, thumbwidth: 1600, thumbheight: Math.round((1600 * h) / w), width: w, height: h, descriptionurl: `https://commons.wikimedia.org/wiki/File:${title}`, extmetadata: { LicenseShortName: { value: license }, Artist: { value: "<a href='x'>Ana Pérez</a>" } } }],
});

function fake(routes: { byTitle?: unknown; search?: unknown; info?: unknown }) {
  const calls: string[] = [];
  const fetchJson = async (url: string) => {
    calls.push(url);
    if (url.includes("prop=imageinfo")) return routes.info;
    if (url.includes("generator=search")) return routes.search;
    return routes.byTitle;
  };
  return { fetchJson, calls };
}

describe("Fotos de Wikipedia (lugares emblemáticos)", () => {
  it("usa la imagen principal del artículo exacto, con autor y licencia libre", async () => {
    const { fetchJson, calls } = fake({
      byTitle: { query: { pages: [{ title: "Perito Moreno Glacier", pageimage: "Perito_Moreno_Glacier_Patagonia_Argentina.jpg" }] } },
      info: { query: { pages: [info("Perito Moreno Glacier Patagonia Argentina.jpg", 4000, 2600)] } },
    });
    const r = await wikipediaImages("Perito Moreno Glacier", 1, fetchJson);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].url).toContain("thumb/Perito");
    expect(r.items[0].attribution).toBe("Ana Pérez — CC BY-SA 4.0, vía Wikipedia");
    expect(calls.some((c) => c.includes("generator=search"))).toBe(false);
  });
  it("descarta mapas, banderas, fotos verticales y licencias no libres", async () => {
    const files = ["Map_of_Bariloche.jpg", "Flag_of_X.jpg", "Tall_tower.jpg", "Nonfree.jpg", "Nahuel_Huapi_lake.jpg"];
    const { fetchJson } = fake({
      byTitle: { query: { pages: [{ title: "Bariloche", missing: true }] } },
      search: { query: { pages: files.map((f, i) => ({ title: `P${i}`, index: i + 1, pageimage: f })) } },
      info: { query: { pages: [info("Tall tower.jpg", 1200, 3000), info("Nonfree.jpg", 3000, 2000, "Fair use"), info("Nahuel Huapi lake.jpg", 3000, 2000)] } },
    });
    const r = await wikipediaImages("Bariloche", 3, fetchJson);
    expect(r.items.map((i) => i.url)).toEqual(["https://upload.wikimedia.org/thumb/Nahuel Huapi lake.jpg"]);
  });
  it("sin imagen apta devuelve vacío (se muestra la postal ilustrada)", async () => {
    const { fetchJson } = fake({ byTitle: { query: { pages: [{ title: "X", missing: true }] } }, search: { query: { pages: [] } } });
    expect((await wikipediaImages("Lugar inexistente", 2, fetchJson)).items).toEqual([]);
  });
});
