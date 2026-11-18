/**
 * 지하철 자료 접근 계층. 화면 코드는 파일 경로·압축 여부를 모르고 이 모듈의 함수만 부른다.
 * 값은 number|null이며 null을 0으로 바꾸지 않는다.
 */
import {decodeStaticJson} from '../../static-json';

const ROOT='data/transit/subway/';
const base=():string=>(import.meta as unknown as {env?:{BASE_URL?:string}}).env?.BASE_URL||'./';

export type Station={id:string;line:number;code:string;name:string;lat:number;lng:number;gu:string|null;guName:string|null;dong:string|null;dongName:string|null;group:string};
export type StationGroup={id:string;name:string;members:string[]};
export type Stations={stations:Station[];groups:StationGroup[];note:string};
export type MonthlyRec={bw:(number|null)[];bh:(number|null)[];aw:(number|null)[];ah:(number|null)[];dw:number[];dh:number[];nb:number[];na:number[]};
export type Monthly={months:string[];stations:Record<string,MonthlyRec>};
export type DailyFile={dates:string[];stations:Record<string,{b:(number|null)[];a:(number|null)[]}>};
export type HourlyMonth={d:[number,number];b:[(number|null)[],(number|null)[]];a:[(number|null)[],(number|null)[]]};
export type Hourly={year:number;buckets:string[];stations:Record<string,Record<string,HourlyMonth>>};
export type TypeHours={b:[(number|null)[],(number|null)[]];a:[(number|null)[],(number|null)[]]};
export type PassengerTypes={months:string[];groups:string[];rawTypeTotals:Record<string,[number|null,number|null]>;stations:Record<string,{m:Record<string,{b:(number|null)[];a:(number|null)[]}>;h:Record<string,TypeHours>;dw:number[];dh:number[]}>};
export type Crowding={unit:string;slots:string[];quarters:Record<string,Partial<Record<'wd'|'sat'|'sun',Record<string,Record<string,(number|null)[]>>>>>};
export type DatasetManifest={id:string;title:string;period?:{start:string;end:string};source?:{id:string;url:string;license:string;retrievedAt:string};measures?:{id:string;label:string;unit:string;nullMeaning:string}[];files?:{path:string;sha256:string}[];notes?:string;status?:string;reason?:string};
export type SubwayManifest={version:string;generatedAt:string;datasets:DatasetManifest[]};
export type Boundary={features:{properties:{name:string;code:string};geometry:unknown}[]};

const cache=new Map<string,Promise<unknown>>();
let version='';
function fetchJson<T>(rel:string):Promise<T>{
  const key=rel+'@'+version;
  if(!cache.has(key)){
    const p=(async()=>{
      const r=await fetch(base()+rel+(version?`?v=${version}`:''));
      if(!r.ok)throw new Error(`자료를 불러오지 못했습니다(${r.status})`);
      return rel.endsWith('.gz')?await decodeStaticJson<T>(new Uint8Array(await r.arrayBuffer())):await r.json() as T;
    })();
    p.catch(()=>cache.delete(key));
    cache.set(key,p);
  }
  return cache.get(key) as Promise<T>;
}

export const subwayData={
  async manifest():Promise<SubwayManifest>{const m=await fetchJson<SubwayManifest>(ROOT+'manifest.json');version=m.version;return m},
  stations:()=>fetchJson<Stations>(ROOT+'stations.json'),
  monthly:()=>fetchJson<Monthly>(ROOT+'monthly.json.gz'),
  daily:(line:number)=>fetchJson<DailyFile>(`${ROOT}daily/${line}.json.gz`),
  hourly:(year:number)=>fetchJson<Hourly>(`${ROOT}hourly/${year}.json.gz`),
  passengerTypes:()=>fetchJson<PassengerTypes>(ROOT+'passenger-types.json.gz'),
  crowding:()=>fetchJson<Crowding>(ROOT+'crowding.json.gz'),
  seoulBoundary:()=>fetchJson<Boundary>('data/districts.geojson'),
};
