import { PrismaClient } from "@prisma/client";
import { seedDemo } from "./demo-seed";

const CHECK_EVERY_MS = 10 * 60 * 1000;
const RESET_HOUR_TR = 3;

/** The demo day a moment belongs to: it changes at 03:00 Turkey time (UTC+3 all year) */
export const demoDay = (at: Date) => new Date(at.getTime() + (3 - RESET_HOUR_TR) * 3600 * 1000).toISOString().slice(0, 10);

/** Calls `run` once per demo day; a failed run is tried again on the next call */
export function dailyRunner(run: () => Promise<void>, startedAt: Date) {
  let last = demoDay(startedAt);
  return async (now: Date) => {
    if (demoDay(now) === last) return false;
    await run();
    last = demoDay(now);
    return true;
  };
}

/** Fills the demo salon now, then keeps it fresh for as long as the server runs */
export async function startDemoResets() {
  const prisma = new PrismaClient();
  // Only the shared demo: businesses that signed up keep their records (lib/plan.ts)
  const reset = () => seedDemo(prisma);
  const report = (error: unknown) => console.error("[demo] sıfırlama başarısız", error);

  await reset().catch(report);
  const tick = dailyRunner(reset, new Date());
  setInterval(() => void tick(new Date()).catch(report), CHECK_EVERY_MS).unref();
}
