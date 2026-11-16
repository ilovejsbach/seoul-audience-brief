import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import './analysis-detail-modal.css';

const activeModals=new Set<HTMLDialogElement>();
let restoreOverflow:string|null=null;
let releaseFrame:number|undefined;
type DetailDisplay='popup'|'main';
const displayPreferences=new WeakMap<HTMLElement,DetailDisplay>();
type DetailSession={focus:HTMLElement|null;x:number;y:number;owners:Set<HTMLElement>;releaseFrame?:number};
const detailSessions=new WeakMap<HTMLElement,DetailSession>();
const surfaceChanged=()=>window.dispatchEvent(new Event('analysis-detail-surface-change'));
function enterDetail(target:HTMLElement,owner:HTMLElement){
 let session=detailSessions.get(target);
 if(!session){session={focus:document.activeElement instanceof HTMLElement?document.activeElement:null,x:window.scrollX,y:window.scrollY,owners:new Set()};detailSessions.set(target,session)}
 if(session.releaseFrame!==undefined){cancelAnimationFrame(session.releaseFrame);session.releaseFrame=undefined}
 session.owners.add(owner);
}
function leaveDetail(target:HTMLElement,owner:HTMLElement){
 const session=detailSessions.get(target);if(!session)return;
 session.owners.delete(owner);if(session.owners.size)return;
 session.releaseFrame=requestAnimationFrame(()=>{
  session.releaseFrame=undefined;if(session.owners.size)return;
  detailSessions.delete(target);
  if(document.querySelector('dialog[open],.analysisMainDetail:not([hidden])'))return;
  window.scrollTo({left:session.x,top:session.y,behavior:'instant'});
  if(session.focus?.isConnected&&session.focus.getClientRects().length)session.focus.focus({preventScroll:true});
 });
}
function lockModal(node:HTMLDialogElement){
 if(releaseFrame!==undefined){cancelAnimationFrame(releaseFrame);releaseFrame=undefined}
 if(restoreOverflow===null)restoreOverflow=document.body.style.overflow;
 activeModals.add(node);document.body.style.overflow='hidden';
}
function unlockModal(node:HTMLDialogElement){
 activeModals.delete(node);
 if(activeModals.size)return;
 // A sibling modal may open later in the same React commit. Restore only when
 // the entire modal transition has settled, preserving the original trigger.
 releaseFrame=requestAnimationFrame(()=>{
  releaseFrame=undefined;if(activeModals.size||restoreOverflow===null)return;
  document.body.style.overflow=restoreOverflow;restoreOverflow=null;
 });
}

