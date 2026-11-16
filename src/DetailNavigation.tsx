import {createContext,useContext,useId,type ReactNode} from 'react';

export type DetailOption={value:string;label:string;disabled?:boolean};
type DetailNavigationState={options:DetailOption[];value:string|null;onChange:(value:string)=>void};
const DetailNavigationContext=createContext<DetailNavigationState|null>(null);

/** Navigation belongs to the workspace, so it remains available in every detail surface. */
export function DetailNavigationProvider({options,value,onChange,children}:DetailNavigationState&{children:ReactNode}){
 return <DetailNavigationContext.Provider value={{options,value,onChange}}>{children}</DetailNavigationContext.Provider>;
}

export function DetailNavigationControl({title}:{title:string}){
 const navigation=useContext(DetailNavigationContext),id='detail-navigation-'+useId().replace(/:/g,'');
 if(!navigation)return <h2>{title}</h2>;
 const current=navigation.options.some(option=>option.value===navigation.value)?navigation.value||'':'';
 return <div className="detailNavigationHeading"><h2 className="detailNavigationSemanticTitle">{title}</h2><label htmlFor={id}>상세 분석</label><select id={id} className="detailNavigationSelect" aria-label="상세 분석 선택" value={current} onChange={event=>navigation.onChange(event.target.value)}><option value="" disabled>상세 분석 선택</option>{navigation.options.map(option=><option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select></div>;
}
