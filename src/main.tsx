import {DetailNavigationProvider,type DetailOption} from './DetailNavigation';
import {decodeStaticJson} from './static-json';
import PopulationPatterns from './PopulationPatterns';
import AnalysisDetailModal from './AnalysisDetailModal';
import RankingDisclosure from './RankingDisclosure';
import MapCandidateTray from './MapCandidateTray';
import DataMeaning from './DataMeaning';
import LayoutControls from './LayoutControls';
import AnalysisToolbarFrame from './AnalysisToolbarFrame';
import {meaningContent} from './data-meaning-content';
import TrendExplorer from './TrendExplorer';
import QuerySummary,{openQueryControl} from './QuerySummary';
import {SearchableSelect,QueryGroup,QueryMore} from './QueryControls';
import DistributionComparison from './DistributionComparison';
import ScenarioWorkbench from './ScenarioWorkbench';
import DemographicComparison from './DemographicComparison';
import ResidentContext from './ResidentContext';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { geoMercator, geoPath } from 'd3-geo';
import './fonts.css';
import './style.css';
import MapCanvas,{MapPanel} from './MapCanvas';
import {MapDataContext} from './MapDataContext';
import ExtraDashboard from './ExtraDashboard';
import Hero,{type HeroStats} from './Hero';
import AppShell from './AppShell';
import WorkspaceNav from './WorkspaceNav';
import DockableRanking from './DockableRanking';
import {SupportCandidates,SupportSource} from './SupportSections';
import {SupportContext} from './SupportContext';
import {detailOptionsOf,viewLabel} from './dataset-view-registry';
import MoreMenu,{type MoreItem} from './MoreMenu';
import {serviceOfView,type ServiceId} from './service-registry';
import MarketExplorer from './MarketExplorer';
import {MapPopup,focusControl,navigateSection,type PopupData} from './Navigation';
import TimeComparison from './TimeComparison';
import './time-comparison.css';
import './theme-overrides.css';
import './map.css';
import './hero.css';
import './app-shell.css';
import './workspace-nav.css';
import './support-column.css';
import './query-bar-fit.css';
import './layout-standard.css';
import './detail-navigation.css';
import './typography.css';
import './readability.css';
import './print.css';
import './fullscreen-map.css';
import './ux-priority-layout.css';
import './interaction-contrast.css';
import './analysis-type-scale.css';
import './presentation-type-scale.css';
import './map-workspace-shell.css';
import './map-candidate-tray.css';
import './long-content-layout.css';
import './analysis-navigation.css';
import './compact-floating-options.css';
import './compact-analysis-headings.css';
import './page-alignment.css';
import './tableau-query-integration.css';
import './full-screen-fixes.css';
import './compact-analysis-toolbar.css';
import './responsive-type-tokens.css';
import './integrated-analysis-header.css';
import './compact-detail-context.css';
type Region={code:string;name:string;districtCode?:string};
type Pop={columns:string[];rows:(string|number|null)[][]};
type IndexEntry={path:string;date:string;rows?:number};
type Generic={sourceUrl?:string;notes?:string[]|string;periods?:string[];records:Record<string,unknown>[]};
const base=import.meta.env?.BASE_URL || './';
async function load<T>(path:string):Promise<T>{try{const r=await fetch(base+path.replace(/^\//,''));if(!r.ok)throw new Error('request failed');return path.endsWith('.gz')?await decodeStaticJson<T>(new Uint8Array(await r.arrayBuffer())):await r.json()}catch{throw new Error('자료를 불러오지 못했습니다. 다른 날짜를 선택하거나 다시 시도해 주세요.')}}
const monthLabel=(m:string)=>`${m.slice(0,4)}년 ${Number(m.slice(4,6))}월`;
const number=(v:number|null|undefined)=>v==null?'자료 없음':Math.round(v).toLocaleString('ko-KR');
const hourLabel=(h:number)=>`${String(h).padStart(2,'0')}:00`;
const shortDate=(d:string)=>d.length===8?`${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6)}`:d;
function App(){
useEffect(()=>{let saved:{element:HTMLDetailsElement;wasOpen:boolean}[]=[];const before=()=>{if(saved.length)return;saved=[...document.querySelectorAll<HTMLDetailsElement>('details.dataNotes')].filter(element=>!element.closest('[hidden]')).map(element=>({element,wasOpen:element.open}));saved.forEach(({element})=>{element.open=true})};const after=()=>{saved.forEach(({element,wasOpen})=>{element.open=wasOpen});saved=[]};window.addEventListener('beforeprint',before);window.addEventListener('afterprint',after);return()=>{window.removeEventListener('beforeprint',before);window.removeEventListener('afterprint',after);after()}},[]);

const presentationStep=0;
const [analysisDetail,setAnalysisDetail]=useState<string|null>(null);
const [demographicOpen,setDemographicOpen]=useState(false),[residentContextOpen,setResidentContextOpen]=useState(false);
const [reloadToken,setReloadToken]=useState(0);
const [mode,setMode]=useState<'analysis'|'presentation'>('analysis'),[detailsOpen,setDetailsOpen]=useState(false);
const [marketOpened,setMarketOpened]=useState(false);
// Left menu open state is kept per region mode: analysis starts open, presentation starts collapsed; after that the user's choice stays (decision a).
const [leftOpen,setLeftOpen]=useState({analysis:true,presentation:false});
// Right support column: one open/closed state for the whole region service (both modes); tab-session only.
const [rightOpen,setRightOpen]=useState(true),[supportHost,setSupportHost]=useState<HTMLElement|null>(null);
const [ratioShare,setRatioShare]=useState<number|null>(null);
useEffect(()=>{const change=(event:Event)=>setRightOpen((event as CustomEvent).detail!=='hidden');const ratio=(event:Event)=>{const detail=(event as CustomEvent).detail;setRatioShare(detail==null?null:Number(detail))};window.addEventListener('secondary-mode',change);window.addEventListener('workspace-map-share',ratio);return()=>{window.removeEventListener('secondary-mode',change);window.removeEventListener('workspace-map-share',ratio)}},[]);
useEffect(()=>{const restore=()=>{setRatioShare(null);setRightOpen(true);setLeftOpen(state=>({...state,[mode]:true}))};window.addEventListener('workspace-layout-restore',restore);return()=>window.removeEventListener('workspace-layout-restore',restore)},[mode]);
const leaveMapFullscreen=async()=>{if(document.fullscreenElement){try{await document.exitFullscreen()}catch{/* Already closed by the browser. */}}window.dispatchEvent(new Event('exit-map-fullscreen'))};
const openMarket=async()=>{await leaveMapFullscreen();setMarketOpened(true);setLastService('market');setView('map');setPopup(null)};
const openRegion=async()=>{await leaveMapFullscreen();setLastService('region');setView('analysis');setPopup(null)};
const selectService=(id:ServiceId)=>{if(id==='region')void openRegion();else if(id==='market')void openMarket()};
const [view,setView]=useState('overview'),[lastService,setLastService]=useState<'region'|'market'|null>(null),[popup,setPopup]=useState<PopupData|null>(null);
const [tab,setTab]=useState('population'),[index,setIndex]=useState<IndexEntry[]>([]),[date,setDate]=useState(''),[hour,setHour]=useState(18),[target,setTarget]=useState('all'),[district,setDistrict]=useState('all'),[dong,setDong]=useState('all'),[compare,setCompare]=useState<string[]>([]),[regions,setRegions]=useState<{districts:Region[];dongs:Region[]}>({districts:[],dongs:[]}),[geo,setGeo]=useState<any>(null),[dongGeo,setDongGeo]=useState<any>(null),[populationResponse,setPop]=useState<{date:string;data:Pop}|null>(null),[mobility,setMobility]=useState<Generic|null>(null),[arrival,setArrival]=useState<Generic|null>(null),[migration,setMigration]=useState<Generic|null>(null),[period,setPeriod]=useState(''),[commerce,setCommerce]=useState<Generic|null>(null),[metric,setMetric]=useState('inflow'),[salesBand,setSalesBand]=useState(-1),[sex,setSex]=useState('all'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[extraErrors,setExtraErrors]=useState<Record<string,string>>({});
const sharedDetailFlow=true;
const openPopulationDetail=(id:string)=>{setPopup(null);setAnalysisDetail(id);if(id==='resident-context')setResidentContextOpen(true);if(id==='demographic-population')setDemographicOpen(true)};
const populationNavigate=(id:string,step:number)=>{if(sharedDetailFlow&&['trend-population','population-patterns','resident-context','demographic-population','shortlist-population','scenario-population','distribution-population','time-compare-population'].includes(id)){openPopulationDetail(id);return}setAnalysisDetail(null);navigateSection(id,step)};
useEffect(()=>{setAnalysisDetail(null)},[tab,view]);
// A new date must never render the previous response under its new title.
const pop=populationResponse?.date===date?populationResponse.data:null;
const retryBoundaries=()=>Promise.all([load<any>('data/dongs.geojson'),load<any>('data/dongs-metadata.json')]).then(([g,m])=>setDongGeo({...g,metadata:m})).catch(()=>setDongGeo(null));
useEffect(()=>{retryBoundaries()},[]);
useEffect(()=>{Promise.all([load<IndexEntry[]>('data/population/index.json?v=daily-20260101-20261112'),load<typeof regions>('data/regions.json'),load<any>('data/districts.geojson')]).then(([i,r,g])=>{setIndex(i);setDate(i.at(-1)?.date||'');setRegions(r);setGeo(g)}).catch(e=>{setError(e.message);setLoading(false)});for(const [key,path,setter] of [['mobility','living-mobility',setMobility],['arrival','living-mobility-arrival',setArrival],['migration','residential-migration',setMigration],['commerce','commerce',setCommerce]] as const){load<Generic>(`data/${path}.json${key==='commerce'?'?v=dong-sales-2026q2-names-20261117':''}`).then(setter).catch(()=>setExtraErrors(p=>({...p,[key]:'원본 자료 확보·정리 중입니다. 확보되지 않은 수치는 표시하지 않습니다.'}))) }},[]);
useEffect(()=>{if(!date)return;let active=true;setLoading(true);setError('');setPop(null);const entry=index.find(x=>x.date===date);if(entry){let path=entry.path.replace(/^public\//,'').replace(/^data\/prepared\/population\//,'data/population/');load<Pop>(path).then(p=>{if(active)setPop({date,data:p})}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})}return()=>{active=false}},[date,index,reloadToken]);
useEffect(()=>{const show=()=>setDetailsOpen(true);window.addEventListener('show-analysis-controls',show);return()=>window.removeEventListener('show-analysis-controls',show)},[]);
useEffect(()=>setPopup(null),[date,hour,sex,target]);
const districtByCode=useMemo(()=>new Map(regions.districts.map(r=>[r.code,r])),[regions]);const dongByCode=useMemo(()=>new Map(regions.dongs.map(r=>[r.code,r])),[regions]);
const getDistrict=(code:string)=>dongByCode.get(code)?.districtCode||code.slice(0,5);
const targetIndices=useMemo(()=>{if(!pop)return[];if(target==='all'&&sex==='all')return[3];return pop.columns.flatMap((col,i)=>{if(i<4)return[];if(sex==='male'&&!col.startsWith('남자'))return[];if(sex==='female'&&!col.startsWith('여자'))return[];if(target==='all')return[i];const m=col.match(/(\d+)[~세]/);const age=m?Number(m[1]):-1;return target==='young'&&age>=20&&age<40||target==='middle'&&age>=40&&age<60||target==='senior'&&age>=60?[i]:[]})},[pop,target,sex]);
const valueOf=(r:(string|number|null)[])=>{const v=targetIndices.map(i=>r[i]);return !v.length||v.some(x=>x==null)?null:v.reduce<number>((s,x)=>s+Number(x),0)};
const hourRows=useMemo(()=>pop?.rows.filter(r=>Number(r[1])===hour)||[],[pop,hour]);
const aggregate=(rows:(string|number|null)[][],level:'district'|'dong')=>{const out=new Map<string,number|null>();for(const r of rows){const code=String(r[2]).trim();const key=level==='district'?getDistrict(code):code;const value=valueOf(r);out.set(key,value==null||out.get(key)===null?null:(out.get(key)||0)+value)}return out};
const districtValues=useMemo(()=>aggregate(hourRows,'district'),[hourRows,regions,targetIndices]);
const dongValues=useMemo(()=>aggregate(hourRows,'dong'),[hourRows,targetIndices]);
const selectedName=dong!=='all'?(dongByCode.get(dong)?.name||dong):district!=='all'?(districtByCode.get(district)?.name||district):'서울 전체';
const selectedRows=useMemo(()=>pop?.rows.filter(r=>(district==='all'||getDistrict(String(r[2]).trim())===district)&&(dong==='all'||String(r[2]).trim()===dong))||[],[pop,district,dong,regions]);
const curve=useMemo(()=>Array.from({length:24},(_,h)=>{const values=selectedRows.filter(r=>Number(r[1])===h).map(valueOf);return values.length&&values.every(v=>v!=null)?values.reduce<number>((s,v)=>s+(v||0),0):null}),[selectedRows,targetIndices]);
const rank=useMemo(()=>[...(district==='all'?districtValues:dongValues)].filter(([code])=>district==='all'||getDistrict(code)===district).map(([code,value])=>({code,value,name:(district==='all'?districtByCode:dongByCode).get(code)?.name||code})).sort((a,b)=>(b.value||0)-(a.value||0)),[districtValues,dongValues,district,regions]);
const max=Math.max(1,...[...districtValues.values()].filter((x):x is number=>x!=null));
const path=useMemo(()=>geo?geoPath(geoMercator().fitExtent([[25,25],[735,525]],geo)):null,[geo]);
const toggleCompare=(code:string)=>setCompare(c=>c.includes(code)?c.filter(x=>x!==code):c.length<3?[...c,code]:c);
const selectMapPopulationRegion=(region:PopupData)=>{if(region.code.length===5){setDistrict(region.code);setDong('all')}else{setDistrict(getDistrict(region.code));setDong(region.code)}setPopup(region)};
const selectPopulationRegion=(code:string,destination?:'map'|'trend')=>{setPopup(null);const current=dong==='all'?district:dong;if(code==='all'){setDistrict('all');setDong('all');populationNavigate('map-population',0);return}if(code.length===5){setDistrict(code);setDong('all');const trend=destination?destination==='trend':code===current;populationNavigate(trend?'trend-population':'map-population',trend?1:0)}else{const parent=getDistrict(code);window.dispatchEvent(new CustomEvent('map-district-detail',{detail:parent}));setDistrict(parent);setDong(code);populationNavigate('trend-population',1)}};
// Query changes preserve the current map/analysis/candidate screen.
const setPopulationQueryRegion=(code:string)=>{setPopup(null);if(code==='all'){setDistrict('all');setDong('all')}else if(code.length===5){setDistrict(code);setDong('all')}else{setDistrict(getDistrict(code));setDong(code)}};
const clearPopulationQueryRegion=()=>{window.dispatchEvent(new CustomEvent('query-region-clear',{detail:'population'}));setPopulationQueryRegion('all')};
const compareSelectedPopulation=()=>{const code=dong==='all'?district:dong;if(code==='all')return;setPopup(null);if(!compare.includes(code)&&compare.length<3)setCompare(c=>c.includes(code)||c.length>=3?c:[...c,code]);populationNavigate('shortlist-population',2)};
const candidatePopulation=(code:string)=>({code,name:code.length===5?(districtByCode.get(code)?.name||code):[districtByCode.get(getDistrict(code))?.name,dongByCode.get(code)?.name||code].filter(Boolean).join(' '),value:(code.length===5?districtValues:dongValues).get(code)??null});
const knownHours=curve.filter((v):v is number=>v!=null);const peakValue=knownHours.length?Math.max(...knownHours):null;const previousPopulation=hour>0?curve[hour-1]:null;const populationDelta=curve[hour]==null||previousPopulation==null?null:curve[hour]!-previousPopulation;
const distributionFrames=useMemo(()=>Array.from({length:24},(_,h)=>{const rows=pop?.rows.filter(r=>Number(r[1])===h)||[];const vals=aggregate(rows,district==='all'?'district':'dong');return {hour:h,regions:[...vals].filter(([code])=>district==='all'||getDistrict(code)===district).map(([code,value])=>({code,name:(district==='all'?districtByCode:dongByCode).get(code)?.name||code,value}))}}),[pop,district,regions,targetIndices]);
const distributionGeo=useMemo(()=>{if(district==='all')return geo?{...geo,features:geo.features.map((f:any)=>({...f,properties:{...f.properties,code:regions.districts.find(r=>r.name===f.properties.name)?.code||f.properties.code}}))}:null;return dongGeo?{...dongGeo,features:dongGeo.features.filter((f:any)=>String(f.properties.districtCode||f.properties.code?.slice(0,5))===district)}:null},[geo,dongGeo,district,regions]);
const currentExtra=tab==='mobility'?mobility:tab==='commerce'?commerce:migration;const exportCSV=()=>{const visible=dong==='all'?rank:rank.filter(r=>r.code===dong);const rows=[['기준일','시간','지역코드','지역','인구(명)','연령조건','성별조건','비고'],...visible.map(r=>[date,hour,r.code,r.name,r.value??'',target,sex,r.value==null?'비공개 또는 자료 없음':''])];const csv='\uFEFF'+rows.map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`seoul-population-${date}-${hour}-${target}-${sex}.csv`;a.click();URL.revokeObjectURL(url)};
useEffect(()=>setPopup(null),[date,hour,target,sex]);
const resumeLast=()=>{if(lastService==='market')void openMarket();else void openRegion()};
const goOverview=async()=>{await leaveMapFullscreen();setView('overview');setPopup(null);window.scrollTo({top:0,behavior:'smooth'})};
const targetLabel=({all:'전체 연령',young:'20–39세',middle:'40–59세',senior:'60세 이상'} as Record<string,string>)[target];const sexLabel=sex==='male'?'남성':sex==='female'?'여성':'전체 성별';
const selectMapData=async(key:string)=>{
 const fallback=!!document.querySelector('.mapOverlay:not([hidden])');
 setTab(key);setPopup(null);
 // The browser fullscreen host is the persistent app, not a dataset's hidden panel.
 await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
 window.dispatchEvent(new CustomEvent('map-fullscreen-transfer',{detail:{fallback}}));
};
const populationQueryItems=[
 {id:'population-date-chip',label:'기준일',value:date?shortDate(date):'자료 확인 중',controlId:'population-date'},
 {id:'population-hour-chip',label:'시각',value:hourLabel(hour),controlId:'population-query-hour'},
 {id:'population-region-chip',label:'분석 지역',value:selectedName,controlId:dong==='all'?'population-query-district':'population-dong',onClear:district!=='all'||dong!=='all'?clearPopulationQueryRegion:undefined},
 {id:'population-age-chip',label:'연령',value:targetLabel,controlId:'population-query-age',onClear:target!=='all'?()=>setTarget('all'):undefined},
 {id:'population-sex-chip',label:'성별',value:sexLabel,controlId:'population-query-sex',onClear:sex!=='all'?()=>setSex('all'):undefined}
];
const populationQuerySummary=<QuerySummary items={populationQueryItems} label="생활인구 현재 조회 조건" maxVisible={5}/>;
const queryControls=<section className="controls focusedQueryControls" aria-label="생활인구 조회 조건 편집">
 <QueryGroup title="기간" defaultOpen>
  <label>기준일<input id="population-date" type="date" aria-label="기준일" value={`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`} min={index[0]?.date.replace(/(....)(..)(..)/,'$1-$2-$3')} max={index.at(-1)?.date.replace(/(....)(..)(..)/,'$1-$2-$3')} onChange={e=>{const next=e.target.value.replaceAll('-','');if(index.some(x=>x.date===next))setDate(next)}} onBlur={e=>{const next=e.target.value.replaceAll('-','');if(index.some(x=>x.date===next))setDate(next)}}/></label>
  <label>시각<select id="population-query-hour" value={hour} onChange={e=>setHour(Number(e.target.value))}>{Array.from({length:24},(_,h)=><option key={h} value={h}>{hourLabel(h)}</option>)}</select></label>
  <details className="queryQuickTime"><summary aria-label="시간 빠르게 이동" title="시간 빠르게 이동">시간 빠르게 이동</summary><div className="queryTimeScrubber"><button aria-label="이전 시간" onClick={()=>setHour(h=>(h+23)%24)}>←</button><label><span>{hourLabel(hour)}</span><input id="population-hour" aria-label="시간대 선택" type="range" min="0" max="23" value={hour} onChange={e=>setHour(Number(e.target.value))}/></label><button aria-label="다음 시간" onClick={()=>setHour(h=>(h+1)%24)}>→</button></div></details>
 </QueryGroup>
 <QueryGroup title="지역" defaultOpen>
  <SearchableSelect id="population-query-district" label="자치구" value={district} onChange={setPopulationQueryRegion} options={[{value:'all',label:'서울 전체'},...regions.districts.map(r=>({value:r.code,label:r.name+(pop&&districtValues.get(r.code)==null?' · 자료 없음':'')}))]}/>
  <SearchableSelect id="population-dong" label="행정동" value={dong} disabled={district==='all'} onChange={value=>setPopulationQueryRegion(value==='all'?district:value)} options={[{value:'all',label:district==='all'?'자치구를 먼저 선택하세요':'동 전체'},...regions.dongs.filter(r=>r.districtCode===district).map(r=>({value:r.code,label:r.name+(pop&&dongValues.get(r.code)==null?' · 자료 없음':'')}))]}/>
 </QueryGroup>
 <QueryMore title="분석 대상 조건" changed={(target!=='all'?1:0)+(sex!=='all'?1:0)} summary={`연령 ${targetLabel} · 성별 ${sexLabel}`}>
  <label>연령<select id="population-query-age" value={target} onChange={e=>setTarget(e.target.value)}><option value="all">전체 연령</option><option value="young">20–39세</option><option value="middle">40–59세</option><option value="senior">60세 이상</option></select></label>
  <label>성별<select id="population-query-sex" value={sex} onChange={e=>setSex(e.target.value)}><option value="all">전체 성별</option><option value="male">남성</option><option value="female">여성</option></select></label>
 </QueryMore>
</section>;
const detailOptions:DetailOption[]=detailOptionsOf(tab);
const chooseDetail=(id:string)=>{if(tab==='population')openPopulationDetail(id);else setAnalysisDetail(id)};
const populationSourceInfo=(<div className="source"><b>출처 · 서울 열린데이터광장</b><a href="https://data.seoul.go.kr/dataList/OA-23016/S/1/datasetView.do" target="_blank" rel="noreferrer">[내국인] 행정동별 서울 생활인구(250m) ↗</a><p>통신데이터 기반 추계 인구입니다. 외국인은 포함하지 않으며 광고 노출·도달·구매자 수를 의미하지 않습니다. 비식별·결측값은 0으로 바꾸지 않습니다. 선택 성별·연령의 일부 값이 비공개이면 지역 합계도 자료 없음으로 표시합니다. 직업별 분석은 별도 조사자료가 필요합니다. 지도 경계의 기준연도와 통계 기준연도를 구분합니다. 경계가 연결되지 않은 지역은 회색입니다.</p></div>);
const analysisToolbar=(<AnalysisToolbarFrame><section className="analysisHeading accessibleAnalysisTitle"><div><h1>{({population:"생활인구 분포 분석",mobility:"지역 간 생활이동 분석",migration:"거주지 전입·전출 분석",commerce:"행정동 추정매출 분석"} as Record<string,string>)[tab]}</h1></div></section></AnalysisToolbarFrame>);
const service=serviceOfView(view);
// Keep keyboard focus useful when the right support column folds or reopens (w37c).
// Fold: focus the visible "보조정보" button that reopens it. Reopen: focus the first control of the panel.
// Only when focus was in the column, on its toggle, or already lost (body); never steal it from another control.
const previousRightOpen=useRef(rightOpen);
useEffect(()=>{
 if(previousRightOpen.current===rightOpen)return;
 previousRightOpen.current=rightOpen;
 if(view!=='analysis')return;
 const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const active=document.activeElement,host=document.getElementById('region-support-host');
  const visible=(element:Element)=>element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden';
  const toggles=[...document.querySelectorAll<HTMLElement>('.supportToggle')].filter(visible);
  const mine=!active||active===document.body||!!host?.contains(active)||toggles.includes(active as HTMLElement);
  if(!mine)return;
  if(rightOpen){const fold=host?.querySelector<HTMLElement>('button[aria-label="보조정보 접기"]'),first=fold&&visible(fold)?fold:host?[...host.querySelectorAll<HTMLElement>('button,[href],input,select,[tabindex]:not([tabindex="-1"])')].find(visible):undefined;first?.focus({preventScroll:true})}
  else toggles[0]?.focus({preventScroll:true});
 }));
 return()=>cancelAnimationFrame(frame);
},[rightOpen,view]);
const heroDates=[...new Set(index.map(entry=>entry.date))].sort();
const heroStats:HeroStats={days:heroDates.length?heroDates.length:null,first:heroDates[0]||'',last:heroDates[heroDates.length-1]||'',dongs:regions.dongs.length?regions.dongs.filter(region=>(region as {activePopulation?:boolean}).activePopulation!==false).length:null,periods:commerce?.periods?.length?commerce.periods:null};
const modeControl=view==='analysis'?<div className="modeToggle" aria-label="대시보드 모드"><button aria-pressed={mode==='analysis'} onClick={()=>setMode('analysis')}>분석용</button><button aria-pressed={mode==='presentation'} onClick={()=>setMode('presentation')}>시연용</button></div>:null;
const moreItems:MoreItem[]=[
 {id:'print',label:'브리핑 인쇄',visible:true,onSelect:()=>window.print()},
 {id:'home',label:'시작 화면',visible:view!=='overview',onSelect:()=>{void goOverview()}},
 {id:'evidence',label:detailsOpen?'근거 정보 접기':'근거 정보 보기',visible:view==='analysis'&&mode==='presentation',onSelect:()=>setDetailsOpen(value=>!value)},
 {id:'layout',label:'화면 배치',visible:view==='analysis',custom:<LayoutControls/>}
];
// I04: market has no mode. The root class is DERIVED (market = fixed analysis type scale); the region `mode` state is never written here.
return <MapDataContext.Provider value={{selected:tab,select:selectMapData}}><SupportContext.Provider value={{host:supportHost,expected:true,open:rightOpen,setOpen:setRightOpen,hostId:'region-support-host'}}><div data-detail-system="shared" data-service={service} className={`app mode-${service==='region'?mode:'analysis'} service-${service} presentation-step-0${detailsOpen?' details-open':''}`}><AppShell service={service} headerClass={view==='analysis'?'integratedAnalysisHeader':view==='map'?'integratedMarketHeader':undefined} onSelect={selectService} onHome={()=>{void goOverview()}} modeControl={modeControl} tools={<MoreMenu items={moreItems}/>} serviceRow={view==='analysis'?analysisToolbar:null}>
<main>{marketOpened&&<div hidden={view!=='map'}><MarketExplorer active={view==='map'} onClose={()=>{setAnalysisDetail(null);setLastService('region');setView('analysis')}} analysis={sharedDetailFlow}/></div>}{view==='overview'&&<Hero geo={geo} stats={heroStats} lastService={lastService} onStart={selectService} onResume={resumeLast}/>}<DetailNavigationProvider options={detailOptions} value={analysisDetail} onChange={chooseDetail}><div hidden={view!=='analysis'} className="regionBody" data-nav-collapsed={!leftOpen[mode]} data-support-open={rightOpen} data-ratio={ratioShare!=null} style={ratioShare!=null?{'--support-share':ratioShare} as React.CSSProperties:undefined}><WorkspaceNav dataset={tab} view={analysisDetail||'map'} collapsed={!leftOpen[mode]} onToggle={()=>setLeftOpen(state=>({...state,[mode]:!state[mode]}))} onSelectDataset={key=>{setTab(key);setPopup(null);requestAnimationFrame(()=>navigateSection(`map-${key}`,0))}} onSelectView={id=>{if(id==='map'){if(tab==='population')populationNavigate('map-population',0);else{setAnalysisDetail(null);navigateSection(`map-${tab}`,0)}}else chooseDetail(id)}}/><div hidden={view!=='analysis'} className="analysisView">
<div id="active-query-summary" className="detailQuerySummary"/>
<div className="dashboardContent"><div hidden={tab!=='population'}>
{error&&<div className="notice error" role="alert">{error} <button onClick={()=>index.length?setReloadToken(n=>n+1):window.location.reload()}>같은 조건 다시 불러오기</button></div>}{loading&&<div className="notice">실제 통계 파일을 불러오고 있습니다…</div>}
<div id="map-population" className="workspace"><MapPanel queryKey="population" queryLayout="focused" controls={queryControls}><div className="panelTitle"><div className="resultTitleWithMeaning"><h2>지역별 생활인구 비교</h2><DataMeaning term="생활인구 자료 설명·출처·해석 기준" definition="" interpretation="" buttonLabel="ⓘ" ariaLabel="생활인구 자료 설명·출처·해석 기준" content={populationSourceInfo}/></div><button className="queryExportAction" disabled={loading||!!error||!pop} onClick={exportCSV}>표 내려받기</button></div><div className="mapWrap"><MapCanvas queryScope="population" querySummary={populationQuerySummary} candidateControls={<MapCandidateTray items={compare.map(candidatePopulation)} unit="명" onRemove={toggleCompare} onOpen={()=>populationNavigate('shortlist-population',2)}/>} emptyReason={loading?'실제 통계 파일을 불러오는 중입니다.':error?'자료를 불러오지 못했습니다. 날짜를 다시 선택하세요.':target!=='all'||sex!=='all'?'선택 성별·연령에 비공개값이 포함된 지역은 합계를 계산하지 않고 자료 없음으로 표시합니다.':undefined} contextLabel={`${shortDate(date)} · ${hourLabel(hour)} · ${targetLabel} · ${sexLabel}`} selectedRegionName={selectedName} unit="명" geo={geo} dongGeo={dongGeo} district={district} selectedCode={dong==='all'?district:dong} onRetry={retryBoundaries} resolve={(feature,isDong)=>{const code=String(feature.properties.code);const reg=isDong?dongByCode.get(code):regions.districts.find(r=>r.name===feature.properties.name);return {code:reg?.code||code,name:feature.properties.name,value:(isDong?dongValues:districtValues).get(reg?.code||code)??null,available:(isDong?dongValues:districtValues).has(reg?.code||code)}}} onPreview={selectMapPopulationRegion}/>{pop&&popup&&<MapPopup region={popup} unit="명" context={`${shortDate(date)} · ${hourLabel(hour)} · ${targetLabel} · ${sexLabel}`} source="https://data.seoul.go.kr/dataList/OA-23016/S/1/datasetView.do" onClose={()=>setPopup(null)} detailHint={popup.code.length>5?'선택 동의 시간대별 규모와 변화를 확인합니다':'구별 동 분포를 확인하고 선택 지역의 추이로 이어갑니다'} onDetail={()=>selectPopulationRegion(popup.code,popup.code.length>5?'trend':'map')} onCompare={()=>{toggleCompare(popup.code);setPopup(null)}} canCompare={compare.includes(popup.code)||compare.length<3} chosen={compare.includes(popup.code)}/>}</div></MapPanel>
<DockableRanking active={view==='analysis'&&tab==='population'}><section className="linkedMetricSummary selectedRegionInsights" aria-label="선택 지역 핵심 지표" data-selected-code={dong==='all'?district:dong}><div className="linkedMetricHeading"><b>{selectedName}</b><span>{shortDate(date)} · {hourLabel(hour)} · {targetLabel} · {sexLabel}</span></div><div className="metrics linkedMetrics compactKPIInsights"><div><span>선택 시각의 생활인구</span><DataMeaning {...meaningContent.population}/><strong>{number(curve[hour])}{curve[hour]!=null&&<small>명</small>}</strong></div><details className="insightComparisons"><summary>비교 지표</summary><div className="secondaryKPIInsights"><div><span>공개된 시간대 중 최대</span><DataMeaning term="공개 시간대 중 최대" definition={`${knownHours.length}/24개 공개 시간대에서만 가장 큰 값을 찾습니다.`} interpretation="같은 날짜와 타깃에서 규모가 큰 시간을 찾는 참고 지표입니다." caution="비공개 시간이 있으면 하루 전체의 최대 시간이라고 단정할 수 없습니다."/><strong>{curve.some(x=>x!=null)?hourLabel(curve.indexOf(Math.max(...curve.map(x=>x??-1)))):'—'}</strong><p>{knownHours.length}/24개 시간 공개 · {number(peakValue)}{peakValue!=null?'명':''}</p></div><div><span>직전 시간 대비 인구 차이</span><DataMeaning term="직전 시간 대비 인구 차이" definition="선택 시간의 생활인구에서 같은 날짜 직전 시간의 생활인구를 뺀 값입니다." interpretation="양수는 머무는 추계 인구 증가, 음수는 감소입니다." caution="실제 입장·퇴장 건수나 광고 효과가 아닙니다. 00시의 같은 날짜 직전 값은 계산하지 않습니다."/><strong>{populationDelta!=null&&populationDelta>0?'+':''}{number(populationDelta)}{populationDelta!=null&&<small>명</small>}</strong><p>{hour>0?`${hourLabel(hour-1)} → ${hourLabel(hour)} · 같은 조건의 차이`:'00시에는 같은 날짜의 직전 시점이 없습니다'}</p></div></div></details></div></section><SupportCandidates items={compare.map(candidatePopulation)} unit="명" selectedCode={dong==='all'?district:dong} onAdd={()=>toggleCompare(dong==='all'?district:dong)} onRemove={toggleCompare} onOpen={()=>populationNavigate('shortlist-population',2)}/><div className="panelTitle"><div><h2>{district==='all'?'서울 자치구 비교':`${districtByCode.get(district)?.name||''} 행정동 비교`}</h2></div><span className="muted">명</span></div><p className="helper">지역명을 눌러 상세 보기 · +로 최대 3곳 비교</p><div className="rankList">{rank.map((r,i)=><div className={`rankRow${r.code===(dong==='all'?district:dong)?' isSelected':''}`} key={r.code}><span className="rankNumber">{String(i+1).padStart(2,'0')}</span><button className="rankName" onClick={()=>selectPopulationRegion(r.code)}><span>{r.name}</span><i style={{width:`${Math.max(2,(r.value||0)/(rank[0]?.value||1)*100)}%`}}/></button><strong>{number(r.value)}</strong><button className={'addCompare '+(compare.includes(r.code)?'chosen':'')} aria-label={`${r.name} 비교 ${compare.includes(r.code)?'해제':'추가'}`} disabled={!compare.includes(r.code)&&compare.length>=3} onClick={()=>toggleCompare(r.code)}>{compare.includes(r.code)?'✓':'+'}</button></div>)}</div><SupportSource note="시점 추계이며 광고 노출이 아닙니다."><DataMeaning term="생활인구 자료 설명·출처·해석 기준" definition="" interpretation="" buttonLabel="출처·해석 보기" ariaLabel="생활인구 출처·해석 기준 보기" content={populationSourceInfo}/></SupportSource><RankingDisclosure/></DockableRanking></div>

<AnalysisDetailModal analysis={sharedDetailFlow} open={analysisDetail==='scenario-population'} title={viewLabel('scenario-population')} onClose={()=>setAnalysisDetail(null)}><div id="scenario-population"><ScenarioWorkbench embedded={sharedDetailFlow} disabled={loading||!!error||!pop} current={{dataset:'생활인구',unit:'명',region:selectedName,period:shortDate(date),value:curve[hour],summary:`${hourLabel(hour)} · ${targetLabel} · ${sexLabel}`,conditions:{date,hour,target,sex,district,dong}}} onApply={s=>{setDate(String(s.conditions.date));setHour(Number(s.conditions.hour));setTarget(String(s.conditions.target));setSex(String(s.conditions.sex));setDistrict(String(s.conditions.district));setDong(String(s.conditions.dong));if(sharedDetailFlow)populationNavigate('map-population',0)}}/></div></AnalysisDetailModal><AnalysisDetailModal analysis={sharedDetailFlow} open={analysisDetail==='trend-population'} title={viewLabel('trend-population')} onClose={()=>setAnalysisDetail(null)}><TrendExplorer sourceDetails={populationSourceInfo} id="trend-population" interpretationNote="시점별 추계 · 일 고유 방문자 아님" supplementaryActions={[
 {label:'요일·월중 특성',onSelect:()=>populationNavigate('population-patterns',1)},
 {label:'체류·거주 기반',onSelect:()=>{setResidentContextOpen(true);populationNavigate('resident-context',1)}},
 {label:'연령·성별 비교',onSelect:()=>{setDemographicOpen(true);populationNavigate('demographic-population',1)}},
 {label:'두 시점 분포 지도',onSelect:()=>populationNavigate('distribution-population',1)},
 {label:'두 시점 비교',onSelect:()=>populationNavigate('time-compare-population',1)}
 ]} purpose="어느 시간에 머무는 인구가 많고, 직전 시간과 얼마나 달라졌는지 비교합니다. 일일 고유 방문자 수는 아닙니다." onReturnRegion={()=>populationNavigate('map-population',0)} onCompareRegion={district==='all'?undefined:compareSelectedPopulation} compareActionLabel={compare.includes(dong==='all'?district:dong)?'후보 비교 보기':compare.length>=3?'후보 3개 · 비교 화면 열기':'선택 지역 후보로 비교하기'} points={curve.map((value,h)=>({key:hourLabel(h),value}))} currentKey={hourLabel(hour)} onSelect={key=>setHour(Number(key.slice(0,2)))} unit="명" label={`${selectedName} 생활인구 추이 · ${shortDate(date)} · ${targetLabel} · ${sexLabel}`} active={view==='analysis'&&tab==='population'&&analysisDetail==='trend-population'}/></AnalysisDetailModal><AnalysisDetailModal analysis={sharedDetailFlow} open={analysisDetail==='time-compare-population'} title={viewLabel('time-compare-population')} onClose={()=>setAnalysisDetail(null)}><TimeComparison id="time-compare-population" points={curve.map((value,h)=>({key:hourLabel(h),value}))} currentKey={hourLabel(hour)} unit="명" label={`${selectedName} · ${shortDate(date)} · ${targetLabel} · ${sexLabel}`}/></AnalysisDetailModal>
<AnalysisDetailModal analysis={sharedDetailFlow} open={analysisDetail==='population-patterns'} title={viewLabel('population-patterns')} onClose={()=>setAnalysisDetail(null)}><PopulationPatterns regionCode={dong==='all'?district:dong} regionName={selectedName} age={target} sex={sex} currentMonth={date.slice(0,6)} currentHour={hour} onSelectHour={h=>{setHour(h);populationNavigate('map-population',0)}}/></AnalysisDetailModal><AnalysisDetailModal analysis={sharedDetailFlow} open={analysisDetail==='resident-context'} title={viewLabel('resident-context')} onClose={()=>setAnalysisDetail(null)}><ResidentContext open={residentContextOpen} onToggle={setResidentContextOpen} regionCode={dong==='all'?district:dong} regionName={selectedName} populationColumns={pop?.columns||[]} populationRows={selectedRows.filter(row=>Number(row[1])===hour)} populationPeriod={`${shortDate(date)} · ${hourLabel(hour)}`} disabled={loading||!!error||!pop}/></AnalysisDetailModal>
<AnalysisDetailModal analysis={sharedDetailFlow} open={analysisDetail==='demographic-population'} title={viewLabel('demographic-population')} onClose={()=>setAnalysisDetail(null)}><DemographicComparison open={demographicOpen} onToggle={setDemographicOpen} columns={pop?.columns||[]} rows={selectedRows.filter(row=>Number(row[1])===hour)} age={target} sex={sex} context={`${selectedName} · ${shortDate(date)} · ${hourLabel(hour)}`} disabled={loading||!!error||!pop} onApply={cohort=>{setTarget(cohort.age);setSex(cohort.sex);populationNavigate('map-population',0)}}/></AnalysisDetailModal>
<AnalysisDetailModal analysis={sharedDetailFlow} open={analysisDetail==='distribution-population'} title={viewLabel('distribution-population')} onClose={()=>setAnalysisDetail(null)}><div id="distribution-population"><DistributionComparison geo={distributionGeo} frames={distributionFrames} currentHour={hour} onSelectHour={setHour} onSelectRegion={selectPopulationRegion} context={`${shortDate(date)} · ${targetLabel} · ${sexLabel} · ${district==='all'?'서울 자치구 비교':selectedName+' 소속 구의 행정동 비교'}`}/></div></AnalysisDetailModal><AnalysisDetailModal analysis={sharedDetailFlow} open={analysisDetail==='shortlist-population'} title={viewLabel('shortlist-population')} onClose={()=>setAnalysisDetail(null)}><section id="shortlist-population" className="panel compare"><div className="candidateContext"><span className="pill">후보 {compare.length} / 3</span><span>{shortDate(date)} · {hourLabel(hour)} · {targetLabel} · {sexLabel}</span><DataMeaning term="후보 비교 기준" definition="모든 후보에 같은 날짜·시각·연령·성별 조건을 적용합니다. 후보는 지역을 바꿔도 유지됩니다." interpretation="지역명을 누르면 해당 지역의 지도·시간 추이로 이어집니다." caution="자치구와 행정동은 면적과 규모가 다릅니다. 인구 규모를 광고 효과나 효율로 해석하지 않습니다."/></div>{compare.length?<div className="compareGrid">{compare.map(code=>{const reg=candidatePopulation(code);const hourly=Array.from({length:24},(_,h)=>{const rows=pop?.rows.filter(r=>Number(r[1])===h&&(code.length===5?getDistrict(String(r[2]).trim())===code:String(r[2]).trim()===code))||[];const vals=rows.map(valueOf);return vals.length&&vals.every(x=>x!=null)?vals.reduce<number>((s,x)=>s+(x||0),0):null});return <article key={code}><button className="remove" aria-label="비교 해제" onClick={()=>toggleCompare(code)}>×</button><h3><button className="candidateDetail" aria-label={`${reg?.name||code} 시간 추이 보기`} onClick={()=>selectPopulationRegion(code)}>{reg?.name||code}<span aria-hidden="true"> ↗</span></button><small>{code.length===5?'자치구':'행정동'}</small></h3><strong>{number(reg?.value)}{reg?.value!=null&&<small>명</small>}</strong>{hourly.some(v=>v!=null)&&<div className="miniBars">{hourly.map((v,h)=><i key={h} aria-label={v==null?`${hourLabel(h)} 자료 없음`:undefined} style={{height:`${(v??0)/Math.max(1,...hourly.map(x=>x||0))*100}%`,visibility:v==null?'hidden':undefined}}/>)}</div>}<p>{hourly.some(v=>v!=null)?`공개 시간 중 최대 ${hourLabel(hourly.indexOf(Math.max(...hourly.map(x=>x??-1))))} · ${hourly.filter(v=>v!=null).length}/24개 공개`:'공개된 시간대 자료 없음'}</p></article>})}</div>:<p className="empty">지역 선택 화면의 지도나 순위에서 후보지를 담으세요.<br/>같은 날짜·시간·연령 조건으로 비교합니다.<br/><button className="returnToRegion" onClick={()=>populationNavigate('map-population',0)}>지역 선택 화면으로 →</button></p>}</section></AnalysisDetailModal>
</div>{(['mobility','migration','commerce'] as const).map(key=><div hidden={tab!==key} key={key}><ExtraDashboard analysis={sharedDetailFlow} detail={analysisDetail} onDetailChange={setAnalysisDetail} queryView={presentationStep} arrivalData={arrival as any} animate={true} active={view==='analysis'&&tab===key} kind={key} data={(key==='mobility'?mobility:key==='migration'?migration:commerce) as any} geo={geo} dongGeo={dongGeo} onRetryBoundaries={retryBoundaries} regions={regions} error={extraErrors[key]}/></div>)}

</div></div><div id="region-support-host" className="regionSupport" ref={setSupportHost} aria-label="선택 대상 보조정보" role="complementary"/></div></DetailNavigationProvider>{view==='analysis'&&<footer><p>현재 제공 범위: 서울 · 자료별 기준 기간과 집계 단위를 확인하세요.</p></footer>}</main></AppShell></div></SupportContext.Provider></MapDataContext.Provider>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
