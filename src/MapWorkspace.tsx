import {useEffect,useLayoutEffect,useId,useRef,useState,type ReactNode,type CSSProperties,type PointerEvent as ReactPointerEvent,type KeyboardEvent as ReactKeyboardEvent} from 'react';
import FloatingQueryLayer from './FloatingQueryLayer';
import {claimFloatingEscape} from './floating-window-escape';
import {useFloatingPanel} from './useFloatingPanel';
import './map-workspace.css';
import './resizable-workspaces.css';
import './market-docking.css';
type Panel='controls'|'details';
type Dock='left'|'right'|'floating';
type Props={children:ReactNode;controls:ReactNode;details:ReactNode;title:string;onClose:()=>void;revealDetails?:number;focusContent?:boolean};
export default function MapWorkspace({children,controls,details,title,onClose,revealDetails,focusContent=false}:Props){
 const bodyRef=useRef<HTMLDivElement>(null),detailsContentRef=useRef<HTMLDivElement>(null),splitDrag=useRef<'controls'|'details'|null>(null);
 const [canvasHeight,setCanvasHeight]=useState<number|null>(null);
 useLayoutEffect(()=>{
  const workspace=bodyRef.current?.parentElement;if(!workspace)return;
  const fit=()=>{if(workspace.closest('[hidden]')||!workspace.getClientRects().length)return;setCanvasHeight(Math.max(240,window.innerHeight-(workspace.getBoundingClientRect().top+window.scrollY)-2))};
  const observer=new ResizeObserver(fit);observer.observe(workspace);
  const appHeader=workspace.closest('.app')?.querySelector<HTMLElement>(':scope>header');if(appHeader)observer.observe(appHeader);
  fit();window.addEventListener('resize',fit);window.addEventListener('scroll',fit);
  return()=>{observer.disconnect();window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit)};
 },[]);
 const [controlsOpen,setControlsOpen]=useState(true),[detailsOpen,setDetailsOpen]=useState(true),[controlsDock,setControlsDock]=useState<Dock>('left'),[detailsDock,setDetailsDock]=useState<Dock>('right'),[leftWidth,setLeftWidth]=useState(280),[rightWidth,setRightWidth]=useState(320),[bodyWidth,setBodyWidth]=useState(1200);
 const narrow=bodyWidth<820;
 const desiredControls=controlsOpen&&controlsDock!=='floating'&&!narrow,desiredDetails=detailsOpen&&detailsDock!=='floating'&&!narrow;
 const detailsFloating=detailsDock==='floating'||narrow||bodyWidth-(desiredControls?leftWidth:0)-rightWidth<540;
 const floating=controlsDock==='floating'||narrow||bodyWidth-leftWidth-(desiredDetails&&!detailsFloating?rightWidth:0)<540;
 const geometry=useFloatingPanel(bodyRef,floating,{viewport:true,width:560,height:360,minHeight:220});
 const detailGeometry=useFloatingPanel(bodyRef,detailsFloating,{viewport:true,width:400,height:520,minWidth:280,minHeight:220});
 const [controlsOpacity,setControlsOpacity]=useState(100),[detailsOpacity,setDetailsOpacity]=useState(100);
 const [preview,setPreview]=useState<{panel:Panel;side:'left'|'right'}|null>(null),previewRef=useRef<typeof preview>(null);
 const [dragPositions,setDragPositions]=useState<Partial<Record<Panel,{x:number;y:number}>>>({});
 const [viewport,setViewport]=useState(()=>({width:window.innerWidth,height:window.innerHeight}));
 const [floatingFront,setFloatingFront]=useState<Panel>('controls');
 const [focusReveal,setFocusReveal]=useState({controls:false,details:false});
 const [compactReveal,setCompactReveal]=useState({controls:false,details:false});
 const compactViewport=viewport.width<768;
 useLayoutEffect(()=>setCompactReveal({controls:false,details:false}),[compactViewport]);
 useLayoutEffect(()=>setFocusReveal({controls:false,details:false}),[focusContent]);
 const revealFloating=(panel:Panel)=>{setFocusReveal(previous=>({...previous,[panel]:true}));setCompactReveal(previous=>({...previous,[panel]:true}))};
 useLayoutEffect(()=>{const sync=()=>setViewport({width:Math.min(window.innerWidth,document.documentElement.clientWidth||window.innerWidth),height:Math.min(window.innerHeight,document.documentElement.clientHeight||window.innerHeight)});sync();window.addEventListener('resize',sync);return()=>window.removeEventListener('resize',sync)},[]);
 // Keep the whole window visible, including after a resize. Each window starts on its own side.
 const floatingBox=(panel:Panel)=>{
  const box=panel==='controls'?geometry.box:detailGeometry.box,width=Math.min(box.width,viewport.width),height=Math.min(box.height,viewport.height);
  const position=dragPositions[panel]||{x:panel==='controls'?10:viewport.width-width-10,y:(bodyRef.current?.getBoundingClientRect().top??44)+8};
  return {width,height,x:Math.max(0,Math.min(viewport.width-width,position.x)),y:Math.max(0,Math.min(viewport.height-height,position.y))};
 };
 // On narrow viewports two open windows share the same working space: show the last requested one.
 const controlsRequested=controlsOpen&&(!compactViewport||compactReveal.controls)&&(!focusContent||!floating||focusReveal.controls),detailsRequested=detailsOpen&&(!compactViewport||compactReveal.details)&&(!focusContent||!detailsFloating||focusReveal.details);
 const alternateFloating=floating&&detailsFloating&&controlsRequested&&detailsRequested&&geometry.box.width+detailGeometry.box.width+30>viewport.width;
 const controlsVisible=controlsRequested&&(!alternateFloating||floatingFront==='controls');
 const detailsVisible=detailsRequested&&(!alternateFloating||floatingFront==='details');
 const clearPosition=(panel:Panel)=>setDragPositions(previous=>({...previous,[panel]:undefined}));
 const dragRef=useRef<{panel:Panel;pointer:number;startX:number;startY:number;left:number;top:number;moved:boolean}|null>(null);
 const widths={controls:leftWidth,details:rightWidth},docks={controls:controlsDock,details:detailsDock};
 const effectiveFloat={controls:floating,details:detailsFloating};
 const dockPanel=(panel:Panel,side:Dock)=>{
  setFloatingFront(panel);revealFloating(panel);
  if(panel==='controls'){setControlsDock(side);setControlsOpen(true);if(side!=='floating'&&(detailsDock===side||bodyWidth-leftWidth-rightWidth<540))setDetailsDock('floating')}
  else{setDetailsDock(side);setDetailsOpen(true);if(side!=='floating'&&(controlsDock===side||bodyWidth-leftWidth-rightWidth<540))setControlsDock('floating')}
  clearPosition(panel);setPreview(null);previewRef.current=null;
 };
 const startMove=(panel:Panel)=>(event:ReactPointerEvent<HTMLDivElement>)=>{
  if(event.button!==0||(event.target as HTMLElement).closest('button,input,select,summary,label'))return;
  const rect=event.currentTarget.parentElement!.getBoundingClientRect();setFloatingFront(panel);
  dragRef.current={panel,pointer:event.pointerId,startX:event.clientX,startY:event.clientY,left:rect.left,top:rect.top,moved:false};
  event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
 };
 const movePanel=(event:ReactPointerEvent<HTMLDivElement>)=>{
  const drag=dragRef.current;if(!drag)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  if(!drag.moved&&Math.abs(dx)+Math.abs(dy)<5)return;
  drag.moved=true;
  const box=floatingBox(drag.panel);
  setDragPositions(previous=>({...previous,[drag.panel]:{x:Math.max(0,Math.min(viewport.width-box.width,drag.left+dx)),y:Math.max(0,Math.min(viewport.height-box.height,drag.top+dy))}}));
  const rect=bodyRef.current?.getBoundingClientRect();
  const side:'left'|'right'|null=rect&&event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom?(event.clientX<=rect.left+56?'left':event.clientX>=rect.right-56?'right':null):null;
  const next=side&&!narrow?{panel:drag.panel,side}:null;previewRef.current=next;setPreview(next);
 };
 const stopMove=()=>{const next=previewRef.current,drag=dragRef.current;dragRef.current=null;if(next)dockPanel(next.panel,next.side);else if(drag?.moved){if(drag.panel==='controls')setControlsDock('floating');else setDetailsDock('floating')}setPreview(null);previewRef.current=null};
 const cancelMove=()=>{const panel=dragRef.current?.panel;dragRef.current=null;previewRef.current=null;setPreview(null);if(panel)clearPosition(panel)};
 const moveWithKeys=(panel:Panel)=>(event:ReactKeyboardEvent<HTMLDivElement>)=>{
  if(event.target!==event.currentTarget)return;
  const dx=event.key==='ArrowLeft'?-10:event.key==='ArrowRight'?10:0,dy=event.key==='ArrowUp'?-10:event.key==='ArrowDown'?10:0;
  if(!dx&&!dy)return;event.preventDefault();const box=floatingBox(panel);
  setDragPositions(previous=>({...previous,[panel]:{x:Math.max(0,Math.min(viewport.width-box.width,box.x+dx)),y:Math.max(0,Math.min(viewport.height-box.height,box.y+dy))}}));
 };
 const panelResize=(panel:Panel)=>{
  const handlers=(panel==='controls'?geometry:detailGeometry).resize;
  const rememberPosition=()=>{const box=floatingBox(panel);setDragPositions(previous=>({...previous,[panel]:{x:box.x,y:box.y}}))};
  return {...handlers,onPointerDown:(event:ReactPointerEvent<HTMLElement>)=>{rememberPosition();handlers.onPointerDown(event)},onKeyDown:(event:ReactKeyboardEvent<HTMLElement>)=>{rememberPosition();handlers.onKeyDown(event)}};
 };
 const panelStyle=(panel:Panel):CSSProperties|undefined=>{
  if(effectiveFloat[panel]||(dragRef.current?.panel===panel&&dragRef.current.moved)){const box=floatingBox(panel);return {position:'fixed',pointerEvents:'auto',left:box.x,top:box.y,width:box.width,height:box.height,maxWidth:'none',maxHeight:'none',...(!effectiveFloat[panel]?{zIndex:1450}:{})}}
  return {gridColumn:docks[panel]==='left'?1:3,gridRow:1};
 };

 const prefix=useId(),menuRef=useRef<HTMLButtonElement>(null),detailRef=useRef<HTMLButtonElement>(null),controlsId=`${prefix}-controls`,detailsId=`${prefix}-details`;
 useEffect(()=>{const node=bodyRef.current;if(!node)return;const observer=new ResizeObserver(()=>setBodyWidth(node.getBoundingClientRect().width));observer.observe(node);return()=>observer.disconnect()},[]);
 useEffect(()=>{if(revealDetails!==undefined){setDetailsOpen(true);setFloatingFront('details');if(revealDetails>0)revealFloating('details');requestAnimationFrame(()=>detailsContentRef.current?.scrollTo({top:0,behavior:'auto'}))}},[revealDetails]);
 useEffect(()=>{if(!floating||!controlsOpen)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(!bodyRef.current?.getClientRects().length)return;if(!claimFloatingEscape(e,document.getElementById(controlsId)))return;setControlsOpen(false);menuRef.current?.focus()}};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[floating,controlsOpen]);
 useEffect(()=>{if(!detailsFloating||!detailsOpen)return;const close=(event:KeyboardEvent)=>{if(event.key!=='Escape'||!bodyRef.current?.getClientRects().length||!claimFloatingEscape(event,document.getElementById(detailsId)))return;setDetailsOpen(false);detailRef.current?.focus()};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[detailsFloating,detailsOpen,detailsId]);
 const queryTrigger=useRef<HTMLElement|null>(null),modeRef=useRef<boolean|null>(null);
 useLayoutEffect(()=>{const app=bodyRef.current?.closest('.app');if(!app)return;const sync=()=>{const next=app.classList.contains('mode-presentation');if(modeRef.current!==next){modeRef.current=next;setControlsOpen(!next);if(!next)setFloatingFront('controls')}};sync();const observer=new MutationObserver(sync);observer.observe(app,{attributes:true,attributeFilter:['class']});return()=>observer.disconnect()},[]);
 useEffect(()=>{const open=(event:Event)=>{const id=(event as CustomEvent<{id:string}>).detail?.id,target=id?document.getElementById(id):null,panel=document.getElementById(controlsId);if(!target||!panel?.contains(target)||bodyRef.current?.closest('[hidden]'))return;queryTrigger.current=document.activeElement as HTMLElement;setControlsOpen(true);setFloatingFront('controls');revealFloating('controls');requestAnimationFrame(()=>requestAnimationFrame(()=>{const control=document.getElementById(id);if(!control)return;for(let parent=control.parentElement;parent&&parent!==panel;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true;control.scrollIntoView({block:'nearest',inline:'nearest'});control.focus({preventScroll:true})}))};window.addEventListener('query-control-open',open);return()=>window.removeEventListener('query-control-open',open)},[controlsId]);
 const closeControls=()=>{setControlsOpen(false);const target=queryTrigger.current?.isConnected&&queryTrigger.current.getClientRects().length?queryTrigger.current:menuRef.current;target?.focus()};
 const reset=()=>{setLeftWidth(280);setRightWidth(320);setControlsDock('left');setDetailsDock('right');setDragPositions({});geometry.reset();detailGeometry.reset()};
 const docked=(panel:Panel)=>(panel==='controls'?controlsOpen:detailsOpen)&&!effectiveFloat[panel];
 const onLeft:Panel|undefined=docked('controls')&&controlsDock==='left'?'controls':docked('details')&&detailsDock==='left'?'details':undefined;
 const onRight:Panel|undefined=docked('details')&&detailsDock==='right'?'details':docked('controls')&&controlsDock==='right'?'controls':undefined;
 const resize=(panel:Panel,value:number)=>{const other=panel==='controls'?'details':'controls',otherWidth=docked(other)?widths[other]:0,min=panel==='controls'?220:260,max=Math.max(min,Math.min(panel==='controls'?360:520,bodyWidth-otherWidth-540));const next=Math.max(min,Math.min(max,Math.round(value)));if(panel==='controls')setLeftWidth(next);else setRightWidth(next)};
 const split=(panel:Panel,side:'left'|'right')=><div key={`split-${panel}`} className="mapWorkspaceSplit" role="separator" aria-label={panel==='controls'?'상권 조회 옵션 너비 조절':'상권 지도와 보조정보 크기 조절'} aria-orientation="vertical" aria-valuemin={panel==='controls'?220:260} aria-valuemax={Math.max(panel==='controls'?220:260,Math.min(panel==='controls'?360:520,bodyWidth-540-(docked(panel==='controls'?'details':'controls')?widths[panel==='controls'?'details':'controls']:0)))} aria-valuenow={widths[panel]} tabIndex={0} style={{left:side==='left'?widths[panel]-5:bodyWidth-widths[panel]-5}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const delta=e.key==='ArrowRight'?10:-10;resize(panel,widths[panel]+(side==='left'?delta:-delta))}}} onPointerDown={e=>{splitDrag.current=panel;e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(splitDrag.current!==panel)return;const r=bodyRef.current!.getBoundingClientRect();resize(panel,side==='left'?e.clientX-r.left:r.right-e.clientX)}} onPointerUp={()=>{splitDrag.current=null}} onLostPointerCapture={()=>{splitDrag.current=null}}/>;
 const columns=`${onLeft?widths[onLeft]+'px':'0px'} minmax(0,1fr) ${onRight?widths[onRight]+'px':'0px'}`;
 const surface=(panel:Panel):CSSProperties=>({...panelStyle(panel),'--market-window-alpha':(effectiveFloat[panel]?(panel==='controls'?controlsOpacity:detailsOpacity):100)/100} as CSSProperties);
 const panelHeader=(panel:Panel)=>{const isFloat=effectiveFloat[panel],g=panel==='controls'?geometry:detailGeometry;return <div className="mapWorkspacePanelHeader marketDockHeader" tabIndex={0} aria-label={panel==='controls'?'상권 조회 옵션 위치 이동':'지역 상세 위치 이동'} title="제목을 끌어 이동 · 화면 좌우 끝에 놓으면 고정" onPointerDown={startMove(panel)} onPointerMove={movePanel} onPointerUp={stopMove} onLostPointerCapture={()=>{if(dragRef.current)cancelMove()}} onPointerCancel={cancelMove} onKeyDown={isFloat?moveWithKeys(panel):undefined}><h2>{panel==='controls'?'조회 옵션':'지역 상세'}</h2><details className="marketWindowSettings"><summary aria-label={panel==='controls'?'상권 조회 옵션 창 설정':'지역 상세 창 설정'}>창 설정</summary><div className="marketWindowSettingsBody"><div className="floatingPanelActions"><button aria-pressed={!isFloat&&docks[panel]==='left'} onClick={()=>dockPanel(panel,'left')}>왼쪽 고정</button><button aria-pressed={!isFloat&&docks[panel]==='right'} onClick={()=>dockPanel(panel,'right')}>오른쪽 고정</button><button aria-pressed={isFloat} onClick={()=>dockPanel(panel,'floating')}>띄우기</button><button onClick={()=>{g.reset();clearPosition(panel)}}>위치·크기 초기화</button></div>{isFloat&&<label className="marketWindowOpacity">배경 불투명도 <output>{panel==='controls'?controlsOpacity:detailsOpacity}%</output><input type="range" min="50" max="100" step="5" aria-label={panel==='controls'?'상권 조회 옵션 배경 불투명도':'상권 지역 상세 배경 불투명도'} value={panel==='controls'?controlsOpacity:detailsOpacity} onChange={e=>panel==='controls'?setControlsOpacity(Number(e.target.value)):setDetailsOpacity(Number(e.target.value))}/></label>}</div></details><button aria-label={panel==='controls'?'분석 조건 접기':'지역 상세 창 접기'} onClick={()=>{if(panel==='controls')closeControls();else{setDetailsOpen(false);detailRef.current?.focus()}}}>접기</button></div>};
 const controlsPanel=<FloatingQueryLayer key="controls" host={bodyRef} enabled={floating}><aside id={controlsId} hidden={!controlsVisible} className="mapWorkspaceControls" aria-label="자료와 분석 조건" style={surface('controls')}>{panelHeader('controls')}<div className="mapWorkspacePanelContent">{controls||<p className="mapWorkspaceEmpty">제공된 분석 조건이 없습니다.</p>}</div>{floating&&<div className="floatingPanelResize" role="button" tabIndex={0} aria-label="상권 조회 옵션 창 크기 조절" {...panelResize('controls')}/>}</aside></FloatingQueryLayer>;
 const detailsPanel=<FloatingQueryLayer key="details" host={bodyRef} enabled={detailsFloating}><aside id={detailsId} hidden={!detailsVisible} className="mapWorkspaceDetails" aria-label="선택 지역 상세와 후보 비교" style={surface('details')}>{panelHeader('details')}<div ref={detailsContentRef} className="mapWorkspacePanelContent">{details||<p className="mapWorkspaceEmpty">지도에서 지역을 선택하면 상세 내역과 비교할 후보를 확인할 수 있습니다.</p>}</div>{detailsFloating&&<div className="floatingPanelResize" role="button" tabIndex={0} aria-label="지역 상세 창 크기 조절" {...panelResize('details')}/>}</aside></FloatingQueryLayer>;
 return <section className={`mapWorkspace${controlsOpen&&!floating?'':' controlsCollapsed'}${detailsOpen?'':' detailsCollapsed'}`} data-controls-floating={floating} data-details-floating={detailsFloating} data-magnetic-workspace="true" aria-label={title} style={{'--workspace-left':leftWidth+'px','--workspace-right':rightWidth+'px',...(canvasHeight!==null?{'--workspace-canvas-height':canvasHeight+'px'}:{})} as CSSProperties}>
 <header className="mapWorkspaceHeader"><div className="mapWorkspaceHeaderLeft"><button ref={menuRef} className="mapWorkspaceMenu" aria-expanded={controlsVisible} aria-controls={controlsId} onClick={()=>{setControlsOpen(!controlsVisible);setFloatingFront('controls');revealFloating('controls')}}><span aria-hidden="true">☰</span> 메뉴 · 조건</button><h1>{title}</h1></div><div className="mapWorkspaceHeaderActions"><button onClick={reset}>배치 초기화</button><button ref={detailRef} className="workspaceDetailsToggle" aria-label={detailsVisible?'지역 상세 접기':'지역 상세 열기'} title={detailsVisible?'지역 상세 접기':'지역 상세 열기'} aria-expanded={detailsVisible} aria-controls={detailsId} onClick={()=>{setDetailsOpen(!detailsVisible);setFloatingFront('details');revealFloating('details')}}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M15 4v16" stroke="currentColor" strokeWidth="1.7"/><path d="M17 8h2v8h-2z" fill="currentColor" opacity={detailsVisible?1:.35}/></svg><span>지역 상세</span></button><button className="mapWorkspaceClose" onClick={onClose}>이전 화면으로 →</button></div></header>
 <div ref={bodyRef} className="mapWorkspaceBody" style={{gridTemplateColumns:columns}}>
 {onLeft==='controls'?controlsPanel:onLeft==='details'?detailsPanel:null}{onLeft&&split(onLeft,'left')}
 <div className="mapWorkspaceCenter" style={{gridColumn:2,gridRow:1}} aria-label="분석 지도와 시간 선택">{children||<div className="mapWorkspaceEmpty">지도를 불러오는 중입니다.</div>}</div>
 {onRight&&split(onRight,'right')}{onRight==='controls'?controlsPanel:onRight==='details'?detailsPanel:null}
 {!docked('controls')&&controlsPanel}{!docked('details')&&detailsPanel}
 {preview&&<div className={`marketDockPreview ${preview.side}`} style={{width:widths[preview.panel]}} role="status">{preview.side==='left'?'왼쪽':'오른쪽'}에 고정</div>}
 </div></section>
}
