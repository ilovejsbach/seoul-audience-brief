/** Regression for table drilldown and repeated detail in presentation mode. */
export async function runDistrictDetails(tab){
 const p=tab.playwright,results=[];
 const button=name=>p.getByRole('button',{name,exact:true});
 const visible=s=>p.locator(s).filter({visible:true});
 const assert=(ok,message)=>{if(!ok)throw Error(message)};
 const select=(name,value)=>p.getByRole('combobox',{name,exact:true}).selectOption(value);
 async function run(id,action){try{await action();results.push({id,status:'passed'})}catch(e){results.push({id,status:'failed',error:String(e)})}}
 async function fresh(pattern){await tab.reload();await p.getByRole('button',{name:pattern}).click();await visible('.controls').waitFor({state:'visible'})}
 await run('mobility-same-district-presentation-detail',async()=>{
  await fresh(/^생활이동 ↗/);await select('자치구','11560');await visible('.metrics').filter({hasText:'48,205'}).waitFor({state:'visible'});await button('시연용').click();await p.locator('.mode-presentation').waitFor({state:'visible'});await p.getByRole('button',{name:/1\s*지역 살펴보기/}).click();
  await p.getByRole('button',{name:/^영등포구 자료일 .*48,205 건/}).click();await button('상세 분석 →').click();
  await visible('.presentationNav').filter({hasText:'2 / 3'}).waitFor({state:'visible'});await visible('.trendExplorer').filter({hasText:'영등포구'}).waitFor({state:'visible'});
  assert(await visible('.mapPopup').count()===0,'popup closed');
  await p.getByRole('button',{name:/1\s*지역 살펴보기/}).click();await p.getByRole('button',{name:/^영등포구 자료일 .*48,205 건/}).click();await button('상세 분석 →').click();await visible('.presentationNav').filter({hasText:'2 / 3'}).waitFor({state:'visible'});
 });
 await run('mobility-table-selection',async()=>{
  await fresh(/^생활이동 ↗/);await visible('.extraTable').getByRole('button',{name:'마포구 상세 보기',exact:true}).click();
  await visible('.metrics').filter({hasText:'59,832'}).waitFor({state:'visible'});await visible('.regionSelectionSummary').filter({hasText:'마포구'}).waitFor({state:'visible'});
  assert(await visible('.trendExplorer').innerText().then(s=>s.includes('마포구')),'trend uses selected gu');assert(!(await button('선택 구 동 지도').isEnabled()),'no fabricated dong map');
  await button('서울 전체로').click();assert(await p.getByRole('combobox',{name:'자치구',exact:true}).evaluate(el=>el.value)==='all','back to all');
 });
 await run('commerce-table-gu-dong',async()=>{
  await fresh(/^상권 추정매출 ↗/);await visible('.extraTable').getByRole('button',{name:'마포구 상세 보기',exact:true}).click();
  await visible('.metrics').filter({hasText:'1,079,338,758,575'}).waitFor({state:'visible'});await visible('.extraTable').getByRole('button',{name:'공덕동 상세 보기',exact:true}).click();
  await visible('.metrics').filter({hasText:'49,119,921,140'}).waitFor({state:'visible'});assert(await visible('.mapWrap svg').getAttribute('aria-label')==='선택 구의 행정동별 실제 통계 지도','dong geometry');
  await button('서울 전체로').click();assert(await p.getByRole('combobox',{name:'행정동',exact:true}).evaluate(el=>el.value)==='all','reset dong');
 });
 await run('migration-table-old-year-fallback',async()=>{
  await fresh(/^거주지 전입·전출 ↗/);await visible('.extraTable').getByRole('button',{name:'마포구 상세 보기',exact:true}).click();
  await visible('.extraTable').getByRole('button',{name:'공덕동 상세 보기',exact:true}).click();await visible('.metrics').filter({hasText:'4,919'}).waitFor({state:'visible'});
  await select('기준 기간','2001');await visible('.metrics').filter({hasText:'81,870'}).waitFor({state:'visible'});await visible('.extraTable').getByRole('button',{name:'마포구 상세 보기',exact:true}).waitFor({state:'visible'});
  assert(await button('↓ 표 내려받기').isEnabled(),'old gu export remains enabled');
 });
 return results;
}
