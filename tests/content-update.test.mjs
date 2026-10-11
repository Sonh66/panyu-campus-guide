import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { localAnswer, searchCatalog } from "../server/catalog-search.mjs";

const catalog = JSON.parse(
  await fs.readFile(new URL("../src/catalog.json", import.meta.url), "utf8"),
);
const byId = new Map(catalog.map((entry) => [entry.id, entry]));

test("both suspended transport routes warn users before any historical timetable", () => {
  for (const id of ["pdf-xinzao-campus-minibus", "pdf-ruyue-bus"]) {
    const entry = byId.get(id);
    assert.match(entry.title, /暂停服务/);
    assert.match(entry.summary, /暂停服务/);
    assert.ok(entry.tables.every((table) => /历史/.test(table.caption)));
    const response = localAnswer(entry.tags[0], catalog);
    assert.match(response.answer, /暂停服务/);
  }
  assert.doesNotMatch(
    byId.get("pdf-xinzao-metro").summary,
    /查看步行与校园小巴方案/,
  );
});

test("Guangzhou South journey gives the correct metro directions", () => {
  const entry = byId.get("rail-guangzhou-south");
  assert.match(entry.summary, /4号线黄村方向/);
  assert.match(entry.summary, /7号线美的大道方向/);
  assert.equal(searchCatalog("广州南站怎么去", catalog)[0].id, entry.id);
  assert.match(
    byId.get("intercity-university-town").content.join(" "),
    /不能坐7号线到大学城北/,
  );
});

test("employment schedules retain all supplied events and distinguish closed activity", () => {
  const fairs = byId.get("career-job-fairs");
  assert.deepEqual(
    fairs.tables.map((table) => table.rows.length),
    [8, 4, 4],
  );
  assert.match(fairs.summary, /已结束/);
  assert.equal(byId.get("career-company-talks").tables[0].rows.length, 22);
  assert.equal(
    byId.get("career-recruitment-notices").tables[0].rows.length,
    20,
  );
  assert.equal(byId.get("career-job-search").tables[0].rows.length, 15);
  assert.match(
    byId.get("career-selection-policy").content.join(" "),
    /当前已结束/,
  );
  assert.match(byId.get("internship-hongkong-gba").summary, /已结束/);
  assert.equal(byId.get("career").url, "https://scdc.jnu.edu.cn/");
});

test("all 19 instruction pictures are attached to relevant guides and the map has changed", async () => {
  const used = new Set(
    catalog.flatMap((entry) => entry.gallery.map((picture) => picture.image)),
  );
  for (let n = 1; n <= 19; n++) {
    const path = `images/instructions/service-step-${String(n).padStart(2, "0")}.png`;
    assert.ok(used.has(path), `Missing instructional picture ${n}`);
    assert.ok(
      (await fs.stat(new URL(`../public/${path}`, import.meta.url))).size >
        1000,
    );
  }
  const map = byId.get("pdf-campus-map");
  assert.equal(map.image, "images/campus/panyu-location-map.jpg");
  assert.equal(map.imageFit, "contain");
  assert.match(map.content.join(" "), /T14–T20/);
  assert.match(map.notice, /不是实时导航/);
  const bytes = await fs.readFile(
    new URL(`../public/${map.image}`, import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "237ae5bfb54deb554c3b6cdd3b50f025696f83d35a0dfecb41b069f2b633cadc",
  );
  const repair = byId.get("pdf-campus-network-repair");
  assert.equal(
    repair.gallery.filter((image) =>
      image.image.startsWith("images/instructions/"),
    ).length,
    4,
  );
  assert.match(repair.content.join(" "), /私人账号/);
});

test("assistant can locate new employment and map content without revealing input files", () => {
  for (const [query, id] of [
    ["舜宇宣讲会", "career-company-talks"],
    ["华为硬件工程师", "career-job-search"],
    ["选调生", "career-selection-policy"],
    ["校园地图", "pdf-campus-map"],
    ["光锥元产品实习生", "internship-company"],
    ["校园网故障报修", "pdf-campus-network-repair"],
  ]) {
    assert.equal(searchCatalog(query, catalog)[0].id, id, query);
    assert.doesNotMatch(
      localAnswer(query, catalog).answer,
      /\.docx|\.md|PDF|宝典|来源页码|kdocs/i,
    );
  }
});
