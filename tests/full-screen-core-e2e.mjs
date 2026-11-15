export async function runCoreScreenAudit(tab,mode,record){
 const p=tab.playwright,b=n=>p.getByRole('button',{name:n,exact:true}).filter({visible:true}),out=[];
 await b(mode==='analysis'?'분석용':'시연용').click();
 for(const [topic,key] of [['생활인구','population'],['생활이동','mobility'],['거주지 이동','migration'],['추정매출','commerce']]){
  await p.getByRole('tab',{name:topic,exact:true}).click();await b('지도').click();
  const add=p.locator(`#map-${key} .addCompare`).filter({visible:true}).first();await add.waitFor({state:'visible'});
  if(!(await add.getAttribute('class')).includes('chosen'))await add.click();
  const map=p.locator(`#map-${key} svg[data-map-level] path[role=button]`).first();await map.press('Enter');
  if(!await b('상세 분석 →').isVisible())throw Error(topic+' map popup absent');
  const data=await p.locator('.mapPopup').filter({visible:true}).innerText();
  await b('상세 분석 →').click();
  out.push(await record({id:`${key.toUpperCase()}-MAP`,mode,assertion:'지도 선택→정보→상세',detail:data.slice(0,280)}));
  await b('상세 분석').click();
  const graph=p.locator('.trendExplorer:not(.floatingQueryScope)').filter({visible:true}).first();await graph.waitFor({state:'visible'});
  const plot=await graph.evaluate(n=>({text:n.innerText.slice(0,450),svg:n.querySelector('svg').getBoundingClientRect().toJSON(),badPath:[...n.querySelectorAll('path')].some(p=>/NaN|Infinity/.test(p.getAttribute('d')||''))}));
  if(plot.badPath||plot.svg.height<60)throw Error(topic+' invalid graph');
  await b('조회 조건').click();if(!await p.locator('.mapOptionsPanel').filter({visible:true}).isVisible())throw Error(topic+' detail query absent');await b('조회 옵션 접기').click();
  out.push(await record({id:`${key.toUpperCase()}-TREND`,mode,assertion:'상세 추이·단일조건편집',detail:plot}));
  await b('후보 비교').click();const candidate=p.locator(`#shortlist-${key}`);await candidate.waitFor({state:'visible'});
  if(!await candidate.locator('.compareGrid article').count())throw Error(topic+' candidate lost');
  out.push(await record({id:`${key.toUpperCase()}-CAND`,mode,assertion:'후보 보존·실값·복귀',detail:(await candidate.innerText()).slice(0,450)}));
  await candidate.getByRole('button',{name:key==='population'?'이 지역 시간 추이 →':'이 지역 상세·추이 →',exact:true}).first().click();
  await b('지도').click();
 }
 return out;
}
