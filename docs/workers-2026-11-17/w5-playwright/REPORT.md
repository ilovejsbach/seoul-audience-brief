# W5 Playwright 화면 규칙 자동 검사 기반

2026-11-17. 역할: 검사 기반 구현 및 현재 로컬 실행. 제품 UI 결함 수정·커밋·푸시·배포는 하지 않았다. 시작 HEAD `467a3e2`, 브랜치 `main`. 시작부터 있던 README·설계 문서·기존 증거 및 다른 작업자 파일은 보존했다.

## 산출물과 재현

- `playwright.config.mjs`: 격리 Chromium, 4개 실제 CSS 뷰포트, 2 workers, retries 0. Vite를 `127.0.0.1:4187`에 자동 기동/종료한다. 살아 있는 다른 서버를 재사용하거나 종료하지 않는다.
- `tests/e2e/screen-rules.spec.mjs`: 2모드 × 생활인구/생활이동/전입전출/상권 × 4크기 = 32여정. 상권은 행정동 추정매출 탭이 아닌 상권 지도 작업공간의 실제 매출 자료를 선택한다.
- `package.json`/lock: `@playwright/test` devDependency, `npm run test:e2e`. 다른 직접 패키지는 추가하지 않았다. Playwright 1.65.1, Chromium 159.0.8154.6, DPR 1, viewport scale 1. CLI의 Chromium 설치가 자동으로 부속 headless-shell/FFmpeg 캐시도 받았다. 이는 npm 직접 의존성 추가가 아니며 별도 다른 브라우저는 설치하지 않았다.
- `results.json`: Playwright 원본 결과/오류/첨부. `summary.json`: 규칙별 판정·32조합·실측·결함 목록. [실행 목록](RESULTS.md): 통과/실패 표와 실패 순간 PNG 링크. `test-results/`: 여정별 measurements.json, 실패 PNG, trace.zip, 오류 문맥.
- `tests/e2e/report-results.mjs`: 원본 JSON과 실측을 읽어 summary.json/RESULTS.md를 다시 만든다. 사용법과 판단 경계는 `tests/e2e/README.md`에 있다.

```sh
npm ci
npx playwright install chromium
npm run test:e2e
node tests/e2e/report-results.mjs
# 일부만 재현
npm run test:e2e -- --project=mobile-390
```

