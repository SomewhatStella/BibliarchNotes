import {useEffect,useRef,type ReactNode} from 'react';
/**
 * Dialogs open modally and centred. Side sheets (`modal={false}`) dock beside the page
 * instead: the page stays usable and recentres in the space that's left.
 */
export default function ToolDialog({children,name,onClose,className='',modal=true}:{children:ReactNode;name:string;onClose:()=>void;className?:string;modal?:boolean}) {
 const ref=useRef<HTMLDialogElement>(null);
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement;
  if(modal)ref.current?.showModal();else ref.current?.show();
  const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]:modal'))close.current();};
  if(!modal)document.addEventListener('keydown',esc);
  return()=>{document.removeEventListener('keydown',esc);previous?.focus?.();};
 },[modal]);
 return <dialog ref={ref} className={`settings panel tool-dialog ${className}`} aria-label={name} onCancel={onClose}>{children}</dialog>;
}
