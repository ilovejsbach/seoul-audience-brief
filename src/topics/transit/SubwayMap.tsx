import React,{useMemo,useRef,useState} from 'react';
import {geoMercator,geoPath} from 'd3-geo';
import type {Boundary,Station} from './subway-data';
import {useSize} from './SubwayCharts';
import {fmt,quantileBreaks} from './subway-model';

export const RAMP=['#dbe7f3','#a9c4e0','#6f9bc9','#3a6fa8','#173e69'];
export const LINE_COLORS:Record<number,string>={1:'#0d3692',2:'#2e8b3a',3:'#a85d00',4:'#1b6ea6',5:'#7d3da0',6:'#8a4a1f',7:'#4a5a10',8:'#b02a6b'};

export type MapPoint={station:Station;value:number|null};
type Props={boundary:Boundary|null;points:MapPoint[];selected:string;onSelect:(id:string)=>void;unitLabel:string;candidates:string[]};

export default function SubwayMap({boundary,points,selected,onSelect,unitLabel,candidates}:Props){
  const {ref,w,h}=useSize<HTMLDivElement>();
  const [view,setView]=useState({k:1,cx:0,cy:0});
  const drag=useRef<{x:number;y:number;cx:number;cy:number;moved:boolean}|null>(null);
  const [hover,setHover]=useState<MapPoint|null>(null);
  const [legend,setLegend]=useState(false);
  const proj=useMemo(()=>boundary&&w>0&&h>0?geoMercator().fitExtent([[24,24],[w-24,h-24]],{type:'FeatureCollection',features:boundary.features} as never):null,[boundary,w,h]);
  const path=useMemo(()=>proj?geoPath(proj):null,[proj]);
  const vals=points.map(p=>p.value).filter((v):v is number=>v!=null);
  const max=Math.max(1,...vals),breaks=useMemo(()=>quantileBreaks(vals,5),[vals.join(',')]);
  const colorOf=(v:number|null)=>{if(v==null)return '#b8c2cd';let c=0;for(let i=1;i<5;i++)if(v>=breaks[i])c=i;return RAMP[c]};
  const radius=(v:number|null)=>v==null?4:3.5+8*Math.sqrt(v/max);
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
      <button type="button" className="swBtn" onClick={()=>setLegend(v=>!v)} aria-expanded={legend} aria-controls="sw-legend-pop">범례</button>
      <span className="swZoomGroup" role="group" aria-label="지도 확대·축소">
        <button type="button" className="swBtn swIconBtn" aria-label="축소" onClick={()=>zoom(1/1.5)} disabled={cur.k<=1}>−</button>
        <span className="swZoomValue" aria-live="polite">{Math.round(cur.k*100)}%</span>
        <button type="button" className="swBtn swIconBtn" aria-label="확대" onClick={()=>zoom(1.5)} disabled={cur.k>=8}>+</button>
        <button type="button" className="swBtn" onClick={reset}>원래 범위</button>
      </span>
    </div>
    <div className="swLegendBar" aria-hidden="true">{RAMP.map(c=><i key={c} style={{background:c}}/>)}<i style={{background:'#b8c2cd'}}/></div>
    {legend&&<div id="sw-legend-pop" className="swPopover swLegendPop" role="dialog" aria-label="지도 범례" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setLegend(false)}}}>
      <b>{unitLabel}</b>
      <ul>{RAMP.map((c,i)=><li key={c}><i style={{background:c}}/>{fmt(breaks[i])} ~ {fmt(breaks[i+1])}</li>)}<li><i style={{background:'#b8c2cd'}}/>자료 없음(결측, 0이 아님)</li></ul>
      <p>점 크기와 색은 같은 값을 따릅니다. 5개 구간은 값의 분위수입니다. 값이 없는 역은 회색이며 0으로 칠하지 않습니다.</p>
      <button type="button" className="swBtn" onClick={()=>setLegend(false)}>닫기</button>
    </div>}
    <div ref={ref} className="swMapBox"
      onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,cx:cur.cx,cy:cur.cy,moved:false}}}
      onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>4)d.moved=true;if(d.moved)setView({k:cur.k,cx:d.cx-dx/cur.k,cy:d.cy-dy/cur.k})}}
      onPointerUp={()=>{setTimeout(()=>{drag.current=null},0)}}>
      {w>0&&h>0&&path&&boundary&&<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="group" aria-label="서울 지하철역 지도">
        <g transform={`translate(${w/2-cur.cx*cur.k},${h/2-cur.cy*cur.k}) scale(${cur.k})`}>
          {boundary.features.map(f=><path key={f.properties.code} d={path(f as never)||''} className="swGu"/>)}
        </g>
        {placed.map(p=>{const s=p.station,isSel=s.id===selected,x=sx2(p.x),y=sy2(p.y);
          if(x<-10||y<-10||x>w+10||y>h+10)return null;
          return <g key={s.id} className="swDot" onClick={()=>{if(!drag.current?.moved)onSelect(s.id)}} onMouseEnter={()=>setHover(p)} onMouseLeave={()=>setHover(null)}>
            <circle cx={x} cy={y} r={radius(p.value)} fill={colorOf(p.value)} stroke={isSel?'#152b43':'#fff'} strokeWidth={isSel?3:1}/>
            {candidates.includes(s.id)&&<circle cx={x} cy={y} r={radius(p.value)+4} fill="none" stroke="#b4530a" strokeWidth={2}/>}
          </g>})}
        {sel&&(()=>{const b=labelBox(sel);return <g pointerEvents="none"><rect x={b.x-4} y={b.y-16} width={Math.max(60,sel.station.name.length*15+34)} height={24} fill="#fff" stroke="#152b43" rx={3}/><text x={b.x} y={b.y} className="swMapLabel">{sel.station.name} {sel.station.line}호선</text></g>})()}
      </svg>}
      {hover&&<div className="swTip" role="status">{hover.station.name} · {hover.station.line}호선 · {fmt(hover.value)}</div>}
      {!boundary&&<div className="swEmpty">지도 경계를 불러오는 중입니다</div>}
    </div>
    <p className="swMapNote">{outside>0?`지도 화면 밖의 ${outside}개 역은 그리지 않습니다. 역 검색·순위에서 선택할 수 있습니다. `:''}서울 밖 역은 경계 없이 점만 보입니다. 점은 호선별 역 행이며 환승역은 호선마다 점이 따로 있습니다.</p>
  </div>;
}
