type Feature={properties:Record<string,any>};
export type MarketFilters={gu:string;dong:string;type:string;query:string};
export const normalizeMarketQuery=(text:string)=>text.normalize('NFKC').replace(/\s+/g,'').toLocaleLowerCase('ko-KR');
/** Only actual area names and source type codes are matched; no inferred place aliases. */
export function filterMarketAreas<T extends Feature>(features:T[],filters:MarketFilters):T[]{
 const query=normalizeMarketQuery(filters.query);
 return features.filter(({properties:a})=>(filters.gu==='all'||String(a.gu)===filters.gu)&&(filters.dong==='all'||String(a.dong)===filters.dong)&&(filters.type==='all'||String(a.typeCode)===filters.type)&&(!query||normalizeMarketQuery(String(a.name||'')).includes(query)));
}

export type MarketRelatedOption={value:string;label:string;count:number;disabled:boolean};
/** Counts describe the area intersection after replacing this control's value.
 * Changing a parent district also clears its dependent dong, just like the UI. */
export function relatedMarketOptions<T extends Feature>(features:T[],filters:MarketFilters,field:'gu'|'dong'|'type'):MarketRelatedOption[]{
 const property=field==='type'?'typeCode':field,name=field==='type'?'type':field==='gu'?'guName':'dongName';
 const base={...filters,[field]:'all',...(field==='gu'?{dong:'all'}:{})};
 const eligible=filterMarketAreas(features,base),counts=new Map<string,number>();
 for(const feature of eligible){const value=String(feature.properties[property]);counts.set(value,(counts.get(value)||0)+1)}
 const scope=field==='dong'&&filters.gu!=='all'?features.filter(f=>String(f.properties.gu)===filters.gu):features;
 const labels=new Map<string,string>();for(const feature of scope)labels.set(String(feature.properties[property]),String(feature.properties[name]));
 return [{value:'all',label:'전체',count:eligible.length,disabled:false},...[...labels].map(([value,label])=>({value,label,count:counts.get(value)||0,disabled:!counts.get(value)&&filters[field]!==value}))];
}
