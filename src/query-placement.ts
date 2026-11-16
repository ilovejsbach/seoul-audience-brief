import {useSyncExternalStore} from 'react';

export type QueryPlacement='top'|'right'|'floating';
export type QueryWindowBox={x:number;y:number;width:number;height:number};
type QueryPlacementState={mode:QueryPlacement;box:QueryWindowBox;dockWidth:number;opacity:number};
const initialBox=():QueryWindowBox=>({x:Math.max(8,Math.min(window.innerWidth-376,window.innerWidth*.62)),y:140,width:360,height:480});
let snapshot:QueryPlacementState={mode:'top',box:initialBox(),dockWidth:320,opacity:100};
const subscribers=new Set<()=>void>();
const subscribe=(listener:()=>void)=>{subscribers.add(listener);return()=>{subscribers.delete(listener)}};
export function clampQueryWindow(box:QueryWindowBox):QueryWindowBox{
 const availableWidth=Math.max(1,Math.min(window.innerWidth,document.documentElement.clientWidth||window.innerWidth)-16),availableHeight=Math.max(1,window.innerHeight-16);
 const width=Math.min(availableWidth,Math.max(280,box.width)),height=Math.min(availableHeight,Math.max(220,box.height));
 return {width,height,x:Math.max(8,Math.min(availableWidth+8-width,box.x)),y:Math.max(8,Math.min(availableHeight+8-height,box.y))};
}
export function updateQueryPlacement(patch:Partial<QueryPlacementState>){
 const next={...snapshot,...patch};
 next.box=clampQueryWindow(next.box);
 next.dockWidth=Math.max(280,Math.min(420,Math.round(next.dockWidth)));next.opacity=Math.max(50,Math.min(100,next.opacity));
 if(next.mode===snapshot.mode&&next.dockWidth===snapshot.dockWidth&&next.opacity===snapshot.opacity&&Object.keys(next.box).every(key=>next.box[key as keyof QueryWindowBox]===snapshot.box[key as keyof QueryWindowBox]))return;
 snapshot=next;subscribers.forEach(listener=>listener());
}
export const resetQueryWindow=()=>updateQueryPlacement({box:initialBox(),dockWidth:320,opacity:100});
export function useQueryPlacement(){return useSyncExternalStore(subscribe,()=>snapshot)}
