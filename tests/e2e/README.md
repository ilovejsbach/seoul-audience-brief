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
