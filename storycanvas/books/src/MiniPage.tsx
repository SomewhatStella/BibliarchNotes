'use client';
import type {CSSProperties, ReactNode} from 'react';
import {comicOf, panelBoxes, svgPoints} from './comic';
import {pageDimensions, type Appearance, type Scene} from './model';
import {decalSource, normalizeLayout} from './design';
import {paragraphStyleCss} from './paragraph-styles';

/*
 * A true miniature of a book page: the real fonts, sizes, alignment, margins,
 * border and ornaments, laid out at full size and scaled down. Used for the
 * template gallery and library covers so previews match what you'll get.
 */
const MM = 3.78;
const css = paragraphStyleCss('.mini-page-body') + '.mini-page-body p{margin:0 0 var(--mp-gap);text-indent:var(--mp-indent);text-align:var(--mp-align)}.mini-page-body p:empty::after{content:"\\00a0"}';

function inline(n: any, key: number): ReactNode {
  if (n.type === 'linebreak') return <br key={key}/>;
  if (n.type === 'tab') return <span key={key}>{'	'}</span>;
  if (n.type !== 'text') return (n.children || []).map(inline);
  const f = Number(n.format) || 0;
  let el: ReactNode = n.text;
  if (f & 1) el = <strong>{el}</strong>;
  if (f & 2) el = <em>{el}</em>;
  if (f & 8) el = <u>{el}</u>;
  return <span key={key}>{el}</span>;
}
function block(n: any, key: number): ReactNode {
  const style: CSSProperties = ['left', 'center', 'right', 'justify'].includes(n.format) ? {textAlign: n.format} : {};
  if (n.indent > 0) style.paddingLeft = `calc(${Math.min(8, n.indent)} * var(--indent-step))`;
  const kids = (n.children || []).map(inline);
  if (n.type === 'heading' && /^h[1-6]$/.test(n.tag)) { const T = n.tag as 'h1'; return <T key={key} style={style}>{kids}</T>; }
  return <p key={key} style={style}>{kids}</p>;
}

/** `boost` enlarges the type (not the page) so small previews stay readable while keeping the book's own fonts, alignment and layout. */
export default function MiniPage({scene, appearance, width, className = '', boost = 1}: {scene: Scene; appearance: Appearance; width: number; className?: string; boost?: number}) {
  const [wMm, hMm] = pageDimensions(appearance);
  const w = wMm * MM, h = hMm * MM, scale = width / w;
  const layout = normalizeLayout(scene.layout);
  const a = {...appearance, bodySize: appearance.bodySize * boost, headingSize: appearance.headingSize * boost, margin: appearance.margin / Math.sqrt(boost), paragraphSpacing: (appearance.paragraphSpacing ?? 16) * boost};
  const blocks = (scene.content?.root?.children || []).slice(0, 18);
  const art = scene.template === 'color-art' || scene.template === 'bnw-art';
  return <span className={`mini-page ${className}`} aria-hidden="true" style={{display: 'block', width, height: h * scale, overflow: 'hidden', position: 'relative', background: '#fff'}}>
    <style>{css}</style>
    <span style={{display: 'block', position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `scale(${scale}) translateZ(0)`, transformOrigin: '0 0', willChange: 'transform', WebkitFontSmoothing: 'antialiased', boxSizing: 'border-box', padding: a.margin * MM, color: '#222',
      fontFamily: `'${a.bodyFont}'`, fontSize: a.bodySize, lineHeight: a.lineHeight ?? 1.6, letterSpacing: (a.tracking ?? 0) + 'px',
      ['--heading-font' as string]: `'${a.headingFont}'`, ['--heading-size' as string]: a.headingSize + 'px',
      ['--mp-gap' as string]: (a.paragraphSpacing ?? 16) + 'px', ['--mp-indent' as string]: (a.paragraphIndent ?? 0) + 'em', ['--mp-align' as string]: a.paragraphAlign ?? 'left', ['--indent-step' as string]: (a.indentStepMm ?? 12.7) * MM + 'px', whiteSpace: 'pre-wrap', tabSize: (a.indentStepMm ?? 12.7) * MM + 'px'} as CSSProperties}>
      {layout.border !== 'none' && <span style={{position: 'absolute', inset: a.margin * MM * .55, border: `${layout.border === 'double' ? 6 : 2}px ${layout.border} #555`}}/>}
      {(scene.decals || []).map(d => { try { return <img key={d.id} src={decalSource(d.src, d.color)} alt="" style={{position: 'absolute', left: d.x + '%', top: d.y + '%', width: d.width + '%', opacity: d.opacity, transform: `rotate(${d.rotation}deg)`}}/>; } catch { return null; } })}
      {scene.template === 'comic' ? <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        {panelBoxes(comicOf(scene), wMm, hMm).map(b => <polygon key={b.index} points={svgPoints(b.shape)} fill={comicOf(scene).panels[b.index]?.assetId ? '#d9d1bf' : '#f6f3ec'} stroke="#111" strokeWidth={Math.max(1, comicOf(scene).borderMm * MM)} vectorEffect="non-scaling-stroke"/>)}
      </svg>
      : art ? (scene.image ? <img src={scene.image.src} alt="" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: scene.image.fit || 'contain', filter: scene.template === 'bnw-art' ? 'grayscale(1)' : undefined}}/>
        : <span style={{position: 'absolute', inset: a.margin * MM, display: 'grid', placeItems: 'center', background: '#f1eee6', color: '#9a917c', fontSize: 40}}>▧</span>)
        : <span className="mini-page-body" style={{display: 'block', position: 'relative'}}>
          {layout.chapterSpacing > 0 && <span style={{display: 'block', height: layout.chapterSpacing * MM * .8}}/>}
          {blocks.map(block)}
        </span>}
    </span>
  </span>;
}
