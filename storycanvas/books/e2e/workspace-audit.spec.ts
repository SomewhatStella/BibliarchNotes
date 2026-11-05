import {test,expect,type Page} from '@playwright/test';
test('90 percent zoom survives refresh',async({page})=>{await open(page);await page.getByLabel('Zoom',{exact:true}).selectOption('90');await page.reload();await expect(page.getByLabel('Zoom',{exact:true})).toHaveValue('90');});
test('overlay search shows excerpt count and selects the actual text',async({page})=>{await open(page);await page.evaluate(()=>{const l=JSON.parse(localStorage.getItem('bibliarch-books-v1')!);const b=l.books.find((b:any)=>b.id===l.activeBook);b.chapters.flatMap((c:any)=>c.scenes).find((s:any)=>s.template==='color-art').overlay={text:'Before visible needle after',x:20,y:20,size:30,color:'#222222'};localStorage.setItem('bibliarch-books-v1',JSON.stringify(l));});await page.reload();await page.getByRole('button',{name:'Review',exact:true}).click();await page.getByRole('button',{name:'Find in document',exact:true}).last().click();await page.getByRole('textbox',{name:'Find in document',exact:true}).fill('visible needle');await expect(page.getByText('1 matches in 1 sections',{exact:true})).toBeVisible();await expect(page.locator('.search-result mark')).toHaveText('visible needle');await page.locator('.search-result').click();await expect.poll(()=>page.evaluate(()=>window.getSelection()?.toString())).toBe('visible needle');});
test('text search joins formatted nodes, selects the occurrence and restores the section',async({page})=>{
 await open(page);const target=await page.evaluate(()=>{const l=JSON.parse(localStorage.getItem('bibliarch-books-v1')!);const b=l.books.find((b:any)=>b.id===l.activeBook),s=b.chapters.flatMap((c:any)=>c.scenes).find((s:any)=>s.template==='prose');s.content={root:{type:'root',version:1,format:'',indent:0,direction:null,children:[{type:'paragraph',version:1,format:'',indent:0,direction:null,children:[{type:'text',version:1,text:'Before joined ',format:0,detail:0,mode:'normal',style:''},{type:'text',version:1,text:'needle after',format:1,detail:0,mode:'normal',style:''}]}]}};localStorage.setItem('bibliarch-books-v1',JSON.stringify(l));return s.id;});
 await page.reload();
 // Let the actual mounted editor normalize the deliberately raw Lexical fixture
 // before measuring search side effects (paragraph defaults are serialized on mount).
 await expect(page.getByRole('textbox',{name:'Manuscript',exact:true}).filter({hasText:'Before joined needle after'})).toBeVisible();
 await expect.poll(()=>page.evaluate(id=>{
   const l=JSON.parse(localStorage.getItem('bibliarch-books-v1')!);
   return l.books.flatMap((b:any)=>b.chapters.flatMap((c:any)=>c.scenes)).find((s:any)=>s.id===id).content.root.children[0].textFormat;
 },target)).toBe(0);
 const manuscript=()=>page.evaluate(()=>{
   const l=JSON.parse(localStorage.getItem('bibliarch-books-v1')!);
   // Navigation is expected; timestamps are bookkeeping, not manuscript data.
   // Retain every content node, format/style, layout, artwork and other book field.
   delete l.activeScene;
   for(const b of l.books) delete b.updatedAt;
   return l;
 });
 const before=await manuscript();
 await page.getByRole('button',{name:'Review',exact:true}).click();await page.getByRole('button',{name:'Find in document',exact:true}).last().click();await page.getByRole('textbox',{name:'Find in document',exact:true}).fill('joined needle');await expect(page.locator('.search-result mark')).toHaveText('joined needle');await page.locator('.search-result').click();
 await expect.poll(()=>page.evaluate(()=>window.getSelection()?.toString())).toBe('joined needle');
 expect(await manuscript()).toEqual(before);
 await page.reload();
 await expect(page.getByRole('textbox',{name:'Manuscript',exact:true}).filter({hasText:'Before joined needle after'})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bibliarch-workspace-v1')!).sceneId)).toBe(target);
 expect(await manuscript()).toEqual(before);
});
test('missing saved book falls back to library without touching manuscript',async({page})=>{await open(page);const before=await page.evaluate(()=>{localStorage.setItem('bibliarch-workspace-v1',JSON.stringify({bookId:'deleted-book',sceneId:'deleted-scene',zoom:999,view:'invalid',home:false}));return localStorage.getItem('bibliarch-books-v1');});await page.reload();await expect(page.getByRole('button',{name:'Open Japanese light novel',exact:true})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('bibliarch-books-v1'))).toBe(before);});
async function open(page:Page){await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();}
async function styles(page:Page){await page.getByRole('button',{name:'Format',exact:true}).click();await page.getByRole('button',{name:'Page styles and typography',exact:true}).click();}
test('search excludes serialized metadata and reports no results',async({page})=>{await open(page);await page.getByRole('button',{name:'Review',exact:true}).click();await page.getByRole('button',{name:'Find in document',exact:true}).last().click();await page.getByRole('textbox',{name:'Find in document',exact:true}).fill('textFormat');await expect(page.getByText('No results', {exact:true})).toBeVisible();});
test('numeric drafts stay blank until commit and typography has direct values',async({page})=>{await open(page);await styles(page);await page.getByLabel('Page preset',{exact:true}).selectOption('Custom');const width=page.getByRole('spinbutton',{name:'Width (mm)',exact:true});await width.fill('');await expect(width).toHaveValue('');await width.fill('20');await width.press('Enter');await expect(width).toHaveValue('80');const spacing=page.getByRole('spinbutton',{name:'Line height',exact:true});await spacing.fill('');await expect(spacing).toHaveValue('');await spacing.press('Tab');await expect(spacing).not.toHaveValue('');const size=page.getByRole('spinbutton',{name:'body size (px)',exact:true});await size.fill('19');await size.press('Enter');await expect(size).toHaveValue('19');});
test('workspace restores view zoom and book without rewriting manuscript on hydration',async({page})=>{await open(page);await page.getByLabel('Zoom',{exact:true}).selectOption('75');await page.getByLabel('View',{exact:true}).selectOption('facing');const before=await page.evaluate(()=>localStorage.getItem('bibliarch-books-v1'));await page.reload();await expect(page.getByLabel('View',{exact:true})).toHaveValue('facing');await expect(page.getByLabel('Zoom',{exact:true})).toHaveValue('75');expect(await page.evaluate(()=>localStorage.getItem('bibliarch-books-v1'))).toBe(before);});
test('personal templates leave book appearance unchanged unless explicitly enabled',async({page})=>{await open(page);await styles(page);page.once('dialog',d=>d.accept('Layout only'));await page.getByRole('button',{name:'Save personal template',exact:true}).click();await page.getByLabel('Body font',{exact:true}).selectOption('Arial');await page.getByRole('button',{name:'Apply Layout only',exact:true}).click();await expect(page.getByLabel('Body font',{exact:true})).toHaveValue('Arial');await page.getByLabel('Also apply saved whole-book appearance',{exact:true}).check();await page.getByRole('button',{name:'Apply Layout only',exact:true}).click();await expect(page.getByLabel('Body font',{exact:true})).not.toHaveValue('Arial');});
