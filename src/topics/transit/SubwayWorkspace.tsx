import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import './subway.css';
import {subwayData,type Boundary,type Crowding,type Hourly,type Monthly,type PassengerTypes,type Station,type Stations,type SubwayManifest,type DailyFile} from './subway-data';
import {PASSENGER_GROUPS,SEASONS,WEEKDAYS,fmt,monthLabel,monthsInPeriod,seasonSummary,stationMetric,sumNullable,toCsv,weekdayMeans,weekdayIndex,type DayType,type Kind} from './subway-model';
import WorkspaceNav from '../../WorkspaceNav';
import {useLoad} from './use-load';
import {StationTrend,PeriodCompare,SamePeriod,CandidateTrend} from './SubwayDetailViews';
import SubwayMap,{type MapPoint} from './SubwayMap';
import {BarChart,LineChart,compact} from './SubwayCharts';

type Dataset='usage'|'crowding';
type ViewId='trend'|'compare'|'sameperiod'|'cands'|'map'|'hourly'|'calendar'|'season'|'types'|'gender'|'od'|'crowd-curve'|'crowd-rank';
const USAGE_VIEWS:{id:ViewId;label:string}[]=[{id:'map',label:'지도'},{id:'hourly',label:'시간대 곡선'},{id:'calendar',label:'일별 달력·요일'},{id:'season',label:'월별·계절 비교'},{id:'trend',label:'선택 역 추이'},{id:'compare',label:'두 기간 비교'},{id:'sameperiod',label:'연도별 같은 시기'},{id:'cands',label:'후보 역 비교'},{id:'types',label:'승객 유형'},{id:'gender',label:'성별'},{id:'od',label:'출발·도착(OD)'}];
const CROWD_VIEWS:{id:ViewId;label:string}[]=[{id:'crowd-curve',label:'30분 혼잡도 곡선'},{id:'crowd-rank',label:'혼잡 상위 역'}];
const KIND_LABEL:Record<Kind,string>={b:'승차',a:'하차',ab:'승차+하차'};
const DAY_LABEL:Record<DayType,string>={all:'전체 요일',wd:'평일',we:'주말'};

