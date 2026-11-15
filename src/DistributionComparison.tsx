import DataMeaning from './DataMeaning';
import {meaningContent} from './data-meaning-content';
import {useEffect,useMemo,useState} from 'react';
import {geoMercator,geoPath} from 'd3-geo';
import {useMapRange,MapRangeControls} from './MapRangeControls';
import MapLegendTooltip from './MapLegendTooltip';
import MapPaletteSelector,{useMapPalette} from './MapPaletteSelector';
import {mapPaletteGradient} from './map-palettes';
import './distribution-comparison.css';
type Region={code:string;name:string;value:number|null};
type Props={geo:any;frames:{hour:number;regions:Region[]}[];currentHour:number;onSelectHour:(h:number)=>void;onSelectRegion:(code:string)=>void;context:string};
const fmt=(v:number|null)=>v==null?'자료 없음':Math.round(v).toLocaleString('ko-KR');
const bound=(v:number)=>Number(v.toFixed(6)).toLocaleString('ko-KR',{maximumFractionDigits:6});
export default function DistributionComparison({geo,frames,currentHour,onSelectHour,onSelectRegion,context}:Props){
 const {paletteId,palette,setPaletteId}=useMapPalette();const colors=palette.colors,blues=palette.positive,oranges=palette.negative;
 const [baseHour,setBaseHour]=useState(12),[mode,setMode]=useState<'side'|'delta'>('side');
 const [tip,setTip]=useState<{name:string;base:number|null;compare:number|null}|null>(null);
 useEffect(()=>setTip(null),[baseHour,currentHour,frames,mode]);
 const first=useMemo(()=>new Map((frames.find(f=>f.hour===baseHour)?.regions||[]).map(r=>[r.code,r])),[frames,baseHour]);
 const second=useMemo(()=>new Map((frames.find(f=>f.hour===currentHour)?.regions||[]).map(r=>[r.code,r])),[frames,currentHour]);
 const features=geo?.features||[];
 const value=(map:Map<string,Region>,code:string)=>{const v=map.get(code)?.value;return typeof v==='number'&&Number.isFinite(v)?v:null};
 const pairedValues:(number|null)[]=features.flatMap((f:any)=>{const code=String(f.properties.code);return [value(first,code),value(second,code)]});
 const deltaValues:(number|null)[]=features.map((f:any)=>{const code=String(f.properties.code),a=value(first,code),b=value(second,code);return a==null||b==null?null:b-a});
 const max=pairedValues.reduce<number>((m,v)=>Math.max(m,v??0),0);
 const deltaMax=deltaValues.reduce<number>((m,v)=>Math.max(m,Math.abs(v??0)),0);
 const hasObserved=pairedValues.some(v=>v!=null),hasDelta=deltaValues.some(v=>v!=null);
 const scopeKey=features.map((f:any)=>String(f.properties.code)).join('|');
 const sideRange=useMapRange(pairedValues,{automaticLow:0,automaticHigh:max||1,symmetric:false,resetKey:scopeKey});
 const deltaRange=useMapRange(deltaValues,{automaticLow:-(deltaMax||1),automaticHigh:deltaMax||1,symmetric:true,resetKey:scopeKey});
 const range=mode==='side'?sideRange:deltaRange;
 const path=useMemo(()=>{if(!geo?.features?.length)return null;const projection=geoMercator().fitExtent([[12,12],[468,368]],geo);return geoPath(projection)},[geo]);
 const bin=(position:number)=>Math.min(4,Math.max(0,Math.ceil(position*5)-1));
 const shade=(v:number|null,delta=false)=>{
  if(v==null)return '#d9dedc';
  if(delta)return v===0?palette.stepNeutral:(v>0?blues:oranges)[bin(Math.abs(v)/deltaRange.high)];
  return colors[bin(sideRange.position(v)??0)];
 };
 const showTip=(f:any)=>{const code=String(f.properties.code);setTip({name:f.properties.name||first.get(code)?.name||code,base:value(first,code),compare:value(second,code)})};
 const map=(which:'base'|'compare'|'delta')=><svg className="distributionSvg" data-color-low={which==='delta'?deltaRange.low:sideRange.low} data-color-high={which==='delta'?deltaRange.high:sideRange.high} viewBox="0 0 480 380" role="group" aria-label={which==='delta'?'비교 시점에서 기준 시점을 뺀 인구 증감 지도':`${which==='base'?baseHour:currentHour}시 인구 분포 지도`} onMouseLeave={()=>setTip(null)}>{features.map((f:any)=>{const code=String(f.properties.code),a=value(first,code),b=value(second,code),v=which==='base'?a:which==='compare'?b:a==null||b==null?null:b-a;return <path key={code} d={path?.(f)||''} fill={shade(v,which==='delta')} tabIndex={0} role="button" aria-label={`${f.properties.name}, ${which==='delta'?'증감 ':''}${fmt(v)}명. 지역 상세 보기`} onMouseEnter={()=>showTip(f)} onFocus={()=>showTip(f)} onBlur={()=>setTip(null)} aria-disabled={!first.has(code)&&!second.has(code)} onClick={()=>{if(first.has(code)||second.has(code))onSelectRegion(code)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(first.has(code)||second.has(code))onSelectRegion(code)}}}><title>{f.properties.name}: {fmt(v)}명 · 선택하면 지역 상세</title></path>})}</svg>;
 const entries=mode==='side'?colors.map((color,i)=>{const lo=sideRange.low+(sideRange.high-sideRange.low)*i/5,hi=sideRange.low+(sideRange.high-sideRange.low)*(i+1)/5;return {color,label:`${bound(lo)} ${i===0?'이상':'초과'}–${bound(hi)} 이하 명`}}):[
  ...oranges.map((color,i)=>({color,label:`감소 · −${bound(deltaRange.high*(i+1)/5)} 이상–${i===0?'0':'−'+bound(deltaRange.high*i/5)} 미만 명`})).reverse(),
  {color:palette.stepNeutral,label:'변화 없음 · 0명'},
  ...blues.map((color,i)=>({color,label:`증가 · ${bound(deltaRange.high*i/5)} 초과–${bound(deltaRange.high*(i+1)/5)} 이하 명`}))
 ];
 entries.push({color:'#d9dedc',label:'자료 없음 · 0과 다름'});
 const legendNote=`${mode==='side'?'두 지도의 공통 색상 범위입니다. 같은 색은 같은 값 구간을 뜻합니다.':`비교 시점 − 기준 시점입니다. ${palette.signLabel}이며 0 중심 대칭 범위를 사용합니다.`} 범위 밖 값은 끝 색으로 표시하며 원자료 값은 바꾸지 않습니다.${!(mode==='side'?hasObserved:hasDelta)?' 현재 관측 자료가 없습니다.':''}`;
 return <section className="panel distributionComparison"><div className="panelTitle"><div><h2>어디에 머무는 인구가 늘고 줄었는가</h2><DataMeaning {...(mode==='side'?meaningContent.distributionSnapshot:{...meaningContent.distributionDelta,interpretation:`${palette.signLabel}으로 구분하며 0을 중심으로 두 시점의 차이를 읽습니다.`})}/><p className="distributionContext">{context}</p></div></div><div className="distributionControls"><div className="distributionTabs" role="group" aria-label="분포 비교 방식"><button className={mode==='side'?'active':''} aria-pressed={mode==='side'} onClick={()=>setMode('side')}>두 시점 나란히</button><button className={mode==='delta'?'active':''} aria-pressed={mode==='delta'} onClick={()=>setMode('delta')}>증감 지도</button></div><label>기준 시간<select value={baseHour} onChange={e=>setBaseHour(Number(e.target.value))}>{frames.map(f=><option key={f.hour} value={f.hour}>{String(f.hour).padStart(2,'0')}:00</option>)}</select></label><label>비교 시간<select value={currentHour} onChange={e=>onSelectHour(Number(e.target.value))}>{frames.map(f=><option key={f.hour} value={f.hour}>{String(f.hour).padStart(2,'0')}:00</option>)}</select></label></div><MapRangeControls range={range} unit="명" label="색상·표시 설정" paletteControl={<MapPaletteSelector value={paletteId} onChange={setPaletteId} diverging={mode==='delta'} stepped/>}/>{!features.length?<p className="empty">지역 경계를 불러오면 분포를 비교할 수 있습니다.</p>:<><div className={`distributionMaps ${mode==='delta'?'delta':''}`}>{mode==='side'?<><figure><figcaption>기준 · {String(baseHour).padStart(2,'0')}:00</figcaption>{map('base')}</figure><figure><figcaption>비교 · {String(currentHour).padStart(2,'0')}:00</figcaption>{map('compare')}</figure></>:<figure><figcaption>{String(currentHour).padStart(2,'0')}:00 − {String(baseHour).padStart(2,'0')}:00 · 인구 증감</figcaption>{map('delta')}</figure>}{tip&&<div className="distributionTooltip" role="status"><b>{tip.name}</b><span>{baseHour}시 {fmt(tip.base)}명 → {currentHour}시 {fmt(tip.compare)}명</span><span>증감 {tip.base==null||tip.compare==null?'자료 없음':`${tip.compare-tip.base>0?'+':''}${fmt(tip.compare-tip.base)}명`}</span><small>지역을 선택하면 상세 자료로 이동합니다.</small></div>}</div><div className="distributionLegend distributionLegendCompact" aria-label="지도 색상 범례" data-low={range.low} data-high={range.high}><MapLegendTooltip title={mode==='side'?'두 지도 공통 색상 범례':'인구 증감 색상 범례'} entries={entries} note={legendNote} paletteId={paletteId} diverging={mode==='delta'} steppedPalette gradient={mapPaletteGradient(palette,mode==='delta',true)} summary={`${mode==='side'?'공통':'대칭'} · ${bound(range.low)}–${bound(range.high)} 명`}/></div></>}<p className="distributionNote">같은 날짜·성별·연령 조건에서 두 시점의 머무는 인구를 비교합니다. 일자 합산이나 고유 방문자 수가 아닙니다. 증감은 비교 시점 − 기준 시점이며, 어느 한쪽이 비공개·결측이면 계산하지 않습니다.</p></section>
}
