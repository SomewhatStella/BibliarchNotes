import {Children, useState, type ReactNode} from 'react';

const tabs = ['Typography', 'Layout', 'Decoration'] as const;
// Keep the original controls mounted: changing categories must not reset drafts.
const categories = ['Decoration', 'Layout', 'Typography', 'Layout', 'Decoration', 'Decoration'];
export default function PageSettingsSections({children,onPreview}:{children:ReactNode;onPreview:()=>void}) {
  const [active,setActive]=useState<string>('Typography');
  return <div className="page-settings">
    <p className="settings-hint">Changes appear on the page as you edit. Book settings apply to every page.</p>
    <div className="settings-tabs" role="tablist" aria-label="Page settings categories">
      {tabs.map((tab,index)=><button key={tab} id={`settings-tab-${tab}`} type="button" role="tab" aria-selected={active===tab} aria-controls={`settings-section-${tab}`} tabIndex={active===tab?0:-1} onClick={()=>setActive(tab)} onKeyDown={event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        setActive(tabs[next]);document.getElementById(`settings-tab-${tabs[next]}`)?.focus();
      }}>{tab}</button>)}
    </div>
    <div className="settings-scroll">
      {tabs.map(tab=><section key={tab} id={`settings-section-${tab}`} role="tabpanel" aria-labelledby={`settings-tab-${tab}`} hidden={active!==tab} tabIndex={0}>
        {Children.toArray(children).filter((_,index)=>categories[index]===tab)}
      </section>)}
    </div>
    <footer className="settings-preview"><span>Changes use book autosave</span><button type="button" onClick={onPreview}>3D book preview →</button></footer>
  </div>;
}
