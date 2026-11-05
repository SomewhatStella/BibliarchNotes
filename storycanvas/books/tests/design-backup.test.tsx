import {it,expect} from 'vitest';import {seed,parseLibrary} from '../src/model';
it('rejects malformed reusable design collections before they can crash the UI',()=>{const l:any=seed();l.books[0].decalCollections=[{id:'x',name:'bad',decals:'not an array'}];expect(()=>parseLibrary(JSON.stringify(l))).toThrow();});
it('rejects invalid saved design layouts',()=>{const l:any=seed();l.books[0].designLayout={chapterSpacing:9999};expect(()=>parseLibrary(JSON.stringify(l))).toThrow();});
