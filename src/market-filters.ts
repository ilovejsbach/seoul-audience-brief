type Feature={properties:Record<string,any>};
export type MarketFilters={gu:string;dong:string;type:string;query:string};
export const normalizeMarketQuery=(text:string)=>text.normalize('NFKC').replace(/\s+/g,'').toLocaleLowerCase('ko-KR');
/** Only actual area names and source type codes are matched; no inferred place aliases. */
export function filterMarketAreas<T extends Feature>(features:T[],filters:MarketFilters):T[]{
 const query=normalizeMarketQuery(filters.query);
 return features.filter(({properties:a})=>(filters.gu==='all'||String(a.gu)===filters.gu)&&(filters.dong==='all'||String(a.dong)===filters.dong)&&(filters.type==='all'||String(a.typeCode)===filters.type)&&(!query||normalizeMarketQuery(String(a.name||'')).includes(query)));
}
