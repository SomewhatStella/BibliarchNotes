import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import JSZip from 'jszip';
import {fonts,seed,parseLibrary} from '../src/model';
import * as design from '../src/design';
import BookDesignPanel from '../src/BookDesignPanel';
import EditorTools from '../src/EditorTools';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {createEmptyHistoryState} from '@lexical/history';
import {buildPrintHtml,buildEpub,type PublishBook} from '../src/publishing';

describe('Verdana reading font',()=>{
 it('offers a clearly named alias without changing the stored CSS family',()=>{
  expect((design as any).fontLabel?.('Verdana')).toBe('Verdana');
  expect((design as any).fontLabel?.('Georgia')).toBe('Georgia');
  expect(fonts).toContain('Verdana');
 });
 it('names Verdana plainly in the body font picker',()=>{
  const book=seed().books[0];
  const html=renderToStaticMarkup(<BookDesignPanel book={book} chapter={book.chapters[0]} scene={book.chapters[0].scenes[0]} pageCount={1} actions={{} as any}/>);
  expect(html).toContain('Verdana');expect(html).not.toContain('AO3');expect(html).not.toContain('Archive of Our Own');
 });
 it('keeps the selection dropdown value a valid CSS family',()=>{
  const html=renderToStaticMarkup(<LexicalComposer initialConfig={{namespace:'font-test',onError: e=>{throw e}}}><EditorTools historyState={createEmptyHistoryState()}/></LexicalComposer>);
  expect(html).toContain('<option value="Verdana">Verdana</option>');
 });
 it('preserves every existing saved font value, including the AO3 fallback',()=>{
  for(const font of fonts){const library=seed();library.books[0].appearance.bodyFont=font;library.books[0].appearance.headingFont=font;expect(parseLibrary(JSON.stringify(library))).toEqual(library);}
 });
 it('keeps rejecting UI labels and unsafe family values as saved fonts',()=>{
  for(const font of ['AO3 style (Verdana)','AO3 (Verdana fallback)','Verdana; color:red']){const library=seed();library.books[0].appearance.bodyFont=font;expect(()=>parseLibrary(JSON.stringify(library))).toThrow();}
 });
 it('exports the actual Verdana family in print and EPUB, never an alias or font download',async()=>{
  const book:PublishBook={title:'AO3 fallback',format:{widthMm:148,heightMm:210,marginMm:15,bodyFont:'Verdana'},sections:[{id:'prose',title:'Prose',kind:'prose',content:{root:{children:[{type:'paragraph',children:[{type:'text',text:'Reading',style:'font-family: Verdana;'}]}]}}}]};
  const html=buildPrintHtml(book);expect(html).toContain('font-family:Verdana');expect(html).not.toContain('AO3 (');expect(html).not.toContain('@font-face');
  const zip=await JSZip.loadAsync(await buildEpub(book));const css=await zip.file('OEBPS/style.css')!.async('string');expect(css).toContain('font-family:Verdana');expect(css).not.toContain('@font-face');expect(Object.keys(zip.files).filter(p=>/\.(woff2?|ttf|otf)$/.test(p))).toEqual([]);
 });
});