export default function SubwayWorkspace({mode,active}:{mode:'analysis'|'presentation';active:boolean}){
  const rootRef=useRef<HTMLDivElement>(null);
  const [headerH,setHeaderH]=useState(72);
  useEffect(()=>{const el=document.querySelector('.appHeader');if(!el)return;const up=()=>setHeaderH(Math.round(el.getBoundingClientRect().height));up();const ro=new ResizeObserver(up);ro.observe(el);window.addEventListener('resize',up);return()=>{ro.disconnect();window.removeEventListener('resize',up)}},[active]);
  const [leftOpen,setLeftOpen]=useState(true),[rightOpen,setRightOpen]=useState(true);
  const [dataset,setDataset]=useState<Dataset>('usage');
  const [view,setView]=useState<ViewId>('map');
  const [from,setFrom]=useState('202501'),[to,setTo]=useState('202610');
  const [line,setLine]=useState<'all'|number>('all');
  const [station,setStation]=useState('');
  const [day,setDay]=useState<DayType>('all');
  const [kind,setKind]=useState<Kind>('ab');
  const [quarter,setQuarter]=useState('2026-09-30'),[cDay,setCDay]=useState<'wd'|'sat'|'sun'>('wd');
  const [candidates,setCandidates]=useState<string[]>([]);
  const [csv,setCsv]=useState<{name:string;rows:(string|number|null)[][]}|null>(null);
  const [popover,setPopover]=useState<''|'source'>('');
  const firstPresentation=useRef(true);
  const [floating,setFloating]=useState(false);
  const [fpos,setFpos]=useState({x:0,y:0});
  const fdrag=useRef<{px:number;py:number;x:number;y:number}|null>(null);
  const clampPos=(x:number,y:number)=>({x:Math.max(0,Math.min(window.innerWidth-380,x)),y:Math.max(headerH,Math.min(window.innerHeight-120,y))});
  const floatQuery=()=>{setFloating(true);setFpos(clampPos((leftOpen?200:64)+40,headerH+220))};

  const manifest=useLoad<SubwayManifest>(()=>subwayData.manifest(),[]);
  const stationsL=useLoad<Stations>(manifest.data?()=>subwayData.stations():null,[manifest.data]);
  const monthlyL=useLoad<Monthly>(manifest.data?()=>subwayData.monthly():null,[manifest.data]);
  const boundaryL=useLoad<Boundary>(()=>subwayData.seoulBoundary(),[]);
  const stations=stationsL.data?.stations||[];
  const byId=useMemo(()=>new Map(stations.map(s=>[s.id,s])),[stations]);
  const sel=station?byId.get(station):undefined;

    useEffect(()=>{if(mode==='presentation'&&firstPresentation.current){firstPresentation.current=false;setLeftOpen(false)}},[mode]);
  useEffect(()=>{setCsv(null)},[view,dataset]);
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setPopover('')};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[]);
  useEffect(()=>{if(!active)setPopover('')},[active]);

  const months=monthlyL.data?.months||[];
  const idx=useMemo(()=>monthsInPeriod(months,from,to),[months,from,to]);
  const views=dataset==='usage'?USAGE_VIEWS:CROWD_VIEWS;
  const chooseDataset=(d:Dataset)=>{setDataset(d);setView(d==='usage'?'map':'crowd-curve')};
  const monthOptions=months.map(m=>({value:m,label:`${m.slice(0,4)}.${m.slice(4,6)}`}));
  const stationLabel=(s:Station)=>`${s.name} · ${s.line}호선`;
  const stationOptions=stations.filter(s=>line==='all'||s.line===line);
  const periodOk=from<=to;

  const rowsForMetric=useMemo(()=>{
    const m=monthlyL.data;if(!m)return [] as MapPoint[];
    return stations.filter(s=>line==='all'||s.line===line).map(s=>({station:s,value:m.stations[s.id]?stationMetric(m.stations[s.id],idx,kind,day).perDay:null}));
  },[monthlyL.data,stations,line,idx,kind,day]);
  // 지도는 모든 노선을 그리고(선택 안 한 노선은 흐리게), 순위·CSV·합계는 조회 조건(호선)대로 그대로 둔다.
  const allPoints=useMemo(()=>{const m=monthlyL.data;return m?stations.map(s=>({station:s,value:m.stations[s.id]?stationMetric(m.stations[s.id],idx,kind,day).perDay:null})):[] as MapPoint[]},[monthlyL.data,stations,idx,kind,day]);
  // 흐린 점을 눌러도 그 역이 선택되고, 특정 호선이 강조 중이면 그 역의 호선으로 강조가 옮겨 간다('전체'면 그대로).
  const pickOnMap=(id:string)=>{setStation(id);const s=byId.get(id);if(s&&line!=='all'&&s.line!==line)setLine(s.line)};
  const ranking=useMemo(()=>[...rowsForMetric].filter(r=>r.value!=null).sort((a,b)=>(b.value as number)-(a.value as number)),[rowsForMetric]);
  const missingCount=rowsForMetric.length-ranking.length;

  const toggleCandidate=(id:string)=>setCandidates(c=>c.includes(id)?c.filter(x=>x!==id):c.length<3?[...c,id]:c);
  const metricFor=(id:string)=>monthlyL.data?.stations[id]?stationMetric(monthlyL.data.stations[id],idx,kind,day):{perDay:null,days:0,total:null};
  const selGroup=sel?stationsL.data?.groups.find(g=>g.id===sel.group):undefined;
  const groupRows=sel?(selGroup?.members||[sel.id]):[];

  const centerTitle=views.find(v=>v.id===view)?.label||'';
  const downloadCsv=()=>{if(!csv)return;const blob=new Blob([toCsv(csv.rows)],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${csv.name}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};

  const common={stations,byId,sel,from,to,idx,kind,day,line,setCsv,monthly:monthlyL.data,mode};
  return <div ref={rootRef} className={`sw sw-${mode}`} data-testid="subway-workspace" style={{height:`calc(100vh - ${headerH}px)`}}>
    <div className="swWorkspace" style={{['--left' as string]:leftOpen?'200px':'64px',['--right' as string]:rightOpen?'300px':'0px'}}>
      <WorkspaceNav collapsed={!leftOpen} onToggle={()=>setLeftOpen(v=>!v)} ariaLabel="교통 자료와 보기" heading="자료와 보기" groups={[
        {title:'자료',kind:'data',aria:'자료 선택',items:[{id:'subway',label:'지하철',short:'지하',current:true,onSelect:()=>undefined},{id:'bus',label:'버스(예정)',short:'버스',current:false,disabled:true,onSelect:()=>undefined}]},
        {title:'지표',kind:'data',aria:'지표 선택',items:[{id:'usage',label:'역 이용(승하차)',short:'이용',current:dataset==='usage',onSelect:()=>chooseDataset('usage')},{id:'crowding',label:'혼잡도',short:'혼잡',current:dataset==='crowding',onSelect:()=>chooseDataset('crowding')}]},
        {title:'보기',kind:'view',aria:'보기 선택',items:views.map(v=>({id:v.id,label:v.label,short:v.label.slice(0,2),current:view===v.id,onSelect:()=>setView(v.id)}))}
      ]}/>
      <div className="swCenter" role="main">
        <section className={`swQuery${floating?' swFloat':''}`} aria-label="조회 조건" style={floating?{left:fpos.x,top:fpos.y}:undefined}>
          {floating&&<div className="swFloatHead" onPointerDown={e=>{(e.target as HTMLElement).setPointerCapture?.(e.pointerId);fdrag.current={px:e.clientX,py:e.clientY,x:fpos.x,y:fpos.y}}} onPointerMove={e=>{const d=fdrag.current;if(d)setFpos(clampPos(d.x+e.clientX-d.px,d.y+e.clientY-d.py))}} onPointerUp={()=>{fdrag.current=null}}><b>조회 조건</b><span className="swMeta">끌어서 이동</span>
            <button type="button" className="swBtn" onPointerDown={e=>e.stopPropagation()} onClick={()=>setFloating(false)}>상단으로</button></div>}
          {dataset==='usage'?<>
            <label className="swField"><span>기간</span><span className="swPair">
              <select aria-label="시작 월" value={from} onChange={e=>setFrom(e.target.value)}>{monthOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
              <i>~</i>
              <select aria-label="끝 월" value={to} onChange={e=>setTo(e.target.value)}>{monthOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></span></label>
            <label className="swField"><select aria-label="호선" value={String(line)} onChange={e=>setLine(e.target.value==='all'?'all':Number(e.target.value))}><option value="all">호선 전체</option>{[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}호선</option>)}</select></label>
            <label className="swField"><span>역</span>
              <StationPicker options={stationOptions} label={stationLabel} value={sel?stationLabel(sel):''} onPick={id=>{setStation(id);const s=byId.get(id);if(s&&line!=='all'&&s.line!==line)setLine(s.line)}} onClear={()=>setStation('')}/></label>
            <label className="swField"><select aria-label="요일 구분" value={day} onChange={e=>setDay(e.target.value as DayType)}><option value="all">요일 전체</option><option value="wd">평일</option><option value="we">주말</option></select></label>
            <label className="swField"><select aria-label="승차 하차" value={kind} onChange={e=>setKind(e.target.value as Kind)}><option value="ab">승차+하차</option><option value="b">승차</option><option value="a">하차</option></select></label>
          </>:<>
            <label className="swField"><span>기준</span><select aria-label="혼잡도 분기" value={quarter} onChange={e=>setQuarter(e.target.value)}><option value="2026-09-30">2026-09-30 분기</option><option value="2026-06-30">2026-06-30 분기</option></select></label>
            <label className="swField"><select aria-label="호선" value={String(line)} onChange={e=>setLine(e.target.value==='all'?'all':Number(e.target.value))}><option value="all">호선 전체</option>{[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}호선</option>)}</select></label>
            <label className="swField"><span>역</span><StationPicker options={stationOptions} label={stationLabel} value={sel?stationLabel(sel):''} onPick={id=>{setStation(id);const s=byId.get(id);if(s&&line!=='all'&&s.line!==line)setLine(s.line)}} onClear={()=>setStation('')}/></label>
            <label className="swField"><select aria-label="혼잡도 요일" value={cDay} onChange={e=>setCDay(e.target.value as 'wd'|'sat'|'sun')}><option value="wd">평일</option><option value="sat">토요일</option><option value="sun">일요일</option></select></label>
          </>}
        </section>
        <section className="swResult" aria-label="결과">
          <div className="swResultHead">
            <div><h1 className="swTitle">{centerTitle}</h1>
              <p className="swSub">{dataset==='usage'?`${monthLabel(from)}~${monthLabel(to)} · ${KIND_LABEL[kind]} · ${DAY_LABEL[day]} · ${view==='types'?'기간 합계(카드 태그 건수, 요일 구분 없음)':view==='calendar'?'하루 값(카드 태그 건수)':'하루 평균(카드 태그 건수)'}`:`정원 대비 평균 혼잡도(%) · ${quarter} 분기 · 승하차 인원과 다른 지표`}</p></div>
            <div className="swResultTools">
              {!floating&&<button type="button" className="swBtn" onClick={floatQuery} title="조회 조건을 지도 위에 띄워 지도 공간을 넓힙니다">조회 띄우기</button>}
              <button type="button" className="swBtn" disabled={!csv} onClick={downloadCsv}>CSV 내려받기</button>
              <button type="button" className="swBtn" aria-expanded={rightOpen} onClick={()=>setRightOpen(v=>!v)}>{rightOpen?'보조정보 접기 ›':'‹ 보조정보 펼치기'}</button>
            </div>
          </div>
          {!periodOk&&dataset==='usage'&&<div className="swNotice" role="alert">시작 월이 끝 월보다 늦습니다. 기간을 바꿔 주세요.</div>}
          {(stationsL.error||monthlyL.error||manifest.error)&&<div className="swNotice" role="alert">{stationsL.error||monthlyL.error||manifest.error}</div>}
          <div className="swBody" data-view={view}>
            {view==='map'&&<div className="swMapArea"><SubwayMap boundary={boundaryL.data} points={allPoints} selected={station} onSelect={pickOnMap} candidates={candidates} activeLine={line} onSelectLine={setLine} unitLabel={`${KIND_LABEL[kind]} 하루 평균(건)`}/>
              <CsvPublisher setCsv={setCsv} name="역별-하루평균" rows={periodOk?[['역','호선','역코드','행정동','하루평균','구분','기간','요일'],...rowsForMetric.map(r=>[r.station.name,r.station.line,r.station.code,r.station.dongName,r.value==null?null:Math.round(r.value),KIND_LABEL[kind],`${from}~${to}`,DAY_LABEL[day]])]:[]}/></div>}
            {view==='hourly'&&<HourlyView {...common} sel={sel}/>}
            {view==='calendar'&&<CalendarView {...common} sel={sel}/>}
            {view==='season'&&<SeasonView {...common} sel={sel}/>}
            {view==='trend'&&<StationTrend {...common} sel={sel}/>}
            {view==='compare'&&<PeriodCompare {...common} sel={sel}/>}
            {view==='sameperiod'&&<SamePeriod {...common} sel={sel}/>}
            {view==='cands'&&<CandidateTrend {...common} sel={sel} candidates={candidates} onPick={setStation}/>}
            {view==='types'&&<TypesView {...common} sel={sel}/>}
            {view==='gender'&&<Placeholder title="성별" lines={['성별 자료 없음','이번에 수집한 승하차·승객유형·혼잡도 공식 파일에는 성별 항목이 없습니다.','다른 통계의 비율을 곱해 성별을 추정하지 않습니다. 공식 성별 자료를 확보하면 이 보기에 추가합니다.']}/>}
            {view==='od'&&<Placeholder title="출발·도착(OD) 준비 중" lines={['준비 중입니다.','OA-21222 표본 한 달을 검사했지만 지하철·버스를 가르는 수단 코드 열이 없고, 환승을 한 통행으로 보는지 구간으로 나누는지 원문 정의를 확인하지 못했습니다.','역 코드와 승하차 합계는 일치했으나(1~8호선 271역) 이 두 가지가 확인되기 전에는 OD를 만들지 않습니다. 자세한 근거는 출처·해석에서 읽을 수 있습니다.']}/>}
            {view==='crowd-curve'&&<CrowdCurve {...common} sel={sel} quarter={quarter} cDay={cDay}/>}
            {view==='crowd-rank'&&<CrowdRank {...common} quarter={quarter} cDay={cDay} onSelect={setStation}/>}
          </div>
        </section>
      </div>
      <aside className="swRight" aria-label="선택 대상 보조정보" hidden={!rightOpen}>
        <div className="swSideHead"><b>선택 대상 보조정보</b></div>
        <section className="swSection" aria-label="선택 역">
          <div className="swLabel">선택 역</div>
          <div className="swSelName">{sel?sel.name:'선택 전'}</div>
          {sel?<p className="swMeta">{sel.line}호선 · 외부역코드 {sel.code}{sel.txCode?` (좌표 파일 기준 · 승하차 원본은 ${sel.txCode})`:''} · {sel.guName&&sel.dongName?`${sel.guName} ${sel.dongName}`:'서울 밖 또는 행정동 연결 없음'}</p>:<p className="swMeta">지도의 점, 순위, 또는 위 ‘역’ 검색으로 고릅니다.</p>}
        </section>
        {dataset==='usage'&&<section className="swSection" aria-label="핵심 지표">
          <div className="swKpi" data-testid="subway-kpi"><div className="swLabel">{KIND_LABEL[kind]} 하루 평균</div><div className="swKpiValue">{sel?fmt(metricFor(sel.id).perDay):'—'}<span>건</span></div>
            {sel&&<div className="swMeta">관측 {metricFor(sel.id).days.toLocaleString('ko-KR')}일{metricFor(sel.id).perDay==null?' · 자료 없음':''}</div>}</div>
          {sel&&groupRows.length>1&&<div className="swGroupBox"><div className="swLabel">환승역 호선별 행과 역 단위 합계</div>
            <ul>{groupRows.map(id=>{const s=byId.get(id)!;return <li key={id}><span>{s.line}호선 {s.name}</span><b>{fmt(metricFor(id).perDay)}</b></li>})}
              <li className="swSum"><span>역 단위 합계</span><b>{fmt(sumNullable(groupRows.map(id=>metricFor(id).perDay)))}</b></li></ul>
            <p className="swMeta">호선별 개찰구 이용 건수를 더한 값이며 중복 없는 사람 수가 아닙니다.</p>
            {selGroup?.external?.length?<p className="swMeta" data-testid="subway-external-note">다른 운영기관 노선 구간 미포함(1~8호선 서울교통공사 구간만 더함): 같은 이름의 {selGroup.external.join('·')} 역은 원본에 따로 있어 이 합계에 넣지 않았습니다.</p>:null}</div>}
        </section>}
        <section className="swSection" aria-label="후보">
          <div className="swLabel">후보 <span>{candidates.length} / 3곳</span></div>
          {[0,1,2].map(i=>{const id=candidates[i];const s=id?byId.get(id):undefined;return <div key={i} className="swCand">{s?<><button type="button" className="swCandName" onClick={()=>setStation(s.id)}>{i+1}. {s.name} {s.line}호선</button><b>{dataset==='usage'?fmt(metricFor(s.id).perDay):''}</b><button type="button" className="swBtn swIconBtn" aria-label={`${s.name} 후보 해제`} onClick={()=>toggleCandidate(s.id)}>×</button></>:<span>{i+1}. 선택 전</span>}</div>})}
          <button type="button" className="swBtn swWide" disabled={!sel||(!candidates.includes(sel.id)&&candidates.length>=3)} onClick={()=>sel&&toggleCandidate(sel.id)}>{sel&&candidates.includes(sel.id)?'선택 역 후보 해제':candidates.length>=3?'후보는 최대 3곳':'선택 역 후보 담기'}</button>
        </section>
        {view==='map'&&dataset==='usage'&&<section className="swSection" aria-label="순위">
          <div className="swLabel">{KIND_LABEL[kind]} 상위 10역 <span>결측 {missingCount}역</span></div>
          <ol className="swRank">{ranking.slice(0,10).map((r,i)=><li key={r.station.id}><button type="button" aria-current={r.station.id===station?'true':undefined} onClick={()=>setStation(r.station.id)}><span>{i+1}</span>{r.station.name} {r.station.line}호선<b>{compact(Math.round(r.value as number))}</b></button></li>)}</ol>
        </section>}
        <section className="swSection swSource" aria-label="해석과 출처">
          <div className="swLabel">해석·출처 요약</div>
          <p className="swMeta">승하차는 카드 태그 건수이며 고유 방문자 수가 아닙니다. 혼잡도는 승하차와 다른 지표입니다.</p>
          <div className="swAnchor"><button type="button" className="swBtn" aria-expanded={popover==='source'} onClick={()=>setPopover(popover==='source'?'':'source')}>출처·해석 보기</button>
            {popover==='source'&&<SourcePopover manifest={manifest.data} onClose={()=>setPopover('')}/>}</div>
        </section>
      </aside>
    </div>
  </div>;
}

