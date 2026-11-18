import type {ReactNode} from 'react';
import {services,type ServiceId} from './service-registry';
type Props={service:'home'|'region'|'market';headerClass?:string;onSelect:(id:ServiceId)=>void;onHome:()=>void;modeControl?:ReactNode;tools:ReactNode;serviceRow?:ReactNode;children:ReactNode};
/** Presentational shell only: top bar, service row and the body slot. It owns no application state. */
export default function AppShell({service,headerClass,onSelect,onHome,modeControl,tools,serviceRow,children}:Props){
 return <>
  <header className={`appHeader${headerClass?' '+headerClass:''}`}>
   <div className="appTopbar">
    <a className="brand integratedBrand" href="#" title="상권·인구 분석 시작 화면" onClick={event=>{event.preventDefault();onHome()}}><span className="brandMark" aria-hidden="true">▦</span><span>상권·인구</span></a>
    <nav className="topicNav" aria-label="메인 주제">{services.map(item=>{
     const planned=item.status==='planned',current=(item.id==='region'&&service==='region')||(item.id==='market'&&service==='market');
     return planned?<button key={item.id} type="button" disabled aria-label={`${item.label.replace('(예정)','')} 예정 · ${item.plannedNote}`} title={`${item.label} · ${item.plannedNote}`}>{item.label}</button>
      :<button key={item.id} type="button" aria-pressed={current} onClick={()=>onSelect(item.id)}>{item.label}</button>})}</nav>
    <span className="appTopbarGrow"/>
    <div className="appTopTools">{modeControl}{tools}</div>
   </div>
   {serviceRow}
   <div id="market-header-slot" hidden={service!=='market'}/>
  </header>
  {children}
 </>;
}
