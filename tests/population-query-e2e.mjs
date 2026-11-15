/** Run only through the documented CUA browser API. No direct page mutation. */
export async function runPopulationQuery(tab){
 const p=tab.playwright,results=[],button=name=>p.getByRole('button',{name,exact:true}).filter({visible:true}),combo=name=>p.getByRole('combobox',{name,exact:true}).filter({visible:true});
 const check=(name,value)=>{if(!value)throw Error(name);results.push({case:name,passed:true})};
 const choose=async(label,value)=>{await combo(label).click();await p.getByRole('searchbox',{name:label+' 선택지 검색',exact:true}).fill(value);await p.getByRole('option',{name:value,exact:true}).click()};
 await p.getByRole('button',{name:/생활인구 ↗/}).click();
 check('한 열 기간 지역 분석대상',await p.locator('#map-population .mapOptionsPanel').evaluate(n=>{const groups=[...n.querySelectorAll('.queryFilterGroup')];return groups.map(g=>g.querySelector('summary').textContent).join('|')==='기간|지역|분석 대상'&&groups.every(g=>Math.abs(g.getBoundingClientRect().x-groups[0].getBoundingClientRect().x)<1)&&!n.querySelector('.mapControlRail')}));
 await p.locator('.linkedMetricSummary').filter({visible:true,hasText:'11,370,664명'}).waitFor({state:'visible'});
 check('서울 전체 실제값', (await p.locator('.linkedMetricSummary').filter({visible:true}).innerText()).includes('11,370,664'));
 await choose('자치구','마포구');await choose('행정동','서교동');await p.locator('#population-query-age').selectOption('young');await p.locator('#population-query-sex').selectOption('male');
 check('서교 남20–39 18시32951', (await p.locator('.linkedMetricSummary').filter({visible:true}).innerText()).includes('32,951'));
 await combo('조회 시각').selectOption('12');check('같은조건12시16169',(await p.locator('.linkedMetricSummary').filter({visible:true}).innerText()).includes('16,169'));
 await button('상세 분석').click();await button('시연용').click();await button('시각 조건 변경: 12:00').click();
 check('상세에서 같은단일입력 포커스',await p.evaluate(()=>document.activeElement.id==='population-query-hour'&&[...document.querySelectorAll('.mapOptionsPanel')].filter(n=>n.getClientRects().length).length===1&&document.querySelector('.app').classList.contains('presentation-step-1')));
 await combo('조회 시각').selectOption('18');await button('조회 옵션 접기').click();check('상세그래프도 같은값',(await p.locator('.trendExplorer').filter({visible:true}).innerText()).includes('32,951'));
 await button('조회 조건').click();await combo('자치구').click();await p.getByRole('searchbox',{name:'자치구 선택지 검색',exact:true}).fill('없는지역');check('검색0건 복구있음',await button('검색어 지우기').isVisible());
 await button('검색어 지우기').click();await p.getByRole('searchbox',{name:'자치구 선택지 검색',exact:true}).press('Escape');check('첫Esc 검색만닫고초점복귀',await p.evaluate(()=>document.activeElement.id==='population-query-district'&&[...document.querySelectorAll('.mapOptionsPanel')].some(n=>n.getClientRects().length)));
 await combo('자치구').press('Escape');check('다음Esc 조회닫고진입점복귀',await p.evaluate(()=>document.activeElement.textContent==='조회 조건'&&![...document.querySelectorAll('.mapOptionsPanel')].some(n=>n.getClientRects().length)));
 await button('지도').click();if(await button('조회 옵션').getAttribute('aria-expanded')!=='true')await button('조회 옵션').click();await choose('자치구','종로구');await choose('행정동','종로1·2·3·4가동');
 check('긴동명 전체가독',await p.locator('#population-dong').evaluate(n=>n.textContent.includes('종로1·2·3·4가동')&&n.scrollWidth<=n.clientWidth+1));
 await p.getByRole('textbox',{name:'기준일',exact:true}).click();await p.getByRole('textbox',{name:'기준일',exact:true}).fill('2026-09-30');await combo('조회 시각').click();check('월밖날짜 적용', (await p.locator('#map-population .querySummary').innerText()).includes('2026.09.30'));
 check('중복입력없음',await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.every((id,i)=>!id||ids.indexOf(id)===i)}));
 check('화면가로넘침없음',await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
 return results;
}
