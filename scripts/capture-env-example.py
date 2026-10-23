"""Render only a sanitized copy of the current .env. Never sends raw values to Chromium."""
from pathlib import Path
from html import escape
import re
APP=Path(__file__).resolve().parents[1]
def capture(page):
    source=APP/'.env'
    if not source.exists(): source=APP/'.env.example'
    rows=[]; private=[]
    for line in source.read_text(encoding='utf-8-sig').splitlines():
        m=re.match(r'^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$',line)
        if not m: continue
        key,value=m.groups(); value=value.strip()
        if len(value)>8: private.append(value.strip('"\''))
        safe=value if key=='PORT' and re.fullmatch(r'\d{1,5}',value) and 0<int(value)<65536 else '[REDACTED]'
        rows.append(f'<div><span>{len(rows)+1:02}</span><code>{escape(key)}=<b>{escape(safe)}</b></code></div>')
    markup='<style>*{box-sizing:border-box}body{margin:0;background:#edf7ff;padding:28px;font:22px Arial;color:#102544}main{background:white;border-radius:20px;overflow:hidden}header,footer{padding:24px;line-height:1.6}section{background:#102544;padding:26px;color:#b5d9ff}section div{display:flex;gap:24px;line-height:2}span{color:#8aa1bd}code{font:22px/2 Consolas,monospace}b{color:#a9edc0}</style><main><header><strong>C06 · .env · sanitized local configuration</strong></header><section>'+''.join(rows)+'</section><footer>All values except PORT are redacted before rendering.<br>API keys, resource IDs and other settings never enter this image.<br>The real .env stays local and is excluded from Git.</footer></main>'
    if any(value and value in markup for value in private): raise RuntimeError('Sanitization failed')
    target=APP/'docs/images/env-redacted.png';target.parent.mkdir(parents=True,exist_ok=True)
    page.set_content(markup);page.locator('main').screenshot(path=str(target))
if __name__=='__main__':
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser=p.chromium.launch();page=browser.new_page(viewport={'width':1400,'height':900});capture(page);browser.close()
    print('Saved sanitized environment image.')
