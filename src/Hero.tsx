import './hero.css';
import {useMemo} from 'react';
import {geoMercator,geoPath} from 'd3-geo';
import {MARKET_AREA_COUNT} from './hero-summary';
export type HeroStats={days:number|null;first:string;last:string;dongs:number|null;periods:string[]|null};
type HeroProps={geo:any;stats:HeroStats;lastService:'region'|'market'|'transport'|null;onStart:(service:'region'|'market')=>void;onResume:()=>void};
const dateLabel=(d:string)=>d.length===8?`${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6)}`:d;
const quarter=(p:string)=>`${p.slice(0,4)}Q${p.slice(4)}`;
const pending='불러오는 중';
/** Start screen. Figures come from loaded data; nothing is shown as 0 before it arrives. */
export default function Hero({geo,stats,lastService,onStart,onResume}:HeroProps){
 const paths=useMemo(()=>{if(!geo?.features?.length)return [];const projection=geoMercator().fitSize([480,360],geo),path=geoPath(projection);return geo.features.map((f:any,i:number)=>({key:String(f.properties?.code||i),name:String(f.properties?.name||''),d:path(f)||''}))},[geo]);
 const resumeName=lastService==='market'?'상권 분석':lastService==='transport'?'교통':lastService==='region'?'지역 분석':'';
 const stat=(label:string,value:string,unit:string,note:string)=><div className="heroStat"><dt>{label}</dt><dd><strong>{value}</strong><span>{unit}</span></dd><p>{note}</p></div>;
 return <section className="heroHome" aria-label="서울 지역·상권 분석 소개">
  <div className="heroMain">
   <div className="heroCopy">
    <p className="heroEyebrow">서울 지역·상권 분석</p>
    <h1>서울의 흐름을, 광고 입지의 근거로</h1>
    <p className="heroSubtitle">지역의 인구·이동과 상권의 소비 수요를 비교해 판단을 돕습니다.</p>
    <div className="heroActions"><button className="primary" onClick={()=>onStart('region')}>지역 분석 시작</button><button onClick={()=>onStart('market')}>상권 분석 시작</button></div>
    <div className="heroContinue"><button disabled={!lastService} onClick={onResume}>이어보기</button><span>{lastService?`마지막으로 보던 ${resumeName} 화면으로 돌아갑니다.`:'분석을 시작하면 이 탭에서 이어볼 수 있습니다.'}</span></div>
   </div>
   <figure className="heroMap">
    <svg className="seoulSilhouette" viewBox="0 0 480 360" role="img" aria-labelledby="seoul-hero-title seoul-hero-desc"><title id="seoul-hero-title">서울 자치구 경계 실루엣</title><desc id="seoul-hero-desc">보유 자치구 경계를 단순화한 위치 안내입니다. 통계값에 따른 색상 지도는 아닙니다.</desc><g>{paths.map((p:{key:string;name:string;d:string})=><path key={p.key} d={p.d}><title>{p.name}</title></path>)}</g></svg>
    <figcaption>{paths.length?`자치구 ${paths.length}개 경계`:'경계를 불러오는 중'}</figcaption>
   </figure>
  </div>
  <dl className="heroStats" aria-label="현재 제공 범위">
   {stat('생활인구 일자',stats.days==null?pending:stats.days.toLocaleString('ko-KR'),stats.days==null?'':'일',stats.days==null?'기간 확인 중':`${dateLabel(stats.first)}–${dateLabel(stats.last)}`)}
   {stat('생활인구 분석 대상',stats.dongs==null?pending:stats.dongs.toLocaleString('ko-KR'),stats.dongs==null?'':'개 행정동','현행 행정동 기준')}
   {stat('보유 상권 경계',MARKET_AREA_COUNT.toLocaleString('ko-KR'),'곳','분기별 매출 관측 상권 수와 다름')}
   {stat('행정동·상권 매출',stats.periods==null?pending:String(stats.periods.length),stats.periods==null?'':'분기',stats.periods==null||!stats.periods.length?'기간 확인 중':`${quarter(stats.periods[0])}–${quarter(stats.periods[stats.periods.length-1])}`)}
  </dl>
 </section>;
}
