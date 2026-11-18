// usage: node capture.mjs <before|after> <outDir>   (dev server on 4196)
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const phase=process.argv[2], out=process.argv[3]; await mkdir(out,{recursive:true});
const b=await chromium.launch();
for (const [w,h] of [[1365,768],[1920,1080]]) {
  const p=await b.newPage({viewport:{width:w,height:h}});
  await p.goto('http://127.0.0.1:4196/'); await p.getByRole('button',{name:'지역 분석 시작'}).click();
  await p.locator('nav[aria-label="자료 선택"]').getByRole('button',{name:'행정동 추정매출',exact:true}).click();
  await p.locator('#map-commerce svg').filter({visible:true}).first().waitFor();
  await p.waitForTimeout(800);
  const region=p.locator('#map-commerce .mapWrap > svg path[data-code], #map-commerce .mapWrap > svg path').filter({visible:true});
  await p.locator('#map-commerce .mapWrap > svg path').nth(10).click({force:true}); await p.waitForTimeout(700);
  if(phase==='before'){ const s=p.locator('.popupExact summary').first(); if(await s.count()) await s.click(); }
  else { const v=p.locator('.mapPopup .exactValueButton').first(); if(await v.count()) await v.hover(); }
  await p.waitForTimeout(500);
  await p.screenshot({path:`${out}/${w}-region-popup-${phase}.png`});
  await p.keyboard.press('Escape');
  // market
  await p.getByRole('button',{name:'상권 분석',exact:true}).click();
  await p.locator('.marketMapSvg path[data-market-code]').first().waitFor();
  await p.locator('.marketMapSvg path[data-market-code="3120107"]').press('Enter'); await p.waitForTimeout(800);
  if(phase==='before'){ const s=p.locator('.marketExact summary').first(); if(await s.count()) await s.click(); }
  else { const v=p.locator('.marketDetails .exactValueButton').first(); if(await v.count()) await v.hover(); }
  await p.waitForTimeout(500);
  await p.screenshot({path:`${out}/${w}-market-info-${phase}.png`});
  await p.close();
}
await b.close();
