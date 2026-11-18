import React,{useMemo,useRef,useState} from 'react';
import {geoMercator,geoPath} from 'd3-geo';
import type {Boundary,Station} from './subway-data';
import {useSize} from './SubwayCharts';
import {fmt,quantileBreaks} from './subway-model';
import {LINE_COLORS,LINE_IDS,buildLineSegments} from './subway-lines';

export const RAMP=['#dbe7f3','#a9c4e0','#6f9bc9','#3a6fa8','#173e69'];
/** 선택하지 않은 노선의 선·점 불투명도. 0.15~0.25 범위에서 점의 이용량 색이 겨우 읽히는 0.2를 골랐다. */
export const DIM_OPACITY=0.2;
/** 기본 상태 선: 가늘고 약간 흐리게(점의 이용량 색을 가리지 않도록). 선택 노선은 굵고 불투명. */
export const LINE_BASE={width:2.2,opacity:.6},LINE_ACTIVE={width:6,opacity:1};

export type MapPoint={station:Station;value:number|null};
type Props={boundary:Boundary|null;points:MapPoint[];selected:string;onSelect:(id:string)=>void;unitLabel:string;candidates:string[];activeLine:'all'|number;onSelectLine:(line:'all'|number)=>void};

export default function SubwayMap({boundary,points,selected,onSelect,unitLabel,candidates,activeLine,onSelectLine}:Props){
  const {ref,w,h}=useSize<HTMLDivElement>();
  const [view,setView]=useState({k:1,cx:0,cy:0});
  const drag=useRef<{x:number;y:number;cx:number;cy:number;moved:boolean}|null>(null);
  const [hover,setHover]=useState<MapPoint|null>(null);
  const [legend,setLegend]=useState(false);
  const [preview,setPreview]=useState<number|null>(null);
  const shownLine:'all'|number=preview??activeLine;     // 범례에 올리면 그 노선을 미리 강조
  const isDim=(line:number)=>shownLine!=='all'&&line!==shownLine;
  const build=useMemo(()=>buildLineSegments(points.map(p=>p.station)),[points.length]);
  const proj=useMemo(()=>boundary&&w>0&&h>0?geoMercator().fitExtent([[24,24],[w-24,h-24]],{type:'FeatureCollection',features:boundary.features} as never):null,[boundary,w,h]);
  const path=useMemo(()=>proj?geoPath(proj):null,[proj]);
  const scalePoints=activeLine==='all'?points:points.filter(p=>p.station.line===activeLine);
  const vals=scalePoints.map(p=>p.value).filter((v):v is number=>v!=null);
  const max=Math.max(1,...vals),breaks=useMemo(()=>quantileBreaks(vals,5),[vals.join(',')]);
  const colorOf=(v:number|null)=>{if(v==null)return '#b8c2cd';let c=0;for(let i=1;i<5;i++)if(v>=breaks[i])c=i;return RAMP[c]};
  // 노선을 고른 상태에서는 점 크기 상한을 낮춰(11.5→8) 선이 점 사이로 보이게 한다.
  const radius=(v:number|null)=>v==null?4:activeLine==='all'?3.5+8*Math.sqrt(v/max):3+5*Math.sqrt(v/max);
  const sx=(x:number)=>(x-view.cx)*view.k+w/2+0,sy=(y:number)=>(y-view.cy)*view.k+h/2;
  const cx0=w/2,cy0=h/2;
  const reset=()=>setView({k:1,cx:cx0,cy:cy0});
  const cur={k:view.k,cx:view.cx||cx0,cy:view.cy||cy0};
  const zoom=(f:number)=>setView(v=>({k:Math.min(8,Math.max(1,(v.k||1)*f)),cx:v.cx||cx0,cy:v.cy||cy0}));
  const placed=points.flatMap(p=>{const xy=proj?proj([p.station.lng,p.station.lat]):null;return xy?[{...p,x:xy[0],y:xy[1]}]:[]});
  const sel=placed.find(p=>p.station.id===selected);
  const outside=points.length-placed.filter(p=>p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h).length;
  const labelBox=(sel:{x:number;y:number;station:Station})=>({x:Math.min(w-110,Math.max(4,sx2(sel.x)+10)),y:Math.max(16,sy2(sel.y)-10)});
  const sx2=(x:number)=>(x-cur.cx)*cur.k+w/2,sy2=(y:number)=>(y-cur.cy)*cur.k+h/2;
  return <div className="swMapWrap">
    <div className="swMapTools">
      <LineChips activeLine={activeLine} shownLine={shownLine} onSelectLine={onSelectLine} setPreview={setPreview}/>
      <button type="button" className="swBtn" onClick={()=>setLegend(v=>!v)} aria-expanded={legend} aria-controls="sw-legend-pop">범례</button>
      <span className="swZoomGroup" role="group" aria-label="지도 확대·축소">
        <button type="button" className="swBtn swIconBtn" aria-label="축소" onClick={()=>zoom(1/1.5)} disabled={cur.k<=1}>−</button>
        <span className="swZoomValue" aria-live="polite">{Math.round(cur.k*100)}%</span>
        <button type="button" className="swBtn swIconBtn" aria-label="확대" onClick={()=>zoom(1.5)} disabled={cur.k>=8}>+</button>
        <button type="button" className="swBtn" onClick={reset}>원래 범위</button>
      </span>
    </div>
    <LegendBarAndPopover open={legend} onClose={()=>setLegend(false)} breaks={breaks} unitLabel={unitLabel}/>
    <div ref={ref} className="swMapBox"
      onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,cx:cur.cx,cy:cur.cy,moved:false}}}
      onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>4)d.moved=true;if(d.moved)setView({k:cur.k,cx:d.cx-dx/cur.k,cy:d.cy-dy/cur.k})}}
      onPointerUp={()=>{setTimeout(()=>{drag.current=null},0)}}>
      {w>0&&h>0&&path&&boundary&&<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="group" aria-label="서울 지하철역 지도">
        <g transform={`translate(${w/2-cur.cx*cur.k},${h/2-cur.cy*cur.k}) scale(${cur.k})`}>
          {boundary.features.map(f=><path key={f.properties.code} d={path(f as never)||''} className="swGu"/>)}
        </g>
        <g className="swLines" pointerEvents="none" data-active-line={String(shownLine)}>{[...build.polylines].sort((a,b)=>Number(a.line===shownLine)-Number(b.line===shownLine)).map((pl,i)=>{
          const pts=pl.ids.map(id=>placed.find(q=>q.station.id===id)).filter(Boolean) as {x:number;y:number}[];
          if(pts.length<2)return null;const hot=pl.line===shownLine,st=hot?LINE_ACTIVE:LINE_BASE;
          return <path key={pl.line+pl.route+i} data-line={pl.line} d={pts.map((q,k)=>`${k?'L':'M'}${sx2(q.x).toFixed(1)},${sy2(q.y).toFixed(1)}`).join('')} fill="none" stroke={LINE_COLORS[pl.line]} strokeWidth={st.width} strokeLinecap="round" strokeLinejoin="round" opacity={isDim(pl.line)?DIM_OPACITY:st.opacity}/>})}</g>
        {placed.map(p=>{const s=p.station,isSel=s.id===selected,x=sx2(p.x),y=sy2(p.y);
          if(x<-10||y<-10||x>w+10||y>h+10)return null;
          return <g key={s.id} className="swDot" data-dim={isDim(s.line)?'true':undefined} opacity={isDim(s.line)&&!isSel?DIM_OPACITY:1} onClick={()=>{if(!drag.current?.moved)onSelect(s.id)}} onMouseEnter={()=>setHover(p)} onMouseLeave={()=>setHover(null)}>
            <circle cx={x} cy={y} r={radius(p.value)} fill={colorOf(p.value)} stroke={isSel?'#152b43':shownLine!=='all'&&s.line===shownLine?LINE_COLORS[s.line]:'#fff'} strokeWidth={isSel?3:shownLine!=='all'&&s.line===shownLine?2:1}/>
            {candidates.includes(s.id)&&<circle cx={x} cy={y} r={radius(p.value)+4} fill="none" stroke="#b4530a" strokeWidth={2}/>}
          </g>})}
        {sel&&(()=>{const b=labelBox(sel);return <g pointerEvents="none"><rect x={b.x-4} y={b.y-16} width={Math.max(60,sel.station.name.length*15+34)} height={24} fill="#fff" stroke="#152b43" rx={3}/><text x={b.x} y={b.y} className="swMapLabel">{sel.station.name} {sel.station.line}호선</text></g>})()}
      </svg>}
      {hover&&<div className="swTip" role="status">{hover.station.name} · {hover.station.line}호선 · {fmt(hover.value)}</div>}
      {!boundary&&<div className="swEmpty">지도 경계를 불러오는 중입니다</div>}
    </div>
    <p className="swMapNote">{outside>0?`지도 화면 밖의 ${outside}개 역은 그리지 않습니다. 역 검색·순위에서 선택할 수 있습니다. `:''}서울 밖 역은 경계 없이 점만 보입니다. 점은 호선별 역 행이며 환승역은 호선마다 점이 따로 있습니다. 노선 색 선은 실제 선로가 아니라 인접한 역을 이은 직선입니다.</p>
  </div>;
}

