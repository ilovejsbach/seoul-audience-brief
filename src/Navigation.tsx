import {displayNumber,exactNumber} from './display-number';
import {useEffect,useRef} from 'react';
export type PopupData={code:string;name:string;value:number|null;available?:boolean};
export function MapPopup({region,unit,context,source,onClose,onDetail,onCompare,canCompare,chosen,detailHint,districtDrilldown=true}:{region:PopupData;unit:string;context:string;source:string;onClose:()=>void;onDetail:()=>void;onCompare:()=>void;canCompare:boolean;chosen:boolean;detailHint?:string;districtDrilldown?:boolean}){
const ref=useRef<HTMLDivElement>(null);
useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.querySelector<HTMLButtonElement>('button')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();onClose()}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);if(previous&&previous.getClientRects().length)previous.focus()}},[]);
return <div className="mapPopup" role="dialog" aria-label={`${region.name} 지역 정보`} ref={ref}><button className="popupClose" aria-label="지역 정보 닫기" onClick={onClose}>×</button><span className="eyebrow">선택 지역 정보</span><h3>{region.name}</h3><strong title={exactNumber(region.value,unit)}>{displayNumber(region.value,unit)}</strong><details className="popupExact"><summary>정확한 수치</summary>{exactNumber(region.value,unit)}</details><p>{context}</p><a href={source} target="_blank" rel="noreferrer">공식 원본 출처 ↗</a><div className="popupActions"><button onClick={()=>{if(districtDrilldown&&region.code.length===5)window.dispatchEvent(new CustomEvent('map-district-detail',{detail:region.code}));onDetail()}} disabled={region.available===false}>상세 분석 →</button><button onClick={onCompare} disabled={region.available===false||(!canCompare&&!chosen)}>{chosen?'✓ 비교 해제':canCompare?'+ 후보 비교':'최대 3곳'}</button></div>{region.available===false&&<p role="status">현재 선택한 통계와 연결된 지역 자료가 없습니다. 경계 기준일과 통계 기준일을 확인하세요.</p>}<span className="popupHint">이스케이프 키로 닫기 · {detailHint||'상세 분석에서 동별 내역 확인'}</span></div>
}
export function Funnel({regionSteps,timeSteps,onCompare,count}:{regionSteps:{label:string;action?:()=>void}[];timeSteps:{label:string;action?:()=>void}[];onCompare:()=>void;count:number}){return <section className="funnel" aria-label="분석 탐색 경로"><div><b>지역별 퍼널</b><nav aria-label="지역 탐색 단계">{regionSteps.map((step,i)=><span key={`${i}-${step.label}`}>{i>0&&<i>›</i>}<button onClick={step.action} disabled={!step.action}>{step.label}</button></span>)}<span><i>›</i><button onClick={onCompare}>후보 비교 {count}/3</button></span></nav></div><div><b>시계열 퍼널</b><nav aria-label="시간 탐색 단계">{timeSteps.map((step,i)=><span key={`${i}-${step.label}`}>{i>0&&<i>›</i>}<button onClick={step.action} disabled={!step.action}>{step.label}</button></span>)}</nav></div><small>탐색 단계를 좁히는 경로입니다. 구매·광고 전환율을 뜻하지 않습니다.</small></section>}
export function focusControl(id:string){window.dispatchEvent(new Event('show-analysis-controls'));requestAnimationFrame(()=>{const el=document.getElementById(id);el?.scrollIntoView({behavior:'smooth',block:'center'});el?.focus()})}

let navigationSequence=0;
const nextNavigationFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
export async function navigateSection(id:string,step:number){
 const sequence=++navigationSequence;
 const target=document.getElementById(id);
 const fullscreen=document.fullscreenElement;
 if(fullscreen&&target&&!fullscreen.contains(target)&&!target.contains(fullscreen)){
  try{await document.exitFullscreen()}catch{/* The user may already have closed fullscreen. */}
 }
 const overlay=document.querySelector('.mapOverlay');
 if(overlay&&target&&!overlay.contains(target)&&!target.contains(overlay)){
  window.dispatchEvent(new Event('exit-map-fullscreen'));
  await nextNavigationFrame();
 }
 if(sequence!==navigationSequence)return;
 window.dispatchEvent(new CustomEvent('presentation-step',{detail:step}));
 // Wait for React's page visibility change and the browser's resulting layout.
 // A single frame can still measure the previous presentation page.
 await nextNavigationFrame();
 await nextNavigationFrame();
 if(sequence!==navigationSequence)return;
 const destination=document.getElementById(id);
 if(!destination)return;
 if(destination instanceof HTMLDetailsElement)destination.open=true;
 const fullscreenMap=document.fullscreenElement||document.querySelector('.mapOverlay');
 const element=fullscreenMap&&destination.contains(fullscreenMap)?fullscreenMap as HTMLElement:destination;
 element.setAttribute('tabindex','-1');
 const presentation=element.closest('.mode-presentation');
 const scrollContainer=element.closest<HTMLElement>('.dashboardContent');
 if(presentation&&scrollContainer&&!fullscreenMap){
  // Presentation pages scroll inside their fixed content area. Do not let
  // scrollIntoView move the outer page or retain a previous page's offset.
  scrollContainer.scrollTop+=element.getBoundingClientRect().top-scrollContainer.getBoundingClientRect().top;
  window.scrollTo({top:0,left:0,behavior:'instant'});
 }else element.scrollIntoView({behavior:'auto',block:'start'});
 element.focus({preventScroll:true});
}
