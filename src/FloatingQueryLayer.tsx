import {useLayoutEffect,useState,type CSSProperties,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';
type Snapshot={target:Element;visible:boolean;appClass:string;appData:Record<string,string>;scopeClass:string;scopeData:Record<string,string>;variables:CSSProperties};
/** Keep query windows outside map clipping while preserving the owning view's theme. */
export default function FloatingQueryLayer({host,enabled,children}:{host:RefObject<HTMLElement|null>;enabled:boolean;children:ReactNode}){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 useLayoutEffect(()=>{
  if(!enabled){setSnapshot(null);return}
  const node=host.current;if(!node)return;
  const scope=node.closest<HTMLElement>('.mapShell,.mapWorkspace')||node,app=node.closest<HTMLElement>('.app');
  const attributes=(element:HTMLElement|null)=>Object.fromEntries([...element?.attributes||[]].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]));
  const sync=()=>{
   const variables:Record<string,string>={},computed=getComputedStyle(app||node);
   for(let i=0;i<computed.length;i++){const key=computed[i];if(key.startsWith('--'))variables[key]=computed.getPropertyValue(key)}
   setSnapshot({target:document.fullscreenElement||document.body,visible:node.getClientRects().length>0,appClass:app?.className||'app mode-analysis',appData:attributes(app),scopeClass:scope.className,scopeData:attributes(scope),variables:variables as CSSProperties});
  };
  sync();const observer=new MutationObserver(sync);
  for(let ancestor:HTMLElement|null=node;ancestor;ancestor=ancestor.parentElement)observer.observe(ancestor,{attributes:true,attributeFilter:['class','style','hidden','data-options-layout','data-options-open','data-controls-floating','data-secondary-mode']});
  window.addEventListener('resize',sync);document.addEventListener('fullscreenchange',sync);
  return()=>{observer.disconnect();window.removeEventListener('resize',sync);document.removeEventListener('fullscreenchange',sync)};
 },[enabled,host]);
 if(!enabled)return <>{children}</>;
 if(!snapshot)return null;
 return createPortal(<div className={`${snapshot.appClass} floatingQueryLayer`} {...snapshot.appData} hidden={!snapshot.visible} style={{...snapshot.variables,position:'fixed',inset:0,zIndex:1400,pointerEvents:'none',margin:0,padding:0,minHeight:0,width:'100%',height:'100%',background:'transparent'}}><div className="dashboardContent floatingQueryContext" style={{display:'contents'}}><div className={`${snapshot.scopeClass} floatingQueryScope`} {...snapshot.scopeData} style={{display:'contents'}}>{children}</div></div></div>,snapshot.target);
}
