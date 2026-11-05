import {test as base,expect,type Page} from '@playwright/test';
// Legacy editor regressions now enter through the real library home after navigation.
// New home/gallery regressions intentionally use Playwright's unmodified page fixture.
export const test=base.extend({page:async({page},use)=>{
 const enter=async()=>{
  await page.getByRole('heading',{name:'Your books',exact:true}).waitFor();
  const title=await page.evaluate(()=>{try{const l=JSON.parse(localStorage.getItem('bibliarch-books-v1')||'null');return l?.books.find((b:{id:string})=>b.id===l.activeBook)?.title||'Book name'}catch{return 'Book name'}});
  await page.getByRole('button',{name:`Open ${title}`,exact:true}).click();
 };
 const goto=page.goto.bind(page),reload=page.reload.bind(page);
 page.goto=async(...args)=>{const response=await goto(...args);if(new URL(page.url()).pathname==='/')await enter();return response};
 page.reload=async(...args)=>{const response=await reload(...args);if(new URL(page.url()).pathname==='/')await enter();return response};
 await use(page);
}});
export {expect};export type {Page};
