import ExactValue from './ExactValue';
import {displayNumber,exactNumber} from './display-number';
import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import FloatingQueryLayer from './FloatingQueryLayer';
import {claimSupportEscape} from './support-window-escape';
import SupportDockTools from './SupportDockTools';
import {useSupportDock} from './useSupportDock';
import './support-docking.css';
export type PopupData={code:string;name:string;value:number|null;available?:boolean};
export function MapPopup({region,unit,context,source,onClose,onDetail,onCompare,canCompare,chosen,detailHint,districtDrilldown=true}:{region:PopupData;unit:string;context:string;source:string;onClose:()=>void;onDetail:()=>void;onCompare:()=>void;canCompare:boolean;chosen:boolean;detailHint?:string;districtDrilldown?:boolean}){
const ref=useRef<HTMLDivElement>(null),marker=useRef<HTMLSpanElement>(null),host=useRef<HTMLElement|null>(null),[ready,setReady]=useState(false),[minimized,setMinimized]=useState(false);const dock=useSupportDock(host);
useLayoutEffect(()=>{host.current=marker.current?.closest<HTMLElement>('.mapPanel')||null;setReady(true)},[]);
useLayoutEffect(()=>{const node=host.current;if(!node||!ready)return;if(dock.mode==='left'||dock.mode==='right'){node.dataset.popupDock=dock.mode;node.dataset.popupWidth=String(dock.width);node.style.setProperty('--support-popup-width',dock.width+'px');return()=>{node.removeAttribute('data-popup-dock');node.removeAttribute('data-popup-width');node.style.removeProperty('--support-popup-width')}}},[dock.mode,ready,dock.width]);
useEffect(()=>{const node=host.current;if(!node||(dock.mode!=='left'&&dock.mode!=='right'))return;const observer=new ResizeObserver(()=>{if(!dock.fits(dock.mode as 'left'|'right'))dock.setMode('floating')});observer.observe(node);return()=>observer.disconnect()},[dock.mode,dock.width]);
useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.querySelector<HTMLButtonElement>('.popupClose')?.focus();const key=(e:KeyboardEvent)=>{if(claimSupportEscape(e,ref.current))onClose()};document.addEventListener('keydown',key,true);return()=>{document.removeEventListener('keydown',key,true);if(previous&&previous.getClientRects().length)previous.focus()}},[]);
useEffect(()=>{if(dock.mode==='default')return;const frame=requestAnimationFrame(()=>ref.current?.querySelector<HTMLElement>('.supportDockTools>summary')?.focus({preventScroll:true}));return()=>cancelAnimationFrame(frame)},[dock.mode]);
const panel=<div className={`mapPopup supportPopup${minimized?' supportMinimized':''}`} data-support-mode={dock.mode} style={{...(dock.mode==='floating'?dock.geometry.style:{}),'--support-bg-alpha':(dock.mode==='floating'?dock.opacity:100)/100} as CSSProperties} role="dialog" aria-label={`${region.name} 지역 정보`} ref={ref}><header className="supportWindowBar" {...dock.move} tabIndex={0} aria-label="선택 지역 정보 창 이동"><span>선택 지역 정보</span><SupportDockTools label="선택 지역 정보" mode={dock.mode} attach={dock.attach} float={()=>dock.setMode('floating')} reset={dock.reset} opacity={dock.opacity} onOpacity={dock.setOpacity} width={dock.width} onWidth={dock.setWidth}/><button aria-label={minimized?'선택 지역 정보 펼치기':'선택 지역 정보 줄이기'} aria-expanded={!minimized} onClick={()=>{if(!minimized&&dock.mode!=='floating')dock.setMode('floating');setMinimized(v=>!v)}}>{minimized?'펼치기':'줄이기'}</button><button className="popupClose" aria-label="지역 정보 닫기" onClick={onClose}>×</button></header><div className="supportPopupContent" hidden={minimized}><h3>{region.name}</h3><strong><ExactValue value={region.value} unit={unit} label={region.name}/></strong><p>{context}</p><a href={source} target="_blank" rel="noreferrer">공식 원본 출처 ↗</a><div className="popupActions"><button onClick={()=>{if(districtDrilldown&&region.code.length===5)window.dispatchEvent(new CustomEvent('map-district-detail',{detail:region.code}));onDetail()}} disabled={region.available===false}>상세 분석 →</button><button onClick={onCompare} disabled={region.available===false||(!canCompare&&!chosen)}>{chosen?'✓ 비교 해제':canCompare?'+ 후보 비교':'최대 3곳'}</button></div>{region.available===false&&<p role="status">현재 선택한 통계와 연결된 지역 자료가 없습니다. 경계 기준일과 통계 기준일을 확인하세요.</p>}<span className="popupHint">이스케이프 키로 닫기 · {detailHint||'상세 분석에서 동별 내역 확인'}</span></div>{dock.mode==='floating'&&!minimized&&<div className="floatingPanelResize" role="button" tabIndex={0} aria-label="선택 지역 정보 창 크기 조절" {...dock.geometry.resize}/>}</div>;
return <><span className="supportDockMarker" ref={marker}/>{ready&&host.current&&(dock.mode==='left'||dock.mode==='right')?createPortal(panel,host.current):<FloatingQueryLayer host={host} enabled={ready&&dock.mode==='floating'}>{panel}</FloatingQueryLayer>}{dock.preview&&host.current&&createPortal(<div className={`supportDockPreview supportDockPreview-${dock.preview}`} role="status">선택 정보를 {dock.preview==='left'?'왼쪽':'오른쪽'}에 붙이기</div>,host.current)}</>
}
export function Funnel({regionSteps,timeSteps,onCompare,count}:{regionSteps:{label:string;action?:()=>void}[];timeSteps:{label:string;action?:()=>void}[];onCompare:()=>void;count:number}){return <section className="funnel" aria-label="분석 탐색 경로"><div><b>지역별 퍼널</b><nav aria-label="지역 탐색 단계">{regionSteps.map((step,i)=><span key={`${i}-${step.label}`}>{i>0&&<i>›</i>}<button onClick={step.action} disabled={!step.action}>{step.label}</button></span>)}<span><i>›</i><button onClick={onCompare}>후보 비교 {count}/3</button></span></nav></div><div><b>시계열 퍼널</b><nav aria-label="시간 탐색 단계">{timeSteps.map((step,i)=><span key={`${i}-${step.label}`}>{i>0&&<i>›</i>}<button onClick={step.action} disabled={!step.action}>{step.label}</button></span>)}</nav></div><small>탐색 단계를 좁히는 경로입니다. 구매·광고 전환율을 뜻하지 않습니다.</small></section>}
export function focusControl(id:string){window.dispatchEvent(new Event('show-analysis-controls'));requestAnimationFrame(()=>{const el=document.getElementById(id);el?.scrollIntoView({behavior:'smooth',block:'center'});el?.focus()})}

