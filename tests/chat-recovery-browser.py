"""Browser regressions for unavailable APIs, retry history and explicit local search."""
import json, mimetypes, os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright, expect

root=Path(os.environ.get('STATIC_ROOT','dist')).resolve()
site='https://campus.sonh.me'
qa=Path('qa/chat-recovery');qa.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('BROWSER_EXECUTABLE','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'))
    page=browser.new_page(viewport={'width':375,'height':812},reduced_motion='reduce')
    errors=[];payloads=[];state={'status':True,'ask':False}
    page.on('pageerror',lambda e:errors.append(str(e)))
    def assets(route):
        target=(root/(unquote(urlsplit(route.request.url).path).lstrip('/') or 'index.html')).resolve()
        assert target.is_relative_to(root)
        route.fulfill(path=str(target),content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')
    page.route(site+'/**',assets)
    def api(route):
        path=urlsplit(route.request.url).path
        if path=='/api/status':
            if not state['status']:route.abort('failed');return
            reply={'mode':'model','catalogCount':86}
        else:
            payloads.append(route.request.post_data_json)
            if not state['ask']:route.abort('failed');return
            reply={'mode':'model','answer':'请先查看衣物护理指南，按衣物标签选择合适的洗涤和晾晒方式。','recommendations':['laundry'],'categories':['clothes']}
        route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':site},body=json.dumps(reply))
    page.route('**/api/**',api)
    page.goto(site+'/');page.wait_for_load_state('networkidle')
    page.get_by_role('button',name='打开校园向导',exact=True).click()
    expect(page.locator('.chat-status')).to_contain_text('AI 校园向导')
    assert '当前使用站内检索' not in page.locator('.chat-footnote').inner_text()
    question='衣服湿了怎么办'
    page.get_by_label('向校园向导提问').fill(question)
    page.get_by_role('button',name='发送问题',exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('网络未能连接')
    expect(page.locator('.chat-status')).to_contain_text('AI 暂未连接')
    assert 'Failed to fetch' not in page.locator('.chat').inner_text()
    assert page.locator('.chat-message.assistant').count()==0
    page.screenshot(path=str(qa/'network-error.png'))
    state['ask']=True
    page.get_by_role('button',name='重试这个问题',exact=True).click()
    expect(page.locator('.chat-message.assistant')).to_have_count(1)
    expect(page.locator('.chat-message.user')).to_have_count(1)
    assert payloads[1]['message']==question and payloads[1]['history']==[]
    state['ask']=False
    page.get_by_label('向校园向导提问').fill('怎么晾干？')
    page.get_by_role('button',name='发送问题',exact=True).click()
    expect(page.get_by_role('alert')).to_be_visible()
    assert len(payloads[-1]['history'])==2
    page.get_by_role('button',name='使用站内检索',exact=True).click()
    expect(page.locator('.chat-message.assistant')).to_have_count(2)
    expect(page.locator('.chat-status')).to_contain_text('站内智能检索')
    expect(page.locator('.chat-footnote')).to_contain_text('当前使用站内检索')
    expect(page.locator('.chat-message.user')).to_have_count(2)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    state['status']=False
    page.get_by_role('button',name='尝试连接 AI',exact=True).click()
    expect(page.locator('.chat-status')).to_contain_text('AI 暂未连接')
    expect(page.get_by_role('alert')).to_contain_text('暂时无法连接')
    assert not errors,errors
    browser.close()
print(json.dumps({'mockedApi':True,'rawFetchErrorHidden':True,'noSilentFallback':True,'retryNoDuplicateQuestion':True,'retryNoDuplicateHistory':True,'explicitLocalSearch':True,'reconnectFailureVisible':True,'pageErrors':errors}))
