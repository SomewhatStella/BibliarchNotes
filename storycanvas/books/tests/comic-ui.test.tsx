import React from 'react';
import {it, expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import ComicPage, {ComicLayoutIcon} from '../src/ComicPage';
import {PageThumbnail} from '../src/LibraryHome';
import {newComic} from '../src/comic';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const noop = () => {};

it('draws panels, the user’s art, bubbles and “Add art” for empty panels', () => {
  const c = newComic('big-two'); c.rtl = true;
  c.panels[0] = {...c.panels[0], assetId: 'a', bubbles: [{id: 'b1', kind: 'speech', text: 'Wait!', x: 10, y: 10, width: 30, sizePt: 9, tail: 'bottom-left'}]};
  const html = renderToStaticMarkup(<ComicPage scene={{id: 's', title: 'Page', content: null as any, template: 'comic', comic: c}} assets={[{id: 'a', src: PNG, name: 'hero.png', naturalWidth: 400, naturalHeight: 300}]}
    width={484} height={688} widthMm={128} heightMm={182} onChange={noop} onUploadArt={noop} onOpenLayout={noop}/>);
  expect(html).toContain('class="pagination-page comic-page comic-editor"');
  expect(html).toContain('read right to left');
  expect(html.match(/class="comic-panel[ "]/g)).toHaveLength(3);
  expect(html).toContain('aria-label="Panel 1: hero.png"');
  expect(html.match(/>Add art</g)).toHaveLength(2);
  expect(html).toContain('clip-path:polygon(');
  expect(html).toContain('Wait!');
  expect(html).toContain('comic-tail bottom-left');
  expect(html).toContain('data-panel="2"');
});

it('layout pictures appear in the page-type thumbnail and the layout picker', () => {
  expect(renderToStaticMarkup(<PageThumbnail template="comic" title="Comic page"/>)).toContain('<polygon');
  expect(renderToStaticMarkup(<ComicLayoutIcon comic={newComic('grid-2x3')}/>).match(/<polygon/g)).toHaveLength(6);
});
