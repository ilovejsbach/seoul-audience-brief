export type PopulationRow=(string|number|null)[];
export type Cohort={age:string;sex:string};
export const ageChoices=[['all','전체 연령'],['young','20–39세'],['middle','40–59세'],['senior','60세 이상']] as const;
export const sexChoices=[['all','전체 성별'],['male','남성'],['female','여성']] as const;
export const cohortLabel=(c:Cohort)=>`${ageChoices.find(x=>x[0]===c.age)?.[1]||c.age} · ${sexChoices.find(x=>x[0]===c.sex)?.[1]||c.sex}`;
export function cohortIndices(columns:string[],cohort:Cohort){
 if(cohort.age==='all'&&cohort.sex==='all')return columns.length>3?[3]:[];
 return columns.flatMap((column,index)=>{if(index<4)return[];if(cohort.sex==='male'&&!column.startsWith('남자')||cohort.sex==='female'&&!column.startsWith('여자'))return[];if(cohort.age==='all')return[index];const start=Number(column.match(/(\d+)[~세]/)?.[1]??-1);return cohort.age==='young'&&start>=20&&start<40||cohort.age==='middle'&&start>=40&&start<60||cohort.age==='senior'&&start>=60?[index]:[]});
}
/** All rows must be from the same selected region and hour. Partial masked totals stay null. */
export function cohortTotal(columns:string[],rows:PopulationRow[],cohort:Cohort):number|null{
 const indices=cohortIndices(columns,cohort);if(!rows.length||!indices.length)return null;
 let total=0;for(const row of rows)for(const index of indices){const value=row[index];if(value==null||value===''||!Number.isFinite(Number(value)))return null;total+=Number(value)}return total;
}
export function cohortComparison(columns:string[],rows:PopulationRow[],a:Cohort,b:Cohort){
 const first=cohortTotal(columns,rows,a),second=cohortTotal(columns,rows,b),total=cohortTotal(columns,rows,{age:'all',sex:'all'});
 const share=(value:number|null)=>value==null||total==null||total<=0?null:value/total*100;
 return {first,second,total,firstShare:share(first),secondShare:share(second),difference:first==null||second==null?null:second-first};
}
