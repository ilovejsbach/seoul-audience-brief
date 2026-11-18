import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(`../public/data/${p}`,import.meta.url),'utf8'));
const constant=Number(/MARKET_AREA_COUNT\s*=\s*(\d+)/.exec(readFileSync(new URL('../src/hero-summary.ts',import.meta.url),'utf8'))?.[1]);

test('hero market-area constant equals the boundary file count',()=>{
  const boundary=read('market-areas.geojson').features;
  assert.ok(Number.isInteger(constant)&&constant>0,'constant not found');
  assert.equal(boundary.length,constant);
  assert.equal(new Set(boundary.map(f=>f.properties.code)).size,constant,'boundary codes must be unique');
});
test('market sales areas and periods agree with the hero claims',()=>{
  const sales=read('market-sales.json'),commerce=read('commerce.json');
  assert.equal(sales.areas.length,constant);
  assert.deepEqual(sales.periods,commerce.periods,'"행정동·상권 매출 N분기" requires the same periods in both files');
});
test('hero run-time figures can be derived from the loaded files',()=>{
  const regions=read('regions.json'),index=read('population/index.json');
  assert.equal(new Set(index.map(e=>e.date)).size,index.length,'index dates must be distinct');
  assert.ok(regions.dongs.filter(d=>d.activePopulation!==false).length>0);
});
