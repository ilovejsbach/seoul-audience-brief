/** Top-level topics only: id, name, status, entry. No dataset or detail ids (those belong to the stage-2 registry). */
export type ServiceId='region'|'market'|'transport'|'realestate';
export type ServiceView='analysis'|'map';
export type ServiceEntry={id:ServiceId;label:string;status:'active'|'planned';entry:ServiceView|null;plannedNote?:string};
export const services:readonly ServiceEntry[]=[
 {id:'region',label:'지역 분석',status:'active',entry:'analysis'},
 {id:'market',label:'상권 분석',status:'active',entry:'map'},
 {id:'transport',label:'교통(예정)',status:'planned',entry:null,plannedNote:'자료 확보 후'},
 {id:'realestate',label:'부동산(예정)',status:'planned',entry:null,plannedNote:'자료 확보 후'}
];
/** The app keeps its legacy `view` state; the service is derived from it. */
export const serviceOfView=(view:string):'home'|'region'|'market'=>view==='analysis'?'region':view==='map'?'market':'home';
