/** Scenario E2E runner. Pass a documented cua_repl browser Tab (not Playwright CLI). */
export function createSuite(tab){
 const page=tab.playwright, results=[];
 const role=(name)=>page.getByRole('button',{name,exact:true});
 const visible=(selector)=>page.locator(selector).filter({visible:true});
 const select=(name,value)=>page.getByRole('combobox',{name,exact:true}).selectOption(value);
 const txt=selector=>visible(selector).innerText();
 const assert=(condition,message)=>{if(!condition)throw new Error(message)};
 const includes=async(selector,value)=>{const text=await txt(selector);const exact=selector==='.metrics'?await visible(selector).locator('strong[title]').evaluateAll(es=>es.map(e=>e.getAttribute('title')).join(' | ')):'';assert((text+' '+exact).includes(value),`${selector}: expected ${value}; actual ${text}`)};
 async function fresh(dataset='population'){
  await tab.reload(); await page.getByRole('heading',{name:'지역별 광고 입지 분석',exact:true}).waitFor({state:'visible'});
  const name={population:/^생활인구 ↗/,mobility:/^생활이동 ↗/,migration:/^거주지 전입·전출 ↗/,commerce:/^상권 추정매출 ↗/}[dataset];
  await page.getByRole('button',{name}).click();
  if(dataset==='population')await visible('.metrics').filter({hasText:'11,370,664'}).waitFor({state:'visible'});
  else await visible('.controls').waitFor({state:'visible'});
 }
 const cases={
  async 'hero-entries'(){
   await tab.reload();assert(await page.locator('.heroAnalysis').isVisible(),'analysis hero default');
   assert(await page.locator('.analysisDatasets button').count()===4,'four datasets');
   assert(await role('브리핑 인쇄 ↗').count()===0,'no dead print control on hero');
   await role('시연용').click();assert(await page.locator('.heroPresentation').isVisible(),'presentation hero');
   assert(await page.locator('.analysisDatasets').count()===0,'presentation omits data catalogue');
   await role('브리핑 시작하기 ↗').click();assert(await visible('.presentationNav').count()===1,'presentation started');
   await role('← 시작 화면').click();await role('분석용').click();
   for(const [key,pattern] of [['population',/^생활인구 ↗/],['mobility',/^생활이동 ↗/],['migration',/^거주지 전입·전출 ↗/],['commerce',/^상권 추정매출 ↗/]]){
    await page.getByRole('button',{name:pattern}).click();assert(await page.getByRole('combobox',{name:'지도 데이터',exact:true}).getAttribute('data-map-dataset')!==null,`map selector ${key}`);await role('← 시작 화면').click();
   }
   for(const pattern of [/^◎ 지역별 인구 분포 비교/,/^◷ 시간대별 이동 변화 분석/,/^↗ 거주 인구의 장기 변화 분석/]){await page.getByRole('button',{name:pattern}).click();assert(await visible('.analysisView').count()===1,'scenario launched');await role('← 시작 화면').click()}
   return '2 hero modes, 4 dataset entries, 3 purpose entries, back navigation';
  },
  async 'population-filters'(){
   await fresh();assert(!(await page.getByRole('combobox',{name:'행정동',exact:true}).isEnabled()),'dong requires gu');
   await select('자치구','11440');await includes('.metrics','540,998');
   await page.getByRole('button',{name:'12:00 485,894 명 선택',exact:true}).click();await includes('.metrics','485,894');
   await select('타깃 연령','young');await select('성별','female');await includes('.metrics','102,539');
   await includes('.mapAppliedConditions','12:00');await includes('.mapAppliedConditions','20–39세 · 여성');
   await page.getByRole('button',{name:'18:00 125,106 명 선택',exact:true}).click();await includes('.metrics','125,106');
   await select('기준일','20261001');await visible('.metrics').filter({hasText:'2026.10.01'}).waitFor({state:'visible'});
   await page.getByText('실제 통계 파일을 불러오고 있습니다…',{exact:true}).waitFor({state:'hidden'});assert(await role('↓ 표 내려받기').isEnabled(),'new date loaded');
   await select('기준일','20261031');await visible('.metrics').filter({hasText:'125,106'}).waitFor({state:'visible'});
   return 'district, date, hour, age, sex update map and validated values';
  },
  async 'map-popup-drilldown'(){
   await fresh();await page.getByRole('button',{name:/^마포구 2026.*540,998 명$/}).click();
   await page.getByRole('dialog',{name:'마포구 지역 정보'}).waitFor({state:'visible'});await includes('.mapPopup','540,998');
   await role('지역 정보 닫기').press('Escape');assert(await visible('.mapPopup').count()===0,'escape closes popup');
   await page.getByRole('button',{name:/^마포구 2026.*540,998 명$/}).click();await role('상세 분석 →').click();
   await page.getByRole('img',{name:'선택 구의 행정동별 실제 통계 지도',exact:true}).waitFor({state:'visible'});
   await page.getByRole('button',{name:/^서교동 2026/}).click();await role('상세 분석 →').click();await includes('.metrics','서교동');
   assert(await visible('.mapWrap path.selected').count()===1,'selected dong highlight');
   await role('서울 구 지도').click();await page.getByRole('img',{name:'서울 자치구별 실제 통계 지도',exact:true}).waitFor({state:'visible'});
   await role('선택 구 동 지도').click();await page.getByRole('img',{name:'선택 구의 행정동별 실제 통계 지도',exact:true}).waitFor({state:'visible'});
   return 'map preview, Escape, gu→dong detail, selected geometry, level switching';
  },
  async 'candidate-limit'(){
   await fresh();for(const n of ['강남구','송파구','마포구'])await role(`${n} 비교 추가`).click();
   assert(await visible('.compareGrid article').count()===3,'three candidates');assert(!(await role('강서구 비교 추가').isEnabled()),'fourth blocked');
   await role('강남구 비교 해제').click();assert(await role('강서구 비교 추가').isEnabled(),'slot freed');await role('강서구 비교 추가').click();
   assert(await visible('.compareGrid article').count()===3,'replacement candidate');
   await visible('.compareGrid article').filter({hasText:'강서구'}).getByRole('button',{name:'비교 해제',exact:true}).click();assert(await visible('.compareGrid article').count()===2,'remove card');
   return 'add/remove/reuse slots; maximum three';
  },
  async 'masked-and-unmapped'(){
   await fresh();await select('자치구','11110');await select('행정동','11110690');await select('성별','female');await includes('.metrics','자료 없음');await includes('.mapMissingReason','비공개');
   await select('성별','all');await select('자치구','11230');
   await page.getByRole('button',{name:/^용신동 .*자료 없음/}).click();
   assert(!(await role('상세 분석 →').isEnabled()),'unmapped geometry must not select nonexistent data');
   assert(!(await role('+ 후보 비교').isEnabled()),'unmapped geometry must not enter shortlist');
   await role('지역 정보 닫기').click();await select('행정동','11230515');await includes('.metrics','19,805');assert(await role('↓ 표 내려받기').isEnabled(),'unmapped current dong still queryable by list');
   return 'masked values remain null; historical geometry cannot create fictitious selection';
  },
  async 'saved-scenarios'(){
   await fresh();await select('자치구','11440');await select('타깃 연령','young');await select('성별','female');
   await visible('.scenarioWorkbenchToggle').click();await role('현재 조건 저장').click();
   await page.getByRole('button',{name:'12:00 102,539 명 선택',exact:true}).click();await role('현재 조건 저장').click();
   await role('다음 시간').click();await role('현재 조건 저장').click();assert(!(await role('최대 3개 저장됨').isEnabled()),'saved limit');
   await role('기준안 조건 다시 적용').click();await includes('.metrics','125,106');await includes('.mapAppliedConditions','18:00');
   await role('비교안 1 삭제').click();assert(await role('현재 조건 저장').isEnabled(),'delete saved scenario frees slot');
   await role('모두 비우기').click();await includes('.scenarioWorkbenchToggle','0 / 3');
   return 'immutable snapshots, limit, apply exact conditions, delete, clear';
  },
  async 'trend-playback'(){
   await fresh();await select('자치구','11440');await select('타깃 연령','young');await select('성별','female');await page.getByRole('button',{name:'12:00 102,539 명 선택',exact:true}).click();
   await role('기준 대비 증감').click();await select('비교 기준 시점','12:00');await includes('.trendCurrent','0');
   await role('기준 100').click();await includes('.trendCurrent','100');await role('실제값').click();await includes('.trendCurrent','102,539');
   await select('재생 간격','800');await role('▶ 재생').click();await visible('.mapAppliedConditions').filter({hasText:'13:00'}).waitFor({state:'visible',timeoutMs:5000});await role('Ⅱ 일시 정지').click();await includes('.mapAppliedConditions','13:00');
   await role('▶ 재생').click();await page.getByRole('tab',{name:/^02\s*유입 · 유출$/}).click();await page.getByRole('tab',{name:/^01\s*생활인구$/}).click();assert(await role('▶ 재생').count()===1,'tab switch stops hidden playback');
   await role('이전 시점').click();await role('다음 시점').click();await visible('.trendExplanation summary').click();await includes('.trendExplanation','비공개·결측');
   return 'actual/difference/index, baseline, play/pause/speed, hidden stop, previous/next';
  },
  async 'mobility-aggregation'(){
   await fresh('mobility');await select('자치구','11440');await visible('.mapAppliedConditions').filter({hasText:'도착 시각'}).waitFor({state:'visible'});await includes('.metrics','59,832');
   await select('지도 지표','outflow');await includes('.metrics','52,526');await select('지도 지표','net');await includes('.metrics','7,306');
   await select('지도 지표','inflow');await select('집계 방식','cumulative');await includes('.metrics','575,183');await select('집계 방식','day');await includes('.metrics','752,663');
   await select('집계 방식','hour');await select('시간 기준','departure');await includes('.metrics','47,799');await select('집계 방식','cumulative');await includes('.metrics','632,994');
   await select('집계 방식','day');await includes('.metrics','752,663');
   assert(!(await role('선택 구 동 지도').isEnabled()),'mobility has no fake dong detail');
   return 'arrival/departure, inflow/outflow/net, hourly/cumulative/day, spatial limits';
  },
  async 'residential-migration'(){
   await fresh('migration');await select('자치구','11440');await includes('.metrics','49,402');await select('행정동',{label:'공덕동'});await includes('.metrics','4,919');
   await select('기준 기간','2001');assert(await role('↓ 표 내려받기').isEnabled(),'historical gu export despite no dong data');await includes('.metrics','81,870');await role('↓ 표 내려받기').click();
   await select('기준 기간','2023');await includes('.notice','두 공식 제공처');
   await select('기준 기간','2022');await select('자치구','11740');await select('행정동',{label:'둔촌1동'});await includes('.metrics','자료 없음');
   await role('순이동').click();await includes('.metrics','자료 없음');
   return 'gu/dong, old-year reset/export, source difference notice, missing value propagation';
  },
  async 'commerce-detail'(){
   await fresh('commerce');await select('자치구','11440');await includes('.metrics','1,079,338,758,575');await select('매출 시간대','4');await includes('.metrics','318,884,312,558');
   await select('매출 시간대','-1');await select('행정동',{label:'공덕동'});await includes('.metrics','49,119,921,140');
   await select('행정동','all');await select('기준 분기','20251');await includes('.metrics','984,757,860,025');
   await select('기준 분기','20254');assert(await visible('.trendExplorer .trendLine').getAttribute('d')!=='','commerce gu period trend present');
   await visible('.dataNotes summary').click();await includes('.dataNotes','원본 데이터 출처');
   return 'quarter, time band, dong, gu period trend, source disclosure';
  },
  async 'fullscreen-dataset'(){
   await fresh();await role('지도 전체화면 보기').click();assert(await visible('.mapIsFullscreen').count()===1,'full screen entered');await role('지도 확대').click();await includes('.mapZoomTools','140%');await role('지도 축소').click();await role('원래 범위').click();await includes('.mapZoomTools','100%');
   await select('지도 데이터','migration');assert(await visible('.mapIsFullscreen').count()===0,'dataset leaves fullscreen');await includes('.mapAppliedConditions','2025년');
   await role('지도 전체화면 보기').click();await role('지도 전체화면 닫기').click();assert(await visible('.mapIsFullscreen').count()===0,'close full screen');
   return 'full screen, zoom in/out/reset, data transition, close';
  },
  async 'presentation-journey'(){
   await fresh();await role('시연용').click();assert(await visible('.workspace').count()===1,'region page map visible');assert(await visible('.trendExplorer').count()===0,'region page trend hidden');
   await role('강남구 비교 추가').click();await role('송파구 비교 추가').click();await role('다음 →').click();assert(await visible('.workspace').count()===0,'time page map hidden');assert(await visible('.trendExplorer').count()===1,'time page trend visible');
   await role('다음 →').click();assert(await visible('.compareGrid article').count()===2,'shortlist page retained candidates');assert(await visible('.trendExplorer').count()===0,'shortlist trend hidden');assert(!(await role('다음 →').isEnabled()),'last page blocks next');
   await role('← 시작 화면').click();await role('이전 시연 이어보기 →').click();await includes('.presentationNav','3 / 3');
   await role('← 이전').click();await includes('.presentationNav','2 / 3');await page.getByRole('button',{name:/1\s*지역 살펴보기/}).click();await includes('.presentationNav','1 / 3');
   await role('세부 조건 보기').click();assert(await visible('.controls').count()===1,'show conditions');await role('세부 조건 접기').click();assert(await visible('.controls').count()===0,'hide conditions');
   await role('분석용').click();assert(await visible('.controls').count()===1,'analysis restores full tools');assert(await visible('.compareGrid article').count()===2,'analysis preserves candidates');
   return 'three pages, back/direct links, hero resume, disclosure, analysis state preserved';
  },
  async 'pointer-controls'(){
   await fresh();await role('지도 전체화면 보기').click();
   const map=visible('.mapWrap svg');const label=map.locator('text').filter({hasText:'마포구'});
   const rect=await map.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}});
   const target=await label.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});
   await tab.drag([10,10],[target.x,target.y]);
   await page.getByRole('tooltip').waitFor({state:'visible',timeoutMs:5000});await includes('.mapHoverTooltip','마포구');await includes('.mapHoverTooltip','540,998');
   const before=await map.locator('g').first().getAttribute('transform');
   await tab.drag([target.x,target.y],[target.x+65,target.y+25]);
   const after=await map.locator('g').first().getAttribute('transform');assert(before!==after,'drag changes transform');assert(await visible('.mapPopup').count()===0,'drag does not accidentally open popup');
   await role('원래 범위').click();await tab.scroll([target.x,target.y],'up',1);assert(!(await txt('.mapZoomTools')).includes('100%'),'wheel changes zoom');await role('원래 범위').click();await role('지도 전체화면 닫기').click();
   return 'real pointer hover, drag pan without accidental popup, wheel zoom';
  },
  async 'network-failure'(){
   await fresh();await select('자치구','11440');await select('기준일','20261030');await visible('.notice.error').waitFor({state:'visible',timeoutMs:8000});
   await includes('.notice.error','자료를 불러오지 못했습니다');assert(!(await role('↓ 표 내려받기').isEnabled()),'failed data must block export');await includes('.metrics','자료 없음');
   await select('기준일','20261031');await visible('.metrics').filter({hasText:'540,998'}).waitFor({state:'visible'});assert(await role('↓ 표 내려받기').isEnabled(),'recover by valid date');
   return 'missing file shows error, no stale value/export, valid date recovers';
  }
 };
 async function run(id){const startedAt=new Date().toISOString();let result;try{const detail=await cases[id]();result={id,status:'passed',detail,startedAt,finishedAt:new Date().toISOString()}}catch(error){result={id,status:'failed',error:String(error),startedAt,finishedAt:new Date().toISOString()}}results.push(result);return result}
 return {run,results,ids:Object.keys(cases),tab};
}
