import {useCallback,useEffect,useRef,useState,type CSSProperties,type RefObject,type PointerEvent,type KeyboardEvent} from 'react';
/** One geometry contract for movable query windows in both map experiences. */
export function useFloatingPanel(host:RefObject<HTMLElement|null>,enabled:boolean,initial:{width?:number;height?:number;minWidth?:number;minHeight?:number}={}){
 const defaultSize=useRef({x:10,y:52,width:initial.width??300,height:initial.height??520});
 const minimum=useRef({width:initial.minWidth??240,height:initial.minHeight??180});
 const [box,setBox]=useState(defaultSize.current);
 const gesture=useRef<{x:number;y:number;box:typeof box;mode:'move'|'resize'}|null>(null);
 const clamp=useCallback((next:typeof box)=>{
  const r=host.current?.getBoundingClientRect();
  if(!r||r.width<=0||r.height<=0)return next;
  // Intersect host-relative coordinates with the visible browser viewport.
  const minX=Math.max(0,-r.left),maxX=Math.min(r.width,window.innerWidth-r.left),minY=Math.max(0,-r.top),maxY=Math.min(r.height,window.innerHeight-r.top);
  const availableWidth=maxX-minX,availableHeight=maxY-minY;
  // Hidden/offscreen hosts must not destroy a window's last useful geometry.
  if(availableWidth<=0||availableHeight<=0)return next;
  const width=Math.min(availableWidth,Math.max(Math.min(minimum.current.width,availableWidth),next.width));
  const height=Math.min(availableHeight,Math.max(Math.min(minimum.current.height,availableHeight),next.height));
  const x=Math.min(maxX-width,Math.max(minX,next.x)),y=Math.min(maxY-height,Math.max(minY,next.y));
  return width===next.width&&height===next.height&&x===next.x&&y===next.y?next:{...next,width,height,x,y};
 },[host]);
 const update=useCallback((next:typeof box)=>setBox(clamp(next)),[clamp]);
 const reset=useCallback(()=>setBox(clamp(defaultSize.current)),[clamp]);
 useEffect(()=>{if(!enabled)return;setBox(previous=>clamp(previous));const node=host.current;if(!node)return;const observer=new ResizeObserver(()=>setBox(previous=>clamp(previous)));observer.observe(node);const resize=()=>setBox(previous=>clamp(previous));window.addEventListener('resize',resize);window.addEventListener('scroll',resize,true);return()=>{observer.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('scroll',resize,true)}},[enabled,clamp,host]);
 const start=(mode:'move'|'resize')=>(e:PointerEvent<HTMLElement>)=>{if(!enabled||e.button!==0||mode==='move'&&(e.target as HTMLElement).closest('button'))return;e.preventDefault();gesture.current={x:e.clientX,y:e.clientY,box,mode};e.currentTarget.setPointerCapture(e.pointerId)};
 const move=(e:PointerEvent<HTMLElement>)=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;update(g.mode==='move'?{...g.box,x:g.box.x+dx,y:g.box.y+dy}:{...g.box,width:g.box.width+dx,height:g.box.height+dy})};
 const stop=()=>{gesture.current=null};
 const keys=(mode:'move'|'resize')=>(e:KeyboardEvent<HTMLElement>)=>{const dx=e.key==='ArrowLeft'?-10:e.key==='ArrowRight'?10:0,dy=e.key==='ArrowUp'?-10:e.key==='ArrowDown'?10:0;if(!dx&&!dy)return;e.preventDefault();update(mode==='move'?{...box,x:box.x+dx,y:box.y+dy}:{...box,width:box.width+dx,height:box.height+dy})};
 const bind=(mode:'move'|'resize')=>({onPointerDown:start(mode),onPointerMove:move,onPointerUp:stop,onLostPointerCapture:stop,onKeyDown:keys(mode)});
 return {box,reset,style:enabled?{position:'absolute',left:box.x,top:box.y,width:box.width,height:box.height,maxWidth:'none',maxHeight:'none'} as CSSProperties:undefined,move:bind('move'),resize:bind('resize')};
}
