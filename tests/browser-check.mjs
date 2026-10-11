import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://127.0.0.1:8787");
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
await fs.mkdir("qa", { recursive: true });
await page.screenshot({ path: "qa/home-desktop.png", fullPage: true });
console.log("home title", await page.title(), "errors", errors);
await page.getByRole("link", { name: "生活指南", exact: true }).click();
await page.waitForTimeout(800);
console.log("directory entries", await page.locator(".entry-card").count());
await page.screenshot({ path: "qa/guide-desktop.png", fullPage: true });
await page.getByRole("link", { name: "安心住下来", exact: true }).click();
await page.waitForTimeout(700);
await page.getByRole("link", { name: /查看详情：宿舍报修与后勤/ }).click();
await page.waitForTimeout(500);
console.log(
  "detail page visible",
  await page.locator(".reading-header h1").isVisible(),
);
await page.screenshot({ path: "qa/detail.png" });
await page.goBack();
await page.getByRole("button", { name: "打开校园向导" }).click();
await page.waitForTimeout(500);
await page.getByLabel("向校园向导提问").fill("我的宿舍空调坏了怎么报修");
await page.getByRole("button", { name: "发送问题" }).click();
await page.locator(".recommendations button").first().waitFor();
console.log(
  "assistant top recommendation",
  await page.locator(".recommendations button").first().innerText(),
);
await page.screenshot({ path: "qa/assistant.png" });
await page.getByRole("button", { name: "关闭校园向导" }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:8787");
await page.waitForTimeout(1200);
await page.screenshot({ path: "qa/home-mobile.png", fullPage: true });
console.log(
  "mobile overflow",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
await page.getByRole("button", { name: "展开导航" }).click();
await page.getByRole("link", { name: "校园向导", exact: true }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: "qa/ask-mobile.png", fullPage: true });
console.log(
  "mobile ask overflow",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://127.0.0.1:8787/#/guide?category=health");
await page.waitForTimeout(400);
console.log(
  "reduced motion entries",
  await page.locator(".entry-card").count(),
  "opacity",
  await page
    .locator("main")
    .evaluate((element) => getComputedStyle(element).opacity),
);
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
