import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
// map-missing.tsx: pattern geometry is expressed in screen pixels times unitsPerPixel, so zooming cannot change the line spacing.
const source=await readFile(new URL('../src/map-missing.tsx',import.meta.url),'utf8');
test('the pattern size is PERIOD x unitsPerPixel (screen-fixed under zoom) and the legend swatch uses the same numbers',()=>{
  assert.match(source,/size=MISSING_PERIOD\*u/);assert.match(source,/width=\{MISSING_LINE\*u\}/);
  assert.match(source,/patternUnits="userSpaceOnUse"/);
  assert.match(source,/repeating-linear-gradient\(135deg,\$\{MISSING_STRIPE\} 0 \$\{MISSING_LINE\}px,\$\{MISSING_BG\} \$\{MISSING_LINE\}px \$\{MISSING_PERIOD\}px\)/);
});
test('every map passes unitsPerPixel derived from its own zoom/scale and fills null with the pattern, never with a value color',async()=>{
  const canvas=await readFile(new URL('../src/MapCanvas.tsx',import.meta.url),'utf8');
  const dist=await readFile(new URL('../src/DistributionComparison.tsx',import.meta.url),'utf8');
  const market=await readFile(new URL('../src/MarketExplorer.tsx',import.meta.url),'utf8');
  assert.match(canvas,/unitsPerPixel=\{1\/\(svgScale\*zoom\.k\)\}/);assert.match(canvas,/fill=\{v==null\?missingFill\(missingId\):shade\(v\)\}/);
  assert.match(market,/unitsPerPixel=\{1\/\(labelScale\*camera\.k\)\}/);assert.match(market,/v==null\?missingFill\(missingId\):colorBreaks/);
  assert.match(dist,/if\(v==null\)return missingFill\(missingId\)/);assert.match(dist,/useUnitsPerPixel\(mapsRoot,'svg\.distributionSvg',480,380\)/);
  for(const [name,src] of [['canvas',canvas],['dist',dist],['market',market]])assert.doesNotMatch(src,/#d7dee6|#d9dedc|#cdd4d0/,name+' no hard-coded missing gray');
});
