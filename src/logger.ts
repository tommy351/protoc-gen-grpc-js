import { Console } from "console";

export default new Console({
  stdout: process.stderr,
  stderr: process.stderr,
});
