import {useLayoutEffect,useState,type CSSProperties,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';
type Snapshot={target:Element;visible:boolean;appClass:string;appData:Record<string,string>;scopeClass:string;scopeData:Record<string,string>;variables:CSSProperties};
/** Keep query windows outside map clipping while preserving the owning view's theme. */
export default function FloatingQueryLayer({host,visibilityHost,enabled,children}:{host:RefObject<HTMLElement|null>;visibilityHost?:RefObject<HTMLElement|null>;enabled:boolean;children:ReactNode}){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 useLayoutEffect(()=>{
  if(!enabled){setSnapshot(null);return}
  const node=host.current;if(!node)return;
  const scope=node.closest<HTMLElement>('.mapShell,.mapWorkspace')||node,app=node.closest<HTMLElement>('.app');
  const attributes=(element:HTMLElement|null)=>Object.fromEntries([...element?.attributes||[]].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]));
  const sync=()=>{
   const variables:Record<string,string>={},computed=getComputedStyle(app||node);
   for(let i=0;i<computed.length;i++){const key=computed[i];if(key.startsWith('--'))variables[key]=computed.getPropertyValue(key)}
   const fullscreen=document.fullscreenElement;
   // The shared app hosts native fullscreen; only its foreground map owns floating controls.
   const fullscreenMap=fullscreen?.matches('.app')?[...fullscreen.querySelectorAll<HTMLElement>('section.mapPanel.mapIsFullscreen')].find(element=>!element.closest('[hidden]')&&element.getClientRects().length>0):null;
   const overlay=[...document.querySelectorAll<HTMLElement>('.mapOverlay')].filter(element=>element.getClientRects().length>0).at(-1),activeSurface=fullscreenMap||fullscreen||overlay;
   const belongsToSurface=!activeSurface||activeSurface.contains(node)||node.contains(activeSurface);
   const visibleNode=visibilityHost?.current||node;
   setSnapshot({target:fullscreen||document.body,visible:!node.closest('[hidden]')&&visibleNode.getClientRects().length>0&&belongsToSurface,appClass:app?.className||'app mode-analysis',appData:attributes(app),scopeClass:scope.className,scopeData:attributes(scope),variables:variables as CSSProperties});
  };
  sync();const observer=new MutationObserver(sync);
  const observed=new Set<HTMLElement>();for(const start of [node,visibilityHost?.current])for(let ancestor:HTMLElement|null=start||null;ancestor;ancestor=ancestor.parentElement){if(observed.has(ancestor))continue;observed.add(ancestor);observer.observe(ancestor,{attributes:true,attributeFilter:['class','style','hidden','data-options-layout','data-options-open','data-options-side','data-controls-floating','data-secondary-mode','data-detail-active','data-presentation-detail','data-detail-id','data-query-context']});}
  window.addEventListener('resize',sync);document.addEventListener('fullscreenchange',sync);window.addEventListener('map-fullscreen-state',sync);
  return()=>{observer.disconnect();window.removeEventListener('resize',sync);document.removeEventListener('fullscreenchange',sync);window.removeEventListener('map-fullscreen-state',sync)};
 },[enabled,host,visibilityHost]);
 if(!enabled)return <>{children}</>;
 if(!snapshot)return null;
 return createPortal(<div className={`${snapshot.appClass} floatingQueryLayer`} {...snapshot.appData} hidden={!snapshot.visible} style={{...snapshot.variables,position:'fixed',inset:0,zIndex:1400,pointerEvents:'none',margin:0,padding:0,minHeight:0,width:'100%',height:'100%',background:'transparent'}}><div className="dashboardContent floatingQueryContext" style={{display:'contents'}}><div className={`${snapshot.scopeClass} floatingQueryScope`} {...snapshot.scopeData} style={{display:'contents'}}>{children}</div></div></div>,snapshot.target);
}
