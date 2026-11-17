# 반복 가능한 화면 규칙 검사

```sh
npm ci
npx playwright install chromium
npm run test:e2e
node tests/e2e/report-results.mjs
```

Node와 Playwright Chromium이 필요하다. 별도 서버는 필요 없다. config가 127.0.0.1:4187 Vite 서버를 자동으로 띄우고 종료한다. 기존 서버를 재사용하지 않으며 이 포트가 사용 중이면 실패한다. 임의 PID를 종료하지 않는다.

`npm run test:e2e -- --project=desktop-1365`처럼 화면 크기를 좁혀 재현할 수 있다. 제품 결함도 테스트 실패(exit 1)로 남기며 expected failure로 숨기지 않는다. 최종 실행의 JSON·트레이스·실패 순간 PNG·실측 파일은 `docs/workers-2026-11-17/w5-playwright/`에 저장된다. Playwright는 다음 실행 때 이 작업 전용 test-results를 교체한다. 기존 일회용 tests/*e2e*.mjs와 증거는 수정하지 않는다.

- 4 viewport × 2 mode × 생활인구/생활이동/전입전출/상권 = 32개 격리 브라우저 여정.
- a: 각 지도/상세 문서의 scrollWidth <= clientWidth.
- b: 지도와 추이, 상세에서 렌더링되는 role=img SVG가 뷰포트/스크롤 조상 안에 전부 들어오는지. 복귀 직후 지도도 검사.
- c: 실제 enabled 옵션을 열거해 팝업·본문 각각 순회, 선택창·복귀 버튼의 화면 내 노출 확인.
- d: 매 옵션에서 실제 지도로 돌아온 후 입력값·선택 지역 표시·토글을 전후 대조. 기본값과 다른 시각/연도/분기를 먼저 선택.
- e: 추이의 모든 .trendAxis 라벨이 SVG와 overflow 조상/화면 경계 안에 들어오는지(1 CSS px 오차). 라벨 0개는 실패.
- f: 보이는 직접 텍스트의 렌더링 글자 크기 집합. SVG getScreenCTM 배율 반영, 0.1px 반올림, 시연 4종/분석 6종 이내. 닫힌 details·가려진 창·0px 대체 텍스트는 제외. 모달은 실제 top layer만 측정.

실제 모든 조회 조합, 마우스 가림/대비·원자료 의미·전체화면·수동축·모든 옵션/툴팁을 펼친 상태·인쇄는 이 검사로 승인하지 않는다. CSS 크기/경계 검사는 사람의 시각 판독을 대신하지 않는다. 폰트 다운로드·React 레이아웃이 안정된 두 프레임 뒤 측정하지만 비동기 자료 로딩은 UI 진입 대기로 확인한다. `execution-blocker`가 있으면 남은 규칙은 미실행이며 results.json 오류를 함께 읽는다.


## 추가 규칙 g/h (R04, R07–R09, R20)

- g는 요소 자신의 computed 배경부터 읽고, 투명하면 조상으로 올라가 알파·opacity를 합성한다. 이미지·그라데이션·SVG 칠하기는 캡처 픽셀의 글자 주변과 글자색을 샘플링하며, 신뢰도 부족은 판정 불가로 둔다. WCAG 일반 글자 4.5:1, 큰 글자 3:1이다. 지도 면 색·범례 색은 텍스트 대비와 구분한다.
- h는 R04의 네 자료 탭(폭·높이·세로 중심 ±1px), 같은 목적의 분석/시연 모드 선택 버튼(R04), 상권 확대/축소 쌍(R04 동일 목적 선택, R20 시각 균등)을 검사한다. 상세 콤보와 주변 버튼, 목적이 다른 지도 도구는 묶지 않는다. 높이·중심은 ±1px이며 정본에 격자 폭이 명시된 자료 탭만 폭도 비교한다.
- 판정 불가는 실패 수치와 구분한다. 유사 CSS 선택자로 묶었지만 실제 의미 위계가 다른 요소가 섞일 수 있어 그룹 판정은 검토 대상이다.
- 결과 경로는 `PLAYWRIGHT_EVIDENCE_DIR=docs/workers-2026-11-17/w10-contrast-uniform npm run test:e2e -- --project=desktop-1365 --project=desktop-1920`으로 지정한다. 기본 출력은 W5 폴더를 유지한다.

- g는 자신 또는 조상이 `aria-hidden="true"`인 텍스트를 장식 제외로 따로 기록하고, 판정 불가도 개수·내역을 보존하며, 신뢰 가능한 대비 미달만 실패로 처리한다(클래스명·disabled 여부만으로 제외하지 않음).
