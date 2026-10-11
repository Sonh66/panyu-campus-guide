import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { searchCatalog } from "../server/catalog-search.mjs";
const catalog = JSON.parse(
  await fs.readFile(new URL("../src/catalog.json", import.meta.url), "utf8"),
);
const transitions = JSON.parse(
  await fs.readFile(
    new URL("../src/catalog-transitions.json", import.meta.url),
    "utf8",
  ),
);
const byId = new Map(catalog.map((entry) => [entry.id, entry]));
const blocks = (id) =>
  byId.get(id).sections.flatMap((section) => section.blocks);

test("tutorial pictures follow their instructions in the supplied order", () => {
  for (const [id, expected] of [
    ["pdf-jnuid-login", [5, 6, 7, 8]],
    ["pdf-network-application", [9, 10, 11, 12]],
    ["pdf-jnu-secure-wifi", [13]],
    ["pdf-wired-network", [14, 15]],
    ["pdf-campus-network-repair", [16, 17, 18, 19]],
  ]) {
    const content = blocks(id);
    const pictures = content.filter(
      (block) =>
        block.type === "image" && block.image.includes("/instructions/"),
    );
    assert.deepEqual(
      pictures.map((block) => Number(block.image.match(/step-(\d+)/)[1])),
      expected,
    );
    for (const picture of pictures) {
      const index = content.indexOf(picture);
      assert.equal(
        content[index - 1].type,
        "paragraph",
        `${id}: picture is detached from its instruction`,
      );
    }
  }
});

test("embedded workbooks retain all rows, and map remains the supplied complete image", () => {
  const table = (id, caption) =>
    blocks(id).find(
      (block) => block.type === "table" && block.caption === caption,
    );
  assert.equal(
    table("welcome", "常用服务与官方入口（完整表格）").rows.length,
    4,
  );
  assert.equal(
    table("intercity-panyu", "五个城际站选择对照（完整表格）").rows.length,
    5,
  );
  assert.equal(table("health-guide", "完整门诊与急诊联系表").rows.length, 6);
  assert.equal(byId.get("pdf-campus-map").imageFit, "contain");
});

test("removed places disappear, merged guides retain their distinct information", () => {
  for (const id of transitions.removed) assert.ok(!byId.has(id));
  assert.doesNotMatch(JSON.stringify(catalog), /白鸽\s*25|F5\s*米粉/);
  for (const [old, target] of Object.entries(transitions.aliases)) {
    assert.ok(!byId.has(old));
    assert.ok(byId.has(target));
  }
  assert.ok(
    blocks("pdf-express-centre").some(
      (block) =>
        block.type === "steps" &&
        block.items.some((item) => item.includes("收件")),
    ),
  );
  assert.ok(
    blocks("pdf-luckin-t3").some(
      (block) => block.type === "paragraph" && block.text.includes("东门"),
    ),
  );
  assert.ok(
    blocks("career-job-search").some(
      (block) => block.type === "table" && block.rows.length === 20,
    ),
  );
});

test("search includes detailed paragraphs and historical report tables", () => {
  assert.ok(
    searchCatalog("G2942", catalog).some(
      (entry) => entry.id === "rail-qingsheng",
    ),
  );
  assert.ok(
    searchCatalog("11926", catalog).some(
      (entry) => entry.id === "career-employment-reports",
    ),
  );
  assert.ok(
    blocks("career-employment-reports").some(
      (block) =>
        block.type === "paragraph" &&
        block.text.includes("统计范围与口径尚需核对"),
    ),
  );
});
