import React,{useEffect,useMemo,useState} from 'react';
import ExactValue from '../../ExactValue';
import {subwayData,type DailyFile,type Monthly,type Station} from './subway-data';
import {useLoad} from './use-load';
import {BarChart,LineChart} from './SubwayCharts';
import {compareTitle,comparePeriods,dailySeries,listPeriods,monthsText,periodValue,type Basis,type DayType,type Kind,type PeriodDef,type PeriodUnit} from './subway-model';

/** 역별 상세(w47): 선택 역 추이, 두 기간 비교, 연도별 같은 시기, 후보 역 비교. 기준은 하루 평균(관측일만으로 계산)이며 합계는 선택한다. */
type Csv={name:string;rows:(string|number|null)[][]}|null;
type DP={sel?:Station;monthly:Monthly|null;kind:Kind;day:DayType;from:string;to:string;setCsv:(c:Csv)=>void;mode:'analysis'|'presentation'};
const KIND:Record<Kind,string>={b:'승차',a:'하차',ab:'승차+하차'};
const DAY:Record<DayType,string>={all:'전체 요일',wd:'평일',we:'주말'};
const COLORS=['#24558b','#b4530a','#2e8b3a'];
const BASIS:[Basis,string][]=[['avg','하루 평균'],['total','합계']];
function Seg<T extends string>({value,onChange,options,label}:{value:T;onChange:(v:T)=>void;options:[T,string][];label:string}){
  return <span className="swSeg" role="group" aria-label={label}>{options.map(([v,t])=><button type="button" key={v} className="swSegBtn" aria-pressed={value===v} onClick={()=>onChange(v)}>{t}</button>)}</span>;
}
const Num=({v,prefix=''}:{v:number|null;prefix?:string})=><ExactValue value={v} unit="건" prefix={prefix}/>;
const unitLabel=(basis:Basis)=>basis==='avg'?'건 / 하루 평균':'건 / 기간 합계';
const NeedStation=()=><div className="swPlaceholder"><p className="swStrong">역을 먼저 고르세요</p><p>지도의 점, 오른쪽 순위, 위 ‘역’ 검색 어느 쪽이든 같은 선택으로 이어집니다.</p></div>;
const Notes=({sel,basis}:{sel?:Station;basis:Basis})=><p className="swMeta">{basis==='avg'?'하루 평균은 관측일 수로 나눕니다(결측일은 빼고 관측일 수를 함께 표시).':'합계는 값이 없는 날이 하나라도 있으면 자료 없음이며, 일부 기간의 합계는 다른 기간과 비교하지 않습니다.'} 승하차는 카드 태그 건수이며 고유 방문자 수가 아닙니다. {sel?`${sel.line}호선 ${sel.name} 행만 집계하며 환승역이라도 다른 호선·다른 노선 구간은 미포함입니다(역 단위 합계는 오른쪽 패널의 호선 합).`:''}</p>;
const shortLabel=(p:PeriodDef)=>p.unit==='month'?`${p.key.slice(2,4)}.${p.key.slice(4)}`:p.unit==='season'?`${String(p.year).slice(2)} ${p.season}${p.complete?'':'*'}`:p.label;
const daysText=(d:number)=>`${d.toLocaleString('ko-KR')}일`;
const Head=({title,children}:{title:string;children?:React.ReactNode})=><div className="swPanelRow"><h2 className="swPanelTitle">{title}</h2><div className="swDetailTools">{children}</div></div>;
const ctx=(kind:Kind,day:DayType)=>`${KIND[kind]} · ${DAY[day]}`;
const r2=(v:number|null)=>v==null?null:Math.round(v*100)/100;

