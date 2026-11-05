"""Prepare only the five visually approved upstream originals; no geometry rewriting."""
import json, pathlib, shutil, hashlib, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
research=ROOT/'artifacts/external-ornament-research'
out=ROOT/'assets/sourced-ornaments'
(out/'originals').mkdir(parents=True,exist_ok=True)
shutil.copyfile(research/'LICENSE',out/'LICENSE')
manifest=json.loads((research/'manifest.json').read_text())+json.loads((research/'broader-thin/manifest.json').read_text())
names=['vintage-calligraphy-border.svg','vintage-calligraphy-frame-border.svg','vintage-calligraphy-frame.svg','Simple-corner-ornament.svg','Underline_Flourish.svg']
allowed_tags={'svg','g','path','rect','circle','ellipse','line','polyline','polygon'}
allowed_attrs=set('d transform fill stroke stroke-width stroke-linecap stroke-linejoin stroke-miterlimit fill-rule clip-rule opacity fill-opacity stroke-opacity points x y x1 x2 y1 y2 cx cy r rx ry width height viewBox'.split())
def clean(el):
    tag=el.tag.split('}')[-1]
    if tag not in allowed_tags:return None
    attrs={k:v for k,v in el.attrib.items() if k in allowed_attrs}
    for item in el.attrib.get('style','').split(';'):
        if ':' in item:
            k,v=item.split(':',1)
            if k.strip() in allowed_attrs:attrs[k.strip()]=v.strip()
    for k,v in attrs.items():
        assert not any(x in v.lower() for x in ['url(', 'javascript:', 'http:', 'https:']), (k,v)
    for k in ['fill','stroke']:
        # White is intentional knockout paint, not ink (floral leaf interiors).
        if k in attrs and attrs[k].lower() not in {'none','inherit','transparent','#fff','#ffffff','white'}:attrs[k]='#555555'
    new=ET.Element(tag,attrs)
    for child in el:
        c=clean(child)
        if c is not None:new.append(c)
    return new
records=[]
for name in names:
    entry=next(x for x in manifest if x['name']==name)
    source=research/('broader-thin/'+entry['file'] if 'file' in entry else name)
    raw=source.read_bytes(); digest=hashlib.sha256(raw).hexdigest(); assert digest==entry['sha256']
    (out/'originals'/name).write_bytes(raw)
    root=ET.fromstring(raw); svg=clean(root)
    svg.attrib.pop('width',None); svg.attrib.pop('height',None)
    svg.set('xmlns','http://www.w3.org/2000/svg')
    if 'fill' not in svg.attrib:svg.set('fill','#555555')
    meta=root.find('{http://www.w3.org/2000/svg}metadata')
    creator=root.find('.//{http://purl.org/dc/elements/1.1/}creator')
    author=''.join(creator.itertext()).strip() if creator is not None else 'Not identified in upstream metadata'
    records.append(dict(name=name,source=entry['url'],sha256=digest,author=author,license='CC0-1.0',licenseEvidence='Embedded public-domain dedication and mirror CC0' if b'licenses/publicdomain/' in raw else 'Repository CC0/public-domain declaration only; file metadata does not identify author or license',metadata=ET.tostring(meta,encoding='unicode'),svg=ET.tostring(svg,encoding='unicode')))
(out/'prepared.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
print('Prepared',len(records),'verified originals')
