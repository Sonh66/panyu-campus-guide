"""Real browser regression: full detail routes, resources, images and navigation."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
catalog = json.loads((root/'src/catalog.json').read_text(encoding='utf-8'))
transitions = json.loads((root/'src/catalog-transitions.json').read_text(encoding='utf-8'))
base = os.environ.get('PREVIEW_URL', 'http://127.0.0.1:8792').rstrip('/')
qa = root/'qa/detail-pages'
qa.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('BROWSER_EXECUTABLE', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'))
    page = browser.new_page(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
    errors, failed = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failed.append(response.url) if response.status >= 400 else None)

    def goto(hash):
        page.goto(base+'/' + hash)
        page.wait_for_load_state('networkidle')
    def overflow():
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), page.url
    def decode(locator):
        locator.scroll_into_view_if_needed()
        locator.evaluate('(img) => img.decode()')
    def check_image_positions():
        for image in page.locator('.instruction-figure img').all():
            decode(image)
            assert image.evaluate('(img) => img.naturalWidth > 0 && getComputedStyle(img).height !== "220px"')

    goto('#/guide?category=all')
    expect(page.locator('.entry-card')).to_have_count(len(catalog))
    expect(page.locator('.entry-details-button')).to_have_count(len(catalog))
    page.locator('.entry-details-button').first.click()
    expect(page).to_have_url(base+'/#/entry/pdf-jnuid-login')
    expect(page.locator('h1')).to_have_text(catalog[0]['title'])
    assert page.locator('.entry-dialog').count() == 0
    page.reload(); page.wait_for_load_state('networkidle')
    expect(page.locator('h1')).to_have_text(catalog[0]['title'])
    page.get_by_role('button', name='返回', exact=True).click()
    expect(page).to_have_url(base+'/#/guide?category=all')

    for viewport in [{'width':1440,'height':1000}, {'width':375,'height':812}]:
        page.set_viewport_size(viewport)
        for index, entry in enumerate(catalog):
            goto('#/entry/'+entry['id'])
            expect(page.locator('h1')).to_have_text(entry['title'])
            assert page.locator('.reading-section').count() >= len(entry['sections'])
            decode(page.locator('.reading-cover img'))
            for image in page.locator('.instruction-figure img').all():
                decode(image)
            overflow()
            if index % 25 == 0: print(f"Detail pages {viewport['width']}px: {index + 1}/{len(catalog)}", flush=True)
        print(f"All {len(catalog)} cover images and detail pages passed at {viewport['width']}px", flush=True)

        for id in ['pdf-jnuid-login','pdf-network-application','pdf-jnu-secure-wifi','pdf-wired-network','pdf-campus-network-repair','welcome','health-guide','intercity-panyu']:
            goto('#/entry/'+id)
            check_image_positions(); overflow()
            instruction_images=page.locator('.instruction-figure img[src*="/instructions/"]')
            for image in instruction_images.all():
                assert image.evaluate('(img) => img.closest("figure").previousElementSibling.tagName === "P"'), id
            if id in ['pdf-network-application','pdf-campus-network-repair']:
                page.locator('.reading-section').last.screenshot(path=str(qa/f'{id}-{viewport["width"]}.png'))
        goto('#/entry/pdf-campus-map')
        image=page.locator('.reading-cover img'); decode(image)
        geometry=image.evaluate('(img) => ({width:img.clientWidth,height:img.clientHeight,nw:img.naturalWidth,nh:img.naturalHeight,fit:getComputedStyle(img).objectFit})')
        assert abs(geometry['width']/geometry['height']-geometry['nw']/geometry['nh']) < .01
        assert geometry['fit']=='contain'
        page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(qa/f'campus-map-{viewport["width"]}.png'),full_page=True)
        with page.expect_popup() as popup_info:
            page.locator('.reading-cover a').click()
        popup=popup_info.value
        popup.wait_for_load_state('load')
        assert popup.url.endswith('/images/campus/panyu-location-map.jpg')
        popup.close()

    page.set_viewport_size({'width':1440,'height':1000})
    for old, target in transitions['aliases'].items():
        goto('#/entry/'+old)
        expect(page).to_have_url(base+'/#/entry/'+target)
    for id in transitions['removed']:
        goto('#/entry/'+id)
        expect(page.locator('h1')).to_have_text('这条指南暂不可用')
    goto('#/entry/pdf-campus-network-repair')
    button=page.get_by_role('navigation',name='本页目录').get_by_role('button',name='第四步 · 逐项填写工单')
    button.click()
    assert page.evaluate('document.activeElement.classList.contains("reading-section")')
    page.screenshot(path=str(qa/'repair-step-desktop.png'))
    with page.expect_popup() as popup_info:
        page.locator('.instruction-figure a').last.click()
    popup=popup_info.value; popup.wait_for_load_state('load'); assert popup.url.endswith('service-step-19.png'); popup.close()

    goto('#/ask')
    page.get_by_label('向校园向导提问').fill('校园网故障报修')
    page.get_by_role('button',name='发送问题').click()
    page.locator('.recommendations button').first.click()
    expect(page).to_have_url(base+'/#/entry/pdf-campus-network-repair')
    expect(page.locator('h1')).to_have_text('校园网故障报修与进度查询')
    # Motion-enabled route transitions and rapid navigation remain usable.
    page.emulate_media(reduced_motion='no-preference')
    goto('#/guide?category=network')
    page.locator('.entry-details-button').first.click()
    expect(page.locator('.reading-header h1')).to_be_visible()
    page.go_back(); expect(page.locator('h1')).to_have_text('校园网络')
    page.set_viewport_size({'width':812,'height':375}); goto('#/entry/pdf-campus-network-repair'); overflow()
    page.set_viewport_size({'width':375,'height':812})
    page.add_style_tag(content='html{font-size:125%}')
    goto('#/entry/pdf-campus-network-repair'); overflow()
    assert not errors, errors
    assert not failed, failed
    browser.close()
    (qa/'results.json').write_text(json.dumps({'entries':len(catalog),'viewports':[1440,375,812],'tutorialPictures':19,'aliases':len(transitions['aliases']),'removed':2,'errors':errors,'failedAssets':failed},ensure_ascii=False,indent=2),encoding='utf-8')
    print('PASS: independent detail pages, every cover, inline images, full map, aliases, back, reload, assistant and motion',flush=True)