/* ---------- 1. 선택 역 추이 ---------- */
export function StationTrend({sel,monthly,kind,day,from,to,setCsv,mode}:DP){
  const [unit,setUnit]=useState<'day'|PeriodUnit>('month'),[basis,setBasis]=useState<Basis>('avg');
  const rec=monthly&&sel?monthly.stations[sel.id]:undefined;
  const dailyL=useLoad<DailyFile>(sel&&unit==='day'?()=>subwayData.daily(sel.line):null,[sel?.line,unit]);
  const daily=useMemo(()=>{const f=sel&&dailyL.data?.stations[sel.id];return f&&dailyL.data?dailySeries(dailyL.data.dates,f.b,f.a,kind,day,from,to,366):null},[dailyL.data,sel?.id,kind,day,from,to]);
  const rows=useMemo(()=>{
    if(!monthly||unit==='day')return [] as {label:string;short:string;value:number|null;days:number;complete:boolean}[];
    let ps=listPeriods(monthly.months,unit);
    if(unit==='month')ps=ps.filter(p=>p.key>=from&&p.key<=to);
    return ps.map(p=>{const v=periodValue(rec,p.idx,kind,day,basis);return {label:p.label,short:shortLabel(p),value:v.value,days:v.days,complete:p.complete}});
  },[monthly,rec,unit,kind,day,basis,from,to]);
  useEffect(()=>{
    if(!sel){setCsv(null);return}
    if(unit==='day'&&daily)setCsv({name:`${sel.name}-일별추이`,rows:[['날짜','값'],...daily.rows.map(r=>[r.date,r.value])]});
    else if(unit!=='day'&&rows.length)setCsv({name:`${sel.name}-${unit}별추이`,rows:[['기간','값','관측일','완전한 기간','기준'],...rows.map(r=>[r.label,r2(r.value),r.days,r.complete?'예':'아니오',basis==='avg'?'하루 평균':'합계'])]});
    else setCsv(null);
  },[sel?.id,unit,daily,rows,basis]);// eslint-disable-line
  if(!sel)return <NeedStation/>;
  const dayVals=daily?.rows.map(r=>r.value)||[];const known=dayVals.filter((v):v is number=>v!=null);
  return <div className="swDetailWrap">
    <div className="swChartPanel"><Head title={`${sel.name} ${sel.line}호선 · 선택 역 추이`}>
      <Seg label="단위" value={unit} onChange={setUnit} options={[['day','일'],['month','월'],['season','계절'],['year','연']]}/>
      {unit!=='day'&&<Seg label="기준" value={basis} onChange={setBasis} options={BASIS}/>}</Head>
      <p className="swMeta">{ctx(kind,day)} · 지표와 요일은 위 조회 조건을 따릅니다. {unit==='month'?'월 단위는 조회 기간만 보여 줍니다.':unit==='day'?`일 단위는 조회 기간 끝에서 최대 366일만 그립니다(더 긴 기간은 월 단위로). ${daily?.truncated?`지금은 ${daily.total.toLocaleString('ko-KR')}일 중 마지막 366일입니다.`:''}`:'계절·연 단위는 기간 조건과 무관하게 전체 관측월을 보여 줍니다. 계절은 봄 3–5, 여름 6–8, 가을 9–11, 겨울 12–2월(12월은 다음 해 겨울)이며 *는 일부 달, 2026은 1~10월뿐입니다.'}</p>
      {unit==='day'?(dailyL.loading?<div className="swEmpty" role="status">일별 자료를 불러오는 중입니다</div>:
        <LineChart ariaLabel="일별 추이" unit="건 / 하루" xLabels={(daily?.rows||[]).map(r=>`${r.date.slice(2,4)}.${r.date.slice(4,6)}.${r.date.slice(6)}`)} tickEvery={Math.max(1,Math.ceil((daily?.rows.length||1)/8))} series={[{label:KIND[kind],color:COLORS[0],values:dayVals}]}/>)
      :unit==='year'?<BarChart ariaLabel="연별 추이" unit={unitLabel(basis)} bars={rows.map(r=>({label:r.short,value:r.value,color:r.complete?COLORS[0]:COLORS[1]}))}/>
      :<LineChart ariaLabel={`${unit==='month'?'월별':'계절별'} 추이`} unit={unitLabel(basis)} xLabels={rows.map(r=>r.short)} tickEvery={Math.max(1,Math.ceil(rows.length/12))} series={[{label:KIND[kind],color:COLORS[0],values:rows.map(r=>r.value)}]}/>}
      {unit==='day'&&daily&&known.length>0&&<p className="swMeta">그림의 값(건/하루): 최대 <Num v={Math.max(...known)}/> · 최소 <Num v={Math.min(...known)}/> · 평균 <Num v={known.reduce((s,v)=>s+v,0)/known.length}/> · 값이 있는 날 {daysText(known.length)} / 표시한 {daysText(dayVals.length)}(없는 날은 선이 끊김)</p>}
      {unit!=='day'&&mode==='analysis'&&<table className="swTable"><thead><tr><th>기간</th><th>{basis==='avg'?'하루 평균':'합계'}(건)</th><th>관측일</th><th>비고</th></tr></thead><tbody>{rows.map(r=><tr key={r.label}><th>{r.label}</th><td><Num v={r.value}/></td><td>{daysText(r.days)}</td><td>{r.complete?'':'일부 기간'}</td></tr>)}</tbody></table>}
      <Notes sel={sel} basis={unit==='day'?'avg':basis}/></div>
  </div>;
}

