import { generate } from "./generate";
import logger from "./logger";

generate().catch((err) => {
  logger.error(err);
  process.exitCode = 1;
});
