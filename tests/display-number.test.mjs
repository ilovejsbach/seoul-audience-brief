import {readFile} from 'node:fs/promises';
import test from 'node:test';import assert from 'node:assert/strict';import ts from 'typescript';
const source=await readFile(new URL('../src/display-number.tsx',import.meta.url),'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {displayNumber,exactNumber}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('real Seoul quarterly sales retain exact source values while shortening primary display',()=>{assert.equal(displayNumber(26105709261054,'원'),'26.11조 원');assert.equal(displayNumber(27216323031204,'원'),'27.22조 원');assert.equal(displayNumber(1110613770150,'원'),'1.11조 원');assert.equal(exactNumber(27216323031204,'원'),'27,216,323,031,204 원')});
test('null, zero, negative and units remain distinct',()=>{assert.equal(displayNumber(null,'원'),'자료 없음');assert.equal(displayNumber(0,'원'),'0 원');assert.equal(displayNumber(-1110613770150,'원'),'-1.11조 원');assert.equal(displayNumber(108.71,'지수'),'108.71 지수');assert.equal(displayNumber(146038,'명'),'146,038 명')});
