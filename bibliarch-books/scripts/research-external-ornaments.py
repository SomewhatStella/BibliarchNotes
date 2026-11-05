"""Download review-only external ornament candidates. Does not modify the catalog."""
import urllib.request, urllib.parse, json, concurrent.futures, pathlib, re, hashlib
root=pathlib.Path(__file__).resolve().parents[1]/'artifacts'/'external-ornament-research'
root.mkdir(parents=True,exist_ok=True)
repo='cyanidecupcake/openclipart-svg'
data=json.load(urllib.request.urlopen(f'https://api.github.com/repos/{repo}/git/trees/master?recursive=1',timeout=20))
sha=data['sha']
paths=[x['path'] for x in data['tree'] if x['path'].startswith('svg/unsorted/') and re.search(r'(DecorativeDivider|PageOrnament|Underline_Flourish|classicaldivider|Celtic-Knot-Line-Art|Flourishy-Corner|Simple-corner-ornament)',x['path'])]
def fetch(p):
 url=f'https://raw.githubusercontent.com/{repo}/{sha}/'+urllib.parse.quote(p)
 try:
  raw=urllib.request.urlopen(url,timeout=12).read(); name=pathlib.Path(p).name
  (root/name).write_bytes(raw)
  return dict(name=name,url=url,sha256=hashlib.sha256(raw).hexdigest(),status='Review only; not integrated',license='Public domain / CC0 mirror; inspect embedded metadata per file')
 except Exception as e: return dict(name=p,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex: rows=list(ex.map(fetch,paths))
for p in ['LICENSE','README.md']:
 (root/p).write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/{repo}/{sha}/{p}',timeout=12).read())
(root/'manifest.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
cards=''.join(f'<figure><img src="{urllib.parse.quote(r["name"])}"><figcaption>{r["name"]}</figcaption></figure>' for r in rows if 'url' in r)
(root/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>External candidates — NOT integrated</title><style>body{background:#f8f6f0;font:12px Arial}main{display:grid;grid-template-columns:repeat(4,1fr)}figure{margin:5px;padding:8px;background:white}img{width:100%;height:125px;object-fit:contain}figcaption{height:30px}</style><h2>External candidates — review only, not integrated</h2><main>'+cards+'</main>',encoding='utf-8')
print(json.dumps(rows,indent=2))
