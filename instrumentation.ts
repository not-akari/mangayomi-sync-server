export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startGcScheduler } = await import("@/lib/services/gc");
    startGcScheduler();
  }
}
