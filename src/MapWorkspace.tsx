import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import './map-workspace.css';
type Props={children:ReactNode;controls:ReactNode;details:ReactNode;title:string;onClose:()=>void;revealDetails?:number};
export default function MapWorkspace({children,controls,details,title,onClose,revealDetails}:Props){
 const detailsContentRef=useRef<HTMLDivElement>(null);
 const [controlsOpen,setControlsOpen]=useState(true),[detailsOpen,setDetailsOpen]=useState(true);
 useEffect(()=>{if(revealDetails!==undefined){setDetailsOpen(true);requestAnimationFrame(()=>detailsContentRef.current?.scrollTo({top:0,behavior:'auto'}))}},[revealDetails]);
 const prefix=useId(),menuRef=useRef<HTMLButtonElement>(null),detailRef=useRef<HTMLButtonElement>(null);
 const controlsId=`${prefix}-controls`,detailsId=`${prefix}-details`;
 const closeControls=()=>{setControlsOpen(false);menuRef.current?.focus()};
 const closeDetails=()=>{setDetailsOpen(false);detailRef.current?.focus()};
 return <section className={`mapWorkspace${controlsOpen?'':' controlsCollapsed'}${detailsOpen?'':' detailsCollapsed'}`} aria-label={title}>
  <header className="mapWorkspaceHeader"><div className="mapWorkspaceHeaderLeft"><button ref={menuRef} className="mapWorkspaceMenu" aria-expanded={controlsOpen} aria-controls={controlsId} onClick={()=>setControlsOpen(open=>!open)}><span aria-hidden="true">☰</span> 메뉴 · 조건</button><h1>{title}</h1></div><div className="mapWorkspaceHeaderActions"><button ref={detailRef} aria-expanded={detailsOpen} aria-controls={detailsId} onClick={()=>setDetailsOpen(open=>!open)}>{detailsOpen?'상세 접기':'상세 보기'}</button><button className="mapWorkspaceClose" onClick={onClose}>이전 화면으로 →</button></div></header>
  <div className="mapWorkspaceBody"><aside id={controlsId} hidden={!controlsOpen} className="mapWorkspaceControls" aria-label="자료와 분석 조건"><div className="mapWorkspacePanelHeader"><div><h2>분석 조건</h2><p>자료 · 지역 · 시간 · 지표</p></div><button aria-label="분석 조건 접기" onClick={closeControls}>접기</button></div><div className="mapWorkspacePanelContent">{controls||<p className="mapWorkspaceEmpty">제공된 분석 조건이 없습니다.</p>}</div></aside>
  <div className="mapWorkspaceCenter" aria-label="분석 지도와 시간 선택">{children||<div className="mapWorkspaceEmpty">지도를 불러오는 중입니다.</div>}</div>
  <aside id={detailsId} hidden={!detailsOpen} className="mapWorkspaceDetails" aria-label="선택 지역 상세와 후보 비교"><div className="mapWorkspacePanelHeader"><div><h2>지역 상세</h2><p>선택 근거 · 추이 · 후보 비교</p></div><button aria-label="지역 상세 접기" onClick={closeDetails}>접기</button></div><div ref={detailsContentRef} className="mapWorkspacePanelContent">{details||<p className="mapWorkspaceEmpty">지도에서 지역을 선택하면 상세 내역과 비교할 후보를 확인할 수 있습니다.</p>}</div></aside></div>
 </section>
}