다음 실행은 작업 전용 test-results와 최종 결과 JSON을 교체한다. 기존 tests/*e2e*.mjs 31개와 그 증거는 삭제/이동하지 않았다. 실패를 expectedFailure로 숨기지 않아 제품 결함이 있으면 exit 1이다. 샌드박스의 포트 바인딩 EPERM은 승인된 재실행으로 해결했으며 제품 실패로 세지 않았다.

## 규칙과 방법

| 항목 | 규칙 | 실제 판정 |
|---|---|---|
| a 가로 넘침 | R05/R20 | 지도 및 모든 상세에서 documentElement.scrollWidth <= clientWidth |
| b 첫 화면 | R05/R20 | 지도, 추이 SVG, 상세의 role=img SVG, 복귀 직후 지도의 전체 경계가 viewport와 overflow 조상 교집합 안. 1 CSS px 오차 |
| c 상세 콤보·복귀 | R06/R15/R20 | enabled 옵션을 런타임에서 전부 열거, 팝업/본문 각각 순회. 콤보 현재값·화면 내 경계 및 복귀 버튼 경계 확인 |
| d 조건 유지 | R13/R15 | 매 옵션에서 실제 복귀 후 query host의 input/select/지역 combobox 현재 표시/pressed 상태를 진입 전과 비교. 비기본 12시/2024년/2026Q1 사용 |
| e 축 잘림 | R07/R19/R20 | 추이 .trendAxis 모든 text DOMRect를 SVG/viewport/overflow 조상 경계와 대조. 0개 라벨은 실패 |
| f 글자 종류 | R07/R20 | 현재 보이는 직접 텍스트의 computed font size, SVG screen CTM의 수직 배율 반영. 0.1px 반올림. 시연4종/분석6종 이하 |

본문 밖 포털을 포함해 document를 읽되 native modal이 열리면 top layer만 측정한다. 닫힌 details/hidden/inert/0px 대체 글자/화면 밖 글자는 세지 않는다. 그래프 첫화면 판정은 세로/가로 잘림 모두 포함한다. CSS 경계·크기 실측이며 사람의 문자 판독이나 대비 검증을 대신하지 않는다.

## 독립 검토와 검사기 수정

별도 Codex 검토자가 기존 31개 스크립트와 새 검사기를 읽었다(파일 수정/브라우저 실행은 하지 않음). 지역 SearchableSelect가 일반 select가 아니라 role=combobox 버튼이라는 지적을 반영해 조건 비교에 현재 지역명도 포함했다. 복귀 직후 지도 노출과 상세 SVG도 추가했다.

예비 실행에서 발견한 검사기 오류(native modal에 DOM 조상 clipping 적용, 0px 대체 텍스트 포함, 상권의 예전 추이 버튼 이름 사용)를 고쳐 최종 전체 실행을 다시 수행했다. 모바일에서 숨겨지는 화살표를 포함한 접근성 이름과 floatingQueryLayer에도 붙는 .app 클래스 중복도 보완했다. 예비 실행 실패는 현재 제품 결함 수에 합산하지 않는다.

## 기존 일회용 검사와 이관 대응표

아래 a–f는 위 규칙이다. '기반'은 개념·측정 방식을 현행 UI로 다시 작성했다는 뜻이며 옛 함수 전체를 실행했다는 뜻이 아니다. 기존의 버튼식 상세 진입/옛 배치 selector는 그대로 가져오지 않았다.

| 기존 tests/ 파일(.mjs) | 이번 이관/재작성 | 이번에 옮기지 않은 검사 |
|---|---|---|
| audience-extension-e2e | c,d 기반 | 원자료 타깃 구성비·주민등록값 |
| briefing-strategy-e2e | b,d | 재생·수동축·창 이동·Esc |
| compact-headings-e2e | a,b,e 기반 | 구 라벨 halo/배율·정확값·툴팁 |
| compact-options-e2e | a,d | 플로팅 폭/리사이즈 |
| cua-e2e | b,d | 저장·후보상한·원자료·오류복구·실포인터 |
| district-detail-e2e | c,d | 표 구/동 탐색·미지원연도 의미 |
| free-query-e2e | d 기반 | 창 이동/도킹·전체화면 소유권 |
| full-screen-core-e2e | b,c,d 기반 | 전체화면 클릭경로·후보값 |
| full-screen-overlays-e2e | 직접 대응 없음 | 검색·출처·범례·CSV·옵션창 |
| full-screen-secondary-e2e | c 기반 | 비교·저장·출처·표 수치 |
| fullscreen-continuity-e2e | d 기반 | native 전체화면·자료전환 |
| fullscreen-detail-e2e | b,c 기반 | 전체화면 종료·초점·구→동 |
| long-content-e2e | a,b,d | 긴 숫자 원값·지수축 수식·저장/후보 |
| map-color-e2e | 직접 대응 없음 | 원자료 색범위·검증·불변성 |
| map-metric-link-e2e | d 기반 | 지도/KPI 독립수치·카메라 |
| map-options-layout-e2e | a,d | 옛 왼쪽 조회창 폭/플로팅 |
| map-palette-e2e | d 기반 | 팔레트·공통눈금·0중립 |
| map-range-tooltip-e2e | 직접 대응 없음 | 수동범위·포화·임계값·결측 |
| market-filter-e2e | d 기반 | 원본코드집합·검색정규화·무결과 |
| market-layout-e2e | a,b | 최대값/긴이름·범례·합성대비 |
| market-map-e2e | c,d 기반 | 독립매출값·업종·결측·후보한도 |
| page-alignment-e2e | a,b | 헤더/본문 정렬 오차 |
| population-daily-period-e2e | d 기반 | 월경계·일수보정·원자료 |
| population-patterns-e2e | a,b,c | 월평균·불균등분모·마스킹·열지도 |
| population-query-e2e | a,c,d | 검색키보드·Esc 단계·ID중복 |
| presentation-focus-e2e | a,b,c,d,e 기반 | 비교/축 원값·한벌·재생 상태 |
| public-query-e2e | a,c,d 기반 | 공개배포 수치·색분포·초점 |
| resizable-panels-e2e | b,d 기반 | 창 리사이즈/도킹·범례 |
| semantic-e2e | d 기반 | 독립원자료 의미·분모·CSV·null |
| ux-visual-rules-e2e | b,f | 지도라벨 겹침·후보 원값·펼친 설정 |
| ux-wave1-e2e | b,d,f | 탭 균등크기·선택 대비·혼합후보 |

e의 실제 추이 text clipping 전수 검사와 c의 현행 모든 콤보 옵션 열거는 새 검사다. 이전 SVG viewBox 맞춤/지도라벨 검사를 추이 축 전수 검증으로 간주하지 않았다.

## 한계와 미검사

- 현재 로컬 Chromium 실행이다. 사용자가 쓰는 Chrome, 공개 배포, 실제 모바일 기기의 터치/안전영역·확대 글자·인쇄는 검사하지 않았다. 모바일/패드는 지정된 CSS viewport이며 touch emulation은 아니다.
- 모든 조회 조합·비기본 구/동 카메라·축/비교기준/후보 상태 보존은 별도 회귀 범위다. 이번 d는 위 입력 조건의 비기본 시각/연도/분기와 현재 지역 표시 보존을 검사했다. 기본 지역은 서울 전체이며 상권만 개별 코드3120107을 선택했다.
- e는 추이의 현재 기본축이다. 수동축·지수축·재생 중 축, 평균차트 축 text 자체는 별도 범위다. 보조 상세의 SVG는 첫 화면 경계만 확인한다. SVG 없는 카드/표를 그래프 통과로 세지 않는다.
- f는 기본 지도/각 상세를 열었을 때 보이는 글자다. 모든 옵션/설정/툴팁을 펼친 상태의 전수 검사는 남아 있다. 화면 밖과 완전히 가려진 글자는 제외하지만 다른 도형에 의한 일부 가림을 완전 판독하지는 않는다.
- 합성색 대비·동위버튼 균등크기·독립 원자료 의미 검증은 미이관이다. 화면 규칙 통과로 R20 전체 통과를 주장하지 않는다.
- 예외/시간초과는 `execution-blocker`로 남기며 이후 규칙은 미실행이다. 이 경우 단순히 실패 판정 수가 적다고 완료로 판단하지 않는다.

최종 수치는 아래 실행 결과 및 JSON을 기준으로 한다. 제품 결함은 목록으로만 보고했으며 src/·public/은 수정하지 않았다.

## 사용자 후속 지시와 판정 범위

사용자 후속 지시: “당분간 모바일은 신경쓰지 말자. 한꺼번에 처리하자.” 이에 모바일 결함은 개선 대상에서 유보한다. 이미 진행 중인 32조합 검사는 현황 증거로만 마무리하며 모바일 실패를 소스 수정이나 추가 대응으로 이어가지 않는다. PC/패드 결과와 모바일 이월 목록을 분리한다.

독립 화면 확인에서 모바일 일반 지도 영역 붕괴와 상권 본문 추이 하단 축 잘림을 확인했다. 반복 실패 판정은 서로 다른 결함 수가 아니다. 동일 현상의 여러 모드·옵션 재현으로 해석한다. 예비 모바일의 빈 글자 집합은 modal 밖 조상 clipping을 적용한 검사기 오류였으며 최종 실행 전 수정했다.

## 공유 작업 폴더의 버전 기록

이 작업자는 src/·public/을 수정하지 않았다. 다만 최종 실행 도중 다른 작업의 변경이 같은 공유 폴더에 나타났다: ExtraDashboard/Hero/main의 행정동 매출 명칭, commerce.json 데이터 메타정보. HEAD도 시작 `467a3e2`에서 문서 작업 커밋 `2c779a9`로 이동했다. 이 변경을 되돌리거나 커밋하지 않았다. `run-metadata.json`에 실행 중 관찰한 HEAD·소스 트리·관련 파일 SHA256을 남겼다. 따라서 이번 결과는 격리된 단일 커밋 보증이 아닌 현재 공유 작업 폴더의 실행 증거다. 앞서 빌드 성공 시 자산은 `index-D7d4XnL-.js`/`index-7CTjbMjC.css`였으며 이후 동시 변경까지 빌드 통과했다고 소급하지 않는다.

## 최종 실행 수치

- 실행: 2026-11-17 11:55:31 KST 시작, 약241초. 32여정 모두 실행, 건너뜀0·재시도0·실행 차단0. PC1365/1920·패드1024의24여정 통과. 모바일390의8여정 실패는 사용자 지시에 따라 후속으로 유보한다.
- 개별 판정2,176건: 통과2,059 / 실패117. a 가로 넘침400/400, c 콤보·복귀400/400(옵션 발견32+순회368), d 조건보존368/368 통과. b 주정보 첫 노출440통과/104실패, e 추이축56통과/8실패, f 글자종류395통과/5실패. 실패는 전부 모바일390에 한정됐으며117종의 서로 다른 결함을 뜻하지 않는다.
- 생활인구8·생활이동6·전입전출6·상권3개 옵션을 각 모드/크기에서 팝업·본문으로 전부 순회했다. 368회 실제 상세→지도 복귀에서 입력 조건 비교를 마쳤다. 실행이 끝나 config의 자체 Vite 서버도 종료됐다.
- 모바일 이월군: 일반 지도 zero-size/주정보 첫 노출 붕괴와 반복 복귀 노출 실패, 본문 추이·일부 평균차트 하단 잘림/추이축 노출, 일부 추이의 글자크기 종류 초과(5회). 상세한 mode/topic/실측/스크린샷은 [RESULTS.md](RESULTS.md)와 summary.json을 따른다. 사용자 지시에 따라 추가 모바일 분석·제품 수정은 진행하지 않는다.
- 검사 파일 구문검사와 package diff 공백 검사는 통과했다. 빌드는 앞서 성공했으며 공유 소스의 이후 변경과 공개 배포 검증은 이 작업의 통과 범위에 포함하지 않는다.

반복 검사 기반과 증거 저장을 마쳤다. PC·패드의 위6개 규칙 범위는 이번 로컬 실행에서 통과했고, 모바일은 이월하며 R20 전체·공개 품질까지 승인한 것은 아니다.
