'use client';
import type {Scene} from './model';
import {IllustrationCanvas} from './IllustrationTools';

type Picture = NonNullable<Scene['image']>;
const FOCUS: [string, string][] = [
  ['0% 0%', 'Top left'], ['50% 0%', 'Top'], ['100% 0%', 'Top right'],
  ['0% 50%', 'Left'], ['50% 50%', 'Center'], ['100% 50%', 'Right'],
  ['0% 100%', 'Bottom left'], ['50% 100%', 'Bottom'], ['100% 100%', 'Bottom right'],
];
const ARROWS = ['↖', '↑', '↗', '←', '•', '→', '↙', '↓', '↘'];

/** Picture controls a writer can use without knowing what an opacity value is. */
export default function PictureSettings({image, canCrop, pageWidthMm, pageHeightMm, textWidthMm, onPick, onCrop, onChange, onRemove}: {
  image?: Picture; canCrop: boolean; pageWidthMm: number; pageHeightMm: number; textWidthMm: number;
  onPick: () => void; onCrop: () => void; onChange: (patch: Partial<Picture>) => void; onRemove: () => void;
}) {
  if (!image) return <div className="picture-settings">
    <p className="muted">This page doesn't have a picture yet.</p>
    <div className="ps-row"><button className="primary" onClick={onPick}>Add a picture…</button></div>
    <p className="muted">PNG, JPEG or WebP, up to 1.5 MB. You can also drag a picture file straight onto the page.</p>
    <ArtistCanvas w={pageWidthMm} h={pageHeightMm}/>
  </div>;
  const width = image.widthPercent ?? 100, tilt = Math.round(image.rotation ?? 0), fade = Math.round((1 - (image.opacity ?? 1)) * 100);
  const blurry = !!image.naturalWidth && image.naturalWidth / (textWidthMm / 25.4 * width / 100) < 150;
  return <div className="picture-settings">
    <div className="ps-preview"><img src={image.src} alt="" style={{opacity: image.opacity ?? 1, transform: `rotate(${tilt}deg)`}}/></div>
    <div className="ps-row">
      <button onClick={onPick}>Replace picture…</button>
      {canCrop && <button onClick={onCrop}>Crop…</button>}
      <button onClick={onRemove}>Remove picture</button>
    </div>
    {blurry && <p className="warning">This picture may look blurry when printed at this size. A larger image file will look sharper.</p>}
    <div className="ps-row" role="group" aria-label="How the picture fills the page">
      <button aria-pressed={(image.fit || 'contain') === 'contain'} onClick={() => onChange({fit: 'contain'})}>Show the whole picture</button>
      <button aria-pressed={image.fit === 'cover'} onClick={() => onChange({fit: 'cover'})}>Fill the page</button>
    </div>
    {image.fit === 'cover' && <div className="ps-slider" role="group" aria-label="Keep this part in view">Keep this part in view
      <div className="ps-focus">{FOCUS.map(([value, label], i) => <button key={value} aria-label={label} title={label} aria-pressed={(image.position || '50% 50%') === value} onClick={() => onChange({position: value})}>{ARROWS[i]}</button>)}</div>
    </div>}
    <Slider label="Size" min={10} max={100} value={width} text={width >= 100 ? 'Full width' : `${width}%`} onChange={widthPercent => onChange({widthPercent})}/>
    <Slider label="Tilt" min={-45} max={45} value={Math.max(-45, Math.min(45, tilt))} text={tilt === 0 ? 'Straight' : `${Math.abs(tilt)}° ${tilt < 0 ? 'left' : 'right'}`} onChange={rotation => onChange({rotation})}
      reset={tilt !== 0 ? () => onChange({rotation: 0}) : undefined}/>
    <Slider label="Fade" min={0} max={90} value={fade} text={fade === 0 ? 'None' : `${fade}%`} onChange={f => onChange({opacity: Math.round((1 - f / 100) * 100) / 100})}/>
    <label className="ps-text">Caption (shown under the picture)<input maxLength={300} value={image.caption || ''} placeholder="Optional" onChange={e => onChange({caption: e.target.value})}/></label>
    <label className="ps-text">Describe the picture (read aloud by screen readers and e-readers)<input maxLength={300} value={image.alt || ''} onChange={e => onChange({alt: e.target.value})}/></label>
    <ArtistCanvas w={pageWidthMm} h={pageHeightMm}/>
  </div>;
}

function Slider({label, min, max, value, text, onChange, reset}: {label: string; min: number; max: number; value: number; text: string; onChange: (v: number) => void; reset?: () => void}) {
  return <label className="ps-slider">{label}<div>
    <input type="range" aria-label={label} min={min} max={max} step={1} value={value} onChange={e => onChange(+e.target.value)}/>
    <output>{text}</output>
    {reset && <button type="button" onClick={e => { e.preventDefault(); reset(); }}>Straighten</button>}
  </div></label>;
}

function ArtistCanvas({w, h}: {w: number; h: number}) {
  return <details><summary>Drawing your own art?</summary>
    <p className="muted">Download a blank image that's exactly the right shape and sharpness for this book's pages, then draw on it in your art app.</p>
    <IllustrationCanvas widthMm={w} heightMm={h}/>
  </details>;
}
