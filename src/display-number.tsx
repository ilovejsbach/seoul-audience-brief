/** Display-only abbreviation. Never use the resulting text in calculations or CSV. */
export function exactNumber(value:number|null|undefined,unit=''):string{
 return value==null||!Number.isFinite(value)?'자료 없음':`${value.toLocaleString('ko-KR',{maximumFractionDigits:2})}${unit?' '+unit:''}`;
}
export function displayNumber(value:number|null|undefined,unit=''):string{
 if(value==null||!Number.isFinite(value))return '자료 없음';
 const size=Math.abs(value);
 const scale=unit==='원'?(size>=1e12?[1e12,'조']:size>=1e8?[1e8,'억']:size>=1e4?[1e4,'만']:null):(unit!=='지수'&&size>=1e8?[1e4,'만']:null);
 if(!scale)return `${value.toLocaleString('ko-KR',{maximumFractionDigits:unit==='지수'?2:0})}${unit?' '+unit:''}`;
 const [divisor,suffix]=scale as [number,string];
 return `${(value/divisor).toLocaleString('ko-KR',{maximumFractionDigits:2})}${suffix}${unit?' '+unit:''}`;
}
