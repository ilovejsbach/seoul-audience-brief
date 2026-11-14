import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {useFloatingPanel} from './useFloatingPanel';
import './floating-legend.css';
export default function FloatingLegend({children,label}:{children:ReactNode;label:string}){
 const [open,setOpen]=useState(false);const host=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),id=useId();
 const floating=useFloatingPanel(host,open,{width:360,height:320});
 useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus()}};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[open]);
 return <div className="floatingLegendHost" ref={host}><div className="floatingLegendKey"><span aria-hidden="true"/><button ref={trigger} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)}>{open?'범례 닫기':'범례 보기'}</button></div>{open&&<div id={id} ref={panel} className="floatingLegendPanel" role="region" aria-label="지도 범례 상세" style={floating.style}><header {...floating.move} tabIndex={0} aria-label="범례 위치 이동"><b>지도 범례</b><button onClick={floating.reset}>위치·크기 초기화</button><button aria-label="범례 닫기" onClick={()=>setOpen(false)}>닫기</button></header><div className="floatingLegendBody"><p>{label}</p>{children}</div><button className="floatingPanelResize" {...floating.resize} aria-label="범례 크기 조절">↘</button></div>}</div>
}
