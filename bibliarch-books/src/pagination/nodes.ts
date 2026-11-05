import { ElementNode, ParagraphNode, type NodeKey, type SerializedElementNode, type SerializedParagraphNode, type EditorConfig } from 'lexical';
import {decoratePage} from './furniture';
export type PageMetrics = { widthPx:number; heightPx:number; marginPx:number; firstPageReservePx?:number; header?:string; headerRecto?:string; footer?:string; view?:any; styleKey?:string; guides?:boolean; insidePx?:number;outsidePx?:number;startPage?:number };
export class PageNode extends ElementNode {
  __metrics: PageMetrics;
  __index: number;
  static getType() { return 'page'; }
  static clone(n:PageNode) { return new PageNode(n.__metrics,n.__index,n.__key); }
  constructor(metrics:PageMetrics={widthPx:600,heightPx:800,marginPx:60},index=0,key?:NodeKey) { super(key); this.__metrics=metrics; this.__index=index; }
  static importJSON(s:SerializedElementNode & {metrics:PageMetrics;index:number}) { return new PageNode(s.metrics,s.index).updateFromJSON(s); }
  exportJSON() { const {view,...metrics}=this.__metrics; return {...super.exportJSON(),type:'page',metrics,index:this.__index}; }
  createDOM() {
    const page=document.createElement('section');
    page.className='pagination-page';
    const body=document.createElement('div'); body.className='pagination-body';
    const prefix=document.createElement('div');prefix.className='pagination-prefix';prefix.contentEditable='false';body.append(prefix);page.append(body); this.decorate(page); return page;
  }
  decorate(page:HTMLElement) {
    const m=this.__metrics, reserve=this.__index===0 ? (m.firstPageReservePx||0):0;
    page.dataset.page=String(this.__index+1);
    const number=(m.startPage||1)+this.__index;
    const left=number%2?(m.insidePx??m.marginPx):(m.outsidePx??m.marginPx),right=number%2?(m.outsidePx??m.marginPx):(m.insidePx??m.marginPx);
    page.style.cssText=`position:relative;box-sizing:border-box;width:${m.widthPx}px;height:${m.heightPx}px;padding:${m.marginPx+reserve}px ${right}px ${m.marginPx}px ${left}px;background:white;color:inherit;box-shadow:0 2px 12px #0002;margin:0 0 24px;flex-shrink:0;`;
    const body=page.querySelector<HTMLElement>('.pagination-body')!;
    body.style.cssText=`display:flow-root;height:${Math.max(24,m.heightPx-2*m.marginPx-reserve)}px;`;
    decoratePage(page,body,body.querySelector<HTMLElement>('.pagination-prefix')!,m,this.__index);
    page.querySelectorAll('[data-page-furniture]').forEach(el=>el.remove());
    // Like printed books: no running head on the title, copyright or contents pages or on the
    // opening page of a chapter, and no page number on the first two.
    const t=m.view?.template, opener=this.__index===0&&['chapter-title','afterword','characters'].includes(t);
    const quietHead=['book-front','copyright','toc'].includes(t)||opener, quietFoot=['book-front','copyright'].includes(t);
    // Facing pages, like a printed book: left pages carry the book title, right pages the chapter.
    const head=number%2===1&&m.headerRecto?m.headerRecto:m.header;
    for(const [position,value] of [['top',quietHead?'':head],['bottom',quietFoot?'':m.footer]] as const) if(value) {
      const label=document.createElement('div'); label.contentEditable='false'; label.dataset.pageFurniture=position;
      // Lines up with the text block (inside/outside margins) and uses the book's own typeface.
      label.style.cssText=`position:absolute;${position}:${Math.max(14,Math.round(m.marginPx*.45))}px;left:${left}px;right:${right}px;font-family:var(--body-font,Georgia,serif);font-size:11px;letter-spacing:.08em;font-variant:small-caps;color:#6b6358;text-align:center;pointer-events:none;user-select:none;`;
      label.className=position==='bottom'?'page-footer':'page-header';label.dataset.template=value;label.textContent=value.replaceAll('{page}',String(number)); page.append(label);
    }
  }
  getDOMSlot(dom:HTMLElement) { return super.getDOMSlot(dom).withElement(dom.querySelector<HTMLElement>('.pagination-body')!).withAfter(dom.querySelector('.pagination-prefix')); }
  updateDOM(prev:PageNode,dom:HTMLElement) { if(prev.__metrics!==this.__metrics || prev.__index!==this.__index) this.decorate(dom); return false; }
  isShadowRoot() { return false; }
}
export class FlowParagraphNode extends ParagraphNode {
  __group:string;
  static getType() { return 'flow-paragraph'; }
  static clone(n:FlowParagraphNode) { return new FlowParagraphNode(n.__group,n.__key); }
  constructor(group?:string,key?:NodeKey) { super(key); this.__group=group || this.__key; }
  static importJSON(s:SerializedParagraphNode & {group:string}) { return new FlowParagraphNode(s.group).updateFromJSON(s); }
  exportJSON() { return {...super.exportJSON(),type:'flow-paragraph',group:this.__group}; }
  createDOM(config:EditorConfig) { const dom=super.createDOM(config); dom.dataset.flowGroup=this.__group; return dom; }
}
