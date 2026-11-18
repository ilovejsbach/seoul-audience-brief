import {createContext,useContext,useLayoutEffect,useRef,useState,type ReactNode,type RefObject,type PointerEvent as ReactPointerEvent,type KeyboardEvent as ReactKeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import QueryPopover from './QueryPopover';
import {markFloatingEscapeHandled} from './floating-window-escape';
import {clampQueryWindow,resetQueryWindow,updateQueryPlacement,useQueryPlacement,type QueryWindowBox} from './query-placement';
import './unified-query-bar.css';
import './query-placement.css';

export const QueryToolbarContext=createContext(false);
export const useQueryToolbar=()=>useContext(QueryToolbarContext);

/** The inputs themselves are the current-condition display, never a second summary. */
export function UnifiedQueryFields({children,scope}:{children:ReactNode;scope?:string}){
 return <QueryToolbarContext.Provider value={true}><div className="unifiedQueryFields" data-query-scope={scope}>{children}</div></QueryToolbarContext.Provider>;
}

/** Move one input instance between the fixed query row and the focused map. */
export default function UnifiedQueryBar({children,scope,active,panel,fullscreenSlot,fullscreen}:{children:ReactNode;scope:string;active:boolean;panel:RefObject<HTMLElement|null>;fullscreenSlot:RefObject<HTMLDivElement|null>;fullscreen:boolean}){
 const parking=useRef<HTMLDivElement>(null),pane=useRef<HTMLElement>(null),toolButton=useRef<HTMLButtonElement>(null),[host]=useState(()=>document.createElement('div')),[toolHost]=useState(()=>document.createElement('span')),[rightSlot]=useState(()=>document.createElement('div'));
 const placement=useQueryPlacement(),latest=useRef(placement);latest.current=placement;
 const [menuOpen,setMenuOpen]=useState(false),[canDock,setCanDock]=useState(true),[foreground,setForeground]=useState(false),[magnet,setMagnet]=useState(false);
 const syncRef=useRef<()=>void>(()=>{}),dockRoot=useRef<HTMLElement|null>(null),drag=useRef<{pointer:number;x:number;y:number;box:QueryWindowBox;mode:'move'|'resize'|'dock-resize';originalMode:typeof placement.mode}|null>(null);
 const dockFailure=useRef('');
 const gestureHandlers=useRef<{move:(event:PointerEvent)=>void;stop:(attach?:boolean)=>void}>({move:()=>{},stop:()=>{}});
 const magnetRef=useRef(false);
 const [panelNode,setPanelNode]=useState<HTMLElement|null>(null);
 useLayoutEffect(()=>{const frame=requestAnimationFrame(()=>setPanelNode(panel.current));return()=>cancelAnimationFrame(frame)},[panel]);
 useLayoutEffect(()=>{
  host.className='unifiedQueryBar';host.setAttribute('role','region');host.setAttribute('aria-label','현재 조회 조건 편집');
  toolHost.className='queryPlacementToolHost';rightSlot.className='queryRightDockSlot';
  const node=panelNode,app=node?.closest<HTMLElement>('.app');
  const clearDock=(root:HTMLElement|null)=>{if(!root)return;delete root.dataset.queryPlacement;root.style.removeProperty('--query-dock-width');root.style.removeProperty('--query-dock-top')};
  const updateTop=()=>{const top=document.getElementById('active-query-summary');if(top){const has=!!top.querySelector('.unifiedQueryBar');if(top.classList.contains('hasUnifiedQueryBar')!==has)top.classList.toggle('hasUnifiedQueryBar',has)}};
  const sync=()=>{
   const view=node?.closest<HTMLElement>('.analysisView');
   const visible=active&&!!view&&!view.closest('[hidden]')&&!node?.closest('[hidden]');
   setForeground(old=>old===visible?old:visible);
   const mainOpen=!!app?.querySelector('.analysisView>.dashboardContent[data-analysis-main-open="true"]');
   const focused=fullscreen&&!mainOpen;
   const top=document.getElementById('active-query-summary');
   const state=latest.current,root=focused?node:view;
   const share=Number.parseFloat(app?.style.getPropertyValue('--workspace-map-track')||'75')/100;
   const rankingNode=node?.closest('.workspace')?.querySelector<HTMLElement>(':scope>.ranking,:scope>.supportRanking');
   const ranking=focused||mainOpen||app?.getAttribute('data-secondary-mode')==='hidden'?0:(rankingNode?Math.max(280,rankingNode.getBoundingClientRect().width):0);
   const available=(root?.clientWidth||0)-state.dockWidth-16;
   const failureKey=`${root?.clientWidth}-${state.dockWidth}-${share}-${ranking}-${mainOpen}-${focused}`;
   const fits=dockFailure.current!==failureKey&&available-ranking>=540&&(focused||mainOpen||available*Math.min(.85,Math.max(.55,share))>=540);
   setCanDock(old=>old===fits?old:fits);
   let mode=state.mode;
   if(visible&&mode==='right'&&!fits){mode='floating';updateQueryPlacement({mode:'floating'})}
   let right=visible&&mode==='right';
   if(dockRoot.current&&(!right||dockRoot.current!==root))clearDock(dockRoot.current);
   dockRoot.current=right?root||null:null;
   if(right&&root){
    root.dataset.queryPlacement='right';root.style.setProperty('--query-dock-width',`${state.dockWidth}px`);
    const content=focused?node?.querySelector<HTMLElement>(':scope>.mapWrap'):view?.querySelector<HTMLElement>(':scope>.dashboardContent');
    root.style.setProperty('--query-dock-top',`${Math.max(0,(content?.getBoundingClientRect().top||root.getBoundingClientRect().top)-root.getBoundingClientRect().top)}px`);
    if(rightSlot.parentElement!==root)root.appendChild(rightSlot);
    const mapWidth=node?.querySelector<SVGElement>(':scope>.mapWrap>svg[aria-label]')?.getBoundingClientRect().width||0;
    if(!mainOpen&&mapWidth>0&&mapWidth<540){dockFailure.current=failureKey;setCanDock(false);clearDock(root);dockRoot.current=null;rightSlot.remove();mode='floating';right=false;updateQueryPlacement({mode:'floating'})}
   }else rightSlot.remove();
   const target=visible?(mode==='right'?rightSlot:mode==='floating'?(document.fullscreenElement||app):focused?fullscreenSlot.current:top):parking.current;
   if(target&&host.parentElement!==target)target.appendChild(host);
   if(host.dataset.queryPlacement!==mode)host.dataset.queryPlacement=mode;
   host.style.cssText=mode==='floating'?`position:fixed;left:${state.box.x}px;top:${state.box.y}px;width:${state.box.width}px;height:${state.box.height}px;z-index:1400;--query-floating-alpha:${state.opacity/100}`:'';
   const tools=visible?(focused?node?.querySelector<HTMLElement>(':scope>.mapPanelTools'):app?.querySelector<HTMLElement>(':scope>header .analysisHeadingActions')||view?.querySelector<HTMLElement>('.analysisHeadingActions')):parking.current;
   if(tools&&toolHost.parentElement!==tools)tools.appendChild(toolHost);
   updateTop();
   if(right&&root){const content=focused?node?.querySelector<HTMLElement>(':scope>.mapWrap'):view?.querySelector<HTMLElement>(':scope>.dashboardContent');root.style.setProperty('--query-dock-top',`${Math.max(0,(content?.getBoundingClientRect().top||root.getBoundingClientRect().top)-root.getBoundingClientRect().top)}px`)}
  };
  syncRef.current=sync;
  sync();const observer=new MutationObserver(sync);
  if(app)observer.observe(app,{subtree:true,attributes:true,attributeFilter:['hidden','class','data-analysis-main-open']});
  const resize=new ResizeObserver(sync);if(viewNode(node))resize.observe(viewNode(node)!);if(node)resize.observe(node);
  const fit=()=>{updateQueryPlacement({box:clampQueryWindow(latest.current.box)});sync()};
  window.addEventListener('resize',fit);
  window.addEventListener('analysis-detail-surface-change',sync);document.addEventListener('fullscreenchange',sync);
  const reset=()=>{if(active){resetQueryWindow();updateQueryPlacement({mode:'top'})}};window.addEventListener('workspace-layout-reset',reset);
  const focus=(event:Event)=>{const id=(event as CustomEvent<{id?:string}>).detail?.id;if(!id||!host.contains(document.getElementById(id)))return;const field=document.getElementById(id);if(!field)return;for(let p=field.parentElement;p&&p!==host;p=p.parentElement)if(p instanceof HTMLDetailsElement)p.open=true;field.focus({preventScroll:true})};
  window.addEventListener('query-control-open',focus);
  return()=>{observer.disconnect();resize.disconnect();window.removeEventListener('workspace-layout-reset',reset);window.removeEventListener('resize',fit);window.removeEventListener('analysis-detail-surface-change',sync);document.removeEventListener('fullscreenchange',sync);window.removeEventListener('query-control-open',focus);clearDock(dockRoot.current);dockRoot.current=null;rightSlot.remove();host.remove();toolHost.remove();updateTop();syncRef.current=()=>{}};
 },[active,fullscreen,panelNode,fullscreenSlot,host,rightSlot,toolHost]);
 useLayoutEffect(()=>{syncRef.current()},[placement]);
 const choose=(mode:'top'|'right'|'floating')=>{updateQueryPlacement({mode});setMenuOpen(false)};
 const stop=(attach=false)=>{if(attach&&magnetRef.current)updateQueryPlacement({mode:'right'});drag.current=null;magnetRef.current=false;setMagnet(false)};
 const start=(mode:'move'|'resize'|'dock-resize')=>(event:ReactPointerEvent<HTMLElement>)=>{if(event.button!==0||mode==='move'&&(event.target as HTMLElement).closest('button,summary,input,select,label'))return;event.preventDefault();const bounds=host.getBoundingClientRect();drag.current={pointer:event.pointerId,x:event.clientX,y:event.clientY,box:placement.mode==='right'?{x:bounds.left,y:bounds.top,width:bounds.width,height:bounds.height}:{...placement.box},mode,originalMode:placement.mode};event.currentTarget.setPointerCapture(event.pointerId)};
 const move=(event:Pick<PointerEvent,'pointerId'|'clientX'|'clientY'>)=>{const gesture=drag.current;if(!gesture||gesture.pointer!==event.pointerId)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(gesture.mode==='dock-resize'){const root=dockRoot.current;if(root)updateQueryPlacement({dockWidth:root.getBoundingClientRect().right-event.clientX});return;}
  if(gesture.originalMode==='right'&&gesture.mode==='move'&&Math.hypot(dx,dy)<4)return;
  updateQueryPlacement({mode:gesture.mode==='move'?'floating':placement.mode,box:gesture.mode==='move'?{...gesture.box,x:gesture.box.x+dx,y:gesture.box.y+dy}:{...gesture.box,width:gesture.box.width+dx,height:gesture.box.height+dy}});
  const root=panelNode?.closest<HTMLElement>('.analysisView'),bounds=(fullscreen&&!root?.querySelector('.analysisMainDetail:not([hidden])')?panelNode:root)?.getBoundingClientRect();
  const near=gesture.mode==='move'&&canDock&&!!bounds&&event.clientX>=bounds.right-56&&event.clientX<=bounds.right+8&&event.clientY>=bounds.top&&event.clientY<=bounds.bottom;
  magnetRef.current=near;setMagnet(near);
 };
 gestureHandlers.current={move,stop};
 useLayoutEffect(()=>{const moving=(event:PointerEvent)=>gestureHandlers.current.move(event),up=()=>gestureHandlers.current.stop(true),cancel=()=>gestureHandlers.current.stop(),key=(event:KeyboardEvent)=>{
  if(event.key!=='Escape')return;
  if(drag.current){event.preventDefault();event.stopImmediatePropagation();markFloatingEscapeHandled(event);gestureHandlers.current.stop();return;}
  if(latest.current.mode!=='floating'||!pane.current?.contains(document.activeElement)||document.querySelector('.queryPopover,.dataMeaningTooltip'))return;
  event.preventDefault();event.stopImmediatePropagation();markFloatingEscapeHandled(event);
  const details=document.activeElement?.closest<HTMLDetailsElement>('details[open]');
  if(details&&pane.current.contains(details)){details.open=false;details.querySelector<HTMLElement>('summary')?.focus({preventScroll:true});return;}
  updateQueryPlacement({mode:'top'});requestAnimationFrame(()=>toolButton.current?.focus({preventScroll:true}));
 };window.addEventListener('pointermove',moving);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);document.addEventListener('keydown',key,true);return()=>{window.removeEventListener('pointermove',moving);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);document.removeEventListener('keydown',key,true)}},[]);
 useLayoutEffect(()=>{if(!active)setMenuOpen(false)},[active]);
 const keyboard=(mode:'move'|'resize'|'dock-resize')=>(event:ReactKeyboardEvent<HTMLElement>)=>{if(event.target!==event.currentTarget)return;const dx=event.key==='ArrowLeft'?-10:event.key==='ArrowRight'?10:0,dy=event.key==='ArrowUp'?-10:event.key==='ArrowDown'?10:0;if(!dx&&!dy)return;event.preventDefault();const bounds=host.getBoundingClientRect(),box=placement.mode==='right'?{x:bounds.left,y:bounds.top,width:bounds.width,height:bounds.height}:placement.box;if(mode==='dock-resize')updateQueryPlacement({dockWidth:placement.dockWidth-dx});else updateQueryPlacement({mode:mode==='move'?'floating':placement.mode,box:mode==='move'?{...box,x:box.x+dx,y:box.y+dy}:{...box,width:box.width+dx,height:box.height+dy}})};
 const bind=(mode:'move'|'resize'|'dock-resize')=>({onPointerDown:start(mode),onPointerCancel:()=>stop(),onKeyDown:keyboard(mode)});
 return <><div ref={parking} hidden/>{createPortal(<section ref={pane} className="queryPlacementPane" data-query-mode={placement.mode}><header className="queryPlacementHeader" hidden={placement.mode==='top'} tabIndex={0} aria-label="조회창 위치 이동" {...bind('move')}><h3>조회 조건</h3><button type="button" title="같은 입력을 상단 조회 바로 옮깁니다" onClick={()=>choose('top')}>상단 복원</button></header><div className="queryPlacementBody"><UnifiedQueryFields scope={scope}>{children}</UnifiedQueryFields></div>{placement.mode==='floating'&&<div className="queryPlacementResize" role="button" tabIndex={0} aria-label="조회창 크기 조절" {...bind('resize')}>↘</div>}{placement.mode==='right'&&<div className="queryDockResize" role="separator" tabIndex={0} aria-label="우측 조회창 너비 조절" aria-orientation="vertical" aria-valuemin={280} aria-valuemax={420} aria-valuenow={placement.dockWidth} {...bind('dock-resize')}/>}</section>,host)}
 {createPortal(<><button ref={toolButton} className="queryPlacementButton" type="button" aria-label="조회창 배치" title="조회창 배치: 상단·우측 고정·띄우기" aria-expanded={menuOpen} onClick={()=>setMenuOpen(value=>!value)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M15 9v11"/></svg></button><QueryPopover open={menuOpen&&foreground} anchor={toolButton} title="조회창 배치" onClose={()=>setMenuOpen(false)} className="queryPlacementPopover"><div className="queryPlacementChoices" role="group" aria-label="조회창 배치 방식"><button aria-pressed={placement.mode==='top'} onClick={()=>choose('top')}>상단 조회 바</button><button aria-pressed={placement.mode==='right'} disabled={!canDock} title={!canDock?'지도를 540픽셀 이상 남길 공간이 필요합니다':undefined} onClick={()=>choose('right')}>우측 고정</button><button aria-pressed={placement.mode==='floating'} onClick={()=>choose('floating')}>띄우기</button></div>{!canDock&&<p className="queryPlacementHint">지도 너비를 확보하기 위해 우측 고정 대신 띄우기를 사용합니다.</p>}{placement.mode!=='top'&&<><p className="queryPlacementHint">제목을 끌어 이동 · 오른쪽 가장자리에 놓으면 고정</p>{placement.mode==='floating'&&<label>배경 불투명도 <output>{placement.opacity}%</output><input aria-label="조회창 배경 불투명도" type="range" min="50" max="100" step="5" value={placement.opacity} onChange={event=>updateQueryPlacement({opacity:Number(event.target.value)})}/></label>}<button onClick={resetQueryWindow}>위치·크기 초기화</button></>}</QueryPopover></>,toolHost)}
 {magnet&&foreground&&createPortal(<div className="queryMagnetPreview" role="status" style={{position:'fixed',right:Math.max(8,window.innerWidth-(panelNode?.closest<HTMLElement>('.analysisView')?.getBoundingClientRect().right||window.innerWidth)),top:panelNode?.closest<HTMLElement>('.analysisView')?.getBoundingClientRect().top||100,bottom:8,width:placement.dockWidth}}>놓으면 조회창을 우측에 고정합니다</div>,document.fullscreenElement||panelNode?.closest('.app')||document.body)}
 </>;
}

const viewNode=(node:HTMLElement|null)=>node?.closest<HTMLElement>('.analysisView')||null;
