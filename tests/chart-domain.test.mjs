import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=await readFile(new URL('../src/chart-domain.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {calculateDomain}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));

test('zero includes all positive, negative and crossing-zero observations',()=>{
 for(const [values,low,high] of [[[3,8],0,8],[[-8,-3],-8,0],[[-3,8],-3,8]]){
  const d=calculateDomain(values,'zero');assert.equal(d.low,low);assert.equal(d.high,high);assert.equal(d.clippedCount,0);assert.equal(d.zeroExcluded,false);
 }
});
test('fit gives 8 percent padding on either end',()=>{
 assert.deepEqual(calculateDomain([10,20],'fit'),{low:9.2,high:20.8,clippedCount:0,zeroExcluded:true});
 const d=calculateDomain([-20,-10],'fit');assert.equal(d.low,-20.8);assert.equal(d.high,-9.2);assert.equal(d.zeroExcluded,true);
});
test('constant and missing series have finite nonzero domains',()=>{
 for(const values of [[0,0],[5,5],[-5,-5],[],[null,undefined,NaN,Infinity,-Infinity]])for(const mode of ['zero','fit']){
  const d=calculateDomain(values,mode);assert.ok(Number.isFinite(d.low)&&Number.isFinite(d.high));assert.ok(d.high>d.low);assert.equal(d.clippedCount,0);
 }
 assert.equal(calculateDomain([5,5],'fit').low,4);assert.equal(calculateDomain([5,5],'fit').high,6);
});
test('manual accepts finite numbers, counts each clipped observation and includes boundaries',()=>{
 assert.deepEqual(calculateDomain([-1,0,1,2,3,3,null,Infinity],'manual','0','2'),{low:0,high:2,clippedCount:3,zeroExcluded:false});
 assert.equal(calculateDomain([1,2],'manual','1','2').zeroExcluded,true);
});
test('invalid manual bounds fall back to zero with actionable error',()=>{
 for(const [lo,hi] of [['','10'],['0',''],['NaN','10'],['0','Infinity'],['2','2'],['5','2'],['-1e308','1e308']]){
  const d=calculateDomain([3,8],'manual',lo,hi);assert.equal(d.low,0);assert.equal(d.high,8);assert.ok(d.error);assert.equal(d.clippedCount,0);
 }
});
test('huge arrays and tiny or overflowing ranges never produce broken axes',()=>{
 const many=Array.from({length:150000},(_,i)=>i-75000);const d=calculateDomain(many,'zero');assert.equal(d.low,-75000);assert.equal(d.high,74999);
 for(const values of [[-Number.MAX_VALUE,Number.MAX_VALUE],[Number.MAX_VALUE],[Number.MIN_VALUE]])for(const mode of ['zero','fit']){
  const x=calculateDomain(values,mode);assert.ok(Number.isFinite(x.low)&&Number.isFinite(x.high)&&Number.isFinite(x.high-x.low));assert.ok(x.low<x.high);
 }
 assert.ok(calculateDomain([-Number.MAX_VALUE,Number.MAX_VALUE],'zero').error);
});
