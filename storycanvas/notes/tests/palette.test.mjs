import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';
function load(path){const exports={};new Function('exports',ts.transpile(readFileSync(path,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}))(exports);return exports;}
const P=load('src/lib/color-palette.ts');

test('normalize repairs bad or missing colours field by field instead of passing them to CSS',()=>{
  const p=P.normalizePalette({id:'custom-1',name:'Mine',colors:{nodeDefault:'#2e5',nodeText:'not a colour',canvasBackground:'rgb(1, 2, 3)'}});
  assert.equal(p.id,'custom-1');
  assert.equal(p.colors.nodeDefault,'#2e5');
  assert.equal(p.colors.nodeText,P.DEFAULT_PALETTE.colors.nodeText);
  assert.equal(p.colors.canvasBackground,'rgb(1, 2, 3)');
  assert.equal(p.colors.success,P.DEFAULT_PALETTE.colors.success);
});
test('legacy flat palettes upgrade, and junk falls back to the default',()=>{
  const p=P.normalizePalette({id:'legacy',main:'#c13f77',complementary:'#15304a',accent:'#e2f1df'});
  assert.equal(p.colors.nodeDefault,'#c13f77');assert.equal(p.colors.canvasBackground,'#e2f1df');assert.equal(p.id,'legacy');
  assert.equal(P.normalizePalette(null),P.DEFAULT_PALETTE);assert.equal(P.normalizePalette('x'),P.DEFAULT_PALETTE);
  assert.equal(P.isDefaultPalette(P.normalizePalette(P.DEFAULT_PALETTE)),true);
  assert.equal(P.isDefaultPalette(P.PALETTE_PRESETS[1]),false);
});
test('a pale preset still gives a visible strip, a tinted card and readable text',()=>{
  for(const preset of [...P.PRESET_PALETTES,...P.PALETTE_PRESETS]){
    const v=P.derivePaletteVars(preset.colors);
    const [,,lAccent]=P.hexToHsl(v['--pal-accent-light']);const [,,lFill]=P.hexToHsl(v['--pal-fill-light']);const [,,lDark]=P.hexToHsl(v['--pal-fill-dark']);
    assert.ok(lAccent<=51,`${preset.name} strip ${v['--pal-accent-light']}`);
    assert.ok(lFill>85&&lDark<30);
    assert.ok(P.contrastRatio(v['--pal-text-light'],v['--pal-fill-light'])>=4.5,preset.name);
  }
});
test('presets are all distinct and valid hex',()=>{
  const ids=new Set(P.PALETTE_PRESETS.map(p=>p.id));assert.equal(ids.size,P.PALETTE_PRESETS.length);
  for(const p of P.PALETTE_PRESETS)for(const c of Object.values(p.colors))assert.ok(P.isHexColor(c),`${p.name} ${c}`);
});
test('dark-mode and custom palette CSS is wired to the derived variables',()=>{
  const css=readFileSync('src/app/board-theme.css','utf8');
  assert.match(css,/\[data-default-palette='false'\] \[data-node-id\]\.emboss \{\s*background: var\(--pal-fill-light\)/);
  assert.match(css,/html\[data-ui-theme='dark'\] \.notes-board-shell\[data-default-palette='false'\] \[data-node-id\]\.emboss \{\s*background: var\(--pal-fill-dark\)/);
});
