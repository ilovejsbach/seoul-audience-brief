import type {ReactNode} from 'react';
import {displayNumber,exactNumber} from './display-number';
import type {MapCandidate} from './MapCandidateTray';
type CandidateProps={items:MapCandidate[];unit:string;selectedCode:string;onAdd:()=>void;onRemove:(code:string)=>void;onOpen:()=>void};
/** Up to three candidates, shown in the right support panel. State lives with the dataset owner (unchanged). */
export function SupportCandidates({items,unit,selectedCode,onAdd,onRemove,onOpen}:CandidateProps){
 const chosen=items.some(item=>item.code===selectedCode),full=items.length>=3,none=selectedCode==='all';
 const label=chosen?'후보에 담김':full?'최대 3곳 선택됨':'선택 대상 후보 담기';
 return <section className="supportCandidates" aria-label="후보 비교">
  <div className="supportCandidatesHead"><p className="supportTitle">후보</p><span role="status" className="supportCount">{items.length} / 3곳</span></div>
  <ol>{[0,1,2].map(index=>{const item=items[index];return <li key={index} className={item?'filled':'empty'}><span className="slot" aria-hidden="true">{index+1}</span>{item?<><span className="name">{item.name}</span><b title={exactNumber(item.value,unit)}>{displayNumber(item.value,unit)}</b><button type="button" aria-label={`${item.name} 후보 해제`} onClick={()=>onRemove(item.code)}>×</button></>:<span className="name placeholder">{index===0&&!items.length?'지역을 눌러 담으세요':'선택 전'}</span>}</li>})}</ol>
  {!items.length&&<p className="supportHint">지역을 눌러 선택한 뒤 후보로 담으세요.</p>}
  <div className="supportCandidatesActions"><button type="button" disabled={none||chosen||full} aria-label={label} onClick={onAdd}>{chosen||full?label:'후보 담기'}</button><button type="button" disabled={!items.length} aria-label="후보 비교 열기 →" onClick={onOpen}>비교 열기 →</button></div>
 </section>;
}
/** Short interpretation note plus the existing full source/definition popover. */
export function SupportSource({note,children}:{note:string;children:ReactNode}){
 return <section className="supportSource" aria-label="해석·출처"><p className="supportTitle">해석·출처</p><p className="supportNote">{note}</p>{children}</section>;
}
