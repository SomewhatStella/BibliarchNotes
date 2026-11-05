import {test,expect,type Locator} from '@playwright/test';
async function select(text:Locator,start:number,end:number){await text.evaluate((el,{start,end})=>{(el as HTMLElement).focus();const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n:Node|null,p=0;const r=document.createRange();let begun=false;while(n=w.nextNode()){const l=n.textContent!.length;if(!begun&&start<=p+l){r.setStart(n,start-p);begun=true;}if(end<=p+l){r.setEnd(n,end-p);break;}p+=l;}const s=getSelection()!;s.removeAllRanges();s.addRange(r);},{start,end});}
async function styles(text:Locator){return text.evaluate(el=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),out:any[]=[];let n:Node|null;while(n=w.nextNode()){const c=getComputedStyle(n.parentElement!);for(const char of n.textContent!)out.push([char,c.fontWeight,c.fontStyle]);}return out;});}
test('only selected Apple gets bold/italic; toggles, typing, paste and reload retain safe runs',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 const art=page.locator('.template-color-art');await art.click();await page.getByRole('tab',{name:'Text',exact:true}).click();await page.getByRole('button',{name:'Add text to picture',exact:true}).click();const text=art.getByRole('textbox',{name:'Illustration text'});await text.fill('The Apple!!');
 await select(text,4,9);await page.getByRole('button',{name:'Bold',exact:true}).click();await page.getByRole('button',{name:'Italic',exact:true}).click();
 const expected=[...'The Apple!!'].map((c,i)=>[c,i>=4&&i<9?'700':'400',i>=4&&i<9?'italic':'normal']);await expect.poll(()=>styles(text)).toEqual(expected);
 await expect.poll(()=>styles(text)).toEqual(expected);
 await expect(page.getByRole('button',{name:'Bold',exact:true})).toHaveAttribute('aria-pressed','true');
 const ghost=art.locator('.text-overflow-ghost > div > div');await expect.poll(()=>styles(ghost)).toEqual(expected);
 await expect.poll(()=>page.evaluate(()=>getSelection()?.toString())).toBe('Apple');
 await page.keyboard.press('Control+b');await expect.poll(()=>styles(text)).toEqual(expected.map(r=>[r[0],'400',r[2]]));await page.keyboard.press('Control+b');await page.keyboard.press('Control+i');await page.keyboard.press('Control+i');await expect.poll(()=>styles(text)).toEqual(expected);
 await select(text,7,7);await page.keyboard.type('X');await expect(text).toHaveText('The AppXle!!');expect((await styles(text))[7]).toEqual(['X','700','italic']);await page.keyboard.press('Backspace');
 await select(text,11,11);await text.evaluate(el=>{const e=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:new DataTransfer()});e.clipboardData!.setData('text/plain',' <safe>');e.clipboardData!.setData('text/html','<img src=x onerror=alert(1)>');el.dispatchEvent(e);});await expect(text).toHaveText('The Apple!! <safe>');await expect(text.locator('img')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bibliarch-books-v1')!).books.flatMap((b:any)=>b.chapters.flatMap((c:any)=>c.scenes)).find((s:any)=>s.overlay?.text==='The Apple!! <safe>')?.overlay.text)).toBe('The Apple!! <safe>');await page.getByRole('button',{name:'← My books',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Open Japanese light novel',exact:true}).click();await expect(text).toHaveText('The Apple!! <safe>');expect((await styles(text)).slice(0,11)).toEqual(expected);
 await text.click();await page.screenshot({path:'test-results/overlay-partial-formatting.png',fullPage:true});
});