/** 노선 색 범례 칩(1~8호선): 호버·초점은 미리 강조, 클릭은 호선 선택(다시 누르면 전체). 지도와 노선도가 함께 쓴다. */
export function LineChips({activeLine,shownLine,onSelectLine,setPreview}:{activeLine:'all'|number;shownLine:'all'|number;onSelectLine:(l:'all'|number)=>void;setPreview:(l:number|null)=>void}){
  return <div className="swLineLegend" role="group" aria-label="노선 색 범례. 누르면 그 호선만 강조하고 다시 누르면 전체로 돌아갑니다">
    {LINE_IDS.map(n=><button type="button" key={n} className="swLineChip" aria-pressed={activeLine===n} data-line={n} onMouseEnter={()=>setPreview(n)} onMouseLeave={()=>setPreview(null)} onFocus={()=>setPreview(n)} onBlur={()=>setPreview(null)} onClick={()=>onSelectLine(activeLine===n?'all':n)}><i style={{background:LINE_COLORS[n],opacity:shownLine!=='all'&&n!==shownLine?DIM_OPACITY:1}} aria-hidden="true"/>{n}호선</button>)}
  </div>;
}
/** 이용량 색 막대와 범례 팝오버(지도·노선도 공통). 버튼은 호출하는 쪽 도구줄에 둔다. */
export function LegendBarAndPopover({open,onClose,breaks,unitLabel}:{open:boolean;onClose:()=>void;breaks:number[];unitLabel:string}){
  return <>
    <div className="swLegendBar" aria-hidden="true">{RAMP.map(c=><i key={c} style={{background:c}}/>)}<i style={{background:'#b8c2cd'}}/></div>
    {open&&<div id="sw-legend-pop" className="swPopover swLegendPop" role="dialog" aria-label="지도 범례" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}}}>
      <b>{unitLabel}</b>
      <ul>{RAMP.map((c,i)=><li key={c}><i style={{background:c}}/>{fmt(breaks[i])} ~ {fmt(breaks[i+1])}</li>)}<li><i style={{background:'#b8c2cd'}}/>자료 없음(결측, 0이 아님)</li></ul>
      <p>점 크기와 색은 같은 값을 따릅니다. 5개 구간은 값의 분위수입니다. 값이 없는 역은 회색이며 0으로 칠하지 않습니다.</p>
      <button type="button" className="swBtn" onClick={onClose}>닫기</button>
    </div>}
  </>;
}
