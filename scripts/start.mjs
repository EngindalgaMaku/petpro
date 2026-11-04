// Production start (npm start): bring the database schema up to date, then start Next.js.
// The project has no maintained migration history; schema changes are applied with
// `prisma db push`. Without --accept-data-loss it only applies changes that keep every row
// (new tables, new nullable columns) and refuses anything destructive; if it refuses or the
// database is unreachable, the app still starts and the log says why.
import { spawnSync, spawn } from "node:child_process";

// npx is a .cmd on Windows and needs a shell there; the command is passed as one string
const run = (command, spawner) =>
  process.platform === "win32"
    ? spawner(command.join(" "), { stdio: "inherit", shell: true })
    : spawner(command[0], command.slice(1), { stdio: "inherit" });

const push = run(["npx", "prisma", "db", "push", "--skip-generate"], spawnSync);
if (push.status !== 0) {
  console.error("[start] prisma db push did not complete; starting with the current schema");
}

const next = run(["npx", "next", "start", ...process.argv.slice(2)], spawn);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => next.kill(signal));
next.on("exit", (code) => process.exit(code ?? 0));
