import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import BugReport from '../src/BugReport';
const source=(name:string)=>readFileSync(name,'utf8');
it('keeps backups out of library header and accessible in footer recovery',()=>{
 const studio=source('app/BooksStudio.tsx');
 expect(studio).not.toContain('tools={<>{backupControls}');
 expect(studio).toContain('recoveryTools={backupControls}');
});
it('uses a labelled feedback icon in the top-right utility area, like Notes',()=>{
 const html=renderToStaticMarkup(createElement(BugReport,{userId:'alice'}));
 expect(html).toContain('aria-label="Send feedback"');expect(html).toContain('<svg');
});
it('validates the current shared account before sending feedback',()=>{
 const report=source('src/BugReport.tsx');
 expect(report).toContain('await sharedSession()');expect(report).toContain('userId&&session?.user.id!==userId');
 expect(report).not.toContain('document.cookie');
});
it('creates the same profile as Notes on immediate-session signup',()=>{
 expect(source('src/SharedAccount.tsx')).toContain("from('profiles').upsert");
});
it('does not show an always-on cloud banner',()=>{
 expect(source('src/CloudPanel.tsx')).toContain('if(!paused)return null');
});
