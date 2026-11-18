import {readFile,readdir} from 'node:fs/promises';
import {access} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
// w39b: 결측은 사선 무늬가 아니라 평평한 회색(#d7dee6) 하나다. 무늬 코드가 되살아나지 않게 지킨다.
const read=f=>readFile(new URL('../src/'+f,import.meta.url),'utf8');
test('the pattern component is gone and the missing color lives in map-palettes.ts only',async()=>{
  await assert.rejects(access(new URL('../src/map-missing.tsx',import.meta.url)),'map-missing.tsx must stay deleted');
  assert.match(await read('map-palettes.ts'),/export const MISSING_BG='#d7dee6'/);
  const files=(await readdir(new URL('../src/',import.meta.url))).filter(f=>/\.(tsx?|css)$/.test(f));
  for(const f of files){const src=await read(f);
    assert.doesNotMatch(src,/<pattern|<MissingPattern|missingFill|missingSwatch|data-missing-pattern|repeating-linear-gradient\(135deg/,f+' has no missing pattern');
    if(f!=='map-palettes.ts'&&f!=='population-pattern-model.ts')assert.doesNotMatch(src,/#d7dee6|#d9dedc|#cdd4d0/,f+' must use MISSING_BG, not a hard-coded gray');}
});
test('every map paints null with MISSING_BG and lists a flat 자료 없음 legend swatch',async()=>{
  const canvas=await read('MapCanvas.tsx'),dist=await read('DistributionComparison.tsx'),market=await read('MarketExplorer.tsx');
  assert.match(canvas,/import \{MISSING_BG\} from '\.\/map-palettes'/);assert.match(canvas,/fill=\{shade\(v\)\}/);   // shade(null)은 continuousPaletteColor의 결측 색
  assert.match(dist,/if\(v==null\)return MISSING_BG/);assert.match(market,/v==null\?MISSING_BG:colorBreaks/);
  for(const [n,src] of [['canvas',canvas],['dist',dist],['market',market]])assert.match(src,/\{color:MISSING_BG,label:'(자료 없음 · 0과 다름|관측 자료 없음)'\}/,n+' legend swatch');
});
