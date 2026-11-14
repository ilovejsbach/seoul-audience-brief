export function validateMapRange(low:string|number,high:string|number,symmetric=false){
 const a=typeof low==='string'&&low.trim()===''?NaN:Number(low),b=typeof high==='string'&&high.trim()===''?NaN:Number(high);
 if(!Number.isFinite(a)||!Number.isFinite(b))return '최솟값과 최댓값에 유한한 숫자를 입력하세요.';
 if(a>=b)return '최솟값은 최댓값보다 작아야 합니다.';
 if(symmetric&&(a>=0||b<=0||Math.abs(a+b)>Math.max(1,Math.abs(a),Math.abs(b))*1e-10))return '증감 범위는 0을 중심으로 같은 폭을 사용합니다.';
 if(!symmetric&&a<0)return '규모 비교의 최솟값은 0 이상이어야 합니다.';
 return '';
}
export function mapRangePosition(value:number|null|undefined,low:number,high:number){if(value==null||!Number.isFinite(value))return null;const denominator=high/2-low/2,ratio=denominator>0?(value/2-low/2)/denominator:.5;return Math.max(0,Math.min(1,Number.isFinite(ratio)?ratio:value<=low?0:1))}
export function resizeMapRange(low:number,high:number,factor:number,symmetric=false){
 if(symmetric){const radius=Math.max(Number.MIN_VALUE,Math.max(Math.abs(low),Math.abs(high))*factor);return {low:-radius,high:radius}}
 const middle=low/2+high/2,radius=(high/2-low/2)*factor,nextLow=Math.max(0,middle-radius);return {low:nextLow,high:nextLow+(high-low)*factor};
}
