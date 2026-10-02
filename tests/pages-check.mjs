import { chromium } from "@playwright/test";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (!url.pathname.startsWith("/panyu-campus-guide/")) {
      response.writeHead(404);
      response.end();
      return;
    }
    const suffix = decodeURIComponent(
      url.pathname.slice("/panyu-campus-guide/".length),
    );
    const target = path.resolve(root, suffix || "index.html");
    if (!target.startsWith(root + path.sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    const body = await fs.readFile(target);
    response.writeHead(200, {
      "Content-Type": mime[path.extname(target)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("No test address");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE,
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const problems = [];
  const failed = [];
  const apis = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failed.push(response.url());
  });
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      apis.push(request.url());
  });
  await page.goto(`http://127.0.0.1:${address.port}/panyu-campus-guide/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1100);
  const images = await page
    .locator("img")
    .evaluateAll((images) =>
      images.every((image) => image.complete && image.naturalWidth > 0),
    );
  if (!images) throw new Error("A Pages image did not load");
  await page.getByRole("button", { name: "打开校园向导" }).click();
  await page.getByLabel("向校园向导提问").fill("宿舍空调坏了");
  await page.getByRole("button", { name: "发送问题" }).click();
  await page.locator(".recommendations button").first().waitFor();
  console.log(
    "Pages subpath images:",
    images,
    "recommendation:",
    await page.locator(".recommendations button").first().innerText(),
  );
  await page.getByRole("button", { name: "关闭校园向导" }).click();
  await page.getByRole("link", { name: /今天吃什么/ }).click();
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForTimeout(700);
  console.log(
    "Reloaded category:",
    await page.locator("h1").innerText(),
    "API requests:",
    apis.length,
    "errors:",
    problems.length,
    "failed assets:",
    failed.length,
  );
  if (apis.length || problems.length || failed.length)
    throw new Error("Pages static deployment check failed");
} finally {
  await browser.close();
  server.close();
}
