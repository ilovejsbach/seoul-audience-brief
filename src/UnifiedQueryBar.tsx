import {createContext,useContext,useLayoutEffect,useRef,useState,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import './unified-query-bar.css';

export const QueryToolbarContext=createContext(false);
export const useQueryToolbar=()=>useContext(QueryToolbarContext);

/** The inputs themselves are the current-condition display, never a second summary. */
export function UnifiedQueryFields({children,scope}:{children:ReactNode;scope?:string}){
 return <QueryToolbarContext.Provider value={true}><div className="unifiedQueryFields" data-query-scope={scope}>{children}</div></QueryToolbarContext.Provider>;
}

/** Move one input instance between the fixed query row and the focused map. */
export default function UnifiedQueryBar({children,scope,active,panel,fullscreenSlot,fullscreen}:{children:ReactNode;scope:string;active:boolean;panel:RefObject<HTMLElement|null>;fullscreenSlot:RefObject<HTMLDivElement|null>;fullscreen:boolean}){
 const parking=useRef<HTMLDivElement>(null),[host]=useState(()=>document.createElement('div'));
 const [panelNode,setPanelNode]=useState<HTMLElement|null>(null);
 useLayoutEffect(()=>{const frame=requestAnimationFrame(()=>setPanelNode(panel.current));return()=>cancelAnimationFrame(frame)},[panel]);
 useLayoutEffect(()=>{
  host.className='unifiedQueryBar';host.setAttribute('role','region');host.setAttribute('aria-label','현재 조회 조건 편집');
  const node=panelNode,app=node?.closest<HTMLElement>('.app');
  const sync=()=>{
   const view=node?.closest<HTMLElement>('.analysisView');
   const foreground=active&&!!view&&!view.closest('[hidden]')&&!node?.closest('[hidden]');
   const mainOpen=!!app?.querySelector('.analysisView>.dashboardContent[data-analysis-main-open="true"]');
   const top=document.getElementById('active-query-summary');
   const target=foreground?(fullscreen&&!mainOpen?fullscreenSlot.current:top):parking.current;
   if(target&&host.parentElement!==target)target.appendChild(host);
   if(top){const has=!!top.querySelector('.unifiedQueryBar');if(top.classList.contains('hasUnifiedQueryBar')!==has)top.classList.toggle('hasUnifiedQueryBar',has);}
  };
  sync();const observer=new MutationObserver(sync);
  if(app)observer.observe(app,{subtree:true,attributes:true,attributeFilter:['hidden','class','data-analysis-main-open']});
  window.addEventListener('analysis-detail-surface-change',sync);document.addEventListener('fullscreenchange',sync);
  const focus=(event:Event)=>{const id=(event as CustomEvent<{id?:string}>).detail?.id;if(!id||!host.contains(document.getElementById(id)))return;const field=document.getElementById(id);if(!field)return;for(let p=field.parentElement;p&&p!==host;p=p.parentElement)if(p instanceof HTMLDetailsElement)p.open=true;field.focus({preventScroll:true})};
  window.addEventListener('query-control-open',focus);
  return()=>{observer.disconnect();window.removeEventListener('analysis-detail-surface-change',sync);document.removeEventListener('fullscreenchange',sync);window.removeEventListener('query-control-open',focus);host.remove();const top=document.getElementById('active-query-summary');top?.classList.toggle('hasUnifiedQueryBar',!!top.querySelector('.unifiedQueryBar'))};
 },[active,fullscreen,panelNode,fullscreenSlot,host]);
 return <><div ref={parking} hidden/><>{createPortal(<UnifiedQueryFields scope={scope}>{children}</UnifiedQueryFields>,host)}</></>;
}
