import {describe, expect, it} from 'vitest';
import {printCheck, supportedTrim, insideMarginMm, printerReadyPatch, spineWidthIn} from '../src/print-check';
import {createPresetBook} from '../src/templates';

describe('print check', () => {
  it('flags template sample text and points at the page', () => {
    const book = createPresetBook('novel');
    const issues = printCheck(book, 120, 'kdp');
    const sample = issues.filter(i => i.title.startsWith('Sample text'));
    expect(sample.length).toBeGreaterThan(2);
    expect(sample.every(i => i.sceneId)).toBe(true);
    expect(issues.some(i => i.title.includes('Copyright') && i.detail.includes('ISBN'))).toBe(true);
  });
  it('knows which sizes Amazon KDP prints and offers the nearest', () => {
    const book = createPresetBook('novel'); // 6 x 9 in
    expect(supportedTrim(book.appearance, 'kdp')?.name).toBe('6 × 9 in');
    const a5 = {...book.appearance, preset: 'A5' as const, widthMm: undefined, heightMm: undefined};
    expect(supportedTrim(a5, 'kdp')).toBeNull();
    expect(supportedTrim(a5, 'ingram')?.name).toBe('A5');
    const issue = printCheck({...book, appearance: a5}, 120, 'kdp').find(i => i.title.includes('doesn’t print this size'));
    expect(issue?.fix?.patch.widthMm).toBeCloseTo(139.7, 0);
  });
  it('requires a wider spine-side margin as the page count grows, and can fix it', () => {
    expect(insideMarginMm(100, 'kdp')).toBeCloseTo(9.525, 2);
    expect(insideMarginMm(400, 'kdp')).toBeCloseTo(15.875, 2);
    const book = createPresetBook('novel');
    const narrow = {...book.appearance, margin: 13, mirror: false};
    const issue = printCheck({...book, appearance: narrow}, 400, 'kdp').find(i => i.title.startsWith('Margins are too small'));
    expect(issue).toBeTruthy();
    const fixed = {...narrow, ...printerReadyPatch(narrow, 400, 'kdp')};
    expect(printCheck({...book, appearance: fixed}, 400, 'kdp').some(i => i.title.startsWith('Margins are too small'))).toBe(false);
  });
  it('checks page count limits', () => {
    const book = createPresetBook('poetry');
    expect(printCheck(book, 10, 'kdp').some(i => i.title.startsWith('Too few pages'))).toBe(true);
    expect(printCheck(book, 10, 'home').some(i => i.title.startsWith('Too few pages'))).toBe(false);
  });
  it('estimates spine width from page count', () => {
    expect(spineWidthIn(300, 'cream')).toBeCloseTo(0.75, 2);
    expect(spineWidthIn(300, 'white')).toBeCloseTo(0.6756, 3);
  });
});
