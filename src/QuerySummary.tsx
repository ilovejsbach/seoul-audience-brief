import {useEffect,useRef,useState} from 'react';
import QueryPopover from './QueryPopover';
import './query-controls.css';

export type QueryChip={id:string;label:string;value:string;controlId?:string;onEdit?:()=>void;onClear?:()=>void;clearLabel?:string};
export function openQueryControl(id:string){window.dispatchEvent(new CustomEvent('query-control-open',{detail:{id}}))}
export default function QuerySummary({items,selection,label='현재 조회 조건',maxVisible=4}:{items:QueryChip[];selection?:QueryChip;label?:string;maxVisible?:number}){
 const [open,setOpen]=useState(false),more=useRef<HTMLButtonElement>(null);
 const visible=items.slice(0,Math.max(1,maxVisible)),remaining=items.slice(Math.max(1,maxVisible));
 useEffect(()=>{if(!remaining.length)setOpen(false)},[remaining.length]);
 const chip=(item:QueryChip,selected=false)=><div className={`queryConditionChip${selected?' querySelectionChip':''}`} key={item.id} data-query-id={item.id}><>{item.onEdit||item.controlId?<button type="button" className="queryChipEdit" aria-label={`${item.label} 조건 변경: ${item.value}`} onClick={()=>{setOpen(false);if(item.onEdit)item.onEdit();else if(item.controlId)openQueryControl(item.controlId)}}><span>{item.label}</span><b>{item.value}</b></button>:<span className="queryChipText"><span>{item.label}</span><b>{item.value}</b></span>}</>{item.onClear&&<button type="button" className="queryChipClear" aria-label={item.clearLabel||`${item.label} 조건 해제`} title={item.clearLabel||`${item.label} 조건 해제`} onClick={item.onClear}>×</button>}</div>;
 if(!items.length&&!selection)return null;
 return <div className="querySummary" role="group" aria-label={label}><span className="querySummaryLabel">{label}</span><div className="querySummaryItems">{visible.map(item=>chip(item))}{remaining.length>0&&<button type="button" ref={more} className="querySummaryMore" aria-expanded={open} aria-haspopup="dialog" onClick={()=>setOpen(value=>!value)}>나머지 조건 {remaining.length}개</button>}{selection&&chip(selection,true)}</div><QueryPopover open={open} anchor={more} onClose={()=>setOpen(false)} title="나머지 조회 조건"><div className="querySummaryOverflow">{remaining.map(item=>chip(item))}</div></QueryPopover></div>
}
