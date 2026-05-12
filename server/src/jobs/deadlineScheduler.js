import { fileURLToPath } from "node:url";
import { JsonStore } from "../data/store.js";
import { runDeadlineScheduler } from "../services/schedulerService.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runDeadlineSchedulerLoop({
  dataFile = process.env.DATA_FILE,
  intervalMs = Number(process.env.SCHEDULER_INTERVAL_MS ?? 15 * 60 * 1000),
  once = process.env.SCHEDULER_ONCE === "true"
} = {}) {
  const store = new JsonStore(dataFile);

  while (true) {
    const result = await store.mutate((data) => runDeadlineScheduler(data, { actorId: "scheduler" }));
    console.log(`[scheduler] scanned=${result.scannedCases} created=${result.created.length}`);

    if (once) {
      return result;
    }

    await sleep(intervalMs);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runDeadlineSchedulerLoop().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
