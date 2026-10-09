import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  searchCatalog,
  localAnswer,
  validateModelAnswer,
} from "../server/catalog-search.mjs";
const catalog = JSON.parse(
  await fs.readFile(new URL("../src/catalog.json", import.meta.url), "utf8"),
);
test("a broken dorm air conditioner leads to repair", () => {
  assert.equal(
    searchCatalog("我的宿舍空调坏了怎么报修", catalog)[0].id,
    "repair",
  );
});
test("medical queries recommend health sources", () => {
  assert.equal(
    searchCatalog("发烧了去哪里看病", catalog)[0].category,
    "health",
  );
});

test("urgent breathing symptoms take priority over financial hardship keywords", () => {
  const question = "胸痛呼吸困难怎么办";
  assert.equal(searchCatalog(question, catalog)[0].id, "health-guide");
  const result = localAnswer(question, catalog);
  assert.match(result.answer, /立即拨打 120/);
  assert.ok(!result.recommendations.includes("scholarship"));
  assert.deepEqual(result.categories, ["health"]);
});

test("ordinary financial hardship still leads to student aid", () => {
  assert.equal(
    searchCatalog("家庭经济困难申请助学金", catalog)[0].id,
    "scholarship",
  );
});
test("unknown questions do not invent destinations", () => {
  const result = localAnswer("量子引力张量", catalog);
  assert.deepEqual(result.recommendations, []);
  assert.equal(result.mode, "local");
});
test("model cannot introduce a destination outside the catalog", () => {
  assert.throws(() =>
    validateModelAnswer(
      { answer: "点击这里", recommendations: ["phishing-url"] },
      catalog,
    ),
  );
});
test("valid model destinations are unique and map to existing categories", () => {
  const result = validateModelAnswer(
    { answer: "查看报修渠道", recommendations: ["repair", "repair"] },
    catalog,
  );
  assert.deepEqual(result.recommendations, ["repair"]);
  assert.deepEqual(result.categories, ["housing"]);
});
test("catalog links are HTTPS and entries are uniquely identified", () => {
  assert.equal(new Set(catalog.map((entry) => entry.id)).size, catalog.length);
  catalog
    .filter((entry) => entry.url)
    .forEach((entry) => assert.equal(new URL(entry.url).protocol, "https:"));
});
