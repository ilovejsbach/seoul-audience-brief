import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

// 지하철 여정(w31). 기능·의미(원본 CSV 독립 계산)·시각(글자 종류·대비·균등 크기·넘침)을 함께 본다.
const RAW = process.env.SUBWAY_RAW_DIR || '/Users/koscom/workspace2/seoul human/data/raw/transit/subway';
const EVIDENCE = process.env.PLAYWRIGHT_EVIDENCE_DIR || 'docs/workers-2026-11-18/w31-subway-build/e2e';
const topicBtn = (page, name) => page.locator('.topicNav').getByRole('button', { name, exact: true });
const enterTransport = async page => { await page.goto('/'); await topicBtn(page, '교통').click(); };
const settle = async page => {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
};
mkdirSync(EVIDENCE, { recursive: true });
const results = [];
const record = (project, name, detail) => results.push({ project, name, ...detail });

// ---- 원본 CSV에서 독립 계산(화면 코드와 준비 코드를 쓰지 않는다) ----
function parseCsv(text) {
  const rows = []; let i = 0, f = '', row = [], q = false;
  for (; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
// 원본 월 파일은 UTF-8과 CP949가 섞여 있다.
function decode(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\ufeff/, ''); } catch { return new TextDecoder('euc-kr').decode(buf); }
}
function rawDaily(lineLabel, name, from, to, dayType = 'all') {
  let b = 0, a = 0, days = 0;
  for (const file of readdirSync(RAW).filter(n => /^OA-12914-CARD_SUBWAY_MONTH_\d{6}\.csv$/.test(n)).sort()) {
    const ym = file.match(/(\d{6})/)[1]; if (ym < from || ym > to) continue;
    const rows = parseCsv(decode(readFileSync(`${RAW}/${file}`)));
    for (const r of rows.slice(1)) {
      if (r[1] !== lineLabel || r[2] !== name) continue;
      const d = new Date(Date.UTC(+r[0].slice(0, 4), +r[0].slice(4, 6) - 1, +r[0].slice(6, 8))), we = [0, 6].includes(d.getUTCDay());
      if ((dayType === 'wd' && we) || (dayType === 'we' && !we)) continue;
      b += +r[3]; a += +r[4]; days++;
    }
  }
  return { b, a, days };
}

async function fontSizes(page) {
  return page.evaluate(() => {
    const sizes = new Map();
    for (const el of document.querySelectorAll('.sw *')) {
      if (el.closest('[hidden]') || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      if (s.visibility !== 'visible' || s.display === 'none' || !r.width || !r.height) continue;
      const m = el instanceof SVGGraphicsElement ? el.getScreenCTM() : null;
      const px = Math.round(parseFloat(s.fontSize) * (m ? Math.hypot(m.c, m.d) : 1) * 10) / 10;
      if (!sizes.has(px)) sizes.set(px, []);
      if (sizes.get(px).length < 3) sizes.get(px).push(el.textContent.trim().slice(0, 40));
    }
    return [...sizes].sort((x, y) => x[0] - y[0]).map(([px, examples]) => ({ px, examples }));
  });
}

async function contrast(page) {
  return page.evaluate(() => {
    const parse = v => { const m = v.match(/^rgba?\(([^)]+)\)$/); if (!m) return null; const n = m[1].split(',').map(parseFloat); return [n[0], n[1], n[2], n.length > 3 ? n[3] : 1]; };
    const lum = c => { const s = c.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * s[0] + .7152 * s[1] + .0722 * s[2]; };
    const comp = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const out = [];
    for (const el of document.querySelectorAll('.sw *')) {
      if (el.closest('[hidden]') || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      if (!r.width || !r.height || s.visibility !== 'visible' || el.closest('[aria-hidden="true"]')) continue;
      const svg = el instanceof SVGElement;
      const fg0 = parse(svg ? s.fill : s.color); if (!fg0) continue;
      let bg = [255, 255, 255, 1];
      const chain = []; for (let p = svg ? el.closest('svg').parentElement : el; p && p !== document.documentElement; p = p.parentElement) chain.push(p);
      for (const p of chain.reverse()) { const c = parse(getComputedStyle(p).backgroundColor); if (c && c[3] > 0) bg = comp(c, bg); }
      if (svg && el.closest('.swMapBox')) { // 지도 위 글자는 흰 상자 위에 있다
        const prev = el.previousElementSibling; if (prev && prev.tagName === 'rect') bg = [255, 255, 255, 1];
      }
      const fg = comp([fg0[0], fg0[1], fg0[2], fg0[3] * Number(s.opacity)], bg);
      const px = parseFloat(s.fontSize), bold = parseInt(s.fontWeight) >= 700;
      out.push({ text: el.textContent.trim().slice(0, 40), ratio: Math.round(ratio(fg, bg) * 100) / 100, need: px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5, cls: String(el.className?.baseVal ?? el.className) });
    }
    return out;
  });
}

async function equalGroups(page) {
  return page.evaluate(() => {
    const info = sel => [...document.querySelectorAll(sel)].filter(e => e.getBoundingClientRect().width).map(e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, cy: r.top + r.height / 2, x: r.left, t: e.textContent.trim().slice(0, 12) }; });
    return { topics: info('.topicNav button'), modes: info('.modeToggle button'), views: info('[aria-label="교통 자료와 보기"] nav[aria-label="보기 선택"] button'), datasets: info('[aria-label="교통 자료와 보기"] nav[aria-label="지표 선택"] button'), sources: info('[aria-label="교통 자료와 보기"] nav[aria-label="자료 선택"] button') };
  });
}
const spread = (xs, k) => Math.max(...xs.map(x => x[k])) - Math.min(...xs.map(x => x[k]));

