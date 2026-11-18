/**
 * Region datasets and their detail views: ids, display names, period unit, supported surfaces and
 * the name of the existing open-adapter. One definition feeds the left menu, the detail combo and
 * the detail titles. It holds no calculation, loader or data request. The market's own three
 * details are not here (stage 4). Detail ids are the app's existing ids and must never change.
 */
export type DatasetId='population'|'mobility'|'migration'|'commerce';
export type DetailAdapter='populationDetail'|'extraDetail';
export type DatasetEntry={id:DatasetId;label:string;shortLabel:string;periodUnit:'day-hour'|'year'|'quarter';valueUnit:string;pageTitle:string;adapter:DetailAdapter};
export type ViewEntry={id:string;datasetId:DatasetId;label:string;shortLabel:string;periodNote:string;surfaces:readonly ('popup'|'main')[]};
const both=['popup','main'] as const;
export const datasets:readonly DatasetEntry[]=[
 {id:'population',label:'생활인구',shortLabel:'인구',periodUnit:'day-hour',valueUnit:'명',pageTitle:'생활인구 분포 분석',adapter:'populationDetail'},
 {id:'mobility',label:'생활이동',shortLabel:'이동',periodUnit:'day-hour',valueUnit:'건',pageTitle:'지역 간 생활이동 분석',adapter:'extraDetail'},
 {id:'migration',label:'거주지 이동',shortLabel:'전입',periodUnit:'year',valueUnit:'명',pageTitle:'거주지 전입·전출 분석',adapter:'extraDetail'},
 {id:'commerce',label:'행정동 추정매출',shortLabel:'매출',periodUnit:'quarter',valueUnit:'원',pageTitle:'행정동 추정매출 분석',adapter:'extraDetail'}
];
const v=(datasetId:DatasetId,id:string,label:string,shortLabel:string,periodNote:string):ViewEntry=>({id,datasetId,label,shortLabel,periodNote,surfaces:both});
export const views:readonly ViewEntry[]=[
 v('population','population-patterns','요일·월중 특성','요일','요일·월 구간'),
 v('population','resident-context','체류·거주 기반','거주','선택 일자·시각'),
 v('population','demographic-population','연령·성별 비교','대상','선택 일자·시각'),
 v('population','trend-population','선택 지역 시간 추이','추이','시간(0–23시)'),
 v('population','time-compare-population','두 시간 비교','시간','같은 날의 두 시각'),
 v('population','distribution-population','두 시간 분포 지도','분포','같은 날의 두 시각'),
 v('population','shortlist-population','후보 지역 비교','후보','선택 일자·시각'),
 v('population','scenario-population','조회 조건 비교','조건','저장한 조건'),
 v('mobility','trend-mobility','시간대별 이동 추이','추이','시간(0–23시)'),
 v('mobility','time-compare-mobility','두 시간 비교','시간','같은 날의 두 시각'),
 v('mobility','mobility-connections','이동 상대지역','상대','선택 시각 조건'),
 v('mobility','table-mobility','지역별 상세 내역','내역','선택 조건'),
 v('mobility','shortlist-mobility','후보 지역 비교','후보','선택 조건'),
 v('mobility','scenario-mobility','조회 조건 비교','조건','저장한 조건'),
 v('migration','trend-migration','선택 지역 연도별 추이','추이','연도'),
 v('migration','time-compare-migration','두 연도 비교','연도','두 연도'),
 v('migration','migration-demographic-details','연령·성별 구성','대상','연도'),
 v('migration','table-migration','지역별 상세 내역','내역','선택 연도'),
 v('migration','shortlist-migration','후보 지역 비교','후보','선택 연도'),
 v('migration','scenario-migration','조회 조건 비교','조건','저장한 조건'),
 v('commerce','trend-commerce','선택 지역 분기별 추이','추이','분기'),
 v('commerce','time-compare-commerce','두 분기 비교','분기','두 분기(전년 동기 포함)'),
 v('commerce','table-commerce','지역별 상세 내역','내역','선택 분기'),
 v('commerce','shortlist-commerce','후보 지역 비교','후보','선택 분기'),
 v('commerce','scenario-commerce','조회 조건 비교','조건','저장한 조건')
];
export const MAP_VIEW={id:'map',label:'지도',shortLabel:'지도'} as const;
export const datasetById=(id:string)=>datasets.find(item=>item.id===id);
export const viewsOf=(datasetId:string)=>views.filter(item=>item.datasetId===datasetId);
/** Same shape the existing detail combo (DetailNavigationProvider) takes. */
export const detailOptionsOf=(datasetId:string)=>viewsOf(datasetId).map(item=>({value:item.id,label:item.label}));
/** Title for a detail window; always equals the combo label. */
export const viewLabel=(id:string)=>views.find(item=>item.id===id)?.label??id;
