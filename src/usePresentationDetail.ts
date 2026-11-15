import {useEffect,useLayoutEffect,useState} from 'react';
import './presentation-detail-views.css';

type Options={tab:string;mode:string;presentationStep:number;view:string};
const labels:Record<string,string>={
 'population-patterns':'요일·월중 특성',
 'resident-context':'체류·거주 기반',
 'demographic-population':'연령·성별 비교',
 'distribution-population':'두 시점 분포 비교',
 'migration-demographic-details':'연령·성별 구성',
 'mobility-connections':'이동 상대지역',
};

/** Presentation details are separate views of the same data, never a scroll journey. */
export default function usePresentationDetail({tab,mode,presentationStep,view}:Options){
 const defaultId=`trend-${tab}`;
 const [detailId,setDetailId]=useState(defaultId);
 useLayoutEffect(()=>setDetailId(defaultId),[defaultId,mode,view]);
 useEffect(()=>{
  const select=(event:Event)=>{
   const detail=(event as CustomEvent<{id?:string;step?:number}>).detail;
   if(detail?.step===1&&typeof detail.id==='string')setDetailId(detail.id);
  };
  window.addEventListener('analysis-section',select);
  return()=>window.removeEventListener('analysis-section',select);
 },[]);
 useLayoutEffect(()=>{
  const dashboard=document.querySelector<HTMLElement>('.app:not(.floatingQueryLayer) .analysisView:not([hidden]) .dashboardContent');
  if(!dashboard)return;
  const clear=()=>{
   for(const host of dashboard.querySelectorAll<HTMLElement>(':scope>div')){
    delete host.dataset.presentationDetail;delete host.dataset.detailId;
    for(const child of host.children)if(child instanceof HTMLElement)delete child.dataset.detailActive;
   }
  };
  if(mode!=='presentation'||presentationStep!==1||view!=='analysis'){clear();return;}
  const sync=()=>{
   clear();
   const host=dashboard.querySelector<HTMLElement>(':scope>div:not([hidden])');
   if(!host)return;
   const target=document.getElementById(detailId);
   if(!target||!host.contains(target))return;
   let root:HTMLElement=target;
   while(root.parentElement&&root.parentElement!==host)root=root.parentElement;
   if(root.parentElement!==host)return;
   host.dataset.presentationDetail='true';host.dataset.detailId=detailId;
   root.dataset.detailActive='true';
  };
  sync();
  // Data can mount the target after the scene switches. Observe children only,
  // so our own marker attributes cannot trigger an observer loop.
  const observer=new MutationObserver(sync);observer.observe(dashboard,{childList:true,subtree:true});
  return()=>{observer.disconnect();clear();};
 },[detailId,mode,presentationStep,tab,view]);
 return{detailId,detailLabel:labels[detailId]||'상세 분석',isSupplementary:detailId!==defaultId};
}