/** A stable portal keeps the original chart and all its local settings mounted. */
export default function AnalysisDetailModal({analysis,open,title,onClose,children}:{analysis:boolean;open:boolean;title:string;onClose:()=>void;children:ReactNode}){
 const anchor=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null),body=useRef<HTMLDivElement>(null),mainBody=useRef<HTMLDivElement>(null),mainHeader=useRef<HTMLElement>(null);
 const [host]=useState(()=>document.createElement('div'));
 const [mainTarget,setMainTarget]=useState<HTMLElement|null>(null),[display,setDisplay]=useState<DetailDisplay>('popup');
 const close=useRef(onClose);close.current=onClose;
 const nestedEscape=useRef(false);
 useLayoutEffect(()=>{
  const node=anchor.current;
  const workspace=node?.closest<HTMLElement>('.mapWorkspace');
  setMainTarget(workspace?.querySelector<HTMLElement>('.marketMap')||node?.closest<HTMLElement>('.dashboardContent:not(.floatingQueryContext)')||null);
 },[]);
 useLayoutEffect(()=>{if(analysis&&open&&mainTarget)setDisplay(displayPreferences.get(mainTarget)||'popup')},[analysis,open,mainTarget]);
 const changeDisplay=(next:DetailDisplay)=>{if(mainTarget)displayPreferences.set(mainTarget,next);setDisplay(next)};
 const main=analysis&&open&&display==='main'&&!!mainTarget;
 useLayoutEffect(()=>{
  if(!analysis||!open||!mainTarget)return;
  enterDetail(mainTarget,host);
  return()=>leaveDetail(mainTarget,host);
 },[analysis,open,mainTarget,host]);
 useLayoutEffect(()=>{
  host.className='analysisDetailContent';
  const destination=!analysis?anchor.current:main?mainBody.current:body.current;
  destination?.appendChild(host);
  surfaceChanged();
  return()=>{host.remove()};
 },[analysis,main,host]);
 useLayoutEffect(()=>{
  if(!main||!mainTarget)return;
  const app=mainTarget.closest<HTMLElement>('.app');
  const appHeader=app?.querySelector<HTMLElement>(':scope > header');
  const workspace=mainTarget.closest<HTMLElement>('.mapWorkspace');
  const localHeader=workspace?.querySelector<HTMLElement>(':scope > .mapWorkspaceHeader')||mainTarget.closest<HTMLElement>('.analysisView')?.querySelector<HTMLElement>(':scope > .analysisToolbar');
  const headerBottom=(appHeader?.getBoundingClientRect().height||0)+(localHeader?.getBoundingClientRect().height||0)+8;
  const before=mainTarget.getBoundingClientRect(),documentTop=before.top+window.scrollY;
  // A sticky menu may be used far down the old page. Bring the replacement
  // surface back under its headers; the entry snapshot restores the map later.
  const shouldAlign=!workspace||before.top<headerBottom-8||before.top>Math.max(headerBottom+32,window.innerHeight/2);
  if(shouldAlign)window.scrollTo({left:window.scrollX,top:Math.max(0,documentTop-headerBottom),behavior:'instant'});
  mainTarget.dataset.analysisMainOpen='true';
  const measure=()=>mainTarget.style.setProperty('--analysis-main-height',`${Math.max(240,window.innerHeight-Math.max(0,mainTarget.getBoundingClientRect().top)-12)}px`);
  measure();window.addEventListener('resize',measure);
  const frame=requestAnimationFrame(()=>{measure();mainHeader.current?.focus({preventScroll:true});surfaceChanged()});
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',measure);delete mainTarget.dataset.analysisMainOpen;mainTarget.style.removeProperty('--analysis-main-height');surfaceChanged()};
 },[main,mainTarget]);
 useLayoutEffect(()=>{
  const node=dialog.current;if(!node)return;
  if(!analysis||!open||main){if(node.open)node.close();return;}
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
 },[analysis,open,main,host]);
 // Opening a details-based module must work in either surface without rebuilding it.
 useLayoutEffect(()=>{if(analysis&&open)host.querySelectorAll<HTMLDetailsElement>(':scope > details').forEach(detail=>{detail.open=true})},[analysis,open,host]);
 return <div className="analysisDetailSlot" ref={anchor}>
  <dialog className="analysisDetailModal" ref={dialog} aria-label={title} onClick={event=>{if(event.target===event.currentTarget)close.current()}}>
   <div className="analysisDetailModalHeader"><h2>{title}</h2><div className="analysisDetailSurfaceActions">{analysis&&mainTarget&&<button onClick={()=>changeDisplay('main')}>본문에서 보기</button>}<button className="analysisDetailClose" onClick={onClose}>닫기 <span aria-hidden="true">×</span></button></div></div>
   <div className="analysisDetailModalBody" ref={body}/>
  </dialog>
  {mainTarget&&createPortal(<section className="analysisMainDetail" hidden={!main} aria-label={`${title} 본문`} data-analysis-detail-main="true"><header ref={mainHeader} className="analysisDetailModalHeader" tabIndex={-1}><h2>{title}</h2><div className="analysisDetailSurfaceActions"><button onClick={()=>changeDisplay('popup')}>팝업으로 보기</button><button onClick={onClose} title="현재 조회 조건과 선택 지역을 유지한 채 지도로 돌아갑니다">← 지도로 돌아가기</button></div></header><div className="analysisDetailModalBody" ref={mainBody}/></section>,mainTarget)}
  {createPortal(children,host)}
 </div>;
}
