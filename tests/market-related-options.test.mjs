import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/market-filters.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {relatedMarketOptions,filterMarketAreas}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const row=(code,gu,dong,typeCode,name)=>({properties:{code,gu,guName:gu+'구',dong,dongName:dong+'동',typeCode,type:typeCode+'상권',name}});
const areas=[row('1','A','A1','T','홍대 입구'),row('2','A','A2','S','홍대 길'),row('3','B','B1','T','홍대 시장'),row('4','B','B1','S','공덕'),row('5','C','C1','T','다른 이름')];
const defaults={gu:'all',dong:'all',type:'all',query:''};
const counts=options=>Object.fromEntries(options.map(o=>[o.value,o.count]));
test('related type counts intersect other filters and exclude only their own type',()=>{
 const filters={...defaults,gu:'A',type:'T',query:'홍대'};
 assert.deepEqual(counts(relatedMarketOptions(areas,filters,'type')),{all:2,T:1,S:1});
 assert.equal(filterMarketAreas(areas,filters).length,1);
});
test('changing parent district counts the result after dependent dong is cleared',()=>{
 const options=relatedMarketOptions(areas,{...defaults,gu:'A',dong:'A1',query:'홍대'},'gu');
 assert.deepEqual(counts(options),{all:3,A:2,B:1,C:0});
 assert.equal(options.find(o=>o.value==='B').disabled,false);
 assert.equal(options.find(o=>o.value==='C').disabled,true);
});
test('dong options remain inside parent district and reflect query/type intersection',()=>{
 const options=relatedMarketOptions(areas,{...defaults,gu:'A',dong:'A1',type:'S',query:'홍대'},'dong');
 assert.deepEqual(counts(options),{all:1,A1:0,A2:1});
 assert.equal(options.find(o=>o.value==='A1').disabled,false,'selected zero-result option remains clearable');
 assert.equal(options.some(o=>o.value==='B1'),false);
});
test('no-result current type remains selectable, unselected zero-result options are disabled',()=>{
 const options=relatedMarketOptions(areas,{...defaults,gu:'A',query:'없는 이름',type:'T'},'type');
 assert.deepEqual(counts(options),{all:0,T:0,S:0});
 assert.equal(options[0].disabled,false);
 assert.equal(options.find(o=>o.value==='T').disabled,false);
 assert.equal(options.find(o=>o.value==='S').disabled,true);
});
test('counts are spatial area counts, not observation availability or arbitrary value sums',()=>{
 const enriched=areas.map((f,i)=>({...f,properties:{...f.properties,observed:i===0?null:0}}));
 assert.deepEqual(counts(relatedMarketOptions(enriched,defaults,'gu')),{all:5,A:2,B:2,C:1});
 assert.equal(filterMarketAreas(areas,{...defaults,query:' 홍 대 '}).length,3);
});
