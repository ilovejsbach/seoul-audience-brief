import { test, expect } from '@playwright/test';

// w39b: 지도 색상 1단계(A안) — 결측은 사선 무늬 없이 평평한 회색 #d7dee6 하나로 칠한다.
const MISSING = '#d7dee6';
const heroStart = (page, name) => page.getByRole('button', { name, exact: true });

test('실제 결측 화면: 생활인구 남성 00시 중구 동 지도에서 자료 없음 동은 평평한 회색, 값 있는 동은 값 색', async ({ page }) => {
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
  expect(missing.every(r => r.fill === MISSING), '결측은 모두 #d7dee6').toBe(true);
  expect(observed.every(r => r.fill !== MISSING && !r.fill.startsWith('url(')), '값이 있는 동은 값 색').toBe(true);
  await expect(page.locator('#map-population pattern'), '무늬 요소가 없다').toHaveCount(0);
  // 안내문의 "회색" 문구는 실제 표시(평평한 회색)와 맞는다
  await expect(page.getByText('현재 통계와 경계가 다르면 회색으로 표시됩니다')).toBeVisible();
  await expect(page.getByText('자료 없음으로 표시합니다').first()).toBeVisible();
  // 범례의 자료 없음 견본은 같은 평평한 회색 칸
  await page.locator('.mapLegendCompact button').first().click();
  const swatch = page.locator('.mapLegendEntries div', { hasText: '자료 없음' }).locator('i');
  await expect(swatch).toHaveCount(1);
  expect(await swatch.evaluate(e => { const s = getComputedStyle(e); return { bg: s.backgroundColor, image: s.backgroundImage }; })).toEqual({ bg: 'rgb(215, 222, 230)', image: 'none' });
});

test('상권 지도: 자료 없음 상권은 #d7dee6(이전 #cdd4d0 아님), 무늬 없음, 첫 구간은 A안 시작색', async ({ page }) => {
  await page.goto('/');
  await heroStart(page, '상권 분석 시작').click();
  await page.waitForSelector('.marketMapSvg path[data-market-code]', { timeout: 30000 });
  const text = await page.locator('.marketFilterFeedback').first().innerText().catch(() => '');
  const shown = Number((text.match(/자료 없음\s*([\d,]+)/) || [])[1]?.replace(/,/g, ''));
  const fills = await page.locator('.marketMapSvg path[data-market-code]').evaluateAll(es => es.map(e => e.getAttribute('fill')));
  const gray = fills.filter(f => f === MISSING).length;
  expect(gray).toBeGreaterThan(0);
  if (shown) expect(gray, '자료 없음 개수와 회색 칸 수').toBe(shown);
  expect(fills).not.toContain('#cdd4d0');
  expect(fills.some(f => f.startsWith('url(')), '무늬 채움 없음').toBe(false);
  await expect(page.locator('.marketMapSvg pattern')).toHaveCount(0);
  expect(fills).toContain('#bcd0e1');                                            // 가장 낮은 값 구간 = A안 시작색
});

test('두 시점 분포 지도: 색 5단계는 A안 값이고 결측 견본은 평평한 회색이다', async ({ page }) => {
  await page.goto('/');
  await heroStart(page, '지역 분석 시작').click();
  await page.getByRole('button', { name: '두 시간 분포 지도', exact: true }).click();
  await page.waitForSelector('svg.distributionSvg path');
  const fills = await page.locator('svg.distributionSvg path').evaluateAll(es => [...new Set(es.map(e => e.getAttribute('fill')))]);
  const allowed = ['#bcd0e1', '#93afc7', '#6a8dae', '#406c94', '#174a7a', MISSING];
  expect(fills.every(f => allowed.includes(f)), JSON.stringify(fills)).toBe(true);
  await expect(page.locator('svg.distributionSvg pattern')).toHaveCount(0);
  await page.locator('.distributionComparison .mapLegendCompact button').first().click();
  const swatch = page.locator('.mapLegendEntries div', { hasText: '자료 없음' }).locator('i');
  await expect(swatch).toHaveCount(1);
  expect(await swatch.evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(215, 222, 230)');
});
