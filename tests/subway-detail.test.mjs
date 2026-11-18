import {readFile,readdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const src=await readFile(new URL('../src/topics/transit/subway-model.ts',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const months=['202411','202412','202501','202502','202503','202504','202505','202506','202507','202508','202509','202510'];

test('season boundary: December belongs to the next year\'s winter; incomplete seasons are flagged',()=>{
  const s=m.listPeriods(months,'season');
  const winter=s.find(p=>p.season==='겨울');assert.equal(winter.year,2024);assert.deepEqual(winter.months.sort((a,b)=>a-b),[1,2,12]);assert.equal(winter.complete,true);
  assert.match(winter.label,/2024 겨울\(2024\.12~2025\.2\)/);
  const fall24=s.find(p=>p.season==='가을'&&p.year===2024);assert.equal(fall24.complete,false);assert.match(fall24.label,/일부 달/);   // 11월만
  const fall25=s.find(p=>p.season==='가을'&&p.year===2025);assert.equal(fall25.complete,false);                                                     // 9·10월만
  assert.equal(s.find(p=>p.season==='여름').complete,true);
});
test('years: a partial year is labelled with its months and is not complete',()=>{
  const y=m.listPeriods(months,'year');assert.equal(y.length,2);
  assert.equal(y[1].label,'2025(1~10월)');assert.equal(y[1].complete,false);assert.equal(y[0].label,'2024(11~12월)');
  const full=m.listPeriods(Array.from({length:12},(_,i)=>`2024${String(i+1).padStart(2,'0')}`),'year');assert.equal(full[0].label,'2024');assert.equal(full[0].complete,true);
});
test('per-day average uses observed days only; null poisons a total but not the observed-day average source',()=>{
  const rec={bw:[1000,null],bh:[400,600],aw:[900,800],ah:[300,200],dw:[20,18],dh:[8,9],nb:[0,1],na:[0,0]};
  assert.deepEqual(m.periodValue(rec,[0],'b','all','avg'),{value:1400/28,perDay:1400/28,total:1400,days:28});
  assert.equal(m.periodValue(rec,[0,1],'b','all','total').value,null);          // 합계: null이 하나라도 있으면 null
  assert.equal(m.periodValue(rec,[0,1],'b','all','avg').value,null);
  assert.equal(m.periodValue(rec,[1],'a','all','avg').value,1000/27);
  assert.equal(m.periodValue(rec,[],'b','all','avg').value,null);
});
test('change rate: base zero or null gives null; otherwise percent of the base',()=>{
  assert.equal(m.changeRate(200,150),-25);assert.equal(m.changeRate(100,100),0);assert.equal(m.changeRate(0,5),null);assert.equal(m.changeRate(null,5),null);assert.equal(m.changeRate(5,null),null);
  assert.equal(m.difference(200,150),-50);assert.equal(m.difference(null,1),null);
});
test('partial year comparison is aligned to the common months (같은 1~10월끼리)',()=>{
  const mm=[];for(const y of [2025,2026])for(let k=1;k<=12;k++){if(y===2026&&k>10)continue;mm.push(`${y}${String(k).padStart(2,'0')}`)}
  const rec={bw:mm.map((x,i)=>100+i),bh:mm.map(()=>0),aw:mm.map(()=>0),ah:mm.map(()=>0),dw:mm.map(()=>1),dh:mm.map(()=>0),nb:mm.map(()=>0),na:mm.map(()=>0)};
  const [y25,y26]=m.listPeriods(mm,'year');assert.equal(y26.label,'2026(1~10월)');
  const c=m.comparePeriods(rec,mm,y25,y26,'b','all','total');
  assert.equal(c.aligned,true);assert.deepEqual(c.commonMonths.sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10]);
  assert.equal(c.a.days,10);assert.equal(c.b.days,10);                      // 2025도 1~10월 10일치만 쓴다
  assert.equal(c.a.value,[...Array(10).keys()].reduce((s,i)=>s+100+i,0));    // 2025 1~10월 합
  assert.equal(m.compareTitle('year'),'두 연도 비교');assert.equal(m.compareTitle('month'),'두 달 비교');assert.equal(m.compareTitle('season'),'두 계절 비교');
  assert.equal(m.monthsText([1,2,3,4,5,6,7,8,9,10]),'1~10월');
});
test('daily series keeps null days, filters weekend/weekday, and limits long ranges',()=>{
  const dates=['20260101','20260102','20260103','20260104'];            // 목 금 토 일
  const r=m.dailySeries(dates,[10,null,5,6],[1,1,1,null],'ab','all','202601','202601');
  assert.deepEqual(r.rows.map(x=>x.value),[11,null,6,null]);
  assert.deepEqual(m.dailySeries(dates,[10,null,5,6],[1,1,1,1],'b','we','202601','202601').rows.map(x=>x.date),['20260103','20260104']);
  assert.equal(m.dailySeries(dates,[1,1,1,1],[1,1,1,1],'b','all','202601','202601',2).truncated,true);
});

// ---- 원본(data/raw) 대조: 읽기만 한다 ----
const RAW=new URL('../data/raw/transit/subway/',import.meta.url);
const has=await readdir(RAW).then(l=>l.includes('OA-12914-CARD_SUBWAY_MONTH_202510.csv'),()=>false);
const dec=b=>{try{return new TextDecoder('utf-8',{fatal:true}).decode(b).replace(/^﻿/,'')}catch{return new TextDecoder('euc-kr').decode(b)}};
async function rawRows(ym){const rows=dec(await readFile(new URL(`OA-12914-CARD_SUBWAY_MONTH_${ym}.csv`,RAW))).split(/\r?\n/).slice(1).filter(Boolean).map(l=>l.replace(/"/g,'').split(','));return rows}
const monthly=JSON.parse(gunzipSync(await readFile(new URL('../public/data/transit/subway/monthly.json.gz',import.meta.url))).toString());
const stationIds={'강남2':'2:0222','서울1':'1:0150'};
const rec=id=>monthly.stations[id];
test('RAW 1: 강남 2호선 2025-10 하루 평균 (승차+하차)',{skip:!has&&'data/raw 없음'},async()=>{
  const rows=(await rawRows('202510')).filter(r=>r[1]==='2호선'&&r[2]==='강남');
  const total=rows.reduce((s,r)=>s+Number(r[3])+Number(r[4]),0),days=new Set(rows.map(r=>r[0])).size;
  const idx=[monthly.months.indexOf('202510')];
  const v=m.periodValue(rec(stationIds['강남2']),idx,'ab','all','avg');
  assert.equal(v.days,days);assert.ok(Math.abs(v.value-total/days)<1e-6,`${v.value} vs ${total/days}`);
});
test('RAW 2: 같은 역 2025-10 대비 2024-10 증감률',{skip:!has&&'data/raw 없음'},async()=>{
  const sum=async ym=>{const rows=(await rawRows(ym)).filter(r=>r[1]==='2호선'&&r[2]==='강남');return rows.reduce((s,r)=>s+Number(r[3])+Number(r[4]),0)/new Set(rows.map(r=>r[0])).size};
  const a=await sum('202410'),b=await sum('202510');
  const p=m.listPeriods(monthly.months,'month'),pa=p.find(x=>x.key==='202410'),pb=p.find(x=>x.key==='202510');
  const c=m.comparePeriods(rec(stationIds['강남2']),monthly.months,pa,pb,'ab','all','avg');
  assert.ok(Math.abs(c.rate-(b-a)/a*100)<1e-6,`${c.rate} vs ${(b-a)/a*100}`);
});
test('RAW 3: 서울역(1호선) 2025 여름(6~8월) 합계',{skip:!has&&'data/raw 없음'},async()=>{
  let total=0;for(const ym of ['202506','202507','202508'])total+=(await rawRows(ym)).filter(r=>r[1]==='1호선'&&r[2]==='서울역').reduce((s,r)=>s+Number(r[3])+Number(r[4]),0);
  const summer=m.listPeriods(monthly.months,'season').find(p=>p.season==='여름'&&p.year===2025);assert.equal(summer.complete,true);
  const v=m.periodValue(rec(stationIds['서울1']),summer.idx,'ab','all','total');assert.equal(v.value,total);
});
