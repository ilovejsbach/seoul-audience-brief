import {forwardRef,useEffect,useId,useLayoutEffect,useRef,useState,type ButtonHTMLAttributes,type HTMLAttributes,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import './analysis-option-button.css';

type Icon='layout'|'chart'|'map';
type Content={label:string;description?:string;icon:Icon};
type Props=ButtonHTMLAttributes<HTMLButtonElement>&Content;

function OptionContents({label,icon}:Content){
 const paths=icon==='layout'?<><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M8 4v16M8 9h13"/></>:icon==='chart'?<><path d="M4 3v17h17M7 14l4-5 4 3 5-7"/><path d="M15 5h5v5"/></>:<><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></>;
 return <><svg className="analysisOptionGlyph" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg><span className="analysisOptionLabel">{label}</span></>;
}

function useOptionTooltip(anchor:RefObject<HTMLElement|null>,text:string){
 const tooltip=useRef<HTMLDivElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const id='analysis-option-tip-'+useId().replace(/:/g,'');
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:12,top:12});
 const hide=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;setOpen(false)};
 const show=(delay=false)=>{if(!anchor.current?.closest('.mode-analysis,.mode-presentation'))return;if(timer.current)clearTimeout(timer.current);if(delay)timer.current=setTimeout(()=>setOpen(true),160);else setOpen(true)};
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{const a=anchor.current?.getBoundingClientRect(),t=tooltip.current;if(!a||!t||!anchor.current?.getClientRects().length){setOpen(false);return;}const r=t.getBoundingClientRect(),width=document.documentElement.clientWidth,height=window.innerHeight;setPosition({left:Math.max(8,Math.min(a.left+a.width/2-r.width/2,width-r.width-8)),top:a.bottom+r.height+14<=height?a.bottom+7:Math.max(8,a.top-r.height-7)})};
  place();const close=()=>setOpen(false),key=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
  window.addEventListener('resize',close);window.addEventListener('scroll',close,true);document.addEventListener('keydown',key);
  return()=>{window.removeEventListener('resize',close);window.removeEventListener('scroll',close,true);document.removeEventListener('keydown',key)};
 },[open,anchor]);
 const portal=open?createPortal(<div ref={tooltip} id={id} role="tooltip" className="analysisOptionTooltip" style={{position:'fixed',left:position.left,top:position.top}}>{text}</div>,anchor.current?.closest('dialog[open]')||document.fullscreenElement||document.body):null;
 return {open,id,show,hide,portal};
}

/** Both work modes share compact tools, labels and accessible explanations. */
const AnalysisOptionButton=forwardRef<HTMLButtonElement,Props>(function AnalysisOptionButton({label,description,icon,className='',onClick,onMouseEnter,onMouseLeave,onFocus,onBlur,onKeyDown,...props},forwardedRef){
 const button=useRef<HTMLButtonElement|null>(null),tip=useOptionTooltip(button,description||label);
 return <><button {...props} type={props.type||'button'} ref={node=>{button.current=node;if(typeof forwardedRef==='function')forwardedRef(node);else if(forwardedRef)forwardedRef.current=node}} className={`analysisOptionButton ${className}`} aria-label={props['aria-label']||label} aria-describedby={[props['aria-describedby'],tip.open?tip.id:undefined].filter(Boolean).join(' ')||undefined} onMouseEnter={event=>{tip.show(true);onMouseEnter?.(event)}} onMouseLeave={event=>{tip.hide();onMouseLeave?.(event)}} onFocus={event=>{tip.show();onFocus?.(event)}} onBlur={event=>{tip.hide();onBlur?.(event)}} onKeyDown={event=>{if(event.key==='Escape')tip.hide();onKeyDown?.(event)}} onClick={event=>{tip.hide();onClick?.(event)}}><OptionContents label={label} icon={icon}/></button>{tip.portal}</>;
});

/** Native summary preserves details keyboard/toggle behavior and its existing owner state. */
export function AnalysisOptionSummary({label,description,icon,className='',onClick,onMouseEnter,onMouseLeave,onFocus,onBlur,onKeyDown,...props}:HTMLAttributes<HTMLElement>&Content){
 const anchor=useRef<HTMLElement|null>(null),tip=useOptionTooltip(anchor,description||label);
 return <><summary {...props} ref={node=>{anchor.current=node}} className={`analysisOptionButton ${className}`} aria-label={props['aria-label']||label} aria-describedby={[props['aria-describedby'],tip.open?tip.id:undefined].filter(Boolean).join(' ')||undefined} onMouseEnter={event=>{tip.show(true);onMouseEnter?.(event)}} onMouseLeave={event=>{tip.hide();onMouseLeave?.(event)}} onFocus={event=>{tip.show();onFocus?.(event)}} onBlur={event=>{tip.hide();onBlur?.(event)}} onKeyDown={event=>{if(event.key==='Escape')tip.hide();onKeyDown?.(event)}} onClick={event=>{tip.hide();onClick?.(event)}}><OptionContents label={label} icon={icon}/></summary>{tip.portal}</>;
}

export default AnalysisOptionButton;
