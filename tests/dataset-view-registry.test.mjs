import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// The registry is TypeScript; read its source and evaluate only the literal tables.
const src=readFileSync(new URL('../src/dataset-view-registry.ts',import.meta.url),'utf8');
const ids=[...src.matchAll(/^ v\('(\w+)','([\w-]+)','([^']+)','([^']+)'/gm)].map(m=>({dataset:m[1],id:m[2],label:m[3],short:m[4]}));
const datasetRows=[...src.matchAll(/\{id:'(\w+)',label:'([^']+)',shortLabel:'([^']+)'/g)].map(m=>({id:m[1],label:m[2],short:m[3]})).filter(x=>x.id!=='map');
const MAIN=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');

test('25 region details: 8 + 6 + 6 + 5, unique ids',()=>{
  assert.equal(ids.length,25);
  const by=k=>ids.filter(x=>x.dataset===k).length;
  assert.deepEqual([by('population'),by('mobility'),by('migration'),by('commerce')],[8,6,6,5]);
  assert.equal(new Set(ids.map(x=>x.id)).size,25);
});
test('the existing detail ids are exactly the ones the app has always used',()=>{
  const expected=['population-patterns','resident-context','demographic-population','trend-population','time-compare-population','distribution-population','shortlist-population','scenario-population',
   'trend-mobility','time-compare-mobility','mobility-connections','table-mobility','shortlist-mobility','scenario-mobility',
   'trend-migration','time-compare-migration','migration-demographic-details','table-migration','shortlist-migration','scenario-migration',
   'trend-commerce','time-compare-commerce','table-commerce','shortlist-commerce','scenario-commerce'];
  assert.deepEqual(ids.map(x=>x.id),expected);
});
test('short names are unique inside a dataset and across datasets, each at most 2 characters',()=>{
  const shorts=datasetRows.map(x=>x.short);
  assert.equal(datasetRows.length,4);assert.equal(new Set(shorts).size,4);
  for(const d of datasetRows){const own=ids.filter(x=>x.dataset===d.id).map(x=>x.short);own.push('지도');assert.equal(new Set(own).size,own.length,`${d.id} short names must be unique`)}
  for(const s of [...shorts,...ids.map(x=>x.short)])assert.ok([...s].length<=2,`${s} is longer than 2 characters`);
});
test('labels are unique inside a dataset and the I03/I05 names are in place',()=>{
  for(const d of datasetRows){const own=ids.filter(x=>x.dataset===d.id).map(x=>x.label);assert.equal(new Set(own).size,own.length)}
  const label=Object.fromEntries(ids.map(x=>[x.id,x.label]));
  assert.equal(datasetRows.find(x=>x.id==='commerce').label,'행정동 추정매출');
  assert.equal(label['time-compare-population'],'두 시간 비교');assert.equal(label['time-compare-mobility'],'두 시간 비교');
  assert.equal(label['time-compare-migration'],'두 연도 비교');assert.equal(label['time-compare-commerce'],'두 분기 비교');
  assert.equal(label['trend-population'],'선택 지역 시간 추이');
});
test('main.tsx no longer keeps its own detail list (the registry is the only definition)',()=>{
  assert.ok(!/const detailOptions:DetailOption\[\]=tab==='population'/.test(MAIN));
  assert.ok(/detailOptionsOf\(tab\)/.test(MAIN));
});
