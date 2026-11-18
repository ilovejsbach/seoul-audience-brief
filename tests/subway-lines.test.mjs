import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=await readFile(new URL('../src/topics/transit/subway-lines.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const stations=JSON.parse(await readFile(new URL('../public/data/transit/subway/stations.json',import.meta.url),'utf8')).stations;
const build=m.buildLineSegments(stations);
const byId=new Map(stations.map(s=>[s.id,s]));

test('official line color constants: exactly 8 lines, distinct hex colors',()=>{
  assert.deepEqual(Object.keys(m.LINE_COLORS).map(Number),[1,2,3,4,5,6,7,8]);
  assert.equal(new Set(Object.values(m.LINE_COLORS)).size,8);
  for(const c of Object.values(m.LINE_COLORS))assert.match(c,/^#[0-9A-F]{6}$/);
  assert.equal(m.LINE_COLORS[2],'#00A84D');assert.equal(m.LINE_COLORS[6],'#CD7C2F');
});
test('every one of the 276 stations is on a route (by name) and no route name is missing',()=>{
  assert.deepEqual(build.missing,[]);assert.deepEqual(build.unused,[]);
});
test('branches: line 2 loop + 성수·신정 지선, line 5 마천·하남 갈래 from 강동, line 6 응암 순환',()=>{
  const routes=n=>m.LINE_ROUTES[n].map(r=>r.label);
  assert.deepEqual(routes(2),['순환선','성수지선','신정지선']);assert.deepEqual(routes(5),['본선(방화~강동)','마천 갈래','하남 갈래']);assert.deepEqual(routes(6),['응암 순환','본선(응암~신내)']);
  for(const label of ['마천 갈래','하남 갈래'])assert.equal(m.LINE_ROUTES[5].find(r=>r.label===label).names[0],'강동');
  const loop=build.polylines.find(p=>p.line===2&&p.route==='순환선');assert.equal(loop.ids[0],loop.ids.at(-1),'closed loop');
  const l6=build.polylines.find(p=>p.line===6&&p.route==='응암 순환');assert.equal(l6.ids[0],l6.ids.at(-1));
  // 이름 기준이라 코드가 밀린 역도 올바른 이웃과 이어진다
  const nameOf=id=>byId.get(id).name;const seq=p=>p.ids.map(nameOf);
  const l6main=seq(build.polylines.find(p=>p.line===6&&p.route.startsWith('본선')));assert.deepEqual(l6main.slice(-3),['화랑대','봉화산','신내']);
  const l8=seq(build.polylines.find(p=>p.line===8));assert.equal(l8[l8.indexOf('남위례')-1],'복정');assert.equal(l8[l8.indexOf('남위례')+1],'산성');
  const l1=seq(build.polylines.find(p=>p.line===1));assert.equal(l1[l1.indexOf('동묘앞')+1],'신설동');
});
test('no wrongly long segment is drawn; the only skipped pairs are the known source-coordinate error of 용답',()=>{
  for(const p of build.polylines)for(let i=1;i<p.ids.length;i++)assert.ok(m.distanceKm(byId.get(p.ids[i-1]),byId.get(p.ids[i]))<=m.MAX_SEGMENT_KM);
  assert.ok(build.maxKm<=m.MAX_SEGMENT_KM);
  // 좌표 원본에서 2호선 용답(0244)의 경도가 126.978(시청 부근)로 적혀 있어 두 구간이 7km 안팎으로 벌어진다. 잇지 않고 보고한다.
  assert.deepEqual(build.anomalies.map(a=>`${a.line}호선 ${a.from}→${a.to}`).sort(),['2호선 성수→용답','2호선 용답→신답']);
  assert.ok(build.anomalies.every(a=>a.km>m.MAX_SEGMENT_KM));
});
test('synthetic data: far-apart neighbors are not joined and unknown names are reported',()=>{
  const st=[{id:'1:a',line:1,name:'가',lat:37.5,lng:127},{id:'1:b',line:1,name:'나',lat:37.5,lng:127.01},{id:'1:c',line:1,name:'다',lat:37.9,lng:127.5}];
  const r=m.buildLineSegments(st,{1:[{label:'t',names:['가','나','다','없음']}]},4.5);
  assert.deepEqual(r.polylines.map(p=>p.ids),[['1:a','1:b']]);assert.equal(r.anomalies.length,1);assert.deepEqual(r.missing,[{line:1,route:'t',name:'없음'}]);
});
