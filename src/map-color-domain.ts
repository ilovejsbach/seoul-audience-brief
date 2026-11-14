export type MapColorDomainMode='zero'|'observed';
export type MapColorDomain={low:number;high:number;observedMin:number|null;observedMax:number|null;hasValues:boolean;diverging:boolean;position:(value:number|null|undefined)=>number|null};
/** Linear map normalization only. Does not change or impute source observations. */
export function calculateMapColorDomain(values:readonly (number|null|undefined)[],mode:MapColorDomainMode='zero',paddingPercent=10):MapColorDomain{
 let min=Infinity,max=-Infinity;
 for(const v of values){if(typeof v!=='number'||!Number.isFinite(v))continue;min=Math.min(min,v);max=Math.max(max,v)}
 const hasValues=min!==Infinity,diverging=hasValues&&min<0;
 let low=0,high=1;
 const percent=Number.isFinite(paddingPercent)&&paddingPercent>=0?paddingPercent:10;
 if(hasValues){
  if(diverging){const extent=Math.max(Math.abs(min),Math.abs(max));low=-extent;high=extent}
  else if(mode==='observed'){
   const spread=max-min;
   const pad=spread===0?Math.max(Math.abs(min)*.1,1):spread*(percent/100);
   low=Math.max(0,min-pad);high=spread===0?max+pad:max;
   if(!Number.isFinite(low))low=0;
   if(!Number.isFinite(high))high=max;
  }else{low=0;high=max>0?max:1}
 }
 // Tiny floating-point intervals can collapse after subtraction/addition.
 if(low===high){low=Math.max(0,min-Math.max(Math.abs(min)*.1,1));high=max+Math.max(Math.abs(max)*.1,1);if(!Number.isFinite(high))high=max}
 const position=(value:number|null|undefined):number|null=>{
  if(value==null||!Number.isFinite(value))return null;
  // Half-range arithmetic avoids overflow when [-MAX_VALUE, MAX_VALUE] is valid.
  const halfLow=low/2,halfHigh=high/2;
  const denominator=halfHigh-halfLow;
  const ratio=denominator>0?(value/2-halfLow)/denominator:0.5;
  return Math.max(0,Math.min(1,Number.isFinite(ratio)?ratio:value<=low?0:1));
 };
 return {low,high,observedMin:hasValues?min:null,observedMax:hasValues?max:null,hasValues,diverging,position};
}
