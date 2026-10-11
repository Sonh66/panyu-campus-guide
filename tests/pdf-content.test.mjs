import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { searchCatalog, localAnswer } from "../server/catalog-search.mjs";

const catalog = JSON.parse(
  await fs.readFile(new URL("../src/catalog.json", import.meta.url), "utf8"),
);
const mapping = JSON.parse(
  await fs.readFile(
    new URL("../docs/pdf-page-map.json", import.meta.url),
    "utf8",
  ),
);
const transitions = JSON.parse(
  await fs.readFile(
    new URL("../src/catalog-transitions.json", import.meta.url),
    "utf8",
  ),
);
const byId = new Map(catalog.map((entry) => [entry.id, entry]));
const provenance = JSON.parse(
  await fs.readFile(
    new URL("../docs/catalog-provenance.json", import.meta.url),
    "utf8",
  ),
);
const provenanceById = new Map(provenance.map((entry) => [entry.id, entry]));

test("all 50 PDF pages have imported, readable entries and page provenance", () => {
  assert.deepEqual(
    mapping.map((row) => row.page),
    Array.from({ length: 50 }, (_, index) => index + 1),
  );
  for (const row of mapping) {
    assert.ok(row.entryIds.length > 0, `Page ${row.page} is missing`);
    for (const id of row.entryIds) {
      if (transitions.removed.includes(id)) {
        assert.ok(!byId.has(id));
        continue;
      }
      const entry = byId.get(transitions.aliases[id] || id);
      assert.equal(provenanceById.get(id)?.sourceState, "pdf");
      assert.ok(provenanceById.get(id).sourcePages.includes(row.page));
      assert.ok(entry.content.length > 0);
    }
  }
  assert.ok(provenanceById.get("pdf-jnu-secure-wifi").sourcePages.includes(26));
  assert.match(
    byId.get("pdf-jnu-secure-wifi").content.join(" "),
    /个人校园网密码/,
  );
});

test("every entry has a packaged detail image and valid optional galleries", async () => {
  for (const entry of catalog) {
    assert.ok(
      entry.imageAlt && entry.imageCredit,
      `${entry.id}: image metadata missing`,
    );
    for (const image of [
      entry.image,
      ...entry.sections.flatMap((section) =>
        section.blocks
          .filter((block) => block.type === "image")
          .map((block) => block.image),
      ),
    ]) {
      assert.match(image, /^images\//);
      assert.ok(!image.includes(".."));
      const file = new URL(`../public/${image}`, import.meta.url);
      assert.ok(
        (await fs.stat(file)).size > 1000,
        `${entry.id}: missing image ${image}`,
      );
    }
  }
  for (const category of [
    "account",
    "network",
    "payment",
    "logistics",
    "facilities",
  ])
    assert.ok(catalog.some((entry) => entry.category === category));
});

test("full transport schedules and all five network offices are preserved", () => {
  assert.equal(byId.get("pdf-teaching-shuttle").tables[0].rows.length, 28);
  assert.equal(byId.get("pdf-ruyue-bus").tables[0].rows.length, 16);
  assert.equal(byId.get("pdf-xinzao-campus-minibus").tables[0].rows.length, 4);
  assert.equal(
    byId.get("pdf-network-service-locations").tables[0].rows.length,
    5,
  );
  assert.match(
    byId.get("pdf-teaching-shuttle").content.join(" "),
    /允许学生乘坐/,
  );
});

test("each named takeout program is independent and searchable", () => {
  for (const [query, id] of [
    ["快点星球", "pdf-takeout-kuaituan"],
    ["暨食堂", "pdf-takeout-jnu-canteen"],
    ["够钟点餐", "pdf-takeout-gouzhong"],
    ["暨食到家", "pdf-takeout-jnu-delivery"],
    ["校园外卖购", "pdf-takeout-waimaigou"],
    ["星球点点", "pdf-takeout-xingqiudiandian"],
    ["Ask For饭", "pdf-takeout-askforfan"],
    ["校园无忧GO", "pdf-takeout-wuyougo"],
    ["一点达", "pdf-takeout-yidianda"],
  ]) {
    assert.equal(searchCatalog(query, catalog)[0].id, id);
    assert.ok(byId.get(id).steps.some((step) => step.includes("微信搜索")));
  }
});

test("network faults lead to network repair without revealing data sources", () => {
  const result = localAnswer("我的宿舍网络坏了怎么报修", catalog);
  assert.equal(result.recommendations[0], "pdf-campus-network-repair");
  assert.match(result.answer, /MyNet/);
  assert.doesNotMatch(result.answer, /PDF|宝典|原文|kdocs/i);
});

test("PDF extra links use explicit website, phone and email schemes", () => {
  for (const entry of catalog)
    for (const link of entry.links)
      assert.ok(
        ["https:", "tel:", "mailto:"].includes(new URL(link.url).protocol),
      );
});
