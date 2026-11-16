import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import './analysis-detail-modal.css';

const activeModals=new Set<HTMLDialogElement>();
let restoreState:{overflow:string;x:number;y:number;focus:HTMLElement|null}|null=null;
let releaseFrame:number|undefined;
function lockModal(node:HTMLDialogElement){
 if(releaseFrame!==undefined){cancelAnimationFrame(releaseFrame);releaseFrame=undefined}
 if(!restoreState)restoreState={overflow:document.body.style.overflow,x:window.scrollX,y:window.scrollY,focus:document.activeElement instanceof HTMLElement?document.activeElement:null};
 activeModals.add(node);document.body.style.overflow='hidden';
}
function unlockModal(node:HTMLDialogElement){
 activeModals.delete(node);
 if(activeModals.size)return;
 // A sibling modal may open later in the same React commit. Restore only when
 // the entire modal transition has settled, preserving the original trigger.
 releaseFrame=requestAnimationFrame(()=>{
  releaseFrame=undefined;if(activeModals.size||!restoreState)return;
  const previous=restoreState;restoreState=null;
  document.body.style.overflow=previous.overflow;
  window.scrollTo({left:previous.x,top:previous.y,behavior:'instant'});
  if(previous.focus?.isConnected&&!document.querySelector('dialog[open]'))previous.focus.focus({preventScroll:true});
 });
}

/** A stable portal keeps the original chart and all its local settings mounted. */
export default function AnalysisDetailModal({analysis,open,title,onClose,children}:{analysis:boolean;open:boolean;title:string;onClose:()=>void;children:ReactNode}){
 const anchor=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null),body=useRef<HTMLDivElement>(null);
 const [host]=useState(()=>document.createElement('div'));
 const close=useRef(onClose);close.current=onClose;
 const nestedEscape=useRef(false);
 useLayoutEffect(()=>{
  host.className='analysisDetailContent';
  const destination=analysis?body.current:anchor.current;
  destination?.appendChild(host);
  return()=>{host.remove()};
 },[analysis,host]);
 useLayoutEffect(()=>{
  const node=dialog.current;if(!node)return;
  if(!analysis||!open){if(node.open)node.close();return;}
  lockModal(node);
  // Native modal dialogs provide top-layer rendering, background inertness and focus containment.
  node.showModal();
  host.querySelectorAll<HTMLDetailsElement>(':scope > details').forEach(detail=>{detail.open=true});
  node.querySelector<HTMLButtonElement>('.analysisDetailClose')?.focus({preventScroll:true});
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')nestedEscape.current=!!node.querySelector('.dataMeaningTooltip,.floatingQueryLayer:not([hidden]) aside:not([hidden]),details.trendSupplementMenu[open]')};
  const cancel=(event:Event)=>{event.preventDefault();if(nestedEscape.current){nestedEscape.current=false;return}close.current()};
  node.addEventListener('keydown',key,true);
  node.addEventListener('cancel',cancel);
  return()=>{
   node.removeEventListener('cancel',cancel);node.removeEventListener('keydown',key,true);if(node.open)node.close();
   unlockModal(node);
  };
 },[analysis,open,host]);
 return <div className="analysisDetailSlot" ref={anchor}>
  <dialog className="analysisDetailModal" ref={dialog} aria-label={title} onClick={event=>{if(event.target===event.currentTarget)close.current()}}>
   <div className="analysisDetailModalHeader"><h2>{title}</h2><button className="analysisDetailClose" onClick={onClose}>닫기 <span aria-hidden="true">×</span></button></div>
   <div className="analysisDetailModalBody" ref={body}/>
  </dialog>
  {createPortal(children,host)}
 </div>;
}
