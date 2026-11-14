export async function runMapColorChecks(tab,fixtures){
 const p=tab.playwright,results=[];
 const ok=(v,m)=>{if(!v)throw Error(m)};
 const button=n=>p.getByRole('button',{name:n,exact:true});
 const select=(n,v)=>p.getByRole('combobox',{name:n,exact:true}).selectOption(v);
 const legend=p.locator('.mapColorLegend').filter({visible:true});
 const paths=()=>p.locator('.mapWrap svg path[role="button"]').filter({visible:true}).evaluateAll(es=>es.map(e=>({label:e.getAttribute('aria-label'),fill:e.getAttribute('fill')})));
 const bound=async(f,k)=>{for(const [attr,value] of [['data-low',f[k].low],['data-high',f[k].high],['data-observed-min',f.observedMin],['data-observed-max',f.observedMax]])ok(Math.abs(Number(await legend.getAttribute(attr))-Number(value))<1e-6,`${attr} expected ${value}`)};
 const base=await paths(),metrics=await p.locator('.metrics').filter({visible:true}).innerText();
 await bound(fixtures.cases[0],'domainZero');
 await select('색상 시작 기준','observed');await bound(fixtures.cases[0],'domainObservedPadding10');
 const changed=await paths();ok(base.length===25&&changed.length===25,'25 districts');
 ok(JSON.stringify(base.map(x=>x.label))===JSON.stringify(changed.map(x=>x.label)),'original labels unchanged');
 ok(metrics===await p.locator('.metrics').filter({visible:true}).innerText(),'KPI unchanged');
 ok(base.some((x,i)=>x.fill!==changed[i].fill),'colors actually change');
 const min=changed.find(x=>x.label.startsWith('금천구 ')),max=changed.find(x=>x.label.startsWith('강남구 '));
 ok(min.fill==='rgb(199, 216, 231)'&&max.fill==='rgb(23, 74, 122)','independent linear endpoint colors');results.push('25구 독립 원자료 범위·색상·수치 불변');
 const input=p.getByRole('spinbutton',{name:'최솟값 아래 여유(%)',exact:true});
 await input.fill('20');await button('색상 범위 적용').click();await bound(fixtures.cases[0],'domainObservedPadding20');
 for(const invalid of ['','-1','101']){await input.fill(invalid);await button('색상 범위 적용').click();ok(await p.getByRole('alert').isVisible(),'invalid alert');await bound(fixtures.cases[0],'domainObservedPadding20')}
 await button('색상 범위 초기화').click();await bound(fixtures.cases[0],'domainZero');ok(JSON.stringify(base)===JSON.stringify(await paths()),'reset restores exact colors');results.push('20% 적용·잘못된 입력 차단·초기화');
 await select('자치구','11440');await p.getByRole('img',{name:'선택 구의 행정동별 실제 통계 지도',exact:true}).waitFor({state:'visible'});await select('색상 시작 기준','observed');await bound(fixtures.cases[1],'domainObservedPadding10');ok((await paths()).length===16,'16 mapo dongs');results.push('마포구 16동 독립 범위');
 const old=await legend.getAttribute('data-low');await p.getByRole('slider',{name:'시간대 선택',exact:true}).press('Home');ok(old!==await legend.getAttribute('data-low'),'hour recalculates domain');ok((await paths()).every(x=>x.label.includes('00:00')),'all map values selected hour');results.push('시간대 연동 재계산');
 await button('지도 색상 시작값 의미와 해석').click();ok((await p.getByRole('tooltip').innerText()).includes('최댓값 − 최솟값'),'formula tooltip');await button('지도 색상 시작값 의미와 해석').press('Escape');results.push('공식·해석 도움말');
 await button('지도 전체화면 보기').click();ok(await input.isVisible(),'full screen color controls');const beforeZoom=await legend.getAttribute('data-low');await button('지도 확대').click();ok(beforeZoom===await legend.getAttribute('data-low'),'zoom unchanged domain');await button('지도 전체화면 닫기').click();results.push('전체화면 옵션·확대시 범위 유지');
 return results;
}
