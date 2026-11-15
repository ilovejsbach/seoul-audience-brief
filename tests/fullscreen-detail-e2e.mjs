export async function runFullscreenDetail(tab){
 const p=tab.playwright,results=[];
 const button=n=>p.getByRole('button',{name:n,exact:true});
 const visible=s=>p.locator(s).filter({visible:true});
 const check=(v,m)=>{if(!v)throw Error(m)};
 async function fresh(pattern){await tab.reload();await p.getByRole('heading',{name:'지역별 광고 입지 분석',exact:true}).waitFor({state:'visible'});await p.getByRole('button',{name:pattern}).click();await visible('.controls').waitFor({state:'visible'})}
 async function inspectTrend(id,name){await visible(`#trend-${id}`).filter({hasText:name}).waitFor({state:'visible'});const state=await p.evaluate(id=>{const el=document.querySelector(`#trend-${id}`),r=el?.getBoundingClientRect();return {fullscreen:!!document.fullscreenElement,overlay:!!document.querySelector('.mapIsFullscreen'),popup:!!document.querySelector('.mapPopup'),active:document.activeElement?.id,top:r?.top,height:r?.height,viewport:innerHeight}},id);check(!state.fullscreen&&!state.overlay,'fullscreen must close');check(!state.popup,'popup must close');check(state.active===`trend-${id}`,'focus on selected trend');check(state.top>=-2&&state.top<state.viewport/2,'trend visible near top');return state}
 await fresh(/^생활인구 ↗/);await visible('.metrics').filter({hasText:'11,370,664'}).waitFor({state:'visible'});await button('지도 전체화면 보기').click();await p.getByRole('button',{name:/^마포구 2026/}).click();await button('상세 분석 →').click();await p.getByRole('img',{name:'선택 구의 행정동별 실제 통계 지도',exact:true}).waitFor({state:'visible'});check(await button('지도 전체화면 닫기').isVisible(),'gu detail stays in fullscreen dong map');await p.getByRole('button',{name:/^서교동 2026/}).click();await button('상세 분석 →').click();results.push({case:'population-gu-dong-fullscreen',state:await inspectTrend('population','서교동')});check((await visible('.metrics').innerText()).includes('122,660'),'selected dong actual value');
 for(const [id,pattern] of [['mobility',/^생활이동 ↗/],['migration',/^거주지 전입·전출 ↗/],['commerce',/^상권 추정매출 ↗/]]){
  await fresh(pattern);await p.getByRole('combobox',{name:'자치구',exact:true}).selectOption('11440');await button('지도 전체화면 보기').click();await visible('.mapWrap svg').getByRole('button',{name:id==='mobility'?/^마포구 자료일/:/^서교동 /}).click();await button('상세 분석 →').click();results.push({case:`${id}-detail-fullscreen`,state:await inspectTrend(id,id==='mobility'?'마포구':'서교동')});
 }
 return results;
}
export async function runPresentationDetail(tab){
 const p=tab.playwright,button=n=>p.getByRole('button',{name:n,exact:true});
 await tab.reload();await button('시연용').click();await p.getByRole('button',{name:/^브리핑 자료 선택/}).click();await p.getByRole('group',{name:'브리핑 자료 선택',exact:true}).getByRole('button',{name:'생활인구',exact:true}).click();await button('지도 전체화면 보기').click();await p.getByRole('button',{name:/^마포구 2026/}).click();await button('상세 분석 →').click();await p.getByRole('button',{name:/^서교동 2026/}).click();await button('상세 분석 →').click();
 await p.locator('#trend-population').filter({visible:true,hasText:'서교동'}).waitFor({state:'visible'});
 const state=await p.evaluate(()=>({fullscreen:!!document.querySelector('.mapIsFullscreen'),active:document.activeElement?.id,title:document.querySelector('#trend-population h2')?.textContent,step:document.querySelector('.presentationNav [aria-current=step]')?.textContent,trendTop:document.querySelector('#trend-population')?.getBoundingClientRect().top,containerTop:document.querySelector('.dashboardContent')?.getBoundingClientRect().top}));
 if(state.fullscreen||state.active!=='trend-population'||!state.step?.includes('시간 흐름')||state.trendTop<state.containerTop-2||state.trendTop>state.containerTop+40)throw Error(JSON.stringify(state));
 return state;
}
