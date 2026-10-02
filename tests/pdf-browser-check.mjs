import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalog = JSON.parse(
  await fs.readFile(path.join(root, "src/catalog.json"), "utf8"),
);
const qa = path.join(root, "qa");
await fs.mkdir(qa, { recursive: true });
const base = process.env.PREVIEW_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const byId = (id) => {
  const entry = catalog.find((candidate) => candidate.id === id);
  assert.ok(entry, `Missing entry ${id}`);
  return entry;
};
function entryCard(entry) {
  return page
    .locator(".entry-card")
    .filter({ has: page.getByText(entry.title, { exact: true }) });
}
async function navigate(hash = "") {
  await page.goto(`${base}/${hash}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(450);
}
async function open(entry) {
  await entryCard(entry).click();
  await expect(page.locator(".entry-dialog")).toBeVisible();
  await page.waitForTimeout(360);
  const geometry = await page
    .locator(".detail-cover > img")
    .evaluate(async (img) => {
      await img.decode();
      return {
        width: img.naturalWidth,
        height: img.getBoundingClientRect().height,
        fit: getComputedStyle(img).objectFit,
      };
    });
  assert.ok(
    geometry.width > 0 && geometry.height > 150,
    `Missing top image for ${entry.id}`,
  );
  assert.equal(
    await page.locator(".detail-scroll").evaluate((el) => el.scrollTop),
    0,
  );
  if (entry.imageFit === "contain")
    assert.equal(
      geometry.fit,
      "contain",
      `Original image is cropped for ${entry.id}`,
    );
}
async function close(entry, method = "escape") {
  if (method === "bottom")
    await page
      .getByRole("button", { name: "关闭本条指南", exact: true })
      .click();
  else if (method === "top") await page.locator(".dialog-close").click();
  else await page.keyboard.press("Escape");
  await expect(page.locator(".entry-dialog")).not.toBeVisible();
  assert.ok(
    await entryCard(entry).evaluate((el) => document.activeElement === el),
    `Focus did not return for ${entry.id}`,
  );
}
async function noPageOverflow() {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
}
async function photoPopup(
  entry,
  locator = page.locator(".detail-gallery-item").first(),
) {
  const popupPromise = page.waitForEvent("popup");
  await locator.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("load");
  assert.ok(popup.url().includes(entry.gallery[0].image));
  await popup.close();
}
async function screenshot(name, fullPage = false) {
  await page.screenshot({ path: path.join(qa, name), fullPage });
}

try {
  await navigate();
  assert.equal(
    await page.locator(".category-card, .service-category-card").count(),
    12,
  );
  await navigate("#/guide");
  await expect(page.locator(".entry-card")).toHaveCount(catalog.length);
  assert.equal(await page.locator(".filter-tabs a").count(), 13);
  for (const entry of catalog) {
    await open(entry);
    assert.equal(
      await page.locator(".detail-prose p").count(),
      entry.content.length,
    );
    assert.equal(await page.locator(".detail-page-reference").count(), 0);
    assert.doesNotMatch(
      await page.locator(".entry-dialog").innerText(),
      /PDF|Untitled|宝典|原文|kdocs/i,
    );
    await close(entry);
  }
  console.log(
    `PASS: ${catalog.length} detail images, business instructions, source privacy, Escape focus restore`,
  );

  const shuttle = byId("pdf-teaching-shuttle");
  await open(shuttle);
  await screenshot("pdf-detail-desktop.png");
  const table = page.locator(".detail-table-scroll");
  assert.equal(await table.locator("tbody tr").count(), 28);
  await table.scrollIntoViewIfNeeded();
  assert.ok(await table.evaluate((el) => el.scrollHeight > el.clientHeight));
  await screenshot("pdf-shuttle-table-desktop.png");
  await table.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  assert.ok(await table.evaluate((el) => el.scrollTop > 0));
  assert.equal(await page.locator(".detail-cta").count(), 0);
  await close(shuttle, "bottom");

  const mapEntry = byId("pdf-campus-map");
  await open(mapEntry);
  await page.locator(".detail-gallery").scrollIntoViewIfNeeded();
  await screenshot("pdf-map.png");
  await photoPopup(mapEntry);
  await close(mapEntry, "bottom");

  const takeoutEntries = catalog.filter(
    (entry) => entry.id.startsWith("pdf-takeout-") && entry.gallery.length,
  );
  const takeout = byId("pdf-takeout-kuaituan");
  for (const entry of takeoutEntries) {
    await open(entry);
    if (entry.id === takeout.id) await screenshot("pdf-takeout-desktop.png");
    await page.locator(".detail-gallery").scrollIntoViewIfNeeded();
    await photoPopup(entry);
    await close(entry, "bottom");
  }
  console.log(
    `PASS: ${takeoutEntries.length} uncropped mini-program originals and full-size popups; bottom close`,
  );

  const telephoneEntry = catalog.find((entry) =>
    entry.links.some((link) => link.url.startsWith("tel:")),
  );
  assert.ok(telephoneEntry);
  await open(telephoneEntry);
  const tel = page.locator('.detail-links a[href^="tel:"]').first();
  await tel.scrollIntoViewIfNeeded();
  assert.ok(await tel.isVisible());
  assert.ok((await tel.getAttribute("href")).startsWith("tel:"));
  await close(telephoneEntry);

  await page.evaluate(() => {
    location.hash = "/guide?category=network";
    setTimeout(() => {
      location.hash = "/guide?category=food";
    }, 25);
    setTimeout(() => {
      location.hash = "/guide?category=facilities";
    }, 55);
  });
  await page.waitForTimeout(850);
  assert.equal(await page.locator(".page-heading h1").innerText(), "校园地图");
  assert.equal(
    await page.locator("main").evaluate((el) => getComputedStyle(el).opacity),
    "1",
  );
  console.log("PASS: interrupted GSAP route transitions and telephone action");

  await page.setViewportSize({ width: 390, height: 844 });
  await navigate("#/guide?category=travel");
  await noPageOverflow();
  assert.equal(
    await page
      .locator(".page-heading h1")
      .evaluate((el) => getComputedStyle(el).outlineStyle),
    "none",
  );
  await screenshot("pdf-guide-mobile.png", true);
  await open(shuttle);
  await screenshot("pdf-detail-mobile.png");
  await screenshot("pdf-detail-top-mobile.png");
  await noPageOverflow();
  await table.scrollIntoViewIfNeeded();
  await screenshot("pdf-shuttle-table-mobile.png");
  assert.ok(
    await table.evaluate(
      (el) =>
        el.scrollWidth > el.clientWidth && el.scrollHeight > el.clientHeight,
    ),
  );
  await table.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    el.scrollLeft = el.scrollWidth;
  });
  assert.ok(
    await table.evaluate((el) => el.scrollTop > 0 && el.scrollLeft > 0),
  );
  await close(shuttle, "bottom");
  await open(shuttle);
  await close(shuttle, "top");
  await page.getByRole("button", { name: "展开导航", exact: true }).click();
  await expect(page.locator(".header-nav")).toBeVisible();
  await page.getByRole("link", { name: "校园向导", exact: true }).click();
  await page.waitForTimeout(650);
  assert.equal(await page.locator(".header-nav").isVisible(), false);
  await noPageOverflow();
  for (const category of new Set(catalog.map((entry) => entry.category))) {
    await navigate(`#/guide?category=${category}`);
    assert.ok(await page.locator(".entry-card").count());
    await noPageOverflow();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await navigate("#/guide?category=facilities");
  await open(mapEntry);
  await close(mapEntry);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: mobile 12 categories, no overflow, menu, independent two-axis table scrolling, top/bottom/Escape close, reduced motion",
  );
  console.log("PDF browser verification passed; screenshots in qa/");
} finally {
  await browser.close();
}
