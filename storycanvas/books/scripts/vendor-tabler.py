"""Fetch pinned MIT Tabler originals and generate the vetted offline decal catalogue."""
from pathlib import Path
import concurrent.futures, hashlib, html, json, subprocess, xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
REV = 'cade2ac67f6c09f96363f096410172ebd1cc9eb3'
BASE = f'https://raw.githubusercontent.com/tabler/tabler-icons/{REV}'
OUT = ROOT / 'public/decals/tabler'
OUT.mkdir(parents=True, exist_ok=True)
def fetch(path):
    return subprocess.check_output(['curl','-fLsS','--retry','2',f'{BASE}/{path}'])
license_bytes = fetch('LICENSE')
(OUT/'LICENSE.txt').write_bytes(license_bytes)
license_text = license_bytes.decode()
assert 'Permission is hereby granted' in license_text and 'sell' in license_text
GROUPS = {'Botanical':['leaf','plant-2','flower','seedling'], 'Celestial':['moon','stars','sparkles','sun'], 'Winter':['snowflake','christmas-tree','snowman','mist'], 'Book ornaments':['book','feather','laurel-wreath','bookmark']}
items = [(group,name) for group,names in GROUPS.items() for name in names]
def asset(item):
    group,name=item
    path=f'icons/outline/{name}.svg'
    raw=fetch(path)
    root=ET.fromstring(raw)
    allowed={'svg','path','circle','ellipse','line','polyline','polygon','rect','g'}
    for element in root.iter():
        assert element.tag.split('}')[-1] in allowed, name
        for key,value in element.attrib.items():
            assert not key.lower().startswith('on') and key not in ('href','style') and 'url(' not in value, name
    (OUT/f'{name}.svg').write_bytes(raw)
    # Neutral ink and embedded complete license travel with self-contained exports.
    svg=raw.decode().replace('currentColor','#555')
    metadata=html.escape(license_text+'\nSource: '+BASE+'/'+path).encode('ascii','xmlcharrefreplace').decode()
    svg=svg.replace('</svg>',f'<metadata>{metadata}</metadata></svg>')
    return {'id':'tabler-'+name,'name':name.replace('-',' ').title(),'category':group,'source':BASE+'/'+path,'sha256':hashlib.sha256(raw).hexdigest(),'license':'MIT','svg':svg}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    records=list(pool.map(asset,items))
(ROOT/'src/decal-library.json').write_text(json.dumps(records,indent=2,ensure_ascii=True)+'\n',encoding='utf-8')
(OUT/'PROVENANCE.json').write_text(json.dumps({'repository':'https://github.com/tabler/tabler-icons','revision':REV,'tag':'v3.31.0','licenseSource':BASE+'/LICENSE','assets':[{k:v for k,v in r.items() if k!='svg'} for r in records]},indent=2)+'\n')
(OUT/'CREDITS.md').write_text('# Tabler decorative library\n\n16 outline icons by Paweł Kuna, Tabler Icons, under the MIT License.\nCommercial use, modification and distribution permitted; retain the copyright and permission notice. No endorsement implied.\n\nLicense: '+BASE+'/LICENSE\n\nPinned revision: '+REV+' (v3.31.0).\n\nOriginal SVG files are unchanged. Runtime copies replace currentColor with #555 and embed the full license and original source in SVG metadata. No remote fetch is needed at runtime. Reflowable EPUB intentionally omits fixed decals.\n\nSee LICENSE.txt for full terms and PROVENANCE.json for per-file source URLs and SHA-256 checksums.\n',encoding='utf-8')
print(f'Vetted and bundled {len(records)} assets at {REV}')
