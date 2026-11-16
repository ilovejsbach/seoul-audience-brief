import {Children,isValidElement,useEffect,useId,useMemo,useRef,useState,type ReactNode,type KeyboardEvent} from 'react';
import {useQueryToolbar} from './UnifiedQueryBar';
import QueryPopover from './QueryPopover';
import './query-controls.css';

export type QuerySelectOption={value:string;label:string;count?:number;disabled?:boolean};
type SelectProps={id:string;label:string;value:string;onChange:(value:string)=>void;options:QuerySelectOption[];disabled?:boolean;placeholder?:string;countUnit?:string;showSelectedCount?:boolean};
const normalize=(value:string)=>value.normalize('NFKC').replace(/\s+/g,'').toLocaleLowerCase('ko-KR');
export function SearchableSelect({id,label,value,onChange,options,disabled=false,placeholder,countUnit='개',showSelectedCount=true}:SelectProps){
 const trigger=useRef<HTMLButtonElement>(null),list=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null),[open,setOpen]=useState(false),[query,setQuery]=useState('');
 const unique=useId().replace(/:/g,''),listId='query-search-'+unique,valueId='query-value-'+unique;
 useEffect(()=>{if(disabled)setOpen(false)},[disabled]);
 const filtered=useMemo(()=>{const text=normalize(query);return text?options.filter(option=>normalize(option.label).includes(text)):options},[options,query]);
 const text=(option:QuerySelectOption)=>option.count==null?option.label:`${option.label} · ${option.count.toLocaleString('ko-KR')}${countUnit}`;
 const selected=options.find(option=>option.value===value),selectedText=selected?(showSelectedCount?text(selected):selected.label):options.length?'선택값 확인 필요':'자료 확인 중';
 // A currently selected zero-result option remains available so the user can clear it.
 const unavailable=(option:QuerySelectOption)=>!!option.disabled&&option.value!==value;
 const choose=(next:string)=>{onChange(next);setOpen(false);if(trigger.current?.getClientRects().length)trigger.current.focus()};
 const toggle=()=>{setQuery('');setOpen(current=>!current)};
 const move=(event:KeyboardEvent)=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;const buttons=[...list.current?.querySelectorAll<HTMLButtonElement>('[role=option]:not(:disabled)')||[]];if(!buttons.length)return;event.preventDefault();const index=buttons.indexOf(document.activeElement as HTMLButtonElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowDown'?(index+1)%buttons.length:index<0?buttons.length-1:(index-1+buttons.length)%buttons.length;buttons[next]?.focus()};
 return <div className="querySearchSelect">
  <label htmlFor={id}>{label}</label>
  <button ref={trigger} id={id} type="button" className="querySelectTrigger" role="combobox" title={selectedText} aria-label={label} aria-describedby={valueId} aria-haspopup="dialog" aria-controls={open&&!disabled?listId:undefined} aria-expanded={open&&!disabled} disabled={disabled||!options.length} onClick={toggle} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setQuery('');setOpen(true)}}}>
   <span id={valueId} className="querySelectValue">{selectedText}</span><span className="querySelectChevron" aria-hidden="true">▾</span>
  </button>
  <QueryPopover open={open&&!disabled} anchor={trigger} title={`${label} 선택`} onClose={()=>setOpen(false)}>
   <label className="querySearchField">이름으로 찾기<input ref={search} data-query-autofocus aria-label={`${label} 선택지 검색`} type="search" autoComplete="off" aria-controls={listId} placeholder={placeholder||`${label} 이름 입력`} value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){const first=!query.trim()?filtered.find(option=>option.value===value&&!unavailable(option))||filtered.find(option=>!unavailable(option)):filtered.find(option=>!unavailable(option));if(first){event.preventDefault();choose(first.value)}}else move(event)}}/></label>
   <p className="querySearchCount" role="status">{query?`검색 ${filtered.length.toLocaleString('ko-KR')}개 / 전체 ${options.length.toLocaleString('ko-KR')}개`:`전체 ${options.length.toLocaleString('ko-KR')}개`}</p>
   <div id={listId} ref={list} role="listbox" aria-label={`${label} 검색 결과`} className="querySearchResults" onKeyDown={move}>{filtered.map(option=><button key={option.value} type="button" role="option" aria-selected={option.value===value} disabled={unavailable(option)} onClick={()=>choose(option.value)}><span>{text(option)}</span>{option.value===value&&<span aria-hidden="true">✓</span>}</button>)}</div>
   {!filtered.length&&<div className="querySearchEmpty"><p>일치하는 선택지가 없습니다.</p><button type="button" onClick={()=>{setQuery('');search.current?.focus()}}>검색어 지우기</button></div>}
  </QueryPopover>
 </div>
}

export function QueryGroup({title,children,defaultOpen=false,summary}:{title:string;children:ReactNode;defaultOpen?:boolean;summary?:string}){
 const toolbar=useQueryToolbar();
 if(toolbar)return <div className="queryToolbarGroup" role="group" aria-label={title}>{Children.map(children,child=>isValidElement<{children:ReactNode}>(child)&&child.type==='small'?<details className="queryToolbarNote"><summary aria-label={`${title} 조회 기준 설명`} title={`${title} 조회 기준 설명`}>ⓘ</summary><div>{child.props.children}</div></details>:child)}</div>;
 return <details className="queryFilterGroup" open={defaultOpen||undefined}><summary><b>{title}</b>{summary&&<span>{summary}</span>}</summary><div className="queryFilterGroupBody">{children}</div></details>;
}