function CsvPublisher({setCsv,name,rows}:{setCsv:(c:{name:string;rows:(string|number|null)[][]}|null)=>void;name:string;rows:(string|number|null)[][]}){
  const key=JSON.stringify(rows.length)+name+(rows[1]?.join('|')||'')+(rows.at(-1)?.join('|')||'');
  useEffect(()=>{setCsv(rows.length>1?{name,rows}:null)},[key]);// eslint-disable-line
  return null;
}

function StationPicker({options,label,value,onPick,onClear}:{options:Station[];label:(s:Station)=>string;value:string;onPick:(id:string)=>void;onClear:()=>void}){
  const [text,setText]=useState(value);
  useEffect(()=>setText(value),[value]);
  const listId=useRef('sw-stations-'+Math.random().toString(36).slice(2)).current;
  const commit=(t:string)=>{const f=options.find(s=>label(s)===t);if(f)onPick(f.id);else if(t==='')onClear()};
  return <span className="swPair"><input aria-label="역 검색" list={listId} placeholder="역 이름 검색" value={text} onChange={e=>{setText(e.target.value);commit(e.target.value)}}/>
    <datalist id={listId}>{options.map(s=><option key={s.id} value={label(s)}/>)}</datalist>
    {value&&<button type="button" className="swBtn swIconBtn" aria-label="역 선택 해제" onClick={onClear}>×</button>}</span>;
}

