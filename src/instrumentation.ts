/** Tareas al iniciar el servidor (solo en Node, no en compilación). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { scheduleWarmup } = await import("./server/media-warmup");
  scheduleWarmup();
}
