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
  catalog.forEach((entry) =>
    assert.equal(new URL(entry.url).protocol, "https:"),
  );
});
