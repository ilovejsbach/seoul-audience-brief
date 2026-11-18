# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: subway.spec.mjs >> 6호선 광흥창: 시간대 곡선이 이름 기준 원본과 같고 일별 값과 같은 역
- Location: tests/e2e/subway.spec.mjs:342:3

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 20
Received:    648.95652173913
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - link "상권·인구" [ref=e6] [cursor=pointer]:
        - /url: "#"
        - generic [aria-hidden] [ref=e7]: ▦
      - navigation "메인 주제" [ref=e9]:
        - button "지역 분석" [ref=e10] [cursor=pointer]
        - button "상권 분석" [ref=e11] [cursor=pointer]
        - button "교통" [pressed] [ref=e12] [cursor=pointer]
        - button "부동산 예정 · 자료 확보 후" [disabled] [ref=e13]: 부동산(예정)
      - generic [ref=e14]:
        - generic "대시보드 모드" [ref=e15]:
          - button "분석용" [pressed] [ref=e16] [cursor=pointer]
          - button "시연용" [ref=e17] [cursor=pointer]
        - 'button "더보기: 브리핑 인쇄·시작 화면" [ref=e19] [cursor=pointer]': ···
  - main [ref=e20]:
    - generic [ref=e23]:
      - complementary "교통 자료와 보기" [ref=e24]:
        - generic [ref=e25]:
          - strong [ref=e26]: 자료와 보기
          - button "왼쪽 메뉴 접기" [expanded] [ref=e27] [cursor=pointer]: ‹
        - generic [ref=e28]:
          - generic [ref=e29]:
            - paragraph [ref=e30]: 자료
            - navigation "자료 선택" [ref=e31]:
              - button "지하철" [pressed] [ref=e32] [cursor=pointer]
              - button "버스(예정)" [disabled] [ref=e33] [cursor=pointer]
          - generic [ref=e34]:
            - paragraph [ref=e35]: 지표
            - navigation "지표 선택" [ref=e36]:
              - button "역 이용(승하차)" [pressed] [ref=e37] [cursor=pointer]
              - button "혼잡도" [ref=e38] [cursor=pointer]
          - generic [ref=e39]:
            - paragraph [ref=e40]: 보기
            - navigation "보기 선택" [ref=e41]:
              - button "지도" [ref=e42] [cursor=pointer]
              - button "시간대 곡선" [ref=e43] [cursor=pointer]
              - button "일별 달력·요일" [ref=e44] [cursor=pointer]
              - button "월별·계절 비교" [ref=e45] [cursor=pointer]
              - button "승객 유형" [ref=e46] [cursor=pointer]
              - button "성별" [ref=e47] [cursor=pointer]
              - button "출발·도착(OD)" [ref=e48] [cursor=pointer]
      - main [ref=e49]:
        - region "조회 조건" [ref=e50]:
          - generic [ref=e51]:
            - generic [ref=e52]: 기간
            - generic [ref=e53]:
              - combobox "시작 월" [ref=e54]:
                - option "2023.01"
                - option "2023.02"
                - option "2023.03"
                - option "2023.04"
                - option "2023.05"
                - option "2023.06"
                - option "2023.07"
                - option "2023.08"
                - option "2023.09"
                - option "2023.10"
                - option "2023.11"
                - option "2023.12"
                - option "2024.01"
                - option "2024.02"
                - option "2024.03"
                - option "2024.04"
                - option "2024.05"
                - option "2024.06"
                - option "2024.07"
                - option "2024.08"
                - option "2024.09"
                - option "2024.10"
                - option "2024.11"
                - option "2024.12"
                - option "2025.01" [selected]
                - option "2025.02"
                - option "2025.03"
                - option "2025.04"
                - option "2025.05"
                - option "2025.06"
                - option "2025.07"
                - option "2025.08"
                - option "2025.09"
                - option "2025.10"
                - option "2025.11"
                - option "2025.12"
                - option "2026.01"
                - option "2026.02"
                - option "2026.03"
                - option "2026.04"
                - option "2026.05"
                - option "2026.06"
                - option "2026.07"
                - option "2026.08"
                - option "2026.09"
                - option "2026.10"
              - generic [ref=e55]: "~"
              - combobox "끝 월" [ref=e56]:
                - option "2023.01"
                - option "2023.02"
                - option "2023.03"
                - option "2023.04"
                - option "2023.05"
                - option "2023.06"
                - option "2023.07"
                - option "2023.08"
                - option "2023.09"
                - option "2023.10"
                - option "2023.11"
                - option "2023.12"
                - option "2024.01"
                - option "2024.02"
                - option "2024.03"
                - option "2024.04"
                - option "2024.05"
                - option "2024.06"
                - option "2024.07"
                - option "2024.08"
                - option "2024.09"
                - option "2024.10"
                - option "2024.11"
                - option "2024.12"
                - option "2025.01" [selected]
                - option "2025.02"
                - option "2025.03"
                - option "2025.04"
                - option "2025.05"
                - option "2025.06"
                - option "2025.07"
                - option "2025.08"
                - option "2025.09"
                - option "2025.10"
                - option "2025.11"
                - option "2025.12"
                - option "2026.01"
                - option "2026.02"
                - option "2026.03"
                - option "2026.04"
                - option "2026.05"
                - option "2026.06"
                - option "2026.07"
                - option "2026.08"
                - option "2026.09"
                - option "2026.10"
          - combobox "호선" [ref=e58]:
            - option "호선 전체"
            - option "1호선"
            - option "2호선"
            - option "3호선"
            - option "4호선"
            - option "5호선"
            - option "6호선" [selected]
            - option "7호선"
            - option "8호선"
          - generic [ref=e59]:
            - generic [ref=e60]: 역
            - generic [ref=e61]:
              - combobox "역 검색" [ref=e62]: 광흥창 · 6호선
              - button "역 선택 해제" [ref=e63] [cursor=pointer]: ×
          - combobox "요일 구분" [ref=e65]:
            - option "요일 전체"
            - option "평일" [selected]
            - option "주말"
          - combobox "승차 하차" [ref=e67]:
            - option "승차+하차" [selected]
            - option "승차"
            - option "하차"
        - region "결과" [ref=e68]:
          - generic [ref=e69]:
            - generic [ref=e70]:
              - heading "시간대 곡선" [level=1] [ref=e71]
              - paragraph [ref=e72]: 2025.01~2025.01 · 승차+하차 · 평일 · 하루 평균(카드 태그 건수)
            - generic [ref=e73]:
              - button "조회 띄우기" [ref=e74] [cursor=pointer]
              - button "CSV 내려받기" [active] [ref=e75] [cursor=pointer]
              - button "보조정보 접기 ›" [expanded] [ref=e76] [cursor=pointer]
          - generic [ref=e78]:
            - heading "광흥창 6호선 · 시간대별 하루 평균" [level=2] [ref=e79]
            - paragraph [ref=e80]: 시간대 자료 기간 2023~2025년 중 선택 기간과 겹치는 23개 역-일. ‘06시 이전’과 ‘24시 이후’는 묶음 구간입니다.
            - img "시간대별 승차·하차 하루 평균" [ref=e82]:
              - generic [ref=e83]: "0"
              - generic [ref=e85]: "500"
              - generic [ref=e87]: 1,000
              - generic [ref=e89]: 1,500
              - generic [ref=e91]: 2,000
              - generic [ref=e93]: 06↓
              - generic [ref=e94]: 07~08
              - generic [ref=e95]: 09~10
              - generic [ref=e96]: 11~12
              - generic [ref=e97]: 13~14
              - generic [ref=e98]: 15~16
              - generic [ref=e99]: 17~18
              - generic [ref=e100]: 19~20
              - generic [ref=e101]: 21~22
              - generic [ref=e102]: 23~24
              - generic [ref=e103]: 건 / 하루 평균
            - list [ref=e148]:
              - listitem [ref=e149]: 승차
              - listitem [ref=e151]: 하차
      - complementary "선택 대상 보조정보" [ref=e153]:
        - region "선택 역" [ref=e156]:
          - generic [ref=e158]: 광흥창
          - paragraph [ref=e159]: 6호선 · 외부역코드 2626 · 마포구 서강동
        - region "핵심 지표" [ref=e160]:
          - generic [ref=e161]:
            - generic [ref=e162]: 승차+하차 하루 평균
            - generic [ref=e163]: 17,059건
            - generic [ref=e164]: 관측 23일
        - region "후보" [ref=e165]:
          - generic [ref=e166]:
            - text: 후보
            - generic [ref=e167]: 0 / 3곳
          - generic [ref=e168]: 1. 선택 전
          - generic [ref=e170]: 2. 선택 전
          - generic [ref=e172]: 3. 선택 전
          - button "선택 역 후보 담기" [ref=e174] [cursor=pointer]
        - region "해석과 출처" [ref=e175]:
          - generic [ref=e176]: 해석·출처 요약
          - paragraph [ref=e177]: 승하차는 카드 태그 건수이며 고유 방문자 수가 아닙니다. 혼잡도는 승하차와 다른 지표입니다.
          - button "출처·해석 보기" [ref=e179] [cursor=pointer]
    - text: ◷ ▾ ▾ ▾ ▾
