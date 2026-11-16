import {useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import AnalysisOptionButton from './AnalysisOptionButton';
import FloatingQueryLayer from './FloatingQueryLayer';
import {claimFloatingEscape} from './floating-window-escape';
import './supplemental-options.css';

/** Display settings stay close to the figure without consuming its canvas. */
export default function SupplementalOptions({label,children}:{label:string;children:ReactNode}){
 const anchor=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null),id='supplemental-options-'+useId().replace(/:/g,'');
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:12,top:12,maxHeight:400});
 const close=()=>{setOpen(false);anchor.current?.focus({preventScroll:true})};
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{const a=anchor.current?.getBoundingClientRect();if(!a)return;const width=Math.min(340,window.innerWidth-24),height=Math.min(panel.current?.getBoundingClientRect().height||240,window.innerHeight-24),below=window.innerHeight-a.bottom-18;setPosition({left:Math.max(12,Math.min(a.right-width,window.innerWidth-width-12)),top:below>=Math.min(height,220)?a.bottom+6:Math.max(12,a.top-height-6),maxHeight:Math.max(120,Math.min(window.innerHeight-24,below>=Math.min(height,220)?below:a.top-18))})};
  place();const frame=requestAnimationFrame(()=>{panel.current?.querySelectorAll<HTMLDetailsElement>(':scope>div>.mapManualRange>details').forEach(detail=>{detail.open=true});place();panel.current?.querySelector<HTMLButtonElement>('button')?.focus()});window.addEventListener('resize',place);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',place)};
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const key=(event:KeyboardEvent)=>{if(claimFloatingEscape(event,panel.current))close()};
  const outside=(event:PointerEvent)=>{if(!anchor.current?.contains(event.target as Node)&&!panel.current?.contains(event.target as Node))setOpen(false)};
  const surface=()=>setOpen(false);
  document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);window.addEventListener('analysis-detail-surface-change',surface);
  return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside);window.removeEventListener('analysis-detail-surface-change',surface)};
 },[open]);
 return <><AnalysisOptionButton ref={anchor} label={label} description={label+'을 필요한 때 펼칩니다'} icon="chart" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(value=>!value)}/><FloatingQueryLayer host={anchor} enabled={open}><aside id={id} ref={panel} className="supplementalOptions" aria-label={label} hidden={!open} style={{position:'fixed',...position}}><header><strong>{label}</strong><button onClick={close} aria-label={label+' 닫기'}>닫기</button></header><div>{children}</div></aside></FloatingQueryLayer></>;
}
