"""Decode all distinct covers and exercise every detail on desktop and mobile."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re

from PIL import Image, ImageDraw, ImageFont, ImageOps
from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / "qa" / "unique-images"
FORBIDDEN = re.compile(r"(?<!\.)\bPDF\b|Untitled|宝典|原文|来源页码|kdocs\.cn|WPS|金山文档", re.I)


def category_covers():
    categories_file = ROOT / "src" / "categories.json"
    if categories_file.exists():
        categories = json.loads(categories_file.read_text(encoding="utf-8-sig"))
        values = categories.values() if isinstance(categories, dict) else categories
        return [("category-" + str(index), item["image"]) for index, item in enumerate(values)]
    source = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8-sig")
    block = re.search(r"const categories:\s*Record<string, Category>\s*=\s*\{([\s\S]*?)\n\};", source)
    assert block, "Could not locate category covers"
    return [("category-" + str(index), path) for index, path in enumerate(re.findall(r'image:\s*"([^"]+)"', block[1]))]


def difference_hash(image):
    # This is an audit hint, not a uniqueness assertion: similar subjects can differ.
    small = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    pixels = list(small.getdata())
    value = 0
    for y in range(8):
        for x in range(8):
            value = (value << 1) | (pixels[y * 9 + x] > pixels[y * 9 + x + 1])
    return value


def image_audit(catalog):
    covers = [(entry["id"], entry["image"]) for entry in catalog] + category_covers()
    assert len(covers) == len(catalog) + 12, "Every entry and category needs a cover"
    assert len({path for _, path in covers}) == len(covers), "Cover paths are reused"
    file_hashes, pixel_hashes = {}, {}
    result = []
    for business_id, relative in covers:
        path = ROOT / "public" / relative
        assert path.is_file(), f"Missing cover for {business_id}: {path}"
        byte_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        assert byte_hash not in file_hashes, f"Identical image files: {business_id} and {file_hashes.get(byte_hash)}"
        file_hashes[byte_hash] = business_id
        with Image.open(path) as raw:
            image = ImageOps.exif_transpose(raw).convert("RGB")
            image.load()
            width, height = image.size
            assert width >= 320 and height >= 200, f"Cover too small for {business_id}: {width}x{height}"
            pixel_hash = hashlib.sha256(f"{width},{height}:".encode() + image.tobytes()).hexdigest()
            assert pixel_hash not in pixel_hashes, f"Identical decoded pixels: {business_id} and {pixel_hashes.get(pixel_hash)}"
            pixel_hashes[pixel_hash] = business_id
            result.append({"id": business_id, "image": relative, "width": width, "height": height, "fileSha256": byte_hash, "pixelSha256": pixel_hash, "differenceHash": difference_hash(image)})
    near_matches = []
    for i, first in enumerate(result):
        for second in result[i + 1:]:
            distance = (first["differenceHash"] ^ second["differenceHash"]).bit_count()
            if distance <= 4:
                near_matches.append({"first": first["id"], "second": second["id"], "distance": distance})
    (QA / "image-audit.json").write_text(json.dumps({"covers": result, "similarityCandidates": near_matches}, ensure_ascii=False, indent=2), encoding="utf-8")
    make_contact_sheet(catalog, covers)
    print(f"PASS: all {len(covers)} covers decode, have distinct bytes and RGB pixels; {len(near_matches)} similarity candidates for review")


def make_contact_sheet(catalog, covers):
    font_path = Path("C:/Windows/Fonts/msyh.ttc")
    font = ImageFont.truetype(str(font_path), 13) if font_path.exists() else ImageFont.load_default()
    titles = {entry["id"]: entry["title"] for entry in catalog}
    groups = {"all-covers": covers}
    for category in sorted({entry["category"] for entry in catalog}):
        groups[category] = [(entry["id"], entry["image"]) for entry in catalog if entry["category"] == category]
    for group, items in groups.items():
        columns, cell_w, cell_h = min(5, len(items)), 320, 210
        canvas = Image.new("RGB", (columns * cell_w, ((len(items) + columns - 1) // columns) * cell_h), "#f4f7f3")
        draw = ImageDraw.Draw(canvas)
        for index, (business_id, relative) in enumerate(items):
            x, y = (index % columns) * cell_w, (index // columns) * cell_h
            with Image.open(ROOT / "public" / relative) as raw:
                image = ImageOps.exif_transpose(raw).convert("RGB")
                image.thumbnail((cell_w - 16, 150))
                canvas.paste(image, (x + (cell_w - image.width) // 2, y + 5))
            title = titles.get(business_id, business_id)
            draw.text((x + 8, y + 158), title[:22], fill="#122b1a", font=font)
            draw.text((x + 8, y + 180), business_id[:39], fill="#53615b", font=font)
        canvas.save(QA / f"{group}-contact-sheet.jpg", quality=90)


def assert_no_source(page, label):
    visible = page.locator("body").inner_text()
    match = FORBIDDEN.search(visible)
    assert not match, f"Source document exposed in {label}: {match.group(0) if match else ''}"
    hrefs = page.locator("a[href]").evaluate_all("links => links.map(link => link.href)")
    assert not any("kdocs.cn" in url.lower() for url in hrefs), f"Source document link exposed in {label}"


def assert_no_overflow(page, label):
    size = page.evaluate("() => ({viewport: innerWidth, width: document.documentElement.scrollWidth})")
    assert size["width"] <= size["viewport"] + 1, f"Horizontal page overflow in {label}: {size}"


def loaded_image(locator):
    return locator.evaluate("""async img => {
      await img.decode();
      const box = img.getBoundingClientRect();
      return {source: img.currentSrc, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
        x: box.x, y: box.y, width: box.width, height: box.height};
    }""")


def browser_audit(catalog, base, executable, entry_ids=None):
    errors, failed_images = [], []
    selected = [entry for entry in catalog if not entry_ids or entry["id"] in entry_ids]
    if entry_ids:
        assert {entry["id"] for entry in selected} == set(entry_ids), "Unknown business ID in --entry"
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=executable or None)
        page = browser.new_page(viewport={"width": 1440, "height": 1100}, reduced_motion="reduce")
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("response", lambda response: failed_images.append(f"{response.status} {response.url}") if response.status >= 400 and "/images/" in response.url else None)

        def navigate(hash_value=""):
            page.goto(f"{base.rstrip('/')}/{hash_value}")
            page.wait_for_load_state("networkidle")

        try:
            if not entry_ids:
                navigate()
                category_cards = page.locator(".category-card, .service-category-card")
                expect(category_cards).to_have_count(12)
                for index in range(12):
                    card = category_cards.nth(index)
                    card.scroll_into_view_if_needed()
                    assert loaded_image(card.locator("img"))["naturalWidth"] >= 320
                assert_no_source(page, "homepage")
                assert_no_overflow(page, "homepage")

            screenshots = {
                "food": "pdf-yuhua-canteen",
                "network": "pdf-jnu-secure-wifi",
                "payment": "pdf-tuition-payment",
                "takeout-kuaituan": "pdf-takeout-kuaituan",
                "takeout-wuyou": "pdf-takeout-wuyougo",
                "clinic-hours": "health-guide",
                "housing-repair": "repair",
                "service-hall": "campus-service-hall",
                "n2-canteen": "chunhui-n2-canteen",
                "cycling": "campus-cycling",
            }
            for size_label, viewport in [("desktop", {"width": 1440, "height": 1100}), ("mobile", {"width": 390, "height": 844})]:
                page.set_viewport_size(viewport)
                navigate("#/guide")
                cards = page.locator(".entry-card")
                expect(cards).to_have_count(len(catalog))
                assert_no_source(page, f"{size_label} guide")
                assert_no_overflow(page, f"{size_label} guide")
                for entry in selected:
                    card = cards.filter(has=page.get_by_text(entry["title"], exact=True))
                    expect(card).to_have_count(1)
                    card.scroll_into_view_if_needed()
                    card_image = loaded_image(card.locator("img"))
                    assert card_image["source"].endswith("/" + entry["image"]), f"Stale card image for {entry['id']}"
                    card.locator(".entry-details-button").click()
                    dialog = page.locator(".reading-page")
                    expect(dialog).to_be_visible()
                    cover = loaded_image(page.locator(".reading-cover img"))
                    assert cover["source"] == card_image["source"], f"Card/detail differ for {entry['id']}"
                    assert cover["height"] >= 150 and cover["width"] >= 280, f"Detail cover too small for {entry['id']}"
                    assert page.evaluate("window.scrollY") == 0, f"Detail opens halfway down: {entry['id']}"
                    assert_no_source(page, f"{size_label} detail {entry['id']}")
                    assert_no_overflow(page, f"{size_label} detail {entry['id']}")
                    box = dialog.bounding_box()
                    assert box["x"] >= -1 and box["x"] + box["width"] <= viewport["width"] + 1, f"Dialog overflows for {entry['id']}"
                    if entry["id"] in screenshots.values():
                        category = next(key for key, value in screenshots.items() if value == entry["id"])
                        page.screenshot(path=str(QA / f"{category}-{size_label}.png"))
                    page.go_back()
                    expect(page.locator(".entry-card")).to_have_count(len(catalog))
                print(f"PASS: {size_label} {len(selected)} cards/detail images decode, header placement correct, no horizontal overflow or source disclosure")

            if not entry_ids:
                navigate("#/ask")
                assert_no_source(page, "assistant initial screen")
                for index, question in enumerate(["宿舍网络坏了怎么办", "学费怎么缴", "到校坐小巴怎么走", "快点星球在哪里用"], 1):
                    page.locator("#assistant-question").fill(question)
                    page.get_by_role("button", name="发送问题", exact=True).click()
                    expect(page.locator(".chat-message.assistant")).to_have_count(index)
                    assert_no_source(page, f"assistant answer {index}")
                page.screenshot(path=str(QA / "assistant-mobile.png"))
                assert_no_overflow(page, "mobile assistant")
            assert not errors, f"Browser errors: {errors}"
            assert not failed_images, f"Image HTTP failures: {failed_images}"
            print("PASS: visible links do not expose the source document; no browser errors")
        finally:
            browser.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets-only", action="store_true", help="Decode/hash covers and generate the contact sheet without launching a browser")
    parser.add_argument("--url", default=os.environ.get("PREVIEW_URL", "http://127.0.0.1:8787"))
    parser.add_argument("--browser", default=os.environ.get("BROWSER_EXECUTABLE", ""))
    parser.add_argument("--entry", action="append", help="Only recheck a changed business in the browser; repeat for multiple IDs. All cover hashes are still checked.")
    args = parser.parse_args()
    QA.mkdir(parents=True, exist_ok=True)
    catalog = json.loads((ROOT / "src" / "catalog.json").read_text(encoding="utf-8-sig"))
    image_audit(catalog)
    if not args.assets_only:
        browser_audit(catalog, args.url, args.browser, args.entry)
    print("Unique cover verification passed; report/screenshots in qa/unique-images/")


if __name__ == "__main__":
    main()
