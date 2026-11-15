export type MigrationDimension='all'|'sex'|'age';
type Capability={periodsByDimension:Record<'sex'|'age',string[]>};
/** Filter the UI to periods actually present in the selected population table. */
export function migrationQueryPeriods(allPeriods:readonly string[],dimension:MigrationDimension,capability:Capability|null):string[]{
 if(dimension==='all')return [...allPeriods];
 const supported=new Set(capability?.periodsByDimension[dimension]||[]);
 return allPeriods.filter(period=>supported.has(period));
}
/** Keep a valid period; otherwise use the closest year, preferring the earlier on ties. */
export function nearestQueryPeriod(requested:string,available:readonly string[]):string{
 if(available.includes(requested))return requested;
 if(!available.length)return '';
 if(!requested||!Number.isFinite(Number(requested)))return available.at(-1)!;
 return available.reduce((best,period)=>{const distance=Math.abs(Number(period)-Number(requested)),previous=Math.abs(Number(best)-Number(requested));return distance<previous||distance===previous&&Number(period)<Number(best)?period:best},available[0]);
}
