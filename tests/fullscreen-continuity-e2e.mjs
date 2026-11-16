/** Invoke through the documented CUA API; never emulate fullscreen through page mutation. */
export async function runFullscreenContinuity(tab){
 const p=tab.playwright,b=name=>p.getByRole('button',{name,exact:true}).filter({visible:true});
 const state=()=>p.evaluate(()=>({native:!!document.fullscreenElement,panels:[...document.querySelectorAll('section.mapPanel.mapIsFullscreen')].filter(n=>!n.closest('[hidden]')).map(n=>({title:n.querySelector('.panelTitle h2')?.textContent,height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width,fallback:n.classList.contains('mapOverlay')})),width:innerWidth,height:innerHeight}));
 const assertFull=async()=>{const value=await state();if(value.panels.length!==1||Math.abs(value.panels[0].height-value.height)>2||Math.abs(value.panels[0].width-value.width)>2)throw Error('Fullscreen continuity lost: '+JSON.stringify(value));return value};
 const results=[];
 await b('지도 전체화면 보기').click();results.push({case:'진입',...await assertFull()});
 const titles={mobility:'시간별 유입·유출 비교',migration:'지역별 전입·전출 비교',commerce:'지역별 추정매출 비교',population:'지역별 생활인구 비교'};
 for(const dataset of ['mobility','migration','commerce','population']){await p.getByRole('combobox',{name:'지도 데이터',exact:true}).filter({visible:true}).selectOption(dataset);await p.locator('section.mapPanel.mapIsFullscreen').filter({visible:true}).getByRole('heading',{name:titles[dataset],exact:true}).waitFor({state:'visible'});results.push({case:'자료 전환 '+dataset,...await assertFull()})}
 await b('조회 옵션').click();await p.getByRole('combobox',{name:'조회 시각',exact:true}).filter({visible:true}).selectOption('12');
 const panel=p.locator('section.mapPanel.mapIsFullscreen').filter({visible:true});
 if(!(await panel.locator('.querySummary').innerText()).includes('12:00'))throw Error('Query hour not applied');
 if(!await panel.getByRole('button',{name:/^강남구 .*12:00.*869,946 명$/}).isVisible())throw Error('Map actual 12h value did not update');
 results.push({case:'시간 조건과 실제 지도 값 유지',...await assertFull()});await b('조회 옵션 접기').click();
 await panel.locator('svg[data-map-level] path[role=button]').first().press('Enter');await p.locator('.mapPopup').filter({visible:true}).getByRole('button',{name:'상세 분석 →',exact:true}).click();
 results.push({case:'구에서 동 지도 확대 유지',...await assertFull()});
 await p.locator('section.mapIsFullscreen svg[data-map-level=dong] path[role=button]').first().press('Enter');await p.locator('.mapPopup').filter({visible:true}).getByRole('button',{name:'상세 분석 →',exact:true}).click();
 if((await state()).panels.length||await p.evaluate(()=>!!document.fullscreenElement))throw Error('Explicit detail transition did not exit fullscreen');
 results.push({case:'동 상세 추이 전환은 명시적 전체화면 종료',passed:true});
 return results;
}
