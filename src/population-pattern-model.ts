export type PatternGroup={kind:'weekday'|'monthPart';key:string;label:string;dates:string[]};
export type PatternRegion={means:(number|null)[][];counts:(number|number[])[]};
export type PatternData={schemaVersion:number;month:string;age:string;sex:string;sourceUrl:string;dates:string[];groups:PatternGroup[];regions:Record<string,PatternRegion>;precision:number;notes:string[]};
export type PatternIndex={months:{month:string;dates:number;regions:number;sourceRows:number;files:{month:string;age:string;sex:string;path:string;bytes:number}[]}[]};
export function patternCell(data:PatternData|null,code:string,groupKey:string,hour:number){
 const index=data?.groups.findIndex(g=>g.key===groupKey)??-1,region=data?.regions[code],group=index>=0?data?.groups[index]:null;
 if(!region||!group||hour<0||hour>23)return{value:null,count:0,expected:group?.dates.length||0};
 const n=region.counts[index],count=typeof n==='number'?n:n?.[hour]||0,value=region.means[index]?.[hour]??null;
 return{value:count>0&&value!=null&&Number.isFinite(value)?value:null,count,expected:group.dates.length};
}
export function patternDifference(a:{value:number|null},b:{value:number|null}){return a.value==null||b.value==null?null:b.value-a.value}
export function patternGroupColors(value:number|null,max:number){return value==null?'#d7dee6':`rgb(${[217,230,242].map((v,i)=>Math.round(v+([23,74,122][i]-v)*(max>0?Math.max(0,Math.min(1,value/max)):0))).join(',')})`}
