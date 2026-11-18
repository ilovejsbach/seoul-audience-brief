import ExactValue from './ExactValue';
import DataMeaning from './DataMeaning';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import FloatingQueryLayer from './FloatingQueryLayer';
import {useFloatingPanel} from './useFloatingPanel';
import {claimFloatingEscape} from './floating-window-escape';
import './supplemental-time-comparison.css';
const keyLabel=(key:string)=>/^\d{5}$/.test(key)?`${key.slice(0,4)}년 ${key.slice(4)}분기`:/^\d{4}$/.test(key)?`${key}년`:/^\d{1,2}$/.test(key)?`${key}시`:key;
type Point={key:string;value:number|null};
import {displayNumber,exactNumber} from './display-number';
export default function TimeComparison({id,points,currentKey,unit,label}:{id?:string;points:Point[];currentKey:string;unit:string;label:string}){
 const marker=useRef<HTMLDivElement>(null),host=useRef<HTMLElement>(null),trigger=useRef<HTMLElement|null>(null);
 const [open,setOpen]=useState(false),[presentation,setPresentation]=useState(false);
 const panelRef=useRef<HTMLElement>(null);
 const geometry=useFloatingPanel(host,open&&presentation,{viewport:true,width:720,height:450,minWidth:280,minHeight:240});
 const close=()=>{setOpen(false);if(trigger.current?.getClientRects().length)trigger.current.focus()};
 useLayoutEffect(()=>{
  let observer:MutationObserver|undefined;
  // Stable modal portals attach their host in a parent layout effect. Resolve
  // ancestry after that attachment, rather than permanently missing the app.
  const frame=requestAnimationFrame(()=>{
   const node=marker.current,app=node?.closest<HTMLElement>('.app');if(!node||!app)return;
   host.current=id?document.getElementById(id.replace('time-compare-','trend-')):node;
   if(!host.current)host.current=node;
   const sync=()=>{const isPresentation=app.classList.contains('mode-presentation')&&app.dataset.detailSystem!=='shared';setPresentation(isPresentation);if(!isPresentation||!app.classList.contains('presentation-step-1')||!host.current?.getClientRects().length)setOpen(false)};
   sync();observer=new MutationObserver(sync);
   for(let ancestor:HTMLElement|null=host.current;ancestor;ancestor=ancestor.parentElement)observer.observe(ancestor,{attributes:true,attributeFilter:['class','style','hidden','open','data-detail-active','data-presentation-detail','data-detail-id']});
  });
  return()=>{cancelAnimationFrame(frame);observer?.disconnect()};
 },[id]);
 useEffect(()=>{if(!id)return;const toggle=(event:Event)=>{const detail=(event as CustomEvent<{id:string;trigger?:HTMLElement}>).detail;if(detail?.id!==id||!presentation||!host.current?.getClientRects().length)return;trigger.current=detail.trigger||document.activeElement as HTMLElement;setOpen(value=>!value)};window.addEventListener('time-comparison-toggle',toggle);return()=>window.removeEventListener('time-comparison-toggle',toggle)},[id,presentation]);
 useEffect(()=>{if(id)window.dispatchEvent(new CustomEvent('time-comparison-state',{detail:{id,open:open&&presentation}}))},[id,open,presentation]);
 useEffect(()=>{if(!open||!presentation)return;const frame=requestAnimationFrame(()=>panelRef.current?.querySelector<HTMLElement>('header')?.focus());const key=(event:KeyboardEvent)=>{if(event.key!=='Escape')return;const settings=panelRef.current?.querySelector<HTMLDetailsElement>('.timeComparisonWindowSettings[open]');if(settings&&settings.contains(document.activeElement)){event.preventDefault();event.stopImmediatePropagation();settings.open=false;settings.querySelector('summary')?.focus();return}if(claimFloatingEscape(event,panelRef.current))close()};document.addEventListener('keydown',key);return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',key)}},[open,presentation]);
 const [chosen,setChosen]=useState('');
 const index=points.findIndex(p=>p.key===currentKey);
 const fallback=points[Math.max(0,index-1)]?.key||'';
 const baselineKey=points.some(p=>p.key===chosen)?chosen:fallback;
 const a=points.find(p=>p.key===baselineKey)?.value??null,b=points.find(p=>p.key===currentKey)?.value??null;
 const delta=a==null||b==null?null:b-a;
 const rate=delta!=null&&a!=null&&a>0?delta/a*100:null;
 const values=[{title:`기준 시점 ${keyLabel(baselineKey)}`,value:a},{title:`선택 시점 ${keyLabel(currentKey)}`,value:b},{title:'선택 시점 − 기준 시점',value:delta}];
 const content=(floating=false)=><section className="panel timeComparison" aria-label="동일 지역 두 시점 비교"><header className="timeComparisonHeading"><div>{!floating&&<h2>같은 지역, 두 시점 비교</h2>}<p>{label} · {unit}</p></div><DataMeaning term="두 시점 차이" definition="동일 자료·지역·조회 조건·단위를 유지하며 선택 시점의 값에서 비교 기준 시점의 값을 뺍니다." interpretation="두 시점의 차이와 기준 대비 비율을 구분해서 보세요. 비율은 기준이 양수일 때만 계산합니다." caution="관측값의 차이이며 고유 방문자 변화·광고 효과·구매전환율이 아닙니다. 차이의 원인을 이 숫자만으로 설명할 수 없습니다. 행정구역이 바뀐 지역의 장기 비교는 주의하세요."/><label>비교 기준<select value={baselineKey} onChange={e=>setChosen(e.target.value)}>{points.map(p=><option key={p.key} value={p.key}>{keyLabel(p.key)}</option>)}</select></label></header><div className="timeComparisonValues">{values.map((item,i)=><article key={i}><span>{item.title}</span><strong className={i===2?(delta!=null&&delta<0?'negative':'positive'):undefined}><ExactValue value={item.value} unit={unit} prefix={i===2&&delta!=null&&delta>0?'+':''}/></strong>{i===2&&<p className="timeComparisonRate">{rate!=null?`기준 대비 ${rate>0?'+':''}${rate.toLocaleString('ko-KR',{maximumFractionDigits:1})}%`:a!=null&&a<=0?'기준값이 0 이하이므로 값의 차이를 비교하세요.':'두 시점에 모두 값이 있어야 차이를 계산합니다.'}</p>}</article>)}</div><details className="timeComparisonExact"><summary>정확한 수치 보기</summary><dl>{values.map((item,i)=><div key={i}><dt>{item.title}</dt><dd>{i===2&&delta!=null&&delta>0?'+':''}{exactNumber(item.value,unit)}</dd></div>)}</dl></details></section>;
 return <div ref={marker} className="timeComparisonHost">{content()}<FloatingQueryLayer host={host} enabled={open&&presentation}><aside ref={panelRef} id={id} hidden={!open||!presentation} className="timeComparisonFloating" aria-label="같은 지역, 두 시점 비교" style={geometry.style}><header {...geometry.move} onPointerDown={event=>{if((event.target as HTMLElement).closest('button,summary,details,input,select,label'))return;geometry.move.onPointerDown(event)}} tabIndex={0} aria-label="두 시점 비교 위치 이동" title="제목을 끌어 이동 · 오른쪽 아래로 크기 조절"><h3>두 시점 비교</h3><div className="timeComparisonWindowActions"><details className="timeComparisonWindowSettings"><summary>창 설정</summary><div><button onClick={geometry.reset}>위치·크기 초기화</button></div></details><button aria-label="두 시점 비교 닫기" onClick={close}>닫기</button></div></header><div className="timeComparisonFloatingBody">{content(true)}</div><div className="floatingPanelResize" role="button" tabIndex={0} aria-label="두 시점 비교 창 크기 조절" {...geometry.resize}/></aside></FloatingQueryLayer></div>
}
