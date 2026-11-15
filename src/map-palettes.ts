export type MapPaletteId='blue'|'teal'|'purple';
export type MapPalette={id:MapPaletteId;name:string;colors:readonly string[];negative:readonly string[];positive:readonly string[];neutral:string;stepNeutral:string;negativeEnd:string;positiveEnd:string;signLabel:string};
const orange=['#fae8d9','#f4c7a0','#eaa16a','#d77a3e','#b65020'];
export const mapPalettes:readonly MapPalette[]=[
 {id:'blue',name:'기본 파랑',colors:['#d9e6f2','#a9c5e0','#729ec7','#3d73a7','#174a7a'],negative:orange,positive:['#dce9f5','#afcce8','#7faad5','#4f83bc','#245c96'],neutral:'#f2f5f8',stepNeutral:'#f1f1ed',negativeEnd:'#b75a1b',positiveEnd:'#174a7a',signLabel:'음수 주황 · 양수 파랑'},
 {id:'teal',name:'청록',colors:['#e0efeb','#b2d4ca','#78b2a1','#3d8873','#125a46'],negative:['#f3e6ef','#dfbfd4','#c492b3','#9d658e','#753a66'],positive:['#e0efeb','#b2d4ca','#78b2a1','#3d8873','#125a46'],neutral:'#f2f5f8',stepNeutral:'#f1f1ed',negativeEnd:'#753a66',positiveEnd:'#125a46',signLabel:'음수 자주 · 양수 청록'},
 {id:'purple',name:'자주',colors:['#ece3f2','#cdb6df','#aa85c5','#81559f','#55316f'],negative:orange,positive:['#ece3f2','#cdb6df','#aa85c5','#81559f','#55316f'],neutral:'#f2f5f8',stepNeutral:'#f1f1ed',negativeEnd:'#b75a1b',positiveEnd:'#55316f',signLabel:'음수 주황 · 양수 자주'}
];
export const getMapPalette=(id:unknown)=>mapPalettes.find(p=>p.id===id)||mapPalettes[0];
export function blendPaletteColor(a:string,b:string,t:number){const position=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));const channel=(hex:string,i:number)=>parseInt(hex.slice(i,i+2),16);return `rgb(${[1,3,5].map(i=>Math.round(channel(a,i)+(channel(b,i)-channel(a,i))*position)).join(', ')})`}
export function continuousPaletteColor(palette:MapPalette,position:number|null,diverging=false,missing='#d7dee6'){
 if(position==null||!Number.isFinite(position))return missing;
 const t=Math.max(0,Math.min(1,position));
 return diverging?(t<.5?blendPaletteColor(palette.negativeEnd,palette.neutral,t*2):blendPaletteColor(palette.neutral,palette.positiveEnd,(t-.5)*2)):blendPaletteColor(palette.colors[0],palette.colors[4],t);
}
export const mapPaletteGradient=(palette:MapPalette,diverging=false,stepped=false)=>diverging?`linear-gradient(90deg,${stepped?palette.negative.at(-1):palette.negativeEnd},${stepped?palette.stepNeutral:palette.neutral},${stepped?palette.positive.at(-1):palette.positiveEnd})`:`linear-gradient(90deg,${stepped?palette.colors.join(','):[palette.colors[0],palette.colors[4]].join(',')})`;
