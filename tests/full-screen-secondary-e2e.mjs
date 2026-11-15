export async function runSecondaryScreenAudit(tab,mode,record){
 const p=tab.playwright,b=n=>p.getByRole('button',{name:n,exact:true}).filter({visible:true}),out=[];
 await b(mode==='analysis'?'분석용':'시연용').click();
 for(const [topic,key,id] of [['생활인구','population','POP'],['생활이동','mobility','MOV'],['거주지 이동','migration','MIG'],['추정매출','commerce','COM']]){
  await p.getByRole('tab',{name:topic,exact:true}).click();await b('상세 분석').click();
  if(mode==='presentation'){
   await b('두 시점 비교').click();const panel=p.locator('.timeComparisonFloating').filter({visible:true});await panel.getByRole('combobox',{name:'비교 기준',exact:true}).selectOption({index:0});out.push(await record({id:id+'-TIME',mode,detail:(await panel.innerText()).slice(0,750)}));await b('두 시점 비교 닫기').click();
   continue;
  }
  const panel=p.locator('.timeComparison').filter({visible:true}).first();await panel.getByRole('combobox',{name:'비교 기준',exact:true}).selectOption({index:0});out.push(await record({id:id+'-TIME',mode,detail:(await panel.innerText()).slice(0,750)}));
  const work=p.locator('.scenarioWorkbench').filter({visible:true});await work.locator('summary').first().click();await work.getByRole('button',{name:'현재 조건 저장',exact:true}).click();await work.getByRole('button',{name:'기준안 조건 다시 적용',exact:true}).click();out.push(await record({id:id+'-SAVE',mode,detail:(await work.innerText()).slice(-600)}));
  const source=p.locator('.dataNotes').filter({visible:true}).first();await source.locator('summary').first().click();out.push(await record({id:id+'-SOURCE',mode,detail:(await source.innerText()).slice(0,700)}));
  if(key!=='population'){const table=p.locator('.extraTable').filter({visible:true});out.push(await record({id:id+'-TABLE',mode,detail:(await table.innerText()).slice(0,450)}));await table.locator('.detailRegionButton').first().click();}
 }
 return out;
}
