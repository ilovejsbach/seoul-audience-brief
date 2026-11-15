import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=await readFile(new URL('../src/migration-query-capabilities.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {migrationQueryPeriods,nearestQueryPeriod}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const periods=['2020','2021','2022','2023','2024','2025'];
const capability={periodsByDimension:{sex:['2021','2022','2023','2024','2025'],age:['2025']}};
test('dimension periods use only the available source and supported table intersection',()=>{
 assert.deepEqual(migrationQueryPeriods(periods,'all',null),periods);
 assert.deepEqual(migrationQueryPeriods(periods,'sex',capability),periods.slice(1));
 assert.deepEqual(migrationQueryPeriods(periods,'age',capability),['2025']);
 assert.deepEqual(migrationQueryPeriods(['2024'],'age',capability),[]);
 assert.deepEqual(migrationQueryPeriods(periods,'sex',null),[]);
 assert.deepEqual(periods,['2020','2021','2022','2023','2024','2025']);
});
test('unsupported periods choose the nearest valid year without inventing a data period',()=>{
 assert.equal(nearestQueryPeriod('2020',migrationQueryPeriods(periods,'sex',capability)),'2021');
 assert.equal(nearestQueryPeriod('2023',migrationQueryPeriods(periods,'age',capability)),'2025');
 assert.equal(nearestQueryPeriod('2023',['2021','2023','2025']),'2023');
 assert.equal(nearestQueryPeriod('2023',['2025','2021']),'2021');
 assert.equal(nearestQueryPeriod('',periods),'2025');
 assert.equal(nearestQueryPeriod('2023',[]),'');
});