function SourcePopover({manifest,onClose}:{manifest:SubwayManifest|null;onClose:()=>void}){
  return <div className="swPopover swSourcePop" role="dialog" aria-label="출처와 해석">
    <b>출처와 정의</b>
    <ul>{(manifest?.datasets||[]).filter(d=>d.source).map(d=><li key={d.id}><a href={d.source!.url} target="_blank" rel="noreferrer">{d.title}</a> · {d.source!.id} · {d.period?.start}~{d.period?.end} · {d.source!.license}</li>)}</ul>
    <b>승객 유형 대응표</b>
    <table className="swTable"><thead><tr><th>화면</th><th>원문 승객유형</th></tr></thead><tbody>
      <tr><td>일반</td><td>일반</td></tr><tr><td>청소년</td><td>청소년, 중고생(운임 규정에 별도 요금이 없어 청소년 요금 대상으로 합침)</td></tr>
      <tr><td>우대</td><td>우대권(노인·장애인·국가유공자가 섞여 있어 연령이 아님)</td></tr><tr><td>기타(어린이 등)</td><td>어린이, 직원, 영어·중국어·일어 일반/어린이(외국어 안내 권종, 정의 미확인)</td></tr></tbody></table>
    <p>평일은 월~금, 주말은 토·일입니다. 공휴일 자료가 없어 공휴일은 평일로 셉니다. 계절은 봄 3–5, 여름 6–8, 가을 9–11, 겨울 12–2월(1·2월은 전년 겨울)입니다.</p>
    <p>시간대 곡선은 OA-12252(인증키 필요) 대신 같은 목적의 서울교통공사 OA-12921(1~8호선 관할)을 씁니다. 코레일 등 외부 운영 노선과 9호선은 좌표가 없어 지도에 없습니다. 성별 자료는 없습니다.</p>
    <button type="button" className="swBtn" onClick={onClose}>닫기</button>
  </div>;
}

