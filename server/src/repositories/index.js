import { createJsonRepositories } from "./jsonRepositories.js";
import { createPostgresRepositories } from "./postgresRepositories.js";

export function createRepositories(data, options = {}) {
  const backend = options.backend ?? process.env.REPOSITORY_BACKEND ?? "json";

  if (backend === "json") {
    return createJsonRepositories(data);
  }

  if (backend === "postgres") {
    return createPostgresRepositories(options);
  }

  throw new Error(`Unknown repository backend: ${backend}`);
}

export { createJsonRepositories };
