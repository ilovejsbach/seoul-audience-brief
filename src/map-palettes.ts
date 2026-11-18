/** 결측 표시 색(바탕·줄무늬·간격). 모양은 map-missing.tsx가 그린다. */
export const MISSING_BG='#d7dee6',MISSING_STRIPE='#5b6b80',MISSING_PERIOD=6,MISSING_LINE=1.5;
export type MapPaletteId='blue'|'teal'|'purple';
export type MapPalette={id:MapPaletteId;name:string;colors:readonly string[];negative:readonly string[];positive:readonly string[];neutral:string;stepNeutral:string;negativeEnd:string;positiveEnd:string;signLabel:string};
/** A안(w39): 시작색을 배경(#f7f9fb) 대비 1.5:1 이상으로. 5단계는 시작색→끝색 직선 위 값이며 연속 채움(blendPaletteColor)과 같은 규칙이다. */
const orange=['#ebc6b0','#dea98c','#d18b68','#c36e44','#b65020'];
const tealColors=['#b9d3cc','#8fb5ab','#669789','#3c7868','#125a46'];
const purpleColors=['#d6c9df','#b6a3c3','#967da7','#75578b','#55316f'];
export const mapPalettes:readonly MapPalette[]=[
 {id:'blue',name:'기본 파랑',colors:['#bdd0e1','#94afc7','#6a8dae','#416c94','#174a7a'],negative:orange,positive:['#dce9f5','#afcce8','#7faad5','#4f83bc','#245c96'],neutral:'#f2f5f8',stepNeutral:'#f1f1ed',negativeEnd:'#b75a1b',positiveEnd:'#174a7a',signLabel:'음수 주황 · 양수 파랑'},
 {id:'teal',name:'청록',colors:tealColors,negative:['#f3e6ef','#dfbfd4','#c492b3','#9d658e','#753a66'],positive:tealColors,neutral:'#f2f5f8',stepNeutral:'#f1f1ed',negativeEnd:'#753a66',positiveEnd:'#125a46',signLabel:'음수 자주 · 양수 청록'},
 {id:'purple',name:'자주',colors:purpleColors,negative:orange,positive:purpleColors,neutral:'#f2f5f8',stepNeutral:'#f1f1ed',negativeEnd:'#b75a1b',positiveEnd:'#55316f',signLabel:'음수 주황 · 양수 자주'}
];
export const getMapPalette=(id:unknown)=>mapPalettes.find(p=>p.id===id)||mapPalettes[0];
export function blendPaletteColor(a:string,b:string,t:number){const position=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));const channel=(hex:string,i:number)=>parseInt(hex.slice(i,i+2),16);return `rgb(${[1,3,5].map(i=>Math.round(channel(a,i)+(channel(b,i)-channel(a,i))*position)).join(', ')})`}
export function continuousPaletteColor(palette:MapPalette,position:number|null,diverging=false,missing=MISSING_BG){
 if(position==null||!Number.isFinite(position))return missing;
 const t=Math.max(0,Math.min(1,position));
 return diverging?(t<.5?blendPaletteColor(palette.negativeEnd,palette.neutral,t*2):blendPaletteColor(palette.neutral,palette.positiveEnd,(t-.5)*2)):blendPaletteColor(palette.colors[0],palette.colors[4],t);
}
export const mapPaletteGradient=(palette:MapPalette,diverging=false,stepped=false)=>diverging?`linear-gradient(90deg,${stepped?palette.negative.at(-1):palette.negativeEnd},${stepped?palette.stepNeutral:palette.neutral},${stepped?palette.positive.at(-1):palette.positiveEnd})`:`linear-gradient(90deg,${stepped?palette.colors.join(','):[palette.colors[0],palette.colors[4]].join(',')})`;