/* ---------- 2. 두 기간 비교 ---------- */
function defaultPair(periods:PeriodDef[]){
  const b=periods.at(-1);if(!b)return {a:'',b:''};
  const prev=b.unit==='month'?periods.find(p=>p.key===`${b.year-1}${b.key.slice(4)}`):b.unit==='season'?periods.find(p=>p.season===b.season&&p.year===b.year-1):periods.find(p=>p.year===b.year-1);
  return {a:(prev||periods.at(-2)||b).key,b:b.key};
}
export function PeriodCompare({sel,monthly,kind,day,setCsv,mode}:DP){
  const [unit,setUnit]=useState<PeriodUnit>('month'),[basis,setBasis]=useState<Basis>('avg');
  const periods=useMemo(()=>monthly?listPeriods(monthly.months,unit):[],[monthly,unit]);
  const [pair,setPair]=useState({a:'',b:''});
  useEffect(()=>{setPair(defaultPair(periods))},[periods]);
  const A=periods.find(p=>p.key===pair.a),B=periods.find(p=>p.key===pair.b);
  const rec=monthly&&sel?monthly.stations[sel.id]:undefined;
  const c=monthly&&A&&B?comparePeriods(rec,monthly.months,A,B,kind,day,basis):null;
  useEffect(()=>{setCsv(sel&&c&&A&&B?{name:`${sel.name}-${compareTitle(unit)}`,rows:[['항목','기준(A)','비교(B)'],['기간',A.label,B.label],[basis==='avg'?'하루 평균(건)':'합계(건)',r2(c.a.value),r2(c.b.value)],['관측일',c.a.days,c.b.days],['차이(B−A, 건)',r2(c.diff),null],['증감률(%)',r2(c.rate),null],['공통 달 맞춤',c.aligned?monthsText(c.commonMonths||[]):'아니오',null]]}:null)},[sel?.id,c,A?.key,B?.key]);// eslint-disable-line
  if(!sel)return <NeedStation/>;
  const pick=(key:string,set:(k:string)=>void,label:string)=><label className="swField"><span>{label}</span><select aria-label={label} value={key} onChange={e=>set(e.target.value)}>{periods.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></label>;
  const sign=(v:number|null)=>v!=null&&v>0?'+':'';
  return <div className="swDetailWrap"><div className="swChartPanel">
    <Head title={`${sel.name} ${sel.line}호선 · ${compareTitle(unit)}`}>
      <Seg label="비교 단위" value={unit} onChange={setUnit} options={[['month','월↔월'],['season','계절↔계절'],['year','연↔연']]}/>
      <Seg label="기준" value={basis} onChange={setBasis} options={BASIS}/></Head>
    <p className="swMeta">{ctx(kind,day)} · 같은 단위끼리만 비교합니다. 기본값은 최신 기간과 그 전년 같은 기간이며, 차이는 비교(B) − 기준(A), 증감률은 기준(A) 대비입니다.</p>
    <div className="swDetailTools">{pick(pair.a,k=>setPair(p=>({...p,a:k})),'기준 기간(A)')}{pick(pair.b,k=>setPair(p=>({...p,b:k})),'비교 기간(B)')}</div>
    {c&&A&&B&&<>
      <div className="swCompareCards">
        <div className="swCard"><span className="swLabel">기준(A) · {A.label}</span><b className="swKpiValue"><Num v={c.a.value}/></b><span className="swMeta">{basis==='avg'?'하루 평균':'합계'} · 관측 {daysText(c.a.days)}</span></div>
        <div className="swCard"><span className="swLabel">비교(B) · {B.label}</span><b className="swKpiValue"><Num v={c.b.value}/></b><span className="swMeta">{basis==='avg'?'하루 평균':'합계'} · 관측 {daysText(c.b.days)}</span></div>
        <div className="swCard"><span className="swLabel">차이(B−A)</span><b className="swKpiValue"><Num v={c.diff} prefix={sign(c.diff)}/></b><span className="swMeta">건</span></div>
        <div className="swCard"><span className="swLabel">증감률</span><b className="swKpiValue">{c.rate==null?'계산 불가':`${sign(c.rate)}${c.rate.toLocaleString('ko-KR',{maximumFractionDigits:1})}%`}</b><span className="swMeta">{c.rate==null?'기준이 없거나 0 이하입니다':'기준(A) 대비'}</span></div>
      </div>
      {c.aligned&&<p className="swWarn">{A.unit==='year'?'연도 비교는':'같은 계절 비교는'} 서로 있는 달만 맞춰 비교합니다: 같은 {monthsText(c.commonMonths||[])}끼리(2026은 1~10월뿐). 전체 기간 합계끼리 비교하지 않습니다.</p>}
      {c.partial&&<p className="swWarn">일부 달만 있는 기간이 포함되어 있습니다({[A,B].filter(p=>!p.complete).map(p=>p.label).join(', ')}). 하루 평균은 관측한 달만으로 계산한 값입니다.</p>}
      {A.key===B.key&&<p className="swWarn">같은 기간을 골랐습니다. 차이는 0입니다.</p>}
      {mode==='analysis'&&<p className="swMeta">하루 평균 참고: A <Num v={c.perDayA}/> / B <Num v={c.perDayB}/> (건/하루)</p>}</>}
    <Notes sel={sel} basis={basis}/></div></div>;
}

/* ---------- 3. 연도별 같은 시기 ---------- */
export function SamePeriod({sel,monthly,kind,day,setCsv,mode}:DP){
  const [kindOf,setKindOf]=useState<'month'|'season'>('month'),[basis,setBasis]=useState<Basis>('avg');
  const months=monthly?.months||[];
  const [monthNo,setMonthNo]=useState(10),[season,setSeason]=useState<string>('가을');
  useEffect(()=>{if(months.length)setMonthNo(Number(months.at(-1)!.slice(4,6)))},[months.length]);// eslint-disable-line
  const rec=monthly&&sel?monthly.stations[sel.id]:undefined;
  const periods=useMemo(()=>monthly?listPeriods(months,kindOf).filter(p=>kindOf==='month'?Number(p.key.slice(4,6))===monthNo:p.season===season):[],[monthly,kindOf,monthNo,season]);
  const rows=periods.map(p=>{const v=periodValue(rec,p.idx,kind,day,basis);return {p,value:v.value,days:v.days}});
  useEffect(()=>{setCsv(sel&&rows.length?{name:`${sel.name}-연도별-${kindOf==='month'?monthNo+'월':season}`,rows:[['연도','기간','값','관측일','완전한 기간'],...rows.map(r=>[r.p.year,r.p.label,r2(r.value),r.days,r.p.complete?'예':'아니오'])]}:null)},[sel?.id,rows.map(r=>r.value).join(),kindOf,monthNo,season]);// eslint-disable-line
  if(!sel)return <NeedStation/>;
  const title=kindOf==='month'?`${monthNo}월`:season;
  return <div className="swDetailWrap"><div className="swChartPanel">
    <Head title={`${sel.name} ${sel.line}호선 · 연도별 같은 시기(${title})`}>
      <Seg label="같은 시기" value={kindOf} onChange={setKindOf} options={[['month','같은 달'],['season','같은 계절']]}/>
      {kindOf==='month'?<label className="swField"><span>달</span><select aria-label="달" value={monthNo} onChange={e=>setMonthNo(Number(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i} value={i+1}>{i+1}월</option>)}</select></label>
        :<label className="swField"><span>계절</span><select aria-label="계절" value={season} onChange={e=>setSeason(e.target.value)}>{['봄','여름','가을','겨울'].map(s=><option key={s}>{s}</option>)}</select></label>}
      <Seg label="기준" value={basis} onChange={setBasis} options={BASIS}/></Head>
    <p className="swMeta">{ctx(kind,day)} · 같은 {kindOf==='month'?'달':'계절'}을 연도끼리 나란히 봅니다. 주황 막대는 일부 달만 있는 기간입니다(계절은 3개월이 다 있어야 완전, 2026은 1~10월뿐이라 가을·겨울은 일부).</p>
    {rows.length?<BarChart ariaLabel={`연도별 ${title}`} unit={unitLabel(basis)} bars={rows.map(r=>({label:r.p.unit==='season'?`${r.p.year}${r.p.complete?'':'*'}`:String(r.p.year),value:r.value,color:r.p.complete?COLORS[0]:COLORS[1]}))}/>:<div className="swEmpty">이 시기의 자료가 없습니다</div>}
    {mode==='analysis'&&rows.length>0&&<table className="swTable"><thead><tr><th>기간</th><th>{basis==='avg'?'하루 평균':'합계'}(건)</th><th>관측일</th><th>직전 해 대비</th></tr></thead><tbody>{rows.map((r,i)=>{const prev=i>0?rows[i-1]:null;const rate=prev&&prev.value!=null&&prev.value>0&&r.value!=null?(r.value-prev.value)/prev.value*100:null;
      return <tr key={r.p.key}><th>{r.p.label}</th><td><Num v={r.value}/></td><td>{daysText(r.days)}</td><td>{rate==null?'—':`${rate>0?'+':''}${rate.toLocaleString('ko-KR',{maximumFractionDigits:1})}%`}{prev&&!(r.p.complete&&prev.p.complete)?' (일부 달 포함, 직접 비교 주의)':''}</td></tr>})}</tbody></table>}
    <Notes sel={sel} basis={basis}/></div></div>;
}

/* ---------- 4. 후보 역 비교 ---------- */
export function CandidateTrend({monthly,kind,day,from,to,setCsv,mode,candidates,byId,onPick}:DP&{candidates:string[];byId:Map<string,Station>;onPick:(id:string)=>void}){
  const [unit,setUnit]=useState<PeriodUnit>('month'),[basis,setBasis]=useState<Basis>('avg');
  const stations=candidates.map(id=>byId.get(id)).filter(Boolean) as Station[];
  const periods=useMemo(()=>{if(!monthly)return [] as PeriodDef[];const ps=listPeriods(monthly.months,unit);return unit==='month'?ps.filter(p=>p.key>=from&&p.key<=to):ps},[monthly,unit,from,to]);
  const series=stations.map((s,i)=>({station:s,color:COLORS[i%3],values:periods.map(p=>periodValue(monthly?.stations[s.id],p.idx,kind,day,basis).value)}));
  useEffect(()=>{setCsv(series.length?{name:'후보역-추이',rows:[['기간',...series.map(s=>`${s.station.name} ${s.station.line}호선`)],...periods.map((p,k)=>[p.label,...series.map(s=>r2(s.values[k]))])]}:null)},[candidates.join(),unit,basis,kind,day,periods.length]);// eslint-disable-line
  if(!stations.length)return <div className="swPlaceholder"><p className="swStrong">후보 역을 담아 주세요</p><p>오른쪽 ‘선택 역 후보 담기’로 최대 3곳을 담으면 같은 단위로 겹쳐 비교합니다.</p></div>;
  return <div className="swDetailWrap"><div className="swChartPanel">
    <Head title={`후보 역 비교 · ${stations.length}/3곳`}>
      <Seg label="단위" value={unit} onChange={setUnit} options={[['month','월'],['season','계절'],['year','연']]}/>
      <Seg label="기준" value={basis} onChange={setBasis} options={BASIS}/></Head>
    <p className="swMeta">{ctx(kind,day)} · 후보를 같은 단위·같은 기준으로 겹쳐 봅니다. {unit==='month'?'월 단위는 조회 기간만, ':''}계절·연 단위는 전체 관측월이며 *는 일부 달(2026은 1~10월)입니다.</p>
    <LineChart ariaLabel="후보 역 추이 비교" unit={unitLabel(basis)} xLabels={periods.map(shortLabel)} tickEvery={Math.max(1,Math.ceil(periods.length/12))} series={series.map(s=>({label:`${s.station.name} ${s.station.line}호선`,color:s.color,values:s.values}))}/>
    <ul className="swSeriesLegend">{series.map(s=><li key={s.station.id}><i style={{background:s.color}}/><button type="button" className="swLink" onClick={()=>onPick(s.station.id)}>{s.station.name} {s.station.line}호선</button></li>)}</ul>
    {mode==='analysis'&&<table className="swTable"><thead><tr><th>기간</th>{series.map(s=><th key={s.station.id}>{s.station.name} {s.station.line}호선</th>)}</tr></thead><tbody>{periods.map((p,k)=><tr key={p.key}><th>{p.label}</th>{series.map(s=><td key={s.station.id}><Num v={s.values[k]}/></td>)}</tr>)}</tbody></table>}
    <Notes basis={basis}/></div></div>;
}