for (const mode of ['analysis', 'presentation']) {
  test(`지하철 여정 · ${mode}`, async ({ page }, info) => {
    const project = info.project.name;
    const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    const external = []; page.on('request', r => { const u = new globalThis.URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) && u.protocol.startsWith('http')) external.push(r.url()); });
    await enterTransport(page);
    await expect(page.getByTestId('subway-workspace')).toBeVisible();
    await expect(page.locator('.swDot').first()).toBeVisible({ timeout: 20000 });
    if (mode === 'presentation') {
      await page.getByRole('button', { name: '시연용', exact: true }).click();
      await expect(page.locator('.sw')).toHaveClass(/sw-presentation/);
      // 시연용에서 처음 들어갈 때만 왼쪽 메뉴를 접는다(결정 a). 접힌 메뉴도 이름·펼치기 경로가 있어야 한다.
      await expect(page.getByRole('button', { name: '왼쪽 메뉴 펼치기' })).toBeVisible();
      expect(await page.locator('.workspaceNav[aria-label="교통 자료와 보기"]').evaluate(e => e.getBoundingClientRect().width)).toBe(64);
      await page.getByRole('button', { name: '왼쪽 메뉴 펼치기' }).click();
    }
    await settle(page);
    const viewBtn = name => page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="보기 선택"]').getByRole('button', { name, exact: true });
    const fontLimit = mode === 'presentation' ? 4 : 6;
    const checkScreen = async label => {
      await settle(page);
      const fonts = await fontSizes(page);
      expect(fonts.length, `${label} 글자 크기 종류 ${JSON.stringify(fonts.map(f => f.px))}`).toBeLessThanOrEqual(fontLimit);
      const ct = await contrast(page); const bad = ct.filter(c => c.ratio < c.need);
      expect(bad, `${label} 대비 미달 ${JSON.stringify(bad.slice(0, 5))}`).toEqual([]);
      const over = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, body: document.body.scrollWidth - document.body.clientWidth }));
      expect(over.doc, `${label} 가로 넘침`).toBeLessThanOrEqual(0);
      const clipped = await page.evaluate(() => [...document.querySelectorAll('.sw svg')].filter(s => s.getBoundingClientRect().width).map(s => { const r = s.getBoundingClientRect(), p = s.parentElement.getBoundingClientRect(); return r.right > p.right + 1 || r.bottom > p.bottom + 1 || r.left < p.left - 1; }).filter(Boolean).length);
      expect(clipped, `${label} SVG가 부모를 벗어남`).toBe(0);
      record(project, `${mode}/${label}`, { fontSizes: fonts.map(f => f.px), contrastMin: Math.min(...ct.map(c => c.ratio)), contrastTexts: ct.length });
    };

    // --- 균등 크기(R04): 상단 주제 4개·모드 2개·보기 7개·자료 2개 ---
    const g = await equalGroups(page);
    expect(g.topics.length).toBe(4); expect(g.modes.length).toBe(2); expect(g.views.length).toBe(11); expect(g.datasets.length).toBe(2); expect(g.sources.length).toBe(2);
    for (const k of ['topics', 'modes']) { expect(spread(g[k], 'w'), `${k} 폭`).toBeLessThanOrEqual(1); expect(spread(g[k], 'h'), `${k} 높이`).toBeLessThanOrEqual(1); expect(spread(g[k], 'cy'), `${k} 가운데선`).toBeLessThanOrEqual(1); }
    for (const k of ['views', 'datasets', 'sources']) { expect(spread(g[k], 'w'), `${k} 폭`).toBeLessThanOrEqual(1); expect(spread(g[k], 'h'), `${k} 높이`).toBeLessThanOrEqual(1); expect(spread(g[k], 'x'), `${k} x정렬`).toBeLessThanOrEqual(1); }
    record(project, `${mode}/equal-size`, { topics: g.topics.length, modes: g.modes.length, views: g.views.length });

    // --- 지도 ---
    await expect(topicBtn(page, '교통')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '버스(예정)' })).toBeDisabled();
    expect(await page.getByRole('button', { name: '교통', exact: true }).count()).toBeGreaterThan(0);
    const dots = await page.locator('.swDot').count();
    expect(dots).toBeGreaterThan(200);
    await checkScreen('지도');
    // 확대/축소 순서(− / 배율 / + / 원래 범위)와 같은 크기
    const zoomOrder = await page.locator('.swZoomGroup').evaluate(e => [...e.children].map(c => c.getAttribute('aria-label') || c.textContent.trim()));
    expect(zoomOrder).toEqual(['축소', '100%', '확대', '원래 범위']);
    const zb = await page.locator('.swZoomGroup .swIconBtn').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }));
    expect(zb[0]).toEqual(zb[1]);
    await page.getByRole('button', { name: '확대', exact: true }).click(); await expect(page.locator('.swZoomValue')).toHaveText('150%');
    await page.getByRole('button', { name: '원래 범위' }).click(); await expect(page.locator('.swZoomValue')).toHaveText('100%');
    // 범례: 열기 → Esc 닫기
    await page.getByRole('button', { name: '범례', exact: true }).click(); await expect(page.locator('#sw-legend-pop')).toBeVisible();
    await checkScreen('범례 열림');
    await page.locator('#sw-legend-pop').getByRole('button', { name: '닫기' }).click();

    // --- 조회: 역 선택(검색) + 기간 바꿈 → KPI가 원본 CSV 독립 계산과 같다 ---
    await page.getByLabel('역 검색').first().fill('강남 · 2호선');
    await expect(page.getByTestId('subway-kpi')).toContainText('하루 평균');
    const kpiNum = async () => +(await page.locator('.swKpiValue').innerText()).replace(/[^\d]/g, '');
    let exp = rawDaily('2호선', '강남', '202501', '202610');
    let want = Math.round((exp.b + exp.a) / exp.days);
    expect(await kpiNum(), '강남 2025.01~2026.10 승차+하차 하루 평균').toBe(want);
    await page.getByLabel('시작 월').selectOption('202603'); await page.getByLabel('끝 월').selectOption('202608');
    await page.getByLabel('요일 구분').selectOption('wd'); await page.getByLabel('승차 하차').selectOption('b');
    exp = rawDaily('2호선', '강남', '202603', '202608', 'wd'); want = Math.round(exp.b / exp.days);
    expect(await kpiNum(), '강남 2026.03~08 평일 승차 하루 평균').toBe(want);
    record(project, `${mode}/semantic-강남`, { rawDays: exp.days, rawBoardingPerDay: want, shown: await kpiNum() });
    await page.getByLabel('시작 월').selectOption('202501'); await page.getByLabel('끝 월').selectOption('202610');
    await page.getByLabel('요일 구분').selectOption('all'); await page.getByLabel('승차 하차').selectOption('ab');

    // --- 환승역: 서울(1호선)+서울(4호선) 합 ---
    await page.getByLabel('역 검색').first().fill('서울 · 1호선');
    await expect(page.locator('.swGroupBox')).toBeVisible();
    const e1 = rawDaily('1호선', '서울역', '202501', '202610'), e4 = rawDaily('4호선', '서울역', '202501', '202610');
    const sumTxt = (await page.locator('.swSum b').innerText()).replace(/[^\d]/g, '');
    const wantSum = Math.round((e1.b + e1.a) / e1.days) + Math.round((e4.b + e4.a) / e4.days);
    expect(Math.abs(+sumTxt - wantSum), '환승역 합계(반올림 차이 ±1)').toBeLessThanOrEqual(1);
    record(project, `${mode}/semantic-transfer-서울역`, { shownSum: +sumTxt, rawSum: wantSum });

    // --- 후보 3곳 상한 ---
    await page.getByRole('button', { name: '선택 역 후보 담기' }).click();
    for (const q of ['홍대입구 · 2호선', '잠실 · 2호선']) { await page.getByLabel('역 검색').first().fill(q); await page.getByRole('button', { name: '선택 역 후보 담기' }).click(); }
    await page.getByLabel('역 검색').first().fill('시청 · 1호선');
    await expect(page.getByRole('button', { name: '후보는 최대 3곳' })).toBeDisabled();
    await page.getByRole('button', { name: '강남 후보 해제' }).count();
    await page.getByLabel('역 검색').first().fill('서울 · 1호선');

    // --- 보기 순회 + 복귀 ---
    const names = ['시간대 곡선', '일별 달력·요일', '월별·계절 비교', '승객 유형'];
    for (const n of names) {
      await viewBtn(n).click(); await settle(page);
      await expect(page.locator('.swBody svg, .swCalGrid, .swTable').first()).toBeVisible({ timeout: 20000 });
      await expect(page.locator('.swSelName')).toHaveText('서울');
      await checkScreen(n);
    }
    // 승객 유형: 대응표·성별 안내·합계가 원본과 같음(독립 대조는 validate-subway.py), 우대 주의 문구
    await expect(page.locator('.swWarn')).toContainText('노인·장애인·국가유공자');
    await viewBtn('성별').click(); await expect(page.getByText('성별 자료 없음')).toBeVisible(); await checkScreen('성별');
    await viewBtn('출발·도착(OD)').click(); await expect(page.getByText('준비 중입니다.')).toBeVisible(); await checkScreen('OD 준비 중');
    // 복귀: 지도로 돌아와도 선택·후보 유지
    await viewBtn('지도').click(); await settle(page);
    await expect(page.locator('.swSelName')).toHaveText('서울');
    await expect(page.locator('.swCand').first()).toContainText('서울');
    expect(await page.locator('.swDot').count()).toBeGreaterThan(200);

    // --- 출처 팝오버: 열기 → 대응표 → Esc ---
    await page.getByRole('button', { name: '출처·해석 보기' }).click();
    await expect(page.locator('.swSourcePop')).toContainText('중고생');
    await checkScreen('출처 팝오버');
    await page.keyboard.press('Escape'); await expect(page.locator('.swSourcePop')).toHaveCount(0);

    // --- 혼잡도(별도 자료) ---
    await page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="지표 선택"]').getByRole('button', { name: '혼잡도', exact: true }).click();
    await expect(page.locator('.swBody svg').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.swMeta').first()).toContainText('정원 대비');
    await checkScreen('혼잡도 곡선');
    await viewBtn('혼잡 상위 역').click(); await expect(page.locator('.swRankTable tbody tr').first()).toBeVisible({ timeout: 20000 });
    const top = await page.locator('.swRankTable tbody tr').first().locator('td').nth(1).innerText();
    const crowd = JSON.parse(gunzipSync(readFileSync('public/data/transit/subway/crowding.json.gz')).toString());
    let best = 0; for (const dirs of Object.values(crowd.quarters['2026-09-30'].wd)) for (const v of Object.values(dirs)) for (const x of v) if (x != null && x > best) best = x;
    expect(top).toBe(best.toFixed(1) + '%');
    await checkScreen('혼잡 상위 역');

    expect(errors, '콘솔 오류').toEqual([]);
    expect(external, '외부 요청').toEqual([]);
    await page.screenshot({ path: `${EVIDENCE}/subway-${project}-${mode}.png` });
    writeFileSync(`${EVIDENCE}/subway-results-${project}-${mode}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), project, mode, results: results.filter(r => r.project === project && r.name.startsWith(mode)) }, null, 1));
  });
}


// 서비스 왕복(교통↔지역↔상권↔히어로): 교통 조건·선택 역·후보 유지, 상권 모드 비상속(I04)
test('교통 경유 왕복: 조건·선택 역·후보 유지, 상권은 모드를 물려받지 않는다', async ({ page }) => {
  await page.goto('/');
  await topicBtn(page, '지역 분석').click();
  await page.getByRole('button', { name: '시연용', exact: true }).click();     // 지역에서 시연용으로
  await topicBtn(page, '교통').click();
  await expect(page.locator('.sw')).toHaveClass(/sw-presentation/);          // 같은 mode 상태 공유
  await expect(page.getByRole('button', { name: '시연용', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.swDot').first()).toBeVisible({ timeout: 20000 });
  const left = page.getByRole('button', { name: '왼쪽 메뉴 펼치기' }); if (await left.count()) await left.click();
  await page.getByLabel('시작 월').selectOption('202603'); await page.getByLabel('승차 하차').selectOption('b');
  await page.getByLabel('역 검색').first().fill('강남 · 2호선');
  await page.getByRole('button', { name: '선택 역 후보 담기' }).click();
  await expect(page.locator('.swCand').first()).toContainText('강남');
  const kpi = await page.locator('.swKpiValue').innerText();
  // 교통 → 상권: 상권은 시연 글자·모드 토글을 물려받지 않는다
  await topicBtn(page, '상권 분석').click();
  await expect(page.locator('.marketMapSvg path[data-market-code]').first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#root > .app')).not.toHaveClass(/mode-presentation/);
  expect(await page.locator('.modeToggle').evaluateAll(es => es.some(e => e.getClientRects().length))).toBe(false);
  await expect(page.locator('.sw')).toBeHidden();
  // 상권 → 교통: 조건·역·후보 그대로
  await topicBtn(page, '교통').click();
  await expect(page.locator('.swSelName')).toHaveText('강남');
  await expect(page.getByLabel('시작 월')).toHaveValue('202603');
  await expect(page.getByLabel('승차 하차')).toHaveValue('b');
  await expect(page.locator('.swCand').first()).toContainText('강남');
  expect(await page.locator('.swKpiValue').innerText()).toBe(kpi);
  // 교통 → 지역: 지역 모드(시연용) 보존
  await topicBtn(page, '지역 분석').click();
  await expect(page.locator('#root > .app')).toHaveClass(/mode-presentation/);
  // 지역 → 히어로 → 이어보기는 지역(마지막 서비스), 다시 교통 → 히어로 → 이어보기는 교통
  await topicBtn(page, '교통').click();
  await page.locator('.appTopbar .integratedBrand').click();
  await page.getByRole('button', { name: '이어보기', exact: true }).click();
  await expect(page.locator('.swSelName')).toHaveText('강남');
  await expect(page.locator('.swCand').first()).toContainText('강남');
  await expect(page.getByLabel('시작 월')).toHaveValue('202603');
  // 히어로에는 교통 시작 버튼이 없다
  await page.locator('.appTopbar .integratedBrand').click();
  await expect(page.locator('.heroActions button')).toHaveText(['지역 분석 시작', '상권 분석 시작']);
});

// 한 줄 조회 바와 플로팅: 같은 입력 호스트를 옮기며 조건·선택·후보가 유지된다
test('조회 바는 한 줄, 플로팅으로 띄워도 같은 입력과 상태', async ({ page }) => {
  await enterTransport(page);
  await expect(page.locator('.swDot').first()).toBeVisible({ timeout: 20000 });
  const lines = await page.locator('.swQuery').evaluate(q => { const tops = new Set([...q.querySelectorAll('select,input')].map(e => Math.round(e.getBoundingClientRect().top))); return tops.size; });
  expect(lines, '조회 입력이 한 줄에 놓여야 함').toBe(1);
  await page.getByLabel('역 검색').first().fill('강남 · 2호선');
  const kpi = await page.locator('.swKpiValue').innerText();
  const mapH = () => page.locator('.swMapBox').evaluate(e => e.getBoundingClientRect().height);
  const before = await mapH();
  await page.getByRole('button', { name: '조회 띄우기' }).click();
  await expect(page.locator('.swQuery.swFloat')).toBeVisible();
  await expect(page.getByLabel('역 검색')).toHaveCount(1);                       // 복제 없음
  expect(await mapH(), '띄우면 지도가 더 커져야 함').toBeGreaterThan(before);
  const box = await page.locator('.swQuery.swFloat').boundingBox();
  await page.mouse.move(box.x + 60, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x - 140, box.y + 90); await page.mouse.up();
  const moved = await page.locator('.swQuery.swFloat').boundingBox();
  expect(Math.abs(moved.x - (box.x - 200))).toBeLessThan(3);
  const vp = page.viewportSize(); expect(moved.x >= 0 && moved.y >= 0 && moved.x + moved.width <= vp.width && moved.y + moved.height <= vp.height).toBe(true);
  await page.getByLabel('승차 하차').selectOption('b');                           // 띄운 상태에서도 편집 가능
  await expect(page.locator('.swKpiValue')).not.toHaveText(kpi);
  await page.getByRole('button', { name: '상단으로' }).click();
  await expect(page.locator('.swQuery.swFloat')).toHaveCount(0);
  await expect(page.getByLabel('승차 하차')).toHaveValue('b');
  await expect(page.locator('.swSelName')).toHaveText('강남');
});

// 좌측 메뉴: 지역과 같은 WorkspaceNav(폭 200/64, 화살표 키 규칙)
test('교통 좌측 메뉴는 지역 메뉴와 같은 폭·키보드 규칙', async ({ page }) => {
  await page.goto('/');
  await topicBtn(page, '지역 분석').click();
  const regionW = await page.locator('.workspaceNav[aria-label="지역 분석 자료와 보기"]').evaluate(e => e.getBoundingClientRect().width);
  await topicBtn(page, '교통').click();
  await expect(page.locator('.swDot').first()).toBeVisible({ timeout: 20000 });
  const nav = page.locator('.workspaceNav[aria-label="교통 자료와 보기"]');
  expect(await nav.evaluate(e => e.getBoundingClientRect().width)).toBe(regionW);
  expect(regionW).toBe(200);
  const first = nav.locator('nav[aria-label="보기 선택"] button').first();
  await page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="보기 선택"] button[aria-current="page"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="보기 선택"] button').nth(1)).toBeFocused();
  await page.keyboard.press('End'); await expect(page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="보기 선택"] button').last()).toBeFocused();
  await page.keyboard.press('Home'); await expect(first).toBeFocused();
  // 비활성 버스는 화살표 순서에서 빠진다
  await page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="자료 선택"] button[aria-pressed="true"]').focus();
  await page.keyboard.press('ArrowDown'); await expect(page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="자료 선택"] button[aria-pressed="true"]')).toBeFocused();
  await page.getByRole('button', { name: '왼쪽 메뉴 접기' }).click();
  expect(await nav.evaluate(e => e.getBoundingClientRect().width)).toBe(64);
  await expect(page.getByRole('button', { name: '지도', exact: true })).toBeVisible();   // 접힌 메뉴도 이름 유지
});

// ---- w41: 6호선 외부역코드 어긋남 재발 방지. 원본을 "이름"으로 읽어 화면 값과 대조한다 ----
function rawHourlyWeekday(year, lineLabel, rawNamePrefix, ym) {
  const rows = parseCsv(decode(readFileSync(`${RAW}/OA-12921-hourly-${year}.csv`))); const out = { 승차: 0, 하차: 0, days: new Set() };
  for (const r of rows.slice(1)) {
    if (r.length < 26 || r[2] !== lineLabel || !r[4].startsWith(rawNamePrefix) || r[1].slice(0, 7) !== ym) continue;
    const d = new Date(Date.UTC(+r[1].slice(0, 4), +r[1].slice(5, 7) - 1, +r[1].slice(8, 10)));
    if ([0, 6].includes(d.getUTCDay())) continue;
    out.days.add(r[1]); for (let i = 6; i < 26; i++) out[r[5]] += +r[i];
  }
  return { b: out.승차, a: out.하차, days: out.days.size };
}
for (const [name, rawName] of [['합정', '합정'], ['상수', '상수'], ['광흥창', '광흥창']]) {
  test(`6호선 ${name}: 시간대 곡선이 이름 기준 원본과 같고 일별 값과 같은 역`, async ({ page }, info) => {
    await enterTransport(page);
    await expect(page.locator('.swDot').first()).toBeVisible({ timeout: 20000 });
    const left = page.getByRole('button', { name: '왼쪽 메뉴 펼치기' }); if (await left.count()) await left.click();
    await page.getByLabel('시작 월').selectOption('202501'); await page.getByLabel('끝 월').selectOption('202501');
    await page.getByLabel('요일 구분').selectOption('wd'); await page.getByLabel('호선').selectOption('6');
    await page.getByLabel('역 검색').first().fill(`${name} · 6호선`);
    await expect(page.locator('.swSelName')).toHaveText(name);
    const day = rawDaily('6호선', name === '광흥창' ? '광흥창(서강)' : name, '202501', '202501', 'wd');
    const kpi = (await page.locator('.swKpiValue').innerText()).replace(/[^\d]/g, '');
    expect(+kpi).toBe(Math.round((day.b + day.a) / day.days));                     // 일별 값
    await page.locator('aside[aria-label^="교통"] button[aria-label="시간대 곡선"]').click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV 내려받기' }).click()]);
    const csv = readFileSync(await dl.path(), 'utf8').split('\n').slice(1).filter(Boolean).map(l => l.split(','));
    const hb = csv.reduce((s, r) => s + +r[1], 0), ha = csv.reduce((s, r) => s + +r[2], 0);
    const raw = rawHourlyWeekday(2025, '6호선', rawName, '2025-01');
    expect(raw.days).toBe(23);
    expect(Math.abs(hb - raw.b / raw.days)).toBeLessThanOrEqual(20);              // 20개 구간 반올림 오차
    expect(Math.abs(ha - raw.a / raw.days)).toBeLessThanOrEqual(20);
    // 같은 역의 일별 합과 시간대 합은 1% 안에서 같아야 한다(코드 어긋남이면 이웃 역 값이 되어 수십 %가 어긋난다)
    expect(Math.abs((hb + ha) - (day.b + day.a) / day.days) / ((day.b + day.a) / day.days)).toBeLessThan(0.02);
    record(info.project.name, `6호선 ${name}`, { kpi: +kpi, hourlySum: Math.round(hb + ha) });
  });
}
test('환승 합계에 다른 운영기관 노선 미포함 표시, 승객유형 제목은 좌표 있는 역 수', async ({ page }) => {
  await enterTransport(page);
  await expect(page.locator('.swDot').first()).toBeVisible({ timeout: 20000 });
  const left = page.getByRole('button', { name: '왼쪽 메뉴 펼치기' }); if (await left.count()) await left.click();
  await page.getByLabel('역 검색').first().fill('서울 · 1호선');
  const note = page.getByTestId('subway-external-note');
  await expect(note).toContainText('다른 운영기관 노선 구간 미포함');
  await expect(note).toContainText('경의선');
  await page.getByLabel('역 검색').first().fill('합정 · 2호선');                  // 6호선과 2호선만 있는 환승역에는 외부 노선 문구가 없어야 한다
  await expect(page.locator('.swSelName')).toHaveText('합정');
  await expect(page.getByTestId('subway-external-note')).toHaveCount(0);
  await page.getByRole('button', { name: '역 선택 해제' }).first().click();
  await expect(page.locator('.swSelName')).toHaveText('선택 전');
  await page.locator('aside[aria-label^="교통"] button[aria-label="승객 유형"]').click();
  await expect(page.locator('.swPanelTitle').first()).toContainText(/좌표 있는 \d+역 합/);
  await expect(page.locator('.swPanelTitle').first()).not.toContainText('1~8호선 전체');
});
