import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const raw = JSON.parse(await readFile(new URL('./raw-checkpoints.json', import.meta.url), 'utf8'));
const names = JSON.parse(await readFile(new URL('./display-name-checkpoints.json', import.meta.url), 'utf8'));
const surface = page => page.locator('dialog.analysisDetailModal[open],.analysisMainDetail:not([hidden])').filter({ visible: true });
const menu = page => page.getByRole('combobox', { name: '상세 분석 선택', exact: true }).filter({ visible: true });
const settle = async page => { await page.evaluate(() => document.fonts.ready); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); };
for (const mode of ['analysis', 'presentation']) test(`OA-22175 ${mode} six-quarter local regression`, async ({ page }, info) => {
  const external = [], errors = [], requests = [], measurements = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', r => { if (r.url().includes('commerce.json')) requests.push(r.url()); });
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(u.protocol)) return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  await page.goto('/');
  const card = page.locator('.analysisDatasets > button').filter({ has: page.getByRole('heading', { name: /^행정동 추정매출/ }) });
  await expect(card).toContainText('2025년 1분기–2026년 2분기'); await card.click();
  if (mode === 'presentation') await page.getByRole('button', { name: '시연용', exact: true }).click();
  const period = page.locator('#extra-period-commerce').filter({ visible: true });
  await expect(period).toHaveValue('20262');
  expect(await period.locator('option').evaluateAll(es => es.map(e => e.value))).toEqual(Object.keys(raw));
  const summary = page.locator('#map-commerce .selectedRegionInsights');
  const primary = summary.locator('.compactKPIInsights > div > strong').first();
  const formatted = n => `${n.toLocaleString('ko-KR')} 원`;
  async function value(n) { await expect(primary).toHaveAttribute('title', formatted(n)); }
  for (const p of Object.keys(raw)) { await period.selectOption(p); await value(raw[p].all.sales); }
  await period.selectOption('20262');
  await page.getByRole('button', { name: '추정매출 자료 설명·출처·해석 기준', exact: true }).filter({ visible: true }).click();
  const tooltip = page.getByRole('tooltip').filter({ visible: true });
  await expect(tooltip).toContainText('2025년 1분기–2026년 2분기');
  await expect(tooltip).toContainText('종로1?2?3?4가동'); await expect(tooltip).toContainText('같은 행정동 코드의 2025년 ZIP 이름');
  await expect(tooltip).toContainText('일원2동'); await expect(tooltip).toContainText('상일동'); await expect(tooltip).toContainText('미확정');
  await page.keyboard.press('Escape');
  await page.locator('#extra-district-commerce').filter({ visible: true }).click();
  await page.getByRole('option', { name: '종로구', exact: true }).click();
  await value(raw['20262']['11110'].sales);
  await page.locator('#extra-dong-commerce').filter({ visible: true }).click();
  await page.getByRole('option', { name: '청운효자동', exact: true }).click();
  await value(raw['20262']['11110515'].sales);
  const band = page.locator('#extra-band-commerce').filter({ visible: true });
  for (const p of ['20254','20261','20262']) {
    await period.selectOption(p);
    for (let b=0;b<6;b++) { await band.selectOption(String(b)); await value(raw[p]['11110515'].timeSales[b]); }
  }
  await band.selectOption('-1'); await value(raw['20262']['11110515'].sales);
  await summary.locator('summary').click();
  const previous = summary.locator('.secondaryKPIInsights > div').first();
  await expect(previous).toContainText('직전 분기 추정매출'); await expect(previous).toContainText('2026년 1분기');
  await expect(previous.locator('strong')).toHaveAttribute('title',formatted(raw['20261']['11110515'].sales));
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#map-commerce').getByRole('button', { name: '표 내려받기', exact: true }).click();
  const download = await downloadPromise; const csvPath = info.outputPath('commerce.csv'); await download.saveAs(csvPath);
  const csv = await readFile(csvPath,'utf8'); expect(csv).toContain('20262'); expect(csv).toContain('11110515'); expect(csv).toContain(String(raw['20262']['11110515'].sales));
  await menu(page).selectOption('trend-commerce'); await surface(page).waitFor();
  await expect(surface(page).locator('.trendAxis').first()).toBeVisible();
  await surface(page).getByRole('button', {name:'본문에서 보기',exact:true}).click();
  await expect(period).toHaveValue('20262'); await period.selectOption('20261');
  await surface(page).getByRole('button', {name:'← 지도로 돌아가기',exact:true}).click();
  await expect(period).toHaveValue('20261'); await expect(page.locator('#extra-dong-commerce')).toHaveAttribute('title','청운효자동'); await value(raw['20261']['11110515'].sales);
  await settle(page);
  const geometry = await page.evaluate(() => ({innerWidth,innerHeight,scale:visualViewport.scale,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,svg:[...document.querySelectorAll('#map-commerce .mapWrap > svg')].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().toJSON())}));
  measurements.push(geometry); expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.svg.length).toBe(1); expect(geometry.svg[0].height).toBeGreaterThan(0);
  await page.screenshot({path:info.outputPath(`${mode}-dong-sales.png`)});
  expect(requests.some(u=>u.endsWith('commerce.json?v=dong-sales-2026q2-names-20261117'))).toBeTruthy();
  // Check every repaired dong in both new quarters on the actual ranking and map.
  const nameChecks=[];
  for (const p of ['20261','20262']) {
    await period.selectOption(p);
    for (const item of names) {
      await page.locator('#extra-district-commerce').filter({visible:true}).click();
      await page.getByRole('option',{name:item.districtName,exact:true}).click();
      const expand=page.getByRole('button',{name:'전체 순위 보기',exact:true}).filter({visible:true});
      if(await expand.count())await expand.click();
      const rank=page.locator('#map-commerce .rankName').filter({hasText:item.displayName});
      await expect(rank).toHaveText(item.displayName); await expect(rank).toBeVisible();
      await page.getByRole('button',{name:'선택 구 동 지도',exact:true}).filter({visible:true}).click();
      const label=page.locator(`#map-commerce [data-map-label-code="${item.code}"] text`);
      await expect(label).toBeVisible(); await expect(label).toContainText(item.displayName);
      expect(await page.locator('#map-commerce .rankName').allTextContents()).not.toEqual(expect.arrayContaining([item.sourceName]));
      expect(await label.textContent()).not.toContain('?');
      nameChecks.push({period:p,...item,rank:await rank.textContent(),map:await label.textContent()});
      if(p==='20262'&&item.code==='11110615')await page.screenshot({path:info.outputPath(`${mode}-names-jongno.png`)});
    }
  }
  measurements.push({nameChecks});
  expect(errors).toEqual([]); expect(external).toEqual([]);
  await writeFile(info.outputPath('measurements.json'),JSON.stringify({mode,requests,errors,external,measurements},null,2));
});