let navigationSequence=0;
const nextNavigationFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
export async function navigateSection(id:string,step:number){
 const sequence=++navigationSequence;
 const target=document.getElementById(id);
 const fullscreen=document.fullscreenElement;
 const fullscreenSurface=fullscreen?.matches('.app')?[...document.querySelectorAll<HTMLElement>('section.mapPanel.mapIsFullscreen')].find(node=>!node.closest('[hidden]'))||fullscreen:fullscreen;
 if(fullscreen&&fullscreenSurface&&target&&!fullscreenSurface.contains(target)&&!target.contains(fullscreenSurface)){
  try{await document.exitFullscreen()}catch{/* The user may already have closed fullscreen. */}
 }
 const overlay=document.querySelector('.mapOverlay');
 if(overlay&&target&&!overlay.contains(target)&&!target.contains(overlay)){
  window.dispatchEvent(new Event('exit-map-fullscreen'));
  await nextNavigationFrame();
 }
 if(sequence!==navigationSequence)return;
 window.dispatchEvent(new CustomEvent('presentation-step',{detail:step}));
 window.dispatchEvent(new CustomEvent('analysis-section',{detail:{id,step}}));
 // Wait for React's page visibility change and the browser's resulting layout.
 // A single frame can still measure the previous presentation page.
 await nextNavigationFrame();
 await nextNavigationFrame();
 if(sequence!==navigationSequence)return;
 const destination=document.getElementById(id);
 if(!destination)return;
 if(destination instanceof HTMLDetailsElement)destination.open=true;
 const fullscreenMap=[...document.querySelectorAll<HTMLElement>('section.mapPanel.mapIsFullscreen')].find(node=>!node.closest('[hidden]'))||document.fullscreenElement;
 const element=fullscreenMap&&destination.contains(fullscreenMap)?fullscreenMap as HTMLElement:destination;
 element.setAttribute('tabindex','-1');
 const presentation=element.closest('.mode-presentation');
 const scrollContainer=element.closest<HTMLElement>('.dashboardContent');
 if(presentation&&scrollContainer&&!fullscreenMap){
  // Presentation changes the selected screen, never jumps along a long page.
  scrollContainer.scrollTop=step===1?0:scrollContainer.scrollTop+element.getBoundingClientRect().top-scrollContainer.getBoundingClientRect().top;
  window.scrollTo({top:0,left:0,behavior:'instant'});
 }else element.scrollIntoView({behavior:'auto',block:'start'});
 element.focus({preventScroll:true});
}
