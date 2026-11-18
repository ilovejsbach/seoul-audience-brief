import {useEffect,useRef,useState,type CSSProperties,type PointerEvent,type RefObject,type KeyboardEvent} from 'react';
export type SupportDock='default'|'left'|'right'|'floating';
/** Display geometry only: changing attachment never changes query or selected data. */
// Default floating spot: just left of the support column (keeps the left menu, the map controls and the column's "다시 붙이기" note reachable).
const floatX=()=>Math.max(20,document.documentElement.clientWidth-(document.getElementById('region-support-host')?.getBoundingClientRect().width||0)-380);
export function useSupportDock(host:RefObject<HTMLElement|null>,initial:'default'|'floating'='default'){
 const [mode,setMode]=useState<SupportDock>(initial),[preview,setPreview]=useState<'left'|'right'|null>(null),[width,setWidth]=useState(320),[opacity,setOpacity]=useState(100);
 const drag=useRef(false),start=useRef({x:0,y:0}),moved=useRef(false);
 const [box,setBox]=useState(()=>({x:floatX(),y:80,width:360,height:440})),resizeStart=useRef<{x:number;y:number;width:number;height:number}|null>(null),dragBox=useRef(box);
 const clamp=(next:typeof box)=>{const w=document.documentElement.clientWidth,h=window.innerHeight,width=Math.min(w,Math.max(280,next.width)),height=Math.min(h,Math.max(180,next.height));return {...next,width,height,x:Math.max(0,Math.min(w-width,next.x)),y:Math.max(0,Math.min(h-height,next.y))}};
 const key=(e:KeyboardEvent<HTMLElement>,size=false)=>{if(!size&&e.target!==e.currentTarget)return;const dx=e.key==='ArrowLeft'?-10:e.key==='ArrowRight'?10:0,dy=e.key==='ArrowUp'?-10:e.key==='ArrowDown'?10:0;if(!dx&&!dy)return;e.preventDefault();setBox(v=>clamp(size?{...v,width:v.width+dx,height:v.height+dy}:{...v,x:v.x+dx,y:v.y+dy}))};
 const geometry={style:{position:'fixed',pointerEvents:'auto',left:box.x,top:box.y,width:box.width,height:box.height,maxWidth:'none',maxHeight:'none'} as CSSProperties,reset:()=>setBox(clamp({x:floatX(),y:80,width:360,height:440})),resize:{onPointerDown:(e:PointerEvent<HTMLElement>)=>{if(e.button!==0)return;e.preventDefault();resizeStart.current={x:e.clientX,y:e.clientY,width:box.width,height:box.height};e.currentTarget.setPointerCapture(e.pointerId)},onPointerMove:(e:PointerEvent<HTMLElement>)=>{const g=resizeStart.current;if(g)setBox(v=>clamp({...v,width:g.width+e.clientX-g.x,height:g.height+e.clientY-g.y}))},onPointerUp:()=>{resizeStart.current=null},onPointerCancel:()=>{resizeStart.current=null},onLostPointerCapture:()=>{resizeStart.current=null},onKeyDown:(e:KeyboardEvent<HTMLElement>)=>key(e,true)}};
 useEffect(()=>{const resize=()=>setBox(v=>clamp(v));window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[]);
 const fits=(side:'left'|'right')=>{void side;const node=host.current;if(!node)return false;const r=node.getBoundingClientRect(),options=node.querySelector<HTMLElement>('.mapOptionsPanel:not([hidden])'),reserved=options&&options.offsetParent!==null&&options.closest('.mapPanel')?.getAttribute('data-options-layout')==='docked'?options.getBoundingClientRect().width:0;const popup=node.querySelector<HTMLElement>('.mapPanel[data-popup-dock]');const other=popup?Number(popup.dataset.popupWidth||320):0;return r.width-width-reserved-other-32>=540};
 useEffect(()=>{if(mode!=='left'&&mode!=='right')return;const node=host.current;if(!node)return;const check=()=>{if(!fits(mode))setMode('floating')};const observer=new MutationObserver(check);observer.observe(node,{subtree:true,attributes:true,attributeFilter:['data-options-layout','data-options-open','data-popup-dock','data-popup-width','style']});return()=>observer.disconnect()},[mode,width]);
 const attach=(side:'left'|'right')=>{const ok=fits(side);if(!ok)geometry.reset();setMode(ok?side:'floating');setPreview(null)};
 const candidate=(x:number,y:number)=>{const r=host.current?.getBoundingClientRect();if(!r||y<r.top||y>r.bottom)return null;const side=x-r.left<56&&x>=r.left?'left':r.right-x<56&&x<=r.right?'right':null;return side&&fits(side)?side:null};
 const move={
  onPointerDown:(e:PointerEvent<HTMLElement>)=>{if(e.button!==0||(e.target as HTMLElement).closest('button,input,select,summary,details'))return;drag.current=true;moved.current=false;start.current={x:e.clientX,y:e.clientY};dragBox.current=box;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId)},
  onPointerMove:(e:PointerEvent<HTMLElement>)=>{if(!drag.current)return;const distance=Math.hypot(e.clientX-start.current.x,e.clientY-start.current.y);if(distance>5)moved.current=true;if(mode==='floating')setBox(clamp({...dragBox.current,x:dragBox.current.x+e.clientX-start.current.x,y:dragBox.current.y+e.clientY-start.current.y}));setPreview(candidate(e.clientX,e.clientY))},
  onPointerUp:(e:PointerEvent<HTMLElement>)=>{if(!drag.current)return;drag.current=false;if(moved.current){const side=candidate(e.clientX,e.clientY);if(side)attach(side);else{if(mode!=='floating')setBox(v=>clamp({...v,x:e.clientX-100,y:e.clientY-20}));setMode('floating')}}setPreview(null)},
  onPointerCancel:()=>{drag.current=false;setPreview(null)},
  onLostPointerCapture:()=>{drag.current=false;setPreview(null)},
  onKeyDown:(e:KeyboardEvent<HTMLElement>)=>key(e)
 };
 return {mode,setMode,preview,width,setWidth,opacity,setOpacity,attach,fits,geometry,move,reset:()=>{setMode(initial);setWidth(320);setOpacity(100);geometry.reset();setPreview(null)}};
}
