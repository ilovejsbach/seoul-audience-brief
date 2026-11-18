import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=await readFile(new URL('../src/map-palettes.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {mapPalettes,getMapPalette,continuousPaletteColor,mapPaletteGradient,blendPaletteColor,MISSING_BG,MISSING_STRIPE,MISSING_PERIOD,MISSING_LINE}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const luminance=hex=>rgb(hex).map(c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
test('default sequential map uses the A-plan start color; end, neutral and signed colors are unchanged',()=>{const p=getMapPalette('blue');assert.deepEqual(p.colors,['#bdd0e1','#94afc7','#6a8dae','#416c94','#174a7a']);assert.equal(continuousPaletteColor(p,0),'rgb(189, 208, 225)');assert.equal(continuousPaletteColor(p,1),'rgb(23, 74, 122)');assert.equal(continuousPaletteColor(p,0,true),'rgb(183, 90, 27)');assert.equal(continuousPaletteColor(p,.5,true),'rgb(242, 245, 248)');assert.equal(p.negative.at(-1),'#b65020');assert.equal(p.positive.at(-1),'#245c96');assert.equal(p.stepNeutral,'#f1f1ed')});
test('all palette steps become darker as magnitude rises and remain distinct',()=>{assert.equal(mapPalettes.length,3);for(const p of mapPalettes){for(const steps of [p.colors,p.negative,p.positive]){const light=steps.map(luminance);assert.ok(light.every((v,i)=>i===0||v<light[i-1]),p.id+' monotonic');assert.equal(new Set(steps).size,5)}assert.notEqual(p.negativeEnd,p.positiveEnd);assert.ok(luminance(p.neutral)>.9)}});
test('palette changes only the color mapping, missing values remain missing and input positions unchanged',()=>{const positions=[null,0,.25,.5,.75,1],copy=[...positions];const outputs=mapPalettes.map(p=>positions.map(x=>continuousPaletteColor(p,x)));assert.deepEqual(positions,copy);assert.ok(outputs.every(colors=>colors[0]==='#d7dee6'));assert.equal(new Set(outputs.map(colors=>colors[3])).size,3);for(const p of mapPalettes){assert.equal(continuousPaletteColor(p,NaN),'#d7dee6');assert.equal(continuousPaletteColor(p,-1),continuousPaletteColor(p,0));assert.equal(continuousPaletteColor(p,2),continuousPaletteColor(p,1));assert.equal(continuousPaletteColor(p,.5,true),'rgb(242, 245, 248)')}});
test('preview gradients use the actual continuous or stepped endpoints, with invalid stored IDs falling back',()=>{assert.equal(getMapPalette('invalid').id,'blue');assert.equal(getMapPalette(null).id,'blue');const p=getMapPalette('blue');assert.equal(mapPaletteGradient(p,true),'linear-gradient(90deg,#b75a1b,#f2f5f8,#174a7a)');assert.equal(mapPaletteGradient(p,true,true),'linear-gradient(90deg,#b65020,#f1f1ed,#245c96)');assert.equal(mapPaletteGradient(p,false,true),'linear-gradient(90deg,#bdd0e1,#94afc7,#6a8dae,#416c94,#174a7a)')});

const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const hexOf=rgbText=>'#'+rgbText.match(/\d+/g).map(n=>Number(n).toString(16).padStart(2,'0')).join('');
const PAGE_BG='#f7f9fb';
// 시안값 그대로 쓴다: 정확값은 1.498~1.503이고 소수 둘째 자리로 반올림하면 1.50이다.
test('A plan: every palette start color is at least 1.5:1 against the page background; end colors are unchanged',()=>{
  const starts={blue:'#bdd0e1',teal:'#b9d3cc',purple:'#d6c9df'},ends={blue:'#174a7a',teal:'#125a46',purple:'#55316f'};
  for(const p of mapPalettes){assert.equal(p.colors[0],starts[p.id]);assert.equal(p.colors[4],ends[p.id]);assert.ok(Math.round(ratio(p.colors[0],PAGE_BG)*100)/100>=1.5,p.id+' start '+ratio(p.colors[0],PAGE_BG));}
  assert.equal(getMapPalette('blue').negative[0],'#ebc6b0');assert.ok(Math.round(ratio('#ebc6b0',PAGE_BG)*100)/100>=1.5);assert.equal(getMapPalette('blue').negative.at(-1),'#b65020');
  for(const p of mapPalettes)assert.equal(p.neutral,'#f2f5f8');   // 0 근처 중립색은 바뀌지 않는다
});
test('A plan: five steps are monotone, evenly derived from the continuous fill line, and adjacent steps stay distinguishable',()=>{
  for(const p of mapPalettes){
    const line=[0,.25,.5,.75,1].map(t=>hexOf(blendPaletteColor(p.colors[0],p.colors[4],t)));
    assert.deepEqual(p.colors,line,p.id+' 5단계는 연속 채움 직선 위');
    const light=p.colors.map(luminance);assert.ok(light.every((v,i)=>i===0||v<light[i-1]),p.id+' monotone');
    for(let i=0;i<4;i++)assert.ok(ratio(p.colors[i],p.colors[i+1])>=1.3,p.id+' adjacent '+i);
  }
  const orange=getMapPalette('blue').negative;const o=[0,.25,.5,.75,1].map(t=>hexOf(blendPaletteColor(orange[0],orange[4],t)));assert.deepEqual(orange,o);
});
test('missing stays null→pattern: stripes contrast with their ground and with the lowest value color; pattern is screen-fixed',()=>{
  assert.ok(ratio(MISSING_STRIPE,MISSING_BG)>=3,'stripe vs ground');
  for(const p of mapPalettes)assert.ok(ratio(MISSING_STRIPE,p.colors[0])>=3,p.id+' stripe vs lowest value color');
  assert.ok(MISSING_LINE/MISSING_PERIOD<=.3&&MISSING_PERIOD>=4);
  for(const p of mapPalettes){assert.equal(continuousPaletteColor(p,null),MISSING_BG);assert.equal(continuousPaletteColor(p,NaN),MISSING_BG);assert.notEqual(continuousPaletteColor(p,0),MISSING_BG)}   // 결측은 0(가장 낮은 색)이 되지 않는다
});
