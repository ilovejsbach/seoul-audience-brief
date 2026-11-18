import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=await readFile(new URL('../src/map-palettes.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {mapPalettes,getMapPalette,continuousPaletteColor,mapPaletteGradient,blendPaletteColor,MISSING_BG}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const luminance=hex=>rgb(hex).map(c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
test('default sequential map uses the A-plan start color; end, neutral and signed colors are unchanged',()=>{const p=getMapPalette('blue');assert.deepEqual(p.colors,['#bcd0e1','#93afc7','#6a8dae','#406c94','#174a7a']);assert.equal(continuousPaletteColor(p,0),'rgb(188, 208, 225)');assert.equal(continuousPaletteColor(p,1),'rgb(23, 74, 122)');assert.equal(continuousPaletteColor(p,0,true),'rgb(183, 90, 27)');assert.equal(continuousPaletteColor(p,.5,true),'rgb(242, 245, 248)');assert.equal(p.negative.at(-1),'#b65020');assert.equal(p.positive.at(-1),'#245c96');assert.equal(p.stepNeutral,'#f1f1ed')});
test('all palette steps become darker as magnitude rises and remain distinct',()=>{assert.equal(mapPalettes.length,3);for(const p of mapPalettes){for(const steps of [p.colors,p.negative,p.positive]){const light=steps.map(luminance);assert.ok(light.every((v,i)=>i===0||v<light[i-1]),p.id+' monotonic');assert.equal(new Set(steps).size,5)}assert.notEqual(p.negativeEnd,p.positiveEnd);assert.ok(luminance(p.neutral)>.9)}});
test('palette changes only the color mapping, missing values remain missing and input positions unchanged',()=>{const positions=[null,0,.25,.5,.75,1],copy=[...positions];const outputs=mapPalettes.map(p=>positions.map(x=>continuousPaletteColor(p,x)));assert.deepEqual(positions,copy);assert.ok(outputs.every(colors=>colors[0]==='#d7dee6'));assert.equal(new Set(outputs.map(colors=>colors[3])).size,3);for(const p of mapPalettes){assert.equal(continuousPaletteColor(p,NaN),'#d7dee6');assert.equal(continuousPaletteColor(p,-1),continuousPaletteColor(p,0));assert.equal(continuousPaletteColor(p,2),continuousPaletteColor(p,1));assert.equal(continuousPaletteColor(p,.5,true),'rgb(242, 245, 248)')}});
test('preview gradients use the actual continuous or stepped endpoints, with invalid stored IDs falling back',()=>{assert.equal(getMapPalette('invalid').id,'blue');assert.equal(getMapPalette(null).id,'blue');const p=getMapPalette('blue');assert.equal(mapPaletteGradient(p,true),'linear-gradient(90deg,#b75a1b,#f2f5f8,#174a7a)');assert.equal(mapPaletteGradient(p,true,true),'linear-gradient(90deg,#b65020,#f1f1ed,#245c96)');assert.equal(mapPaletteGradient(p,false,true),'linear-gradient(90deg,#bcd0e1,#93afc7,#6a8dae,#406c94,#174a7a)')});

const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const hexOf=rgbText=>'#'+rgbText.match(/\d+/g).map(n=>Number(n).toString(16).padStart(2,'0')).join('');
const PAGE_BG='#f7f9fb';
// 반올림 없이 정확값이 1.5 이상이어야 한다(시안값 #bdd0e1·#d6c9df는 0.001~0.002 모자라 파랑·자주 시작색을 빨강 채널 1칸씩 낮춤).
test('A plan: every palette start color is at least 1.5:1 against the page background; end colors are unchanged',()=>{
  const starts={blue:'#bcd0e1',teal:'#b9d3cc',purple:'#d5c9df'},ends={blue:'#174a7a',teal:'#125a46',purple:'#55316f'};
  for(const p of mapPalettes){assert.equal(p.colors[0],starts[p.id]);assert.equal(p.colors[4],ends[p.id]);assert.ok(ratio(p.colors[0],PAGE_BG)>=1.5,p.id+' start '+ratio(p.colors[0],PAGE_BG));}
  assert.equal(getMapPalette('blue').negative[0],'#ebc6b0');assert.ok(ratio('#ebc6b0',PAGE_BG)>=1.5);assert.equal(getMapPalette('blue').negative.at(-1),'#b65020');
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
test('missing is a flat gray (no pattern): null stays missing, never the lowest value color, never 0',()=>{
  assert.equal(MISSING_BG,'#d7dee6');
  for(const p of mapPalettes){assert.equal(continuousPaletteColor(p,null),MISSING_BG);assert.equal(continuousPaletteColor(p,NaN),MISSING_BG);assert.notEqual(continuousPaletteColor(p,0),MISSING_BG)}
});

// CIEDE2000 색차: 결측 회색은 가장 낮은 값 색과 밝기 대비가 1.17로 가깝지만 색차는 크다(눈에 띄는 차이는 약 2.3 이상).
const lab=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const X=(c[0]*.4124564+c[1]*.3575761+c[2]*.1804375)/.95047,Y=c[0]*.2126729+c[1]*.7151522+c[2]*.072175,Z=(c[0]*.0193339+c[1]*.119192+c[2]*.9503041)/1.08883;
 const f=t=>t>216/24389?Math.cbrt(t):(24389/27*t+16)/116;return [116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))]};
const de2000=(h1,h2)=>{const [L1,a1,b1]=lab(h1),[L2,a2,b2]=lab(h2),rad=Math.PI/180,deg=180/Math.PI;
 const C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),Cb=(C1+C2)/2,G=.5*(1-Math.sqrt(Cb**7/(Cb**7+25**7)));
 const a1p=(1+G)*a1,a2p=(1+G)*a2,C1p=Math.hypot(a1p,b1),C2p=Math.hypot(a2p,b2);
 const hp=(b,a)=>{if(a===0&&b===0)return 0;const h=Math.atan2(b,a)*deg;return h<0?h+360:h};
 const h1p=hp(b1,a1p),h2p=hp(b2,a2p),dL=L2-L1,dC=C2p-C1p;let dh=0;if(C1p*C2p!==0){dh=h2p-h1p;if(dh>180)dh-=360;else if(dh<-180)dh+=360}
 const dH=2*Math.sqrt(C1p*C2p)*Math.sin(dh/2*rad),Lb=(L1+L2)/2,Cbp=(C1p+C2p)/2;let hb=h1p+h2p;
 if(C1p*C2p!==0){hb=Math.abs(h1p-h2p)<=180?(h1p+h2p)/2:(h1p+h2p<360?(h1p+h2p+360)/2:(h1p+h2p-360)/2)}else hb=h1p+h2p;
 const T=1-.17*Math.cos((hb-30)*rad)+.24*Math.cos(2*hb*rad)+.32*Math.cos((3*hb+6)*rad)-.2*Math.cos((4*hb-63)*rad);
 const dTh=30*Math.exp(-(((hb-275)/25)**2)),Rc=2*Math.sqrt(Cbp**7/(Cbp**7+25**7)),Sl=1+.015*(Lb-50)**2/Math.sqrt(20+(Lb-50)**2),Sc=1+.045*Cbp,Sh=1+.015*Cbp*T,Rt=-Math.sin(2*dTh*rad)*Rc;
 return Math.sqrt((dL/Sl)**2+(dC/Sc)**2+(dH/Sh)**2+Rt*(dC/Sc)*(dH/Sh))};

test('missing gray is perceptibly different from the lowest value color of every palette (CIEDE2000 >= 5)',()=>{
  for(const p of mapPalettes){const d=de2000(MISSING_BG,p.colors[0]);assert.ok(d>=5,p.id+' ΔE00 '+d.toFixed(2))}
  assert.ok(Math.abs(de2000(MISSING_BG,getMapPalette('blue').colors[0])-6.1)<.3);   // 기본 파랑 약 6.1
});
