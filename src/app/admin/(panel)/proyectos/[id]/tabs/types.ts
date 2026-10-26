import type { projectBundle } from "@/server/services/admin";

export type Bundle = NonNullable<Awaited<ReturnType<typeof projectBundle>>>;
