import {useState} from 'react';
const keyLabel=(key:string)=>/^\d{5}$/.test(key)?`${key.slice(0,4)}년 ${key.slice(4)}분기`:/^\d{4}$/.test(key)?`${key}년`:/^\d{1,2}$/.test(key)?`${key}시`:key;
type Point={key:string;value:number|null};
const fmt=(v:number|null|undefined)=>v==null?'자료 없음':Math.round(v).toLocaleString('ko-KR');
export default function TimeComparison({points,currentKey,unit,label}:{points:Point[];currentKey:string;unit:string;label:string}){
 const [chosen,setChosen]=useState('');
 const index=points.findIndex(p=>p.key===currentKey);
 const fallback=points[Math.max(0,index-1)]?.key||'';
 const baselineKey=points.some(p=>p.key===chosen)?chosen:fallback;
 const a=points.find(p=>p.key===baselineKey)?.value??null,b=points.find(p=>p.key===currentKey)?.value??null;
 const delta=a==null||b==null?null:b-a;
 const rate=delta!=null&&a!=null&&a>0?delta/a*100:null;
 return <section className="panel timeComparison" aria-label="동일 지역 두 시점 비교"><div><h2>같은 지역, 두 시점 비교</h2><p>{label} · {unit} · 동일 자료와 선택 조건</p></div><label>비교 기준<select value={baselineKey} onChange={e=>setChosen(e.target.value)}>{points.map(p=><option key={p.key} value={p.key}>{keyLabel(p.key)}</option>)}</select></label><div><span>기준 시점 {keyLabel(baselineKey)}</span><strong>{fmt(a)} {a!=null&&<small>{unit}</small>}</strong></div><div><span>선택 시점 {keyLabel(currentKey)}</span><strong>{fmt(b)} {b!=null&&<small>{unit}</small>}</strong></div><div><span>선택 시점 − 기준 시점</span><strong className={delta!=null&&delta<0?'negative':'positive'}>{delta!=null&&delta>0?'+':''}{fmt(delta)} {delta!=null&&<small>{unit}</small>}</strong></div><p className="timeComparisonRate">{rate!=null?`기준 대비 ${rate>0?'+':''}${rate.toLocaleString('ko-KR',{maximumFractionDigits:1})}%`:a!=null&&a<=0?'기준값이 0 이하이므로 증감률 대신 값의 차이를 비교하세요.':'두 시점에 모두 값이 있어야 차이를 계산합니다.'}</p><p className="timeComparisonNote">관측값의 차이입니다. 고유 방문자 변화·광고 효과·구매전환율을 의미하지 않습니다. 행정구역이 바뀐 지역의 장기 비교는 주의하세요.</p></section>
}