function Placeholder({title,lines}:{title:string;lines:string[]}){
  return <div className="swPlaceholder"><h2 className="swPanelTitle">{title}</h2>{lines.map((l,i)=><p key={i} className={i===0?'swStrong':''}>{l}</p>)}</div>;
}

type VP={stations:Station[];byId:Map<string,Station>;sel?:Station;from:string;to:string;idx:number[];kind:Kind;day:DayType;line:'all'|number;setCsv:(c:{name:string;rows:(string|number|null)[][]}|null)=>void;monthly:Monthly|null;mode:'analysis'|'presentation'};
const needStation=<div className="swPlaceholder"><p className="swStrong">역을 먼저 고르세요</p><p>지도의 점, 오른쪽 순위, 위 ‘역’ 검색 어느 쪽이든 같은 선택으로 이어집니다.</p></div>;
const Loading=({text}:{text:string})=><div className="swEmpty" role="status">{text}</div>;

function HourlyView({sel,from,to,kind,day,stations,setCsv}:VP){
  const years=[2023,2024,2025].filter(y=>String(y)>=from.slice(0,4)&&String(y)<=to.slice(0,4));
  const L=useLoad<Hourly[]>(()=>Promise.all(years.map(y=>subwayData.hourly(y))),[years.join()]);
  const dt=day==='we'?[1]:day==='wd'?[0]:[0,1];
  const out=useMemo(()=>{
    if(!L.data)return null;
    const ids=sel?[sel.id]:stations.map(s=>s.id);
    const acc={b:Array<number|null>(20).fill(0),a:Array<number|null>(20).fill(0)};let days=0;
    for(const h of L.data){for(const id of ids){const st=h.stations[id];if(!st)continue;
      for(const [mo,rec] of Object.entries(st)){const ym=`${h.year}${mo}`;if(ym<from||ym>to)continue;
        for(const k of dt){days+=rec.d[k];for(let i=0;i<20;i++){acc.b[i]=acc.b[i]==null||rec.b[k][i]==null?null:(acc.b[i] as number)+(rec.b[k][i] as number);acc.a[i]=acc.a[i]==null||rec.a[k][i]==null?null:(acc.a[i] as number)+(rec.a[k][i] as number)}}}}}
    const per=(arr:(number|null)[])=>arr.map(v=>v==null||!days?null:v/days);
    const n=ids.filter(id=>L.data!.some(h=>!!h.stations[id])).length;
    return {buckets:L.data[0]?.buckets||[],b:per(acc.b),a:per(acc.a),days,sel:!!sel,n};
  },[L.data,sel,from,to,day,stations.length]);
  useEffect(()=>{setCsv(out&&out.days?{name:'시간대-하루평균',rows:[['시간대','승차 하루평균','하차 하루평균'],...out.buckets.map((b,i)=>[b,out.b[i]==null?null:Math.round(out.b[i] as number),out.a[i]==null?null:Math.round(out.a[i] as number)])]}:null)},[out]);// eslint-disable-line
  if(!years.length)return <Placeholder title="선택한 기간에 시간대 자료 없음" lines={['시간대 자료는 2023~2025년입니다.','위 기간을 이 범위로 바꾸면 곡선이 보입니다.']}/>;
  if(L.loading||!out)return <Loading text="시간대 자료를 불러오는 중입니다"/>;
  return <div className="swChartPanel"><h2 className="swPanelTitle">{sel?`${sel.name} ${sel.line}호선`:`좌표 있는 ${out.n}역 평균`} · 시간대별 하루 평균</h2>
    <p className="swMeta">시간대 자료 기간 2023~2025년 중 선택 기간과 겹치는 {out.days.toLocaleString('ko-KR')}개 역-일. {sel?'':'역을 고르지 않으면 역 하나당 평균입니다. '}‘06시 이전’과 ‘24시 이후’는 묶음 구간입니다.</p>
    <LineChart ariaLabel="시간대별 승차·하차 하루 평균" unit="건 / 하루 평균" xLabels={out.buckets.map(b=>b.replace('시 이전','↓').replace('시 이후','↑').replace('-','~').replace('시',''))} tickEvery={2}
      series={[...(kind!=='a'?[{label:'승차',color:'#24558b',values:out.b}]:[]),...(kind!=='b'?[{label:'하차',color:'#b4530a',values:out.a,dash:'6 4'}]:[])]}/>
    <Legend items={[...(kind!=='a'?[['승차','#24558b']]:[]),...(kind!=='b'?[['하차','#b4530a']]:[])] as [string,string][]}/></div>;
}

