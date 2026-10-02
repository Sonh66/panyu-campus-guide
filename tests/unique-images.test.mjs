import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { localAnswer } from "../server/catalog-search.mjs";

const catalog = JSON.parse(
  await fs.readFile(new URL("../src/catalog.json", import.meta.url), "utf8"),
);
const byId = new Map(catalog.map((entry) => [entry.id, entry]));
const digest = (value) => createHash("sha256").update(value).digest("hex");
const forbiddenPublicSource =
  /PDF|Untitled|宝典|原文|来源页码|kdocs\.cn|WPS|金山文档/i;

async function categoryImages() {
  const categoriesFile = new URL("../src/categories.json", import.meta.url);
  try {
    const data = JSON.parse(await fs.readFile(categoriesFile, "utf8"));
    return (Array.isArray(data) ? data : Object.values(data)).map(
      (category) => category.image,
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const app = await fs.readFile(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );
  const categoryBlock = app.match(
    /const categories:\s*Record<string, Category>\s*=\s*\{([\s\S]*?)\n\};/,
  );
  assert.ok(categoryBlock, "Cannot locate category covers in App.tsx");
  return [...categoryBlock[1].matchAll(/image:\s*"([^"]+)"/g)].map(
    (match) => match[1],
  );
}

test("each of 70 business entries and 12 categories has a different cover file", async () => {
  assert.equal(
    catalog.length,
    70,
    "A business entry was added or removed unexpectedly",
  );
  assert.equal(byId.size, 70, "Business entry IDs must remain unique");
  const entryImages = catalog.map((entry) => entry.image);
  assert.equal(
    new Set(entryImages).size,
    70,
    "Entry covers reuse the same image path",
  );
  const covers = await categoryImages();
  assert.equal(covers.length, 12, "All 12 categories need a cover");
  assert.equal(new Set(covers).size, 12, "Category covers reuse an image path");
  const allImages = [...entryImages, ...covers];
  assert.equal(
    new Set(allImages).size,
    82,
    "Category and entry covers share a picture",
  );
  const hashes = new Map();
  for (const image of allImages) {
    assert.match(image, /^images\/[\w./-]+\.(?:webp|jpe?g|png)$/i);
    assert.ok(!image.includes(".."), `Unsafe image path: ${image}`);
    const bytes = await fs.readFile(
      new URL(`../public/${image}`, import.meta.url),
    );
    assert.ok(bytes.length > 1000, `Image is unexpectedly empty: ${image}`);
    const hash = digest(bytes);
    assert.ok(
      !hashes.has(hash),
      `Renamed duplicate pictures: ${hashes.get(hash)} and ${image}`,
    );
    hashes.set(hash, image);
  }
});

const expectedImportedIds = [
  "pdf-jnuid-login",
  "pdf-jnuid-password-reset",
  "pdf-wechat-service-hub",
  "pdf-tuition-payment",
  "pdf-finance-hall",
  "pdf-campus-card-entry",
  "pdf-jnu-deepseek",
  "pdf-digital-resources",
  "pdf-fitness-results",
  "pdf-campus-map",
  "pdf-campus-clinic-location",
  "pdf-study-room-location",
  "pdf-sports-facilities",
  "pdf-express-centre",
  "pdf-xingan-supermarket",
  "pdf-f5-rice-noodles",
  "pdf-speciality-restaurant",
  "pdf-shanbei-restaurant",
  "pdf-hongli-canteen",
  "pdf-yuhua-canteen",
  "pdf-lakeside-restaurant",
  "pdf-campus-kfc",
  "pdf-luckin-t3",
  "pdf-ningji-t5",
  "pdf-cotti-t5",
  "pdf-encounter-noodles-east",
  "pdf-luckin-east",
  "pdf-mcdonalds-east",
  "pdf-chabaidao-east",
  "pdf-jiliudaren-east",
  "pdf-express-address",
  "pdf-network-application",
  "pdf-jnu-secure-wifi",
  "pdf-wired-network",
  "pdf-campus-network-repair",
  "pdf-network-service-locations",
  "pdf-teaching-shuttle",
  "pdf-xinzao-campus-minibus",
  "pdf-ruyue-bus",
  "pdf-xinzao-metro",
  "pdf-dorm-water-electricity",
  "pdf-offcampus-takeout-lockers",
  "pdf-takeout-kuaituan",
  "pdf-takeout-jnu-canteen",
  "pdf-takeout-gouzhong",
  "pdf-takeout-jnu-delivery",
  "pdf-takeout-waimaigou",
  "pdf-takeout-xingqiudiandian",
  "pdf-takeout-askforfan",
  "pdf-takeout-wuyougo",
  "pdf-takeout-yidianda",
];

test("all 51 imported businesses and complete schedule rows survive the image update", () => {
  assert.deepEqual(
    catalog
      .filter((entry) => entry.id.startsWith("pdf-"))
      .map((entry) => entry.id)
      .sort(),
    expectedImportedIds.toSorted(),
  );
  for (const id of expectedImportedIds) {
    const entry = byId.get(id);
    assert.ok(
      entry.content.length > 0,
      `${id} has lost its business instructions`,
    );
    assert.ok(entry.summary.trim(), `${id} has lost its summary`);
    assert.ok(
      entry.imageAlt && entry.imageCredit,
      `${id} has lost image metadata`,
    );
  }
  // Compare only business facts. Source captions and headings may be rewritten.
  for (const [id, hash] of Object.entries({
    "pdf-network-service-locations":
      "794df4b9f27d5695b0fb01314bd39064a6ef50ee90934883d48410fce029b115",
    "pdf-teaching-shuttle":
      "169ba9c44c2e4b302a44b711d11f3cfc60fd58261638a25ebfec3b4a29980bde",
    "pdf-xinzao-campus-minibus":
      "e425a1c52b3eb9fce3e930a12d9c984e156d35886c288fde41ffb8935c10b1ea",
    "pdf-ruyue-bus":
      "6912bd45cc5ca0182f954b2ad93d4b886249ad648364766e8da0160aae84b8c9",
  })) {
    assert.equal(
      digest(JSON.stringify(byId.get(id).tables.map((table) => table.rows))),
      hash,
      `${id}: timetable/office rows changed`,
    );
  }
});

test("business text and assistant replies do not expose the user's source document", () => {
  for (const entry of catalog) {
    const visibleFields = [
      entry.title,
      entry.summary,
      ...entry.content,
      ...entry.steps,
      ...entry.tables.flatMap((table) => [
        table.caption ?? "",
        ...table.columns,
        ...table.rows.flat(),
      ]),
      ...entry.links.map((link) => `${link.label} ${link.url}`),
    ];
    assert.doesNotMatch(
      visibleFields.join("\n"),
      forbiddenPublicSource,
      `${entry.id}: visible text exposes a source document`,
    );
  }
  for (const query of [
    "宿舍网络坏了怎么办",
    "学费怎么缴",
    "新造地铁站怎么去",
    "快点星球在哪里用",
  ]) {
    assert.doesNotMatch(
      localAnswer(query, catalog).answer,
      forbiddenPublicSource,
      `Assistant exposed a document source for ${query}`,
    );
  }
});
