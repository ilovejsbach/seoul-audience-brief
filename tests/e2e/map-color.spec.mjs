import { test, expect } from '@playwright/test';

// w39: 지도 색상 1단계(A안) — 결측은 값 색이 아니라 사선 무늬로, 줄 간격은 화면 고정.
const heroStart = (page, name) => page.getByRole('button', { name, exact: true });

test('실제 결측 화면: 생활인구 남성 00시 중구 동 지도에서 자료 없음 동은 무늬, 값 있는 동은 색', async ({ page }) => {
  await page.goto('/');
  await heroStart(page, '지역 분석 시작').click();
  await page.waitForSelector('#map-population svg path[role="button"]');
  await page.locator('#population-query-hour').selectOption('0');
  await page.locator('#population-query-sex').selectOption('male');
  await page.locator('#map-population svg path[role="button"][aria-label^="중구"]').first().click();
  await page.getByRole('button', { name: '선택 구 동 지도', exact: true }).click();
  await expect(page.locator('#map-population svg path[role="button"]')).toHaveCount(15);
  const rows = await page.locator('#map-population svg path[role="button"]').evaluateAll(es => es.map(e => ({ label: e.getAttribute('aria-label'), fill: e.getAttribute('fill') })));
  const missing = rows.filter(r => r.label.includes('자료 없음')), observed = rows.filter(r => !r.label.includes('자료 없음'));
  expect(missing.length, '원자료에서 확인한 결측 동 5곳').toBe(5);
  expect(missing.every(r => r.fill.startsWith('url(#')), '결측은 모두 무늬').toBe(true);
  expect(observed.every(r => !r.fill.startsWith('url(') && r.fill !== '#d7dee6'), '값이 있는 동은 값 색').toBe(true);
  await expect(page.locator('#map-population pattern[data-missing-pattern]')).toHaveCount(1);
  // 줄 간격은 확대해도 화면 6px
  const px = () => page.evaluate(() => { const pt = document.querySelector('#map-population pattern[data-missing-pattern]'); const g = document.querySelector('#map-population svg path[role="button"][fill^="url("]'); const m = g.getScreenCTM(); return Math.round(+pt.getAttribute('width') * Math.hypot(m.a, m.b) * 100) / 100; });
  const before = await px();
  for (let i = 0; i < 3; i++) { await page.evaluate(() => document.querySelector('button[aria-label="지도 확대"]').click()); await page.waitForTimeout(150); }
  const after = await px();
  expect(before).toBe(6); expect(after).toBe(6);
  // 범례의 자료 없음 견본은 같은 무늬
  await page.locator('.mapLegendCompact button').first().click();
  await expect(page.locator('.mapLegendEntries i[data-legend-missing="true"]')).toHaveCount(1);
  expect(await page.locator('.mapLegendEntries i[data-legend-missing="true"]').evaluate(e => e.style.background)).toContain('repeating-linear-gradient');
});

test('상권 지도: 자료 없음 상권 수와 무늬 수가 같고 값 색은 첫 구간이 배경과 구분된다', async ({ page }) => {
  await page.goto('/');
  await heroStart(page, '상권 분석 시작').click();
  await page.waitForSelector('.marketMapSvg path[data-market-code]', { timeout: 30000 });
  const text = await page.locator('.marketFilterFeedback').first().innerText().catch(() => '');
  const shown = Number((text.match(/자료 없음\s*([\d,]+)/) || [])[1]?.replace(/,/g, ''));
  const patterned = await page.locator('.marketMapSvg path[data-market-code]').evaluateAll(es => es.filter(e => (e.getAttribute('fill') || '').startsWith('url(')).length);
  expect(patterned).toBeGreaterThan(0);
  if (shown) expect(patterned).toBe(shown);
  const fills = await page.locator('.marketMapSvg path[data-market-code]').evaluateAll(es => [...new Set(es.map(e => e.getAttribute('fill')).filter(f => !f.startsWith('url(')))]);
  expect(fills).not.toContain('#cdd4d0');
  expect(fills).toContain('#bdd0e1');                                            // 가장 낮은 값 구간 = A안 시작색
});

test('두 시점 분포 지도: 색 5단계는 A안 값이고 결측 견본이 범례에 있다', async ({ page }) => {
  await page.goto('/');
  await heroStart(page, '지역 분석 시작').click();
  await page.getByRole('button', { name: '두 시간 분포 지도', exact: true }).click();
  await page.waitForSelector('svg.distributionSvg path');
  const fills = await page.locator('svg.distributionSvg path').evaluateAll(es => [...new Set(es.map(e => e.getAttribute('fill')))]);
  const allowed = ['#bdd0e1', '#94afc7', '#6a8dae', '#416c94', '#174a7a'];
  expect(fills.every(f => allowed.includes(f)), JSON.stringify(fills)).toBe(true);
  await page.locator('.distributionComparison .mapLegendCompact button').first().click();
  await expect(page.locator('.mapLegendEntries i[data-legend-missing="true"]')).toHaveCount(1);
});
