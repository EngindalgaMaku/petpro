// Runs once when the server starts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { sessionSecretProblem } = await import("@/lib/session-secret");
    // Without a usable key nobody can sign in. The server stays up so the pages and this line
    // can be seen: a container that exits at once leaves the host with no log to show
    const problem = sessionSecretProblem();
    if (problem) console.error(`[start] Sign-in is disabled: ${problem}`);

    if (process.env.AUTO_SEED === "true") {
      try {
        const { startDemoResets } = await import("@/lib/demo-reset");
        await startDemoResets();
      } catch (error) {
        console.error("[demo] could not start", error);
      }
    }
  }
}