```

# Test source

```ts
  259 |   await expect(page.locator('.swSelName')).toHaveText('강남');
  260 |   await expect(page.getByLabel('시작 월')).toHaveValue('202603');
  261 |   await expect(page.getByLabel('승차 하차')).toHaveValue('b');
  262 |   await expect(page.locator('.swCand').first()).toContainText('강남');
  263 |   expect(await page.locator('.swKpiValue').innerText()).toBe(kpi);
  264 |   // 교통 → 지역: 지역 모드(시연용) 보존
  265 |   await topicBtn(page, '지역 분석').click();
  266 |   await expect(page.locator('#root > .app')).toHaveClass(/mode-presentation/);
  267 |   // 지역 → 히어로 → 이어보기는 지역(마지막 서비스), 다시 교통 → 히어로 → 이어보기는 교통
  268 |   await topicBtn(page, '교통').click();
  269 |   await page.locator('.appTopbar .integratedBrand').click();
  270 |   await page.getByRole('button', { name: '이어보기', exact: true }).click();
  271 |   await expect(page.locator('.swSelName')).toHaveText('강남');
  272 |   await expect(page.locator('.swCand').first()).toContainText('강남');
  273 |   await expect(page.getByLabel('시작 월')).toHaveValue('202603');
  274 |   // 히어로에는 교통 시작 버튼이 없다
  275 |   await page.locator('.appTopbar .integratedBrand').click();
  276 |   await expect(page.locator('.heroActions button')).toHaveText(['지역 분석 시작', '상권 분석 시작']);
  277 | });
  278 | 
  279 | // 한 줄 조회 바와 플로팅: 같은 입력 호스트를 옮기며 조건·선택·후보가 유지된다
  280 | test('조회 바는 한 줄, 플로팅으로 띄워도 같은 입력과 상태', async ({ page }) => {
  281 |   await enterTransport(page);
  282 |   await expect(page.locator('.swDot').first()).toBeVisible({ timeout: 20000 });
  283 |   const lines = await page.locator('.swQuery').evaluate(q => { const tops = new Set([...q.querySelectorAll('select,input')].map(e => Math.round(e.getBoundingClientRect().top))); return tops.size; });
  284 |   expect(lines, '조회 입력이 한 줄에 놓여야 함').toBe(1);
  285 |   await page.getByLabel('역 검색').first().fill('강남 · 2호선');
  286 |   const kpi = await page.locator('.swKpiValue').innerText();
  287 |   const mapH = () => page.locator('.swMapBox').evaluate(e => e.getBoundingClientRect().height);
  288 |   const before = await mapH();
  289 |   await page.getByRole('button', { name: '조회 띄우기' }).click();
  290 |   await expect(page.locator('.swQuery.swFloat')).toBeVisible();
  291 |   await expect(page.getByLabel('역 검색')).toHaveCount(1);                       // 복제 없음
  292 |   expect(await mapH(), '띄우면 지도가 더 커져야 함').toBeGreaterThan(before);
  293 |   const box = await page.locator('.swQuery.swFloat').boundingBox();
  294 |   await page.mouse.move(box.x + 60, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x - 140, box.y + 90); await page.mouse.up();
  295 |   const moved = await page.locator('.swQuery.swFloat').boundingBox();
  296 |   expect(Math.abs(moved.x - (box.x - 200))).toBeLessThan(3);
  297 |   const vp = page.viewportSize(); expect(moved.x >= 0 && moved.y >= 0 && moved.x + moved.width <= vp.width && moved.y + moved.height <= vp.height).toBe(true);
  298 |   await page.getByLabel('승차 하차').selectOption('b');                           // 띄운 상태에서도 편집 가능
  299 |   await expect(page.locator('.swKpiValue')).not.toHaveText(kpi);
  300 |   await page.getByRole('button', { name: '상단으로' }).click();
  301 |   await expect(page.locator('.swQuery.swFloat')).toHaveCount(0);
  302 |   await expect(page.getByLabel('승차 하차')).toHaveValue('b');
  303 |   await expect(page.locator('.swSelName')).toHaveText('강남');
  304 | });
  305 | 
  306 | // 좌측 메뉴: 지역과 같은 WorkspaceNav(폭 200/64, 화살표 키 규칙)
  307 | test('교통 좌측 메뉴는 지역 메뉴와 같은 폭·키보드 규칙', async ({ page }) => {
  308 |   await page.goto('/');
  309 |   await topicBtn(page, '지역 분석').click();
  310 |   const regionW = await page.locator('.workspaceNav[aria-label="지역 분석 자료와 보기"]').evaluate(e => e.getBoundingClientRect().width);
  311 |   await topicBtn(page, '교통').click();
  312 |   await expect(page.locator('.swDot').first()).toBeVisible({ timeout: 20000 });
  313 |   const nav = page.locator('.workspaceNav[aria-label="교통 자료와 보기"]');
  314 |   expect(await nav.evaluate(e => e.getBoundingClientRect().width)).toBe(regionW);
  315 |   expect(regionW).toBe(200);
  316 |   const first = nav.locator('nav[aria-label="보기 선택"] button').first();
  317 |   await page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="보기 선택"] button[aria-current="page"]').focus();
  318 |   await page.keyboard.press('ArrowDown');
  319 |   await expect(page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="보기 선택"] button').nth(1)).toBeFocused();
  320 |   await page.keyboard.press('End'); await expect(page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="보기 선택"] button').last()).toBeFocused();
  321 |   await page.keyboard.press('Home'); await expect(first).toBeFocused();
  322 |   // 비활성 버스는 화살표 순서에서 빠진다
  323 |   await page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="자료 선택"] button[aria-pressed="true"]').focus();
  324 |   await page.keyboard.press('ArrowDown'); await expect(page.locator('[aria-label="교통 자료와 보기"] nav[aria-label="자료 선택"] button[aria-pressed="true"]')).toBeFocused();
  325 |   await page.getByRole('button', { name: '왼쪽 메뉴 접기' }).click();
  326 |   expect(await nav.evaluate(e => e.getBoundingClientRect().width)).toBe(64);
  327 |   await expect(page.getByRole('button', { name: '지도', exact: true })).toBeVisible();   // 접힌 메뉴도 이름 유지
  328 | });
  329 | 
  330 | // ---- w41: 6호선 외부역코드 어긋남 재발 방지. 원본을 "이름"으로 읽어 화면 값과 대조한다 ----
  331 | function rawHourlyWeekday(year, lineLabel, rawNamePrefix, ym) {
  332 |   const rows = parseCsv(decode(readFileSync(`${RAW}/OA-12921-hourly-${year}.csv`))); const out = { 승차: 0, 하차: 0, days: new Set() };
  333 |   for (const r of rows.slice(1)) {
  334 |     if (r.length < 26 || r[2] !== lineLabel || !r[4].startsWith(rawNamePrefix) || r[1].slice(0, 7) !== ym) continue;
  335 |     const d = new Date(Date.UTC(+r[1].slice(0, 4), +r[1].slice(5, 7) - 1, +r[1].slice(8, 10)));
  336 |     if ([0, 6].includes(d.getUTCDay())) continue;
  337 |     out.days.add(r[1]); for (let i = 6; i < 26; i++) out[r[5]] += +r[i];
  338 |   }
  339 |   return { b: out.승차, a: out.하차, days: out.days.size };
  340 | }
  341 | for (const [name, rawName] of [['합정', '합정'], ['상수', '상수'], ['광흥창', '광흥창']]) {
  342 |   test(`6호선 ${name}: 시간대 곡선이 이름 기준 원본과 같고 일별 값과 같은 역`, async ({ page }, info) => {
  343 |     await enterTransport(page);
  344 |     await expect(page.locator('.swDot').first()).toBeVisible({ timeout: 20000 });
  345 |     const left = page.getByRole('button', { name: '왼쪽 메뉴 펼치기' }); if (await left.count()) await left.click();
  346 |     await page.getByLabel('시작 월').selectOption('202501'); await page.getByLabel('끝 월').selectOption('202501');
  347 |     await page.getByLabel('요일 구분').selectOption('wd'); await page.getByLabel('호선').selectOption('6');
  348 |     await page.getByLabel('역 검색').first().fill(`${name} · 6호선`);
  349 |     await expect(page.locator('.swSelName')).toHaveText(name);
  350 |     const day = rawDaily('6호선', name === '광흥창' ? '광흥창(서강)' : name, '202501', '202501', 'wd');
  351 |     const kpi = (await page.locator('.swKpiValue').innerText()).replace(/[^\d]/g, '');
  352 |     expect(+kpi).toBe(Math.round((day.b + day.a) / day.days));                     // 일별 값
  353 |     await page.locator('aside[aria-label^="교통"] button[aria-label="시간대 곡선"]').click();
  354 |     const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV 내려받기' }).click()]);
  355 |     const csv = readFileSync(await dl.path(), 'utf8').split('\n').slice(1).filter(Boolean).map(l => l.split(','));
  356 |     const hb = csv.reduce((s, r) => s + +r[1], 0), ha = csv.reduce((s, r) => s + +r[2], 0);
  357 |     const raw = rawHourlyWeekday(2025, '6호선', rawName, '2025-01');
  358 |     expect(raw.days).toBe(23);
> 359 |     expect(Math.abs(hb - raw.b / raw.days)).toBeLessThanOrEqual(20);              // 20개 구간 반올림 오차
      |                                             ^ Error: expect(received).toBeLessThanOrEqual(expected)
  360 |     expect(Math.abs(ha - raw.a / raw.days)).toBeLessThanOrEqual(20);
  361 |     // 같은 역의 일별 합과 시간대 합은 1% 안에서 같아야 한다(코드 어긋남이면 이웃 역 값이 되어 수십 %가 어긋난다)
  362 |     expect(Math.abs((hb + ha) - (day.b + day.a) / day.days) / ((day.b + day.a) / day.days)).toBeLessThan(0.02);
  363 |     record(info.project.name, `6호선 ${name}`, { kpi: +kpi, hourlySum: Math.round(hb + ha) });
  364 |   });
  365 | }
  366 | test('환승 합계에 다른 운영기관 노선 미포함 표시, 승객유형 제목은 좌표 있는 역 수', async ({ page }) => {
  367 |   await enterTransport(page);
  368 |   await expect(page.locator('.swDot').first()).toBeVisible({ timeout: 20000 });
  369 |   const left = page.getByRole('button', { name: '왼쪽 메뉴 펼치기' }); if (await left.count()) await left.click();
  370 |   await page.getByLabel('역 검색').first().fill('서울 · 1호선');
  371 |   const note = page.getByTestId('subway-external-note');
  372 |   await expect(note).toContainText('다른 운영기관 노선 구간 미포함');
  373 |   await expect(note).toContainText('경의선');
  374 |   await page.getByLabel('역 검색').first().fill('합정 · 2호선');                  // 6호선과 2호선만 있는 환승역에는 외부 노선 문구가 없어야 한다
  375 |   await expect(page.locator('.swSelName')).toHaveText('합정');
  376 |   await expect(page.getByTestId('subway-external-note')).toHaveCount(0);
  377 |   await page.getByRole('button', { name: '역 선택 해제' }).first().click();
  378 |   await expect(page.locator('.swSelName')).toHaveText('선택 전');
  379 |   await page.locator('aside[aria-label^="교통"] button[aria-label="승객 유형"]').click();
  380 |   await expect(page.locator('.swPanelTitle').first()).toContainText(/좌표 있는 \d+역 합/);
  381 |   await expect(page.locator('.swPanelTitle').first()).not.toContainText('1~8호선 전체');
  382 | });
  383 | 
```