import {useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {MapDataContext} from './MapDataContext';
import {MapOptionsHost} from './MapOptionsContext';
import WorkspaceSplitHandle from './WorkspaceSplitHandle';
import UnifiedQueryBar from './UnifiedQueryBar';
import {floatingEscapeHandled} from './floating-window-escape';

/** Focused maps share one editable top row instead of a duplicate left form. */
export default function UnifiedMapPanel({children,controls,queryKey}:{children:ReactNode;controls?:ReactNode;queryKey:string}){
 const panel=useRef<HTMLElement>(null),querySlot=useRef<HTMLDivElement>(null),choice=useContext(MapDataContext);
 const [nativeFull,setNativeFull]=useState(false),[fallback,setFallback]=useState(false);
 const active=choice.selected===queryKey,fullscreen=nativeFull||fallback;
 useEffect(()=>{
  const change=()=>setNativeFull(active&&!!document.fullscreenElement&&document.fullscreenElement===panel.current?.closest('.app'));
  const transfer=(event:Event)=>{change();setFallback(active&&!!(event as CustomEvent<{fallback?:boolean}>).detail?.fallback)};
  const exit=()=>setFallback(false);
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&active&&!floatingEscapeHandled(event)&&!document.querySelector('dialog[open],.queryPopover,.dataMeaningTooltip,.graphOptionsPanel:not([hidden])'))setFallback(false)};
  change();document.addEventListener('fullscreenchange',change);window.addEventListener('map-fullscreen-transfer',transfer);window.addEventListener('exit-map-fullscreen',exit);document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('fullscreenchange',change);window.removeEventListener('map-fullscreen-transfer',transfer);window.removeEventListener('exit-map-fullscreen',exit);document.removeEventListener('keydown',key)};
 },[active]);
 useEffect(()=>{window.dispatchEvent(new Event('map-fullscreen-state'))},[fullscreen]);
 useEffect(()=>{if(!fallback||!active)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old}},[fallback,active]);
 const toggle=async()=>{if(fallback){setFallback(false);return}if(nativeFull){await document.exitFullscreen();return}try{const root=panel.current?.closest<HTMLElement>('.app');if(root?.requestFullscreen)await root.requestFullscreen();else setFallback(true)}catch{setFallback(true)}};
 return <MapOptionsHost.Provider value={null}><section ref={panel} className={`mapPanel panel mapShell unifiedMapPanel${fullscreen?' mapIsFullscreen':''}${fallback?' mapOverlay':''}`} data-options-layout="floating" data-options-open="false" data-query-layout="unified">
  <div className="mapPanelTools"><label className="mapDatasetChoice"><span className="mapDatasetLabel">지도 데이터</span><select aria-label="지도 데이터" data-map-dataset value={choice.selected} onChange={event=>{void choice.select(event.target.value)}}><option value="population">생활인구</option><option value="mobility">생활이동</option><option value="migration">거주지 전입·전출</option><option value="commerce">행정동 추정매출</option></select></label><button className="mapFullscreenButton" onClick={toggle} aria-label={fullscreen?'지도 전체화면 닫기':'지도 전체화면 보기'}>{fullscreen?'✕ 전체화면 닫기':'⛶ 전체화면'}</button></div>
  <div className="unifiedQueryFullscreenSlot" ref={querySlot}/>
  <UnifiedQueryBar scope={queryKey} active={active} panel={panel} fullscreenSlot={querySlot} fullscreen={fullscreen}>{controls}</UnifiedQueryBar>
  {!fullscreen&&<WorkspaceSplitHandle panel={panel}/>}{children}
 </section></MapOptionsHost.Provider>;
}