const Legend=({items}:{items:[string,string][]})=><ul className="swSeriesLegend">{items.map(([l,c])=><li key={l}><i style={{background:c}}/>{l}</li>)}</ul>;

function CalendarView({sel,from,to,kind,setCsv}:VP){
  const L=useLoad<DailyFile>(sel?()=>subwayData.daily(sel.line):null,[sel?.line]);
  const [calMonth,setCalMonth]=useState('');
  const data=sel&&L.data?.stations[sel.id];
  const dates=L.data?.dates||[];
  const val=(i:number)=>!data?null:kind==='b'?data.b[i]:kind==='a'?data.a[i]:(data.b[i]==null||data.a[i]==null?null:(data.b[i] as number)+(data.a[i] as number));
  const inPeriod=dates.map((d,i)=>({d,i})).filter(x=>x.d.slice(0,6)>=from&&x.d.slice(0,6)<=to);
  const months=[...new Set(inPeriod.map(x=>x.d.slice(0,6)))];
  const month=months.includes(calMonth)?calMonth:months.at(-1)||'';
  const wm=weekdayMeans(inPeriod.map(x=>x.d),inPeriod.map(x=>val(x.i)));
  useEffect(()=>{setCsv(sel&&inPeriod.length?{name:`${sel.name}-일별`,rows:[['날짜','값'],...inPeriod.map(x=>[x.d,val(x.i)])]}:null)},[sel?.id,L.data,from,to,kind]);// eslint-disable-line
  if(!sel)return needStation;
  if(L.loading||!data)return <Loading text="일별 자료를 불러오는 중입니다"/>;
  const mdays=inPeriod.filter(x=>x.d.slice(0,6)===month);
  const first=mdays.length?weekdayIndex(mdays[0].d):0;
  const vals=mdays.map(x=>val(x.i)).filter((v):v is number=>v!=null);const lo=Math.min(...vals),hi=Math.max(...vals);
  const shade=(v:number|null)=>{if(v==null)return '#b8c2cd';const t=hi===lo?1:(v-lo)/(hi-lo);return ['#dbe7f3','#a9c4e0','#6f9bc9','#3a6fa8','#173e69'][Math.min(4,Math.floor(t*5))]};
  const dark=(c:string)=>['#3a6fa8','#173e69'].includes(c);
  return <div className="swCalWrap"><div className="swChartPanel swCal">
    <div className="swPanelRow"><h2 className="swPanelTitle">{sel.name} {sel.line}호선 · 일별 달력</h2>
      <select aria-label="달력 월" value={month} onChange={e=>setCalMonth(e.target.value)}>{months.map(m=><option key={m} value={m}>{m.slice(0,4)}년 {Number(m.slice(4))}월</option>)}</select></div>
    <p className="swMeta">{KIND_LABEL[kind]} 하루 값(건). 회색은 그날 자료 없음(0이 아님). 공휴일 정보는 없어 요일만 표시합니다.</p>
    <div className="swCalGrid" role="grid" aria-label="일별 달력">{WEEKDAYS.map(w=><div key={w} className="swCalHead" role="columnheader">{w}</div>)}
      {Array.from({length:first}).map((_,i)=><div key={'e'+i}/>)}
      {mdays.map(x=>{const v=val(x.i);const c=shade(v);return <div key={x.d} role="gridcell" className={`swCalCell ${dark(c)?'swDark':'swLight'}`} style={{background:c}}><span>{Number(x.d.slice(6))}</span><b>{v==null?'없음':compact(v)}</b></div>})}</div></div>
    <div className="swChartPanel swCalBars"><h2 className="swPanelTitle">요일별 평균</h2><p className="swMeta">선택 기간 전체의 요일 평균(자료 없는 날 제외).</p>
      <BarChart ariaLabel="요일별 평균" unit="건 / 하루 평균" bars={wm.map((w,i)=>({label:WEEKDAYS[i],value:w.mean,color:i>=5?'#b4530a':'#24558b'}))}/></div></div>;
}

