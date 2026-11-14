export type DomainMode = 'zero' | 'fit' | 'manual';
export type ChartDomain = {low:number;high:number;error?:string;clippedCount:number;zeroExcluded:boolean};

/** Receives already transformed display values. Missing/nonfinite observations are ignored. */
export function calculateDomain(
  values: readonly (number|null|undefined)[],
  mode: DomainMode = 'zero',
  minText: string = '',
  maxText: string = '',
): ChartDomain {
  const valid=values.filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));
  let observedLow=Infinity,observedHigh=-Infinity;
  for(const value of valid){observedLow=Math.min(observedLow,value);observedHigh=Math.max(observedHigh,value)}
  const result=(low:number,high:number,error?:string):ChartDomain=>({low,high,...(error?{error}:{}),clippedCount:valid.reduce((n,v)=>n+(v<low||v>high?1:0),0),zeroExcluded:low>0||high<0});
  const safe=(low:number,high:number)=>Number.isFinite(low)&&Number.isFinite(high)&&low<high&&Number.isFinite(high-low);
  const zero=(error?:string):ChartDomain=>{
    const low=valid.length?Math.min(0,observedLow):0;
    const high=valid.length?Math.max(0,observedHigh):1;
    if(low===high)return result(0,1,error);
    if(!safe(low,high))return result(0,1,error||'값의 범위가 너무 커서 기본 축으로 표시합니다.');
    return result(low,high,error);
  };
  if(mode==='manual'){
    const low=minText.trim()===''?NaN:Number(minText);
    const high=maxText.trim()===''?NaN:Number(maxText);
    if(!safe(low,high))return zero('최솟값과 최댓값을 유한한 숫자로 입력하고, 최솟값을 더 작게 설정하세요.');
    return result(low,high);
  }
  if(mode==='fit'&&valid.length){
    const spread=observedHigh-observedLow;
    // A constant series needs a visible nonzero interval as well.
    const padding=spread===0?Math.max(Math.abs(observedLow)*0.08,1):spread*0.08;
    const low=observedLow-padding,high=observedHigh+padding;
    if(!safe(low,high))return zero('자동 축 범위를 계산할 수 없어 0을 포함하는 축으로 표시합니다.');
    return result(low,high);
  }
  return zero();
}

/** Index values are already rebased to 100. Keep 100 centered, with explicit breathing room. */
export function calculateIndexDomain(values:readonly (number|null|undefined)[],paddingRatio=0.2):ChartDomain {
 const valid=values.filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));
 let deviation=0;for(const value of valid)deviation=Math.max(deviation,Math.abs(value-100));
 const padding=Number.isFinite(paddingRatio)?Math.max(0,paddingRatio):0.2;
 const radius=Math.max(1,deviation*(1+padding));
 if(!Number.isFinite(radius)||!Number.isFinite(100+radius)||!Number.isFinite(radius*2))return {low:99,high:101,error:'지수 범위가 너무 커서 기본 범위로 표시합니다.',clippedCount:valid.filter(v=>v<99||v>101).length,zeroExcluded:true};
 return {low:100-radius,high:100+radius,clippedCount:0,zeroExcluded:100-radius>0};
}
