import type { Interest, LibraryActivity } from "../types";

export function act(
  id: string,
  name: string,
  kind: LibraryActivity["kind"],
  hours: number,
  effort: 1 | 2 | 3,
  booking: LibraryActivity["booking"],
  tags: Interest[],
  extra: Partial<Pick<LibraryActivity, "indoor" | "months" | "kidsOk" | "url" | "note">> = {},
): LibraryActivity {
  return { id, name, kind, hours, effort, booking, tags, ...extra };
}
