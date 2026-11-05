import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import LibraryHome from '../src/LibraryHome';
const render=()=>renderToStaticMarkup(createElement(LibraryHome,{books:[],status:'Saved on this device',error:null,tools:null,onOpen:()=>{},onCreate:()=>{},onDelete:()=>{}}));
it('does not show obsolete browser-only notices or primary backup buttons',()=>{
 const html=render();
 expect(html).not.toContain('Your books are saved in this browser');
 expect(html).not.toContain('Clearing your browser data can delete your books');
 expect(html).not.toContain('Save backup');
 expect(html).toContain('Start a new book');
});
it('welcomes an empty library instead of reporting a failed search',()=>{
 expect(render()).toContain('Your first book starts here');
 expect(render()).not.toContain('No books found');
});