function SeasonView({sel,monthly,kind,day,stations,setCsv}:VP){
  const [target,setTarget]=useState<'sel'|'all'>('sel');
  const m=monthly;
  const cells=useMemo(()=>{
    if(!m)return null;
    if(sel&&target==='sel')return seasonSummary(m.months,m.stations[sel.id],kind,day);
    return null;
  },[m,sel,kind,day,target]);
  const monthlySeries=useMemo(()=>{
    if(!m||!sel)return [];
    const rec=m.stations[sel.id];const years=[...new Set(m.months.map(x=>x.slice(0,4)))];
    return years.map((y,yi)=>({label:`${y}년`,color:['#9fb3c8','#6f9bc9','#24558b','#b4530a'][yi%4],values:Array.from({length:12},(_,k)=>{const i=m.months.indexOf(`${y}${String(k+1).padStart(2,'0')}`);return i<0||!rec?null:stationMetric(rec,[i],kind,day).perDay})}));
  },[m,sel,kind,day]);
  useEffect(()=>{setCsv(cells?{name:`${sel?.name}-계절`,rows:[['연도','계절','하루평균','관측일','포함 월 수','완전한 계절'],...cells.map(c=>[c.year,c.season,c.perDay==null?null:Math.round(c.perDay),c.days,c.monthsPresent,c.complete?'예':'아니오'])]}:null)},[cells]);// eslint-disable-line
  if(!sel)return needStation;
  if(!cells)return <Loading text="월별 자료를 불러오는 중입니다"/>;
  const years=[...new Set(cells.map(c=>c.year))];
  return <div className="swSeasonWrap"><div className="swChartPanel"><h2 className="swPanelTitle">{sel.name} {sel.line}호선 · 월별 하루 평균(연도별 겹쳐 보기)</h2>
    <p className="swMeta">같은 달을 연도끼리 비교합니다. 선이 끊긴 곳은 그 달 자료 없음입니다. 월별 값은 조회 기간과 무관하게 전체 관측월을 보여줍니다.</p>
    <LineChart ariaLabel="월별 하루 평균 연도 비교" unit="건 / 하루 평균" xLabels={Array.from({length:12},(_,i)=>`${i+1}월`)} series={monthlySeries}/>
    <Legend items={monthlySeries.map(s=>[s.label,s.color] as [string,string])}/></div>
    <div className="swChartPanel"><h2 className="swPanelTitle">계절 비교 · 봄 3–5, 여름 6–8, 가을 9–11, 겨울 12–2월</h2>
      <p className="swMeta">하루 평균(건)과 관측 일수. ‘일부 달’은 그 계절의 3개월이 모두 있지 않아 다른 해와 직접 비교하면 안 됩니다. 한 해의 계절은 기술통계일 뿐 계절성 판단에는 여러 해가 필요합니다.</p>
      <table className="swTable swSeasonTable"><thead><tr><th>연도</th>{SEASONS.map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>
        {years.map(y=><tr key={y}><th>{y}</th>{SEASONS.map(s=>{const c=cells.find(x=>x.year===y&&x.season===s);return <td key={s}>{c?<><b>{fmt(c.perDay)}</b><span>{c.days.toLocaleString('ko-KR')}일{c.complete?'':' · 일부 달'}</span></>:<span>자료 없음</span>}</td>})}</tr>)}
      </tbody></table></div></div>;
}

function TypesView({sel,from,to,day,setCsv}:VP){
  const L=useLoad<PassengerTypes>(()=>subwayData.passengerTypes(),[]);
  const [which,setWhich]=useState<'b'|'a'>('b');
  const out=useMemo(()=>{
    if(!L.data)return null;
    const mi=monthsIdx(L.data.months,from,to);
    const ids=sel?[sel.id]:Object.keys(L.data.stations);
    const nStations=ids.filter(id=>!!L.data!.stations[id]).length;
    const tot=PASSENGER_GROUPS.map(g=>sumNullable(ids.flatMap(id=>mi.map(i=>L.data!.stations[id]?.m[g]?.[which][i]??null))));
    return {mi,tot,sum:sumNullable(tot),nStations};
  },[L.data,sel,from,to,which]);
  useEffect(()=>{setCsv(out&&out.mi.length?{name:'승객유형',rows:[['유형',which==='b'?'승차':'하차','비중(%)'],...PASSENGER_GROUPS.map((g,i)=>[g==='기타'?'기타(어린이 등)':g,out.tot[i],out.sum&&out.tot[i]!=null?Math.round(1000*(out.tot[i] as number)/out.sum)/10:null])]}:null)},[out,which]);// eslint-disable-line
  if(L.loading||!out||!L.data)return <Loading text="승객 유형 자료를 불러오는 중입니다"/>;
  if(!out.mi.length)return <Placeholder title="선택한 기간에 승객 유형 자료 없음" lines={['승객 유형 자료는 2026년 1~6월입니다.','기간을 이 범위와 겹치게 바꿔 주세요.']}/>;
  const colors=['#24558b','#2e8b3a','#b4530a','#6b7a8c'];
  return <div className="swTypesWrap"><div className="swChartPanel"><div className="swPanelRow"><h2 className="swPanelTitle">{sel?`${sel.name} ${sel.line}호선`:`좌표 있는 ${out.nStations}역 합`} · 승객 유형별 {which==='b'?'승차':'하차'}</h2>
    <span className="swSeg" role="group" aria-label="승차 하차 선택"><button type="button" className="swSegBtn" aria-pressed={which==='b'} onClick={()=>setWhich('b')}>승차</button><button type="button" className="swSegBtn" aria-pressed={which==='a'} onClick={()=>setWhich('a')}>하차</button></span></div>
    <p className="swMeta">기간 {monthLabel(L.data.months[out.mi[0]].replace('-',''))}~{monthLabel(L.data.months[out.mi.at(-1)!].replace('-',''))} 합계(건). 승객 유형은 카드 권종이며 실제 나이·성별이 아닙니다. 요일 구분은 이 월 합에 적용하지 않습니다{day!=='all'?'(조회의 요일 선택은 무시됨)':''}.</p>
    <BarChart ariaLabel="승객 유형별 합계" unit="건(기간 합)" bars={PASSENGER_GROUPS.map((g,i)=>({label:g==='기타'?'기타(어린이 등)':g,value:out.tot[i],color:colors[i]}))}/></div>
    <div className="swChartPanel"><h2 className="swPanelTitle">유형별 비중</h2>
      <table className="swTable"><thead><tr><th>유형</th><th>건수</th><th>비중</th></tr></thead><tbody>{PASSENGER_GROUPS.map((g,i)=><tr key={g}><th>{g==='기타'?'기타(어린이 등)':g}</th><td>{fmt(out.tot[i])}</td><td>{out.sum&&out.tot[i]!=null?(100*(out.tot[i] as number)/out.sum).toFixed(1)+'%':'자료 없음'}</td></tr>)}</tbody></table>
      <p className="swWarn">우대에는 노인·장애인·국가유공자 권종이 섞여 있어 ‘연령’으로 읽으면 안 됩니다. 청소년에는 중고생 권종을 합쳤습니다. 기타는 어린이·직원·외국어 안내 권종입니다. 성별은 자료 없음입니다.</p></div></div>;
}
const monthsIdx=(months:string[],from:string,to:string)=>months.flatMap((m,i)=>{const k=m.replace('-','');return k>=from&&k<=to?[i]:[]});

function useCrowd(quarter:string){return useLoad<Crowding>(()=>subwayData.crowding(),[quarter])}
type CP=VP&{quarter:string;cDay:'wd'|'sat'|'sun'};
function CrowdCurve({sel,quarter,cDay,setCsv}:CP){
  const L=useCrowd(quarter);
  const rec=sel&&L.data?.quarters[quarter]?.[cDay]?.[sel.id];
  useEffect(()=>{setCsv(rec&&L.data?{name:`${sel!.name}-혼잡도`,rows:[['시간',...Object.keys(rec)],...L.data.slots.map((s,i)=>[s,...Object.values(rec).map(v=>v[i])])]}:null)},[rec,L.data]);// eslint-disable-line
  if(!sel)return needStation;
  if(L.loading||!L.data)return <Loading text="혼잡도 자료를 불러오는 중입니다"/>;
  if(!rec)return <Placeholder title="이 역의 혼잡도 자료 없음" lines={['선택한 역·요일에 혼잡도 행이 없습니다.']}/>;
  const colors=['#24558b','#b4530a','#2e8b3a','#7d3da0'];
  const dirs=Object.keys(rec);
  return <div className="swChartPanel"><h2 className="swPanelTitle">{sel.name} {sel.line}호선 · 방향별 30분 평균 혼잡도</h2>
    <p className="swMeta">단위: 정원 대비 % (좌석이 모두 찬 상태가 34%). 열차 통과 기준 평균이며 승하차 인원과 다른 지표입니다. 값 100%는 정원이 찬 상태입니다.</p>
    <LineChart ariaLabel="방향별 30분 혼잡도" unit="% (정원 대비)" tickEvery={4} xLabels={L.data.slots.map(s=>s.slice(0,5))} series={dirs.map((d,i)=>({label:d,color:colors[i%4],values:rec[d],dash:i%2?'6 4':undefined}))}/>
    <Legend items={dirs.map((d,i)=>[d,colors[i%4]] as [string,string])}/></div>;
}
function CrowdRank({quarter,cDay,line,byId,onSelect,setCsv}:CP&{onSelect:(id:string)=>void}){
  const L=useCrowd(quarter);
  const rows=useMemo(()=>{
    const q=L.data?.quarters[quarter]?.[cDay];if(!q)return [];
    return Object.entries(q).flatMap(([id,dirs])=>{const s=byId.get(id);if(!s||(line!=='all'&&s.line!==line))return [];
      let best:{v:number;dir:string;slot:number}|null=null;
      for(const [dir,vals] of Object.entries(dirs))vals.forEach((v,i)=>{if(v!=null&&(!best||v>best.v))best={v,dir,slot:i}});
      return best?[{s,...(best as {v:number;dir:string;slot:number})}]:[]}).sort((a,b)=>b.v-a.v);
  },[L.data,quarter,cDay,line,byId]);
  useEffect(()=>{setCsv(rows.length&&L.data?{name:'혼잡-상위역',rows:[['역','호선','최대 혼잡도(%)','방향','30분 구간'],...rows.map(r=>[r.s.name,r.s.line,r.v,r.dir,L.data!.slots[r.slot]])]}:null)},[rows]);// eslint-disable-line
  if(L.loading||!L.data)return <Loading text="혼잡도 자료를 불러오는 중입니다"/>;
  return <div className="swChartPanel"><h2 className="swPanelTitle">하루 중 가장 붐비는 30분 기준 상위 역</h2>
    <p className="swMeta">각 역의 방향·시간 중 최댓값(정원 대비 %)입니다. 한 순간의 최댓값이라 하루 전체의 혼잡과 다릅니다.</p>
    <table className="swTable swRankTable"><thead><tr><th>순위</th><th>역</th><th>최대 혼잡도</th><th>방향·시간</th></tr></thead><tbody>
      {rows.slice(0,15).map((r,i)=><tr key={r.s.id}><td>{i+1}</td><th><button type="button" className="swLink" onClick={()=>onSelect(r.s.id)}>{r.s.name} {r.s.line}호선</button></th><td>{r.v.toFixed(1)}%</td><td>{r.dir} {L.data!.slots[r.slot]}</td></tr>)}</tbody></table></div>;
}
