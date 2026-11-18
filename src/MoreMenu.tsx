import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
/** One item list builds BOTH the menu and its tooltip, so the two cannot disagree (I09). */
export type MoreItem={id:string;label:string;visible:boolean;onSelect?:()=>void;custom?:ReactNode};
export default function MoreMenu({items}:{items:readonly MoreItem[]}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),id=useId();
 const shown=items.filter(item=>item.visible),summary=shown.map(item=>item.label).join('·');
 useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[open]);
 const keydown=(event:React.KeyboardEvent)=>{if(event.key!=='Escape')return;if(document.querySelector('.layoutOptions'))return;event.preventDefault();event.stopPropagation();setOpen(false);button.current?.focus()};
 return <div className="moreMenu" ref={root} onKeyDown={keydown}>
  <button ref={button} type="button" className="moreButton" aria-haspopup="true" aria-expanded={open} aria-controls={id} aria-label={`더보기: ${summary}`} title={`더보기: ${summary}`} onClick={()=>setOpen(value=>!value)}>···</button>
  {/* Kept mounted when closed: the layout control owns map/detail ratio state. */}
  <div id={id} className="moreMenuList" role="group" aria-label="더보기" hidden={!open}>
   {items.map(item=>item.custom!==undefined?<div key={item.id} className="moreMenuCustom" hidden={!item.visible}>{item.custom}</div>:item.visible?<button key={item.id} type="button" onClick={()=>{setOpen(false);item.onSelect?.()}}>{item.label}</button>:null)}
  </div>
 </div>;
}
