import {useState,type KeyboardEvent} from 'react';
import {datasets,viewsOf,MAP_VIEW} from './dataset-view-registry';
type Props={dataset:string;view:string;collapsed:boolean;onToggle:()=>void;onSelectDataset:(id:string)=>void;onSelectView:(id:string)=>void};
type Tip={text:string;top:number;left:number};
/** Left menu of the region service: data + map/detail views. Presentational; state lives in App. */
export default function WorkspaceNav({dataset,view,collapsed,onToggle,onSelectDataset,onSelectView}:Props){
 const [tip,setTip]=useState<Tip|null>(null);
 const items=[{id:MAP_VIEW.id as string,label:MAP_VIEW.label as string,short:MAP_VIEW.shortLabel as string},...viewsOf(dataset).map(item=>({id:item.id,label:item.label,short:item.shortLabel}))];
 // Collapsed names show a short form; the accessible name is always the full name.
 const showTip=(text:string,element:HTMLElement)=>{if(!collapsed)return;const r=element.getBoundingClientRect();setTip({text,top:r.top+r.height/2,left:r.right+6})};
 const arrows=(event:KeyboardEvent<HTMLElement>)=>{
  const keys=['ArrowDown','ArrowUp','Home','End'];if(!keys.includes(event.key))return;
  const buttons=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')],at=buttons.indexOf(document.activeElement as HTMLButtonElement);if(at<0)return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,at+(event.key==='ArrowDown'?1:-1)));
  buttons[next].focus();
 };
 const button=(key:string,label:string,short:string,current:boolean,kind:'data'|'view',onClick:()=>void)=>
  <button key={key} type="button" data-nav-kind={kind} data-nav-id={key} aria-label={label} title={collapsed?undefined:label} {...(kind==='data'?{'aria-pressed':current}:current?{'aria-current':'page' as const}:{})} tabIndex={current?0:-1} onClick={onClick} onMouseEnter={event=>showTip(label,event.currentTarget)} onMouseLeave={()=>setTip(null)} onFocus={event=>showTip(label,event.currentTarget)} onBlur={()=>setTip(null)}>{collapsed?short:label}</button>;
 return <aside className="workspaceNav" data-collapsed={collapsed} aria-label="지역 분석 자료와 보기">
  <div className="workspaceNavHead">{!collapsed&&<strong>자료와 분석</strong>}<button type="button" className="workspaceNavToggle" aria-expanded={!collapsed} aria-label={collapsed?'왼쪽 메뉴 펼치기':'왼쪽 메뉴 접기'} title={collapsed?'왼쪽 메뉴 펼치기':'왼쪽 메뉴 접기'} onClick={onToggle}>{collapsed?'›':'‹'}</button></div>
  <div className="workspaceNavBody">
   <section className="navGroup"><p className="navGroupTitle">자료</p><nav aria-label="자료 선택" onKeyDown={arrows}>{datasets.map(item=>button(item.id,item.label,item.shortLabel,dataset===item.id,'data',()=>onSelectDataset(item.id)))}</nav></section>
   <section className="navGroup"><p className="navGroupTitle">보기</p><nav aria-label="보기 선택" onKeyDown={arrows}>{items.map(item=>button(item.id,item.label,item.short,view===item.id,'view',()=>onSelectView(item.id)))}</nav></section>
  </div>
  {tip&&<div className="workspaceNavTip" role="presentation" style={{top:tip.top,left:tip.left}}>{tip.text}</div>}
 </aside>;
}
