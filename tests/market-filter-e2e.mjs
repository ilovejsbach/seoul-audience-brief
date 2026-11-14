export async function runMarketFilterChecks(tab,fixtures){
 const p=tab.playwright,results=[],b=n=>p.getByRole('button',{name:n,exact:true}),sel=(n,x)=>p.getByRole('combobox',{name:n,exact:true}).selectOption(x),input=p.getByRole('textbox',{name:'상권 이름 검색',exact:true});const ok=(v,m)=>{if(!v)throw Error(m)};
 async function codes(){return (await p.locator('[data-market-code]').evaluateAll(es=>es.map(e=>e.getAttribute('data-market-code')))).sort()}
 for(const dataset of ['sales','population']){
  await sel('자료',dataset);
  for(const f of fixtures.cases){await sel('자치구',f.gu);await sel('상권 유형',f.type);await input.fill(f.query);const actual=await codes();ok(JSON.stringify(actual)===JSON.stringify(f.codes.map(String).sort()),`${dataset}/${f.query}/${f.type}/${f.gu}: exact raw code set`);ok((await p.locator('.marketFilterFeedback').innerText()).includes(`조회 상권 ${f.count.toLocaleString('ko-KR')}개`),'visible count agrees with actual paths')}
  results.push(`${dataset}: 21개 검색·유형·지역 조합의 원본코드 집합·표시개수 일치`);
 }
 await sel('자치구','all');await sel('상권 유형','all');await input.fill('  홍대 입구역  ');ok((await codes()).length===2,'spaces do not hide actual names');results.push('앞뒤·사이 공백 정규화');
 await input.fill('공덕');await sel('상권 유형','U');ok((await codes()).length===0,'incompatible filters really empty');ok((await p.locator('.marketNoResults').innerText()).includes('함께'),'AND filter explanation');await b('상권 유형 전체로').click();ok((await codes()).length===4,'empty results recover by type reset');results.push('검색×유형 무결과 및 명시적 복구');
 await input.fill('홍대');await sel('상권 유형','A');ok(await b('성북구 1개').isVisible()&&await b('마포구 3개').isVisible(),'homonymous names explain multiple districts');await b('마포구 3개').click();ok((await codes()).length===3,'district chip narrows exact set');results.push('동명이름 구별 안내·지역 좁히기');
 await sel('자료','sales');const legendToggle=p.locator('.floatingLegendKey button[aria-expanded=false]').filter({visible:true});if(await legendToggle.count())await legendToggle.click();const beforeLegend=await p.locator('.marketLegend').innerText();await p.getByRole('button',{name:/^1\. 홍대입구역 3번 /}).click();ok((await p.locator('.marketMapSvg>g').getAttribute('transform'))!=='translate(0 0) scale(1)','result selection focuses map');ok(beforeLegend===await p.locator('.marketLegend').innerText(),'focus preserves color domain');ok((await p.locator('.mapWorkspaceDetails').innerText()).includes('홍대입구역 3번'),'selected detail');await b('조회 범위 맞춤').click();ok((await p.locator('.marketMapSvg>g').getAttribute('transform'))==='translate(0 0) scale(1)','refit restores all filtered results');results.push('검색 결과 집중·상세 연결·공통색상 유지·범위 복귀');
 await b('지역·검색·유형 초기화').click();ok((await codes()).length===1650,'all spatial conditions reset');ok(await selValue('상권 유형')==='all'&&await selValue('자치구')==='all','reset actual options');results.push('전체 공간 조건 초기화');return results;
 async function selValue(n){return p.getByRole('combobox',{name:n,exact:true}).evaluate(e=>e.value)}
}
