import {useState} from 'react';
type Point={key:string;value:number|null};
const fmt=(v:number|null|undefined)=>v==null?'자료 없음':Math.round(v).toLocaleString('ko-KR');
export default function TimeComparison({points,currentKey,unit,label}:{points:Point[];currentKey:string;unit:string;label:string}){
 const [chosen,setChosen]=useState('');
 const index=points.findIndex(p=>p.key===currentKey);
 const fallback=points[Math.max(0,index-1)]?.key||'';
 const baselineKey=points.some(p=>p.key===chosen)?chosen:fallback;
 const a=points.find(p=>p.key===baselineKey)?.value??null,b=points.find(p=>p.key===currentKey)?.value??null;
 const delta=a==null||b==null?null:b-a;
 return <section className="panel timeComparison" aria-label="동일 지역 두 시점 비교"><div><span className="eyebrow">TIME COMPARISON</span><h2>같은 지역, 두 시점 비교</h2><p>{label} · {unit} · 동일 자료와 선택 조건</p></div><label>비교 기준<select value={baselineKey} onChange={e=>setChosen(e.target.value)}>{points.map(p=><option key={p.key} value={p.key}>{p.key}</option>)}</select></label><div><span>기준 시점 {baselineKey}</span><strong>{fmt(a)} <small>{unit}</small></strong></div><div><span>선택 시점 {currentKey}</span><strong>{fmt(b)} <small>{unit}</small></strong></div><div><span>선택 − 기준</span><strong className={delta!=null&&delta<0?'negative':'positive'}>{delta!=null&&delta>0?'+':''}{fmt(delta)} <small>{unit}</small></strong></div><p className="timeComparisonNote">관측값의 차이입니다. 고유 방문자 변화·광고 효과·구매전환율을 의미하지 않습니다. 행정구역이 바뀐 지역의 장기 비교는 주의하세요.</p></section>
}
