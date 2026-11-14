export type ResidentRecord={code:string;level:'seoul'|'gu'|'dong';name:string;gu?:string;period:string;value:number|null};
export type ResidentData={title:string;period:string;periodLabel:string;referenceDate:string|null;populationScope:string;sourceUrl:string;records:ResidentRecord[]};
const normalize=(name:string)=>name.replace(/제(?=\d)/g,'').replace(/[.·\s]/g,'');
/** Historical code/name mismatches remain unavailable; no geographic interpolation. */
export function findResidentRecord(records:ResidentRecord[],regionCode:string,regionName:string):ResidentRecord|null{
 const matches=records.filter(record=>regionCode==='all'?record.level==='seoul'&&record.code==='all':regionCode.length===5?record.level==='gu'&&record.code===regionCode:record.level==='dong'&&record.code.slice(0,8)===regionCode.slice(0,8)&&normalize(record.name)===normalize(regionName));
 return matches.length===1?matches[0]:null;
}
