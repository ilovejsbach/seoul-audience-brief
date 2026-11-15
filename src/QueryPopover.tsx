import {useEffect,useLayoutEffect,useRef,useState,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import './query-controls.css';

type Props={open:boolean;anchor:RefObject<HTMLElement|null>;onClose:()=>void;title:string;children:ReactNode;className?:string};
/** Small query dialogs escape clipped map/option containers without taking over the page. */
export default function QueryPopover({open,anchor,onClose,title,children,className=''}:Props){
 const panel=useRef<HTMLDivElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
 const [position,setPosition]=useState({left:12,top:12,width:340,maxHeight:400});
 const dismiss=(restore=true)=>{closeRef.current();if(restore&&anchor.current?.getClientRects().length)anchor.current.focus()};
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{
   const target=anchor.current;if(!target)return;const a=target.getBoundingClientRect();
   const width=Math.min(360,Math.max(180,Math.min(window.innerWidth,document.documentElement.clientWidth||window.innerWidth)-24));
   const screenHeight=Math.min(window.innerHeight,document.documentElement.clientHeight||window.innerHeight),below=screenHeight-a.bottom-18,above=a.top-18;
   const height=panel.current?.getBoundingClientRect().height||280,putBelow=below>=Math.min(height,260)||below>=above;
   const maxHeight=Math.max(96,Math.min(screenHeight-24,putBelow?below:above));
   const desired=putBelow?a.bottom+6:a.top-Math.min(height,maxHeight)-6;
   const next={width,maxHeight,left:Math.max(12,Math.min(a.left,document.documentElement.clientWidth-width-12)),top:Math.max(12,Math.min(desired,screenHeight-Math.min(height,maxHeight)-12))};
   setPosition(old=>Object.keys(next).every(key=>Math.abs(old[key as keyof typeof old]-next[key as keyof typeof next])<1)?old:next);
  };
  place();const frame=requestAnimationFrame(()=>{place();(panel.current?.querySelector<HTMLElement>('[data-query-autofocus]')||panel.current?.querySelector<HTMLElement>('input')||panel.current?.querySelector<HTMLElement>('button'))?.focus()});
  const resize=new ResizeObserver(place);if(panel.current)resize.observe(panel.current);
  window.addEventListener('resize',place);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();window.removeEventListener('resize',place)};
 },[open,anchor]);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(panel.current?.contains(event.target as Node)||anchor.current?.contains(event.target as Node))return;dismiss(false)};
  const focus=(event:FocusEvent)=>{if(panel.current?.contains(event.target as Node)||anchor.current?.contains(event.target as Node))return;closeRef.current()};
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&panel.current?.getClientRects().length){event.preventDefault();event.stopImmediatePropagation();dismiss()}};
  const scroll=(event:Event)=>{if(panel.current?.contains(event.target as Node))return;dismiss(false)};
  const visible=()=>{if(!anchor.current?.getClientRects().length)closeRef.current()};
  const observer=new MutationObserver(visible);for(let node=anchor.current;node;node=node.parentElement)observer.observe(node,{attributes:true,attributeFilter:['hidden','style','class','data-detail-active','data-presentation-detail','data-detail-id']});
  document.addEventListener('pointerdown',outside);document.addEventListener('focusin',focus);document.addEventListener('keydown',key,true);window.addEventListener('scroll',scroll,true);
  return()=>{observer.disconnect();document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',focus);document.removeEventListener('keydown',key,true);window.removeEventListener('scroll',scroll,true)};
 },[open,anchor]);
 if(!open)return null;
 return createPortal(<div ref={panel} className={`queryPopover ${className}`} role="dialog" aria-modal="false" aria-label={title} style={{position:'fixed',...position}}><div className="queryPopoverHeader"><b>{title}</b><button type="button" aria-label={`${title} 닫기`} onClick={()=>dismiss()}>닫기</button></div><div className="queryPopoverBody">{children}</div></div>,document.fullscreenElement||document.body);
}
