import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const problems = [];
page.on("pageerror", (error) => problems.push(error.message));
await page.goto("http://127.0.0.1:8787");
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "“宿舍空调坏了怎么办？”" }).click();
await page
  .locator(".recommendations button")
  .first()
  .waitFor({ timeout: 10000 });
console.log(
  "preset question completed",
  await page.locator(".recommendations button").first().innerText(),
);
await page.getByRole("button", { name: "关闭校园向导" }).click();
await page.evaluate(() => {
  location.hash = "#/guide?category=food";
  setTimeout(() => (location.hash = "#/guide?category=travel"), 30);
  setTimeout(() => (location.hash = "#/journey?stage=graduation"), 60);
});
await page.waitForTimeout(1000);
console.log(
  "rapid navigation final",
  await page.locator("h1").innerText(),
  await page
    .locator("main")
    .evaluate((element) => getComputedStyle(element).opacity),
);
await page.goBack();
await page.waitForTimeout(700);
console.log("history back", await page.locator("h1").innerText());
await page.setViewportSize({ width: 768, height: 1024 });
await page.goto("http://127.0.0.1:8787");
await page.waitForTimeout(1200);
await page.screenshot({ path: "qa/home-tablet.png", fullPage: true });
console.log(
  "tablet overflow",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(
  "http://127.0.0.1:8787/#/guide?category=all&q=%E9%87%8F%E5%AD%90%E5%BC%95%E5%8A%9B",
);
await page.waitForTimeout(700);
console.log(
  "empty state",
  await page.getByRole("heading", { name: "暂时没有找到相关指南" }).isVisible(),
);
await page.goto("http://127.0.0.1:8787/#/ask");
await page.waitForTimeout(500);
await page.getByLabel("向校园向导提问").fill("量子引力");
await page.getByRole("button", { name: "发送问题" }).click();
await page.getByText(/目前的站内资料没有匹配/).waitFor();
console.log(
  "no fabricated recommendations",
  await page.locator(".recommendations button").count(),
);
await page.screenshot({ path: "qa/ask-mobile.png", fullPage: true });
console.log("browser problems", problems);
await browser.close();
if (problems.length) throw new Error("browser errors");
