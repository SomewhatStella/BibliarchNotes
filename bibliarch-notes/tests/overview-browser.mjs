import {build} from 'esbuild';import {chromium} from 'playwright';import {createServer} from 'node:http';import {readFileSync,mkdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const dir='tests/artifacts/overview';mkdirSync(dir,{recursive:true});
const mocks={
 'next/navigation':'export const useRouter=()=>({push:()=>{}});',
 'next/link':'import React from "react";export default function Link(p){return React.createElement("a",p)}',
 '@/lib/supabase/client':`export const createClient=()=>({from:()=>({select:()=>({order:async()=>({data:Array.from({length:12},(_,i)=>({id:String(i),title:'Story '+i,updated_at:'2026-01-01',bio:''}))}),eq:()=>({single:async()=>({data:{is_admin:false}})})})})});`,
 '@/lib/auth/actions':'export const signOut=()=>{};',
 '@/lib/collaboration':'export const getMyInvitations=async()=>[];export const acceptInvitation=async()=>{};export const declineInvitation=async()=>{};',
};
await build({entryPoints:['tests/overview-fixture.tsx'],bundle:true,outfile:`${dir}/fixture.js`,jsx:'automatic',alias:{'@':'./src'},plugins:[{name:'mock',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js',resolveDir:process.cwd()}));}}]});
execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-i','src/app/globals.css','-o',`${dir}/fixture.css`],{stdio:'pipe'});
const server=createServer((req,res)=>{const file=['/fixture.js','/fixture.css'].includes(req.url)?req.url:null;res.setHeader('Content-Type',file?.endsWith('js')?'text/javascript':file?'text/css':'text/html');res.end(file?readFileSync(dir+file):'<link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
try {const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));for(const width of [1440,390]){
 await p.setViewportSize({width,height:900});await p.goto(`http://127.0.0.1:${server.address().port}`);await p.getByText('Story 11',{exact:true}).waitFor();
 const nav=p.getByRole('navigation',{name:'Workspaces'});await nav.waitFor();assert.equal(await nav.getByRole('link',{name:'Notes',exact:true}).getAttribute('aria-current'),'page');assert.equal(await nav.getByRole('link',{name:'Home',exact:true}).getAttribute('href'),'/');assert.equal(await nav.getByRole('link',{name:'Books',exact:true}).getAttribute('href'),'/books');
 assert.equal(await p.getByRole('link',{name:'Bibliarch home'}).count(),1);
 const y=(await p.locator('.notes-site-navigation').boundingBox()).y;await p.locator('main').evaluate(el=>el.scrollTop=1000);assert.equal((await p.locator('.notes-site-navigation').boundingBox()).y,y);assert.ok(await p.locator('main').evaluate(el=>el.scrollTop>0));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('main').evaluate(el=>el.scrollTop=0);await p.screenshot({path:`${dir}/${width}.png`});
}assert.deepEqual(errors,[]);console.log('PASS actual Dashboard with mocked data: persistent top nav, correct destinations/active Notes, one logo, scrollable overview and mobile fit');}finally{await browser.close();await new Promise(r=>server.close(r));}
