import {useEffect,useState} from 'react';
import {displayNumber,exactNumber} from './display-number';
import {mapRangePosition,resizeMapRange,validateMapRange} from './map-manual-range';
import './map-range-controls.css';
type Options={automaticLow:number;automaticHigh:number;symmetric?:boolean;resetKey?:string};
export function useMapRange(values:readonly(number|null|undefined)[],{automaticLow,automaticHigh,symmetric=false,resetKey=''}:Options){
 const [manual,setManual]=useState<{low:number;high:number}|null>(null),[minDraft,setMinDraft]=useState(''),[maxDraft,setMaxDraft]=useState(''),[error,setError]=useState('');
 const low=manual?.low??automaticLow,high=manual?.high??automaticHigh;
 const formatDraft=(v:number)=>String(v);
 useEffect(()=>{setManual(null);setError('');setMinDraft(formatDraft(automaticLow));setMaxDraft(formatDraft(automaticHigh))},[resetKey,symmetric]);
 useEffect(()=>{setMinDraft(formatDraft(low));setMaxDraft(formatDraft(high))},[low,high]);
 const reset=()=>{setManual(null);setError('');setMinDraft(formatDraft(automaticLow));setMaxDraft(formatDraft(automaticHigh))};
 const apply=(a:string|number=minDraft,b:string|number=maxDraft)=>{const problem=validateMapRange(a,b,symmetric);if(problem){setError(problem);return false}setManual({low:Number(a),high:Number(b)});setError('');return true};
 const changeMin=(text:string)=>{setMinDraft(text);if(symmetric&&text.trim()!==''&&Number.isFinite(Number(text)))setMaxDraft(String(Math.abs(Number(text))))};
 const changeMax=(text:string)=>{setMaxDraft(text);if(symmetric&&text.trim()!==''&&Number.isFinite(Number(text)))setMinDraft(String(-Math.abs(Number(text))))};
 const scale=(factor:number)=>{const next=resizeMapRange(low,high,factor,symmetric);apply(next.low,next.high)};
 const observed=values.filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));
 return {low,high,manual:!!manual,hasValues:!!observed.length,symmetric,minDraft,maxDraft,changeMin,changeMax,apply,reset,scale,error,below:observed.filter(v=>v<low).length,above:observed.filter(v=>v>high).length,position:(v:number|null|undefined)=>mapRangePosition(v,low,high)};
}
export type MapRange=ReturnType<typeof useMapRange>;
export function MapRangeControls({range,unit,label='색상 범위'}:{range:MapRange;unit:string;label?:string}){return <div className="mapManualRange"><details><summary>{label} <span>{range.manual?'직접 지정':'자동'}</span></summary><div className="mapManualRangeBody"><p>색의 차이만 조절합니다. {range.symmetric?'0 중심 대칭 범위이며 한쪽 입력을 바꾸면 반대쪽도 맞춥니다.':'현재 범위 중심에서 폭을 조절하며, 하한이 0에 닿으면 상단을 조정해 폭을 유지합니다. 값이 클수록 짙게 표시합니다.'}</p><div className="mapManualRangeInputs"><label>색상 최솟값<input type="number" step="any" value={range.minDraft} onChange={e=>range.changeMin(e.target.value)}/></label><label>색상 최댓값<input type="number" step="any" value={range.maxDraft} onChange={e=>range.changeMax(e.target.value)}/></label></div><div className="mapManualRangeActions"><button disabled={!range.hasValues} onClick={()=>range.apply()}>색상 범위 적용</button><button disabled={!range.hasValues} onClick={()=>range.scale(.8)}>범위 좁히기 −20%</button><button disabled={!range.hasValues} onClick={()=>range.scale(1.2)}>범위 넓히기 +20%</button><button onClick={range.reset}>직접 범위 초기화</button></div>{range.error&&<p role="alert">{range.error}</p>}</div></details><p className="mapManualRangeSummary" data-color-low={range.low} data-color-high={range.high} title={`${exactNumber(range.low,unit)}–${exactNumber(range.high,unit)}`}>{range.manual?'직접 범위':'자동 범위'} {displayNumber(range.low,unit)}–{displayNumber(range.high,unit)}{range.manual&&' · 원값 유지'}{(range.below>0||range.above>0)&&<span> · 하한 미만 {range.below}개·상한 초과 {range.above}개 관측값은 끝 색상으로 표시</span>}</p></div>}
