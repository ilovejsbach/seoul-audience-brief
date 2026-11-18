/** 지하철 화면의 순수 계산. null은 0이 아니며, null이 섞인 합계는 null이다. */

export type Kind='b'|'a'|'ab';          // 승차 / 하차 / 승차+하차
export type DayType='all'|'wd'|'we';    // 전체 / 평일(월~금) / 주말(토·일)

export const sumNullable=(values:(number|null|undefined)[]):number|null=>{
  if(!values.length)return null;
  let s=0;
  for(const v of values){if(v==null)return null;s+=v}
  return s;
};

export const addNullable=(a:number|null,b:number|null):number|null=>a==null||b==null?null:a+b;

export const monthsInPeriod=(months:string[],from:string,to:string):number[]=>
  months.flatMap((m,i)=>m>=from&&m<=to?[i]:[]);

type MonthlyLike={bw:(number|null)[];bh:(number|null)[];aw:(number|null)[];ah:(number|null)[];dw:number[];dh:number[]};

/** 선택 달들의 일평균과 관측 일수. 관측 일수가 0이거나 합에 null이 있으면 perDay=null. */
export function stationMetric(rec:MonthlyLike|undefined,idx:number[],kind:Kind,day:DayType){
  if(!rec||!idx.length)return {perDay:null,days:0,total:null as number|null};
  const parts:(number|null)[]=[];let days=0;
  for(const i of idx){
    if(day!=='we'){days+=rec.dw[i];if(rec.dw[i]>0)parts.push(...kindValues(rec,'w',i,kind))}
    if(day!=='wd'){days+=rec.dh[i];if(rec.dh[i]>0)parts.push(...kindValues(rec,'h',i,kind))}
  }
  const total=sumNullable(parts);
  return {perDay:total==null||days===0?null:total/days,days,total};
}
function kindValues(rec:MonthlyLike,t:'w'|'h',i:number,kind:Kind):(number|null)[]{
  const b=t==='w'?rec.bw[i]:rec.bh[i],a=t==='w'?rec.aw[i]:rec.ah[i];
  return kind==='b'?[b]:kind==='a'?[a]:[b,a];
}

/** 계절 정의: 봄 3–5, 여름 6–8, 가을 9–11, 겨울 12–2. 겨울의 연도는 12월이 속한 해(1·2월은 전년 겨울). */
export const SEASONS=['봄','여름','가을','겨울'] as const;
export type Season=typeof SEASONS[number];
export function seasonOf(month:string):{year:number;season:Season;monthsNeeded:string[]}{
  const y=Number(month.slice(0,4)),m=Number(month.slice(4,6))||Number(month.slice(5,7));
  const mm=(yy:number,k:number)=>`${yy}${String(k).padStart(2,'0')}`;
  if(m>=3&&m<=5)return {year:y,season:'봄',monthsNeeded:[3,4,5].map(k=>mm(y,k))};
  if(m>=6&&m<=8)return {year:y,season:'여름',monthsNeeded:[6,7,8].map(k=>mm(y,k))};
  if(m>=9&&m<=11)return {year:y,season:'가을',monthsNeeded:[9,10,11].map(k=>mm(y,k))};
  const wy=m===12?y:y-1;
  return {year:wy,season:'겨울',monthsNeeded:[mm(wy,12),mm(wy+1,1),mm(wy+1,2)]};
}

export type SeasonCell={year:number;season:Season;perDay:number|null;days:number;monthsPresent:number;complete:boolean};
export function seasonSummary(months:string[],rec:MonthlyLike|undefined,kind:Kind,day:DayType):SeasonCell[]{
  const groups=new Map<string,{year:number;season:Season;idx:number[];need:string[]}>();
  months.forEach((m,i)=>{const s=seasonOf(m);const k=`${s.year}-${s.season}`;if(!groups.has(k))groups.set(k,{year:s.year,season:s.season,idx:[],need:s.monthsNeeded});groups.get(k)!.idx.push(i)});
  return [...groups.values()].map(g=>{
    const r=stationMetric(rec,g.idx,kind,day);
    const present=g.idx.length;
    return {year:g.year,season:g.season,perDay:r.perDay,days:r.days,monthsPresent:present,complete:g.need.every(n=>months.includes(n))};
  }).sort((a,b)=>a.year-b.year||SEASONS.indexOf(a.season)-SEASONS.indexOf(b.season));
}

/** 승객유형 원문 → 그룹. 중고생은 청소년 요금 대상으로 합치고, 어린이·직원·외국어 안내 권종은 기타다. */
export const PASSENGER_GROUPS=['일반','청소년','우대','기타'] as const;
export const TYPE_MAPPING:Record<string,typeof PASSENGER_GROUPS[number]>={'일반':'일반','청소년':'청소년','중고생':'청소년','우대권':'우대'};
export const passengerGroup=(raw:string)=>TYPE_MAPPING[raw]??'기타';

export const WEEKDAYS=['월','화','수','목','금','토','일'] as const;
/** YYYYMMDD → 월요일=0 … 일요일=6 */
export function weekdayIndex(d:string):number{
  const dt=new Date(Date.UTC(Number(d.slice(0,4)),Number(d.slice(4,6))-1,Number(d.slice(6,8))));
  return (dt.getUTCDay()+6)%7;
}
/** 요일별 평균. null인 날은 평균에서 빼지 않고 센다(관측 안 됨). */
export function weekdayMeans(dates:string[],values:(number|null)[]){
  const out=WEEKDAYS.map(()=>({sum:0,n:0,missing:0}));
  dates.forEach((d,i)=>{const w=weekdayIndex(d);const v=values[i];if(v==null)out[w].missing++;else{out[w].sum+=v;out[w].n++}});
  return out.map(o=>({mean:o.n?o.sum/o.n:null,n:o.n,missing:o.missing}));
}

export function quantileBreaks(values:number[],classes=5):number[]{
  const v=[...values].sort((a,b)=>a-b);
  if(!v.length)return [];
  return Array.from({length:classes+1},(_,i)=>v[Math.min(v.length-1,Math.round(i*(v.length-1)/classes))]);
}

export const fmt=(v:number|null|undefined,digits=0)=>v==null?'자료 없음':v.toLocaleString('ko-KR',{maximumFractionDigits:digits,minimumFractionDigits:digits});

export function toCsv(rows:(string|number|null)[][]):string{
  const cell=(x:string|number|null)=>x==null?'':/[",\n]/.test(String(x))?`"${String(x).replace(/"/g,'""')}"`:String(x);
  return '﻿'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
}

export const monthLabel=(m:string)=>`${m.slice(0,4)}.${m.slice(4,6)}`;
