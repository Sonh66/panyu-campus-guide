import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const executable = process.env.PYTHON_EXECUTABLE || "python";
const child = spawn(
  executable,
  [fileURLToPath(new URL("./detail_browser.py", import.meta.url))],
  { stdio: "inherit", env: process.env },
);
child.on("error", (error) => {
  console.error(
    "Set PYTHON_EXECUTABLE to a Python runtime with Playwright:",
    error.message,
  );
  process.exitCode = 1;
});
child.on("close", (code) => {
  process.exitCode = code ?? 1;
});
