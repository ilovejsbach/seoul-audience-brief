import {useRef,useState} from 'react';
import './scenario-workbench.css';
import {displayNumber,exactNumber} from './display-number';

export type Scenario={
 dataset:string;
 unit:string;
 region:string;
 period:string;
 value:number|null;
 summary:string;
 conditions:Record<string,string|number>;
};
type SavedScenario={id:number;scenario:Scenario};
type Props={current:Scenario;onApply:(scenario:Scenario)=>void;disabled?:boolean};
const copyScenario=(scenario:Scenario):Scenario=>({...scenario,conditions:{...scenario.conditions}});

export default function ScenarioWorkbench({current,onApply,disabled=false}:Props){
 const [saved,setSaved]=useState<SavedScenario[]>([]);
 const nextId=useRef(1);
 const [message,setMessage]=useState('');
 const baseline=saved[0]?.scenario;
 const capture=()=>{
  if(disabled||saved.length>=3)return;
  const snapshot={id:nextId.current++,scenario:copyScenario(current)};
  setSaved(previous=>previous.length<3?[...previous,snapshot]:previous);
  setMessage(`${saved.length===0?'기준안':'비교안'}을 저장했습니다. 이후 조회 조건을 바꾸어도 저장한 값은 유지됩니다.`);
 };
 const remove=(id:number)=>{
  setSaved(previous=>previous.filter(item=>item.id!==id));
  setMessage('저장한 안을 삭제했습니다. 맨 위에 남은 안이 기준안입니다.');
 };
 const apply=(scenario:Scenario)=>{
  onApply(copyScenario(scenario));
  setMessage('저장한 조회 조건을 다시 적용했습니다. 실제 값은 해당 자료의 조회 결과를 확인하세요.');
 };
 const delta=(scenario:Scenario,index:number)=>{
  if(index===0)return '기준';
  if(!baseline||baseline.dataset!==scenario.dataset||baseline.unit!==scenario.unit)return '자료·단위가 달라 비교 안 함';
  if(baseline.value==null||scenario.value==null||!Number.isFinite(baseline.value)||!Number.isFinite(scenario.value))return '자료 없음';
  const difference=scenario.value-baseline.value;
  return `${difference>0?'+':''}${displayNumber(difference,scenario.unit)}`;
 };
 return <details className="scenarioWorkbench panel" aria-label="조회 조건 비교 작업대"><summary className="scenarioWorkbenchToggle">조건별 비교안 저장·관리 <span>{saved.length} / 3개</span></summary><div className="scenarioWorkbenchBody">
  <div className="scenarioWorkbenchHeading"><div><h2>조건별 시나리오 비교</h2><p>첫 번째 안을 기준으로 최대 3개 조건의 실제 조회 값을 나란히 확인합니다.</p></div><span className="scenarioWorkbenchCount">{saved.length} / 3개 저장</span></div>
  <div className="scenarioWorkbenchCurrent"><div><strong>현재 조회 조건</strong><p>{current.dataset} · {current.region} · {current.period}</p><p>{current.summary||'선택 조건 없음'}</p></div><div className="scenarioWorkbenchValue"><strong title={exactNumber(current.value,current.unit)}>{displayNumber(current.value,current.unit)}</strong><details className="scenarioExact"><summary>정확한 값</summary><p>{exactNumber(current.value,current.unit)}</p></details></div><button type="button" onClick={capture} disabled={disabled||saved.length>=3}>{saved.length>=3?'최대 3개 저장됨':'현재 조건 저장'}</button></div>
  {saved.length>0?<>
   <div className="scenarioWorkbenchTableWrap"><table><caption className="scenarioWorkbenchCaption">저장한 기준안·비교안의 조건과 실제 조회 결과</caption><thead><tr><th scope="col">비교안</th><th scope="col">자료·지역·기간</th><th scope="col">저장한 조건</th><th scope="col">조회 값</th><th scope="col">기준안과 차이</th><th scope="col">조건 관리</th></tr></thead><tbody>{saved.map(({id,scenario},index)=><tr key={id}><th scope="row">{index===0?'기준안':`비교안 ${index}`}</th><td><strong>{scenario.dataset}</strong><span>{scenario.region}</span><span>{scenario.period}</span></td><td className="scenarioWorkbenchSummary">{scenario.summary||'선택 조건 없음'}</td><td className="scenarioWorkbenchNumber" title={exactNumber(scenario.value,scenario.unit)}>{displayNumber(scenario.value,scenario.unit)}<details className="scenarioExact"><summary>정확한 값</summary><p>{exactNumber(scenario.value,scenario.unit)}</p></details></td><td className="scenarioWorkbenchNumber" title={index>0&&baseline?.dataset===scenario.dataset&&baseline.unit===scenario.unit&&baseline.value!=null&&scenario.value!=null?exactNumber(scenario.value-baseline.value,scenario.unit):undefined}>{delta(scenario,index)}</td><td><div className="scenarioWorkbenchActions"><button type="button" onClick={()=>apply(scenario)} aria-label={`${index===0?'기준안':`비교안 ${index}`} 조건 다시 적용`}>조건 다시 적용</button><button type="button" onClick={()=>remove(id)} aria-label={`${index===0?'기준안':`비교안 ${index}`} 삭제`}>비교안 삭제</button></div></td></tr>)}</tbody></table></div>
   <div className="scenarioWorkbenchFooter"><p>조건별 조회 결과의 차이입니다. 광고 효과·미래 매출·방문자 수를 예측하지 않습니다. 자료나 단위가 다르면 차이를 계산하지 않습니다.</p><button type="button" onClick={()=>{setSaved([]);setMessage('저장한 비교안을 모두 비웠습니다.')}}>모두 비우기</button></div>
  </>:<p className="scenarioWorkbenchEmpty">현재 조건을 기준안으로 저장한 뒤, 지역·시간·대상을 바꾸고 비교안을 추가하세요.</p>}
  <p className="scenarioWorkbenchSessionNote">저장한 안은 이 화면에서만 유지됩니다. 새로고침하면 지워집니다.</p><div className="scenarioWorkbenchStatus" role="status" aria-live="polite">{message}</div>
 </div></details>;
}
