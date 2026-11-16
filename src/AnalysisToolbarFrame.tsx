import {useLayoutEffect,useRef,type ReactNode} from 'react';

/** Measure the shared chrome so sticky navigation and briefing scenes use the same space. */
export default function AnalysisToolbarFrame({children}:{children:ReactNode}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const bar=ref.current,app=bar?.closest<HTMLElement>('.app'),header=app?.querySelector<HTMLElement>(':scope>header'),dashboard=app?.querySelector<HTMLElement>('.analysisView>.dashboardContent'),summary=app?.querySelector<HTMLElement>('#active-query-summary');
  if(!bar||!app||!header||!dashboard)return;
  const measure=()=>{
   app.style.setProperty('--app-header-height',`${header.getBoundingClientRect().height}px`);
   app.style.setProperty('--analysis-toolbar-height',`${bar.getBoundingClientRect().height}px`);
   app.style.setProperty('--analysis-view-height',`${Math.max(240,window.innerHeight-(bar.parentElement?.getBoundingClientRect().top??0)-window.scrollY-12)}px`);
   // Read the document position, not the transient position while scrolling.
   app.style.setProperty('--analysis-scene-height',`${Math.max(240,window.innerHeight-dashboard.getBoundingClientRect().top-window.scrollY-12)}px`);
  };
  const observer=new ResizeObserver(measure);[bar,header,...(summary?[summary]:[])].forEach(n=>observer.observe(n));
  // Attribute changes include the shared mode and supplementary-view switches.
  const changes=new MutationObserver(measure);changes.observe(app,{attributes:true,attributeFilter:['class']});
  measure();window.addEventListener('resize',measure);
  return()=>{observer.disconnect();changes.disconnect();window.removeEventListener('resize',measure)};
 },[]);
 return <div className="analysisToolbar" ref={ref}>{children}</div>;
}
