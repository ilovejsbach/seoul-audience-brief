import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=await readFile(new URL('../src/topics/transit/subway-model.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));

test('null is never treated as zero in sums',()=>{
  assert.equal(m.sumNullable([1,2,3]),6);
  assert.equal(m.sumNullable([1,null,3]),null);
  assert.equal(m.sumNullable([]),null);
  assert.equal(m.addNullable(null,5),null);
});
test('station metric is a per-observed-day mean and keeps null',()=>{
  const rec={bw:[100,200],bh:[40,null],aw:[10,20],ah:[4,6],dw:[2,4],dh:[1,2]};
  assert.deepEqual(m.stationMetric(rec,[0],'b','wd'),{perDay:50,days:2,total:100});
  assert.equal(m.stationMetric(rec,[0],'b','all').perDay,140/3);
  assert.equal(m.stationMetric(rec,[0,1],'b','we').perDay,null);       // 주말 승차에 null이 섞이면 null
  assert.equal(m.stationMetric(rec,[0,1],'a','we').perDay,10/3);
  assert.equal(m.stationMetric(rec,[],'b','all').perDay,null);
  assert.equal(m.stationMetric(undefined,[0],'b','all').perDay,null);
});
test('seasons: winter belongs to the year of December; incompleteness is reported',()=>{
  assert.equal(m.seasonOf('202301').year,2022);assert.equal(m.seasonOf('202301').season,'겨울');
  assert.equal(m.seasonOf('202312').year,2023);assert.equal(m.seasonOf('202402').year,2023);
  assert.equal(m.seasonOf('202305').season,'봄');assert.equal(m.seasonOf('202308').season,'여름');assert.equal(m.seasonOf('202311').season,'가을');
  const months=['202312','202401','202402','202403'];
  const rec={bw:[1,1,1,1],bh:[1,1,1,1],aw:[1,1,1,1],ah:[1,1,1,1],dw:[1,1,1,1],dh:[1,1,1,1]};
  const s=m.seasonSummary(months,rec,'b','all');
  const winter=s.find(x=>x.season==='겨울'&&x.year===2023);assert.equal(winter.complete,true);assert.equal(winter.monthsPresent,3);
  const spring=s.find(x=>x.season==='봄');assert.equal(spring.complete,false);
});
test('passenger types: 중고생 joins 청소년; 어린이·직원·외국어 권종 are 기타',()=>{
  assert.equal(m.passengerGroup('중고생'),'청소년');assert.equal(m.passengerGroup('우대권'),'우대');
  for(const t of ['어린이','직원','영어 일반','중국어 어린이'])assert.equal(m.passengerGroup(t),'기타');
});
test('weekday means skip nulls and count them',()=>{
  const r=m.weekdayMeans(['20261012','20261019','20261026'],[10,null,30]);   // 모두 월요일
  assert.deepEqual(r[0],{mean:20,n:2,missing:1});assert.equal(r[1].mean,null);
  assert.equal(m.weekdayIndex('20261018'),6);
});
test('breaks, format and csv',()=>{
  assert.deepEqual(m.quantileBreaks([1,2,3,4,5,6],5).length,6);
  assert.equal(m.fmt(null),'자료 없음');assert.equal(m.fmt(1234.4),'1,234');
  assert.equal(m.toCsv([['a,b',null,1]]),'﻿"a,b",,1');
});
