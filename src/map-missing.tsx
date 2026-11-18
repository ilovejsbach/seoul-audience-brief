import {useEffect,useId,useState,type RefObject} from 'react';
/**
 * 결측(자료 없음) 표시: 회색 바탕 + 사선 줄무늬. 값 0이나 가장 낮은 값 색과 구분하기 위한 모양이다.
 * 줄 간격은 화면 픽셀 고정이며(지도 확대·축소와 무관), 그러려면 이 패턴을 쓰는 쪽이
 * "SVG 사용자 단위 / 화면 픽셀" 비율(unitsPerPixel)을 넘겨야 한다.
 */
import {MISSING_BG,MISSING_STRIPE,MISSING_PERIOD,MISSING_LINE} from './map-palettes';
export {MISSING_BG,MISSING_STRIPE,MISSING_PERIOD,MISSING_LINE};
export const useMissingPatternId=()=>'map-missing-'+useId().replace(/:/g,'');
export const missingFill=(id:string)=>`url(#${id})`;
export function MissingPattern({id,unitsPerPixel=1}:{id:string;unitsPerPixel?:number}){
 const u=Number.isFinite(unitsPerPixel)&&unitsPerPixel>0?unitsPerPixel:1,size=MISSING_PERIOD*u;
 return <defs><pattern id={id} data-missing-pattern="true" patternUnits="userSpaceOnUse" width={size} height={size} patternTransform="rotate(45)"><rect width={size} height={size} fill={MISSING_BG}/><rect width={MISSING_LINE*u} height={size} fill={MISSING_STRIPE}/></pattern></defs>;
}
/** 범례 견본: 지도 무늬와 같은 색·간격·방향(CSS). */
export const missingSwatchBackground=`repeating-linear-gradient(135deg,${MISSING_STRIPE} 0 ${MISSING_LINE}px,${MISSING_BG} ${MISSING_LINE}px ${MISSING_PERIOD}px)`;
/** viewBox 한 변이 화면에서 몇 px인지(meet 기준)로 사용자 단위/픽셀 비율을 구한다. */
export function useUnitsPerPixel(root:RefObject<Element|null>,selector:string,viewW:number,viewH:number,zoom=1){
 const [scale,setScale]=useState(1);
 useEffect(()=>{
  const svg=root.current?.querySelector(selector);if(!svg)return;
  const update=()=>{const box=svg.getBoundingClientRect();const px=Math.min(box.width/viewW,box.height/viewH);if(px>0)setScale(1/px)};
  update();const observer=new ResizeObserver(update);observer.observe(svg);return()=>observer.disconnect();
 });
 return scale/Math.max(zoom,1e-6);
}
