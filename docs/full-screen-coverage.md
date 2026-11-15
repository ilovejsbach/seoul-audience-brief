# 배포 화면 전수 점검 목록과 판정 기준

2026-11-16 · **독립 소스 목록 / 현재 실화면 판정 대기**. 이 문서 작성자는 브라우저를 조작하지 않았다. 부모 에이전트의 실제 공개 실행 결과만 현재 통과 증거로 붙인다. 이전 대표 여정 통과는 목록의 빈칸을 채우지 않는다.

논리 화면·옵션 계열은 **52개 ID**로 정리했다. 하나의 ID가 분석/시연 및 자료별 문맥을 포함할 수 있으므로 ID 개수는 실제 방문 횟수와 같지 않다. 모든 날짜·지역 조합을 전수 열었다는 뜻도 아니다. [기계판독 계획](../tests/full-screen-plan.json)의 `modes`, `datasets`, `variants`를 펼쳐 실행한다.

## 실행 원칙

- 각 화면을 보는 질문을 먼저 읽고 조회 → 결과 → 다음 행동 → 복귀를 끝까지 수행한다. 버튼의 존재와 화면 이동만으로 통과하지 않는다.
- 분석과 시연은 같은 계산을 쓰되 시연은 화면 교체·지도/그래프 면적·복귀를 별도로 본다. 지원하지 않는 문맥은 미검사로 숨기지 않고 비제공 이유를 남긴다.
- 1800×905와1366×768에서 긴 지역명·14자리금액·음수·0·결측·0건·비활성·자료로딩을 포함한다. 실제 화면의 대비·잘림·너비균형과 입력/결과 의미를 함께 기록한다.
- 실패 시 처음 상태·행동·실제 결과·기대 결과·소스수정·재배포 버전·공개 재검사 증거를 연결한다. 수정 전 화면 방문과 수정 후 재검사를 구분한다.
- `pending_live`는 소스 목록만 확인한 상태다. 부모는 이 문서를 과거 보고처럼 통과로 소급하지 않는다.

## 논리 화면·옵션 목록

| ID | 화면·목적 | 진입 → 복귀 | 지원 문맥 | 이번 공개 결과 |
|---|---|---|---|---|
| HOME-A | 분석 시작 — 자료의 모집단·기간을 고르고 분석 시작 | 분석용 → 시작 화면 → 자료 선택 → 해당 지도 / 이전 분석 이어보기 | analysis / 공통 | 실행 대기 |
| HOME-P | 시연 시작 — 광고주에게 분석 목적과 자료 선택 제시 | 시연용 → 시작 화면 → 브리핑 자료 선택 → 자료 지도 / 이전 시연 이어보기 | presentation / 공통 | 실행 대기 |
| POP-MAP | 생활인구 지도 — 어디에 규모·흐름이 집중되는가 | 자료 탭 → 지도 → 상세 분석 / 후보 비교 / 시작 화면 | analysis, presentation / population | 실행 대기 |
| POP-TREND | 생활인구 상세 추이 — 선택 지역의 어느 시점에 변화가 있는가 | 보기 상세 분석 / 지역 상세 / 후보 상세 → 지도 선택 / 후보 비교 / 시작 화면 | analysis, presentation / population | 실행 대기 |
| POP-CAND | 생활인구 후보 비교 — 어느 후보를 같은 조건으로 비교할 것인가 | 후보 1~3개 담기 → 후보 비교 → 각 후보 상세 / 지도 / 시작 화면 | analysis, presentation / population | 실행 대기 |
| POP-TIME | 생활인구 두 시점 비교 — 같은 지역·조건에서 기준 시점과 얼마나 다른가 | 분석 상세 본문 / 시연 두 시점 비교 버튼 → 창 닫기→원래 그래프 | analysis, presentation / population | 실행 대기 |
| POP-SAVE | 생활인구 조건별 비교안 — 서로 다른 조회 조건의 저장값과 차이를 비교 | 분석용 조건별 비교안 저장·관리 → 조건 다시 적용 → 현재 자료 / 모두 비우기 | analysis / population | 실행 대기 |
| POP-SOURCE | 생활인구 출처·해석 — 해석 한계·제공 범위·원본을 확인 | 분석 본문 자료 설명 / 시연 근거 정보 보기 → 접기 / 현재 화면 유지 | analysis, presentation / population | 실행 대기 |
| MOV-MAP | 생활이동 지도 — 어디에 규모·흐름이 집중되는가 | 자료 탭 → 지도 → 상세 분석 / 후보 비교 / 시작 화면 | analysis, presentation / mobility | 실행 대기 |
| MOV-TREND | 생활이동 상세 추이 — 선택 지역의 어느 시점에 변화가 있는가 | 보기 상세 분석 / 지역 상세 / 후보 상세 → 지도 선택 / 후보 비교 / 시작 화면 | analysis, presentation / mobility | 실행 대기 |
| MOV-CAND | 생활이동 후보 비교 — 어느 후보를 같은 조건으로 비교할 것인가 | 후보 1~3개 담기 → 후보 비교 → 각 후보 상세 / 지도 / 시작 화면 | analysis, presentation / mobility | 실행 대기 |
| MOV-TIME | 생활이동 두 시점 비교 — 같은 지역·조건에서 기준 시점과 얼마나 다른가 | 분석 상세 본문 / 시연 두 시점 비교 버튼 → 창 닫기→원래 그래프 | analysis, presentation / mobility | 실행 대기 |
| MOV-SAVE | 생활이동 조건별 비교안 — 서로 다른 조회 조건의 저장값과 차이를 비교 | 분석용 조건별 비교안 저장·관리 → 조건 다시 적용 → 현재 자료 / 모두 비우기 | analysis / mobility | 실행 대기 |
| MOV-SOURCE | 생활이동 출처·해석 — 해석 한계·제공 범위·원본을 확인 | 분석 본문 자료 설명 / 시연 근거 정보 보기 → 접기 / 현재 화면 유지 | analysis, presentation / mobility | 실행 대기 |
| MOV-TABLE | 생활이동 상세 표 — 어느 하위 지역에 값이 있는지 정확히 확인 | 분석용 상세 내역 표 → 행 지역 클릭→지도/추이 | analysis / mobility | 실행 대기 |
| MIG-MAP | 거주지 이동 지도 — 어디에 규모·흐름이 집중되는가 | 자료 탭 → 지도 → 상세 분석 / 후보 비교 / 시작 화면 | analysis, presentation / migration | 실행 대기 |
| MIG-TREND | 거주지 이동 상세 추이 — 선택 지역의 어느 시점에 변화가 있는가 | 보기 상세 분석 / 지역 상세 / 후보 상세 → 지도 선택 / 후보 비교 / 시작 화면 | analysis, presentation / migration | 실행 대기 |
| MIG-CAND | 거주지 이동 후보 비교 — 어느 후보를 같은 조건으로 비교할 것인가 | 후보 1~3개 담기 → 후보 비교 → 각 후보 상세 / 지도 / 시작 화면 | analysis, presentation / migration | 실행 대기 |
| MIG-TIME | 거주지 이동 두 시점 비교 — 같은 지역·조건에서 기준 시점과 얼마나 다른가 | 분석 상세 본문 / 시연 두 시점 비교 버튼 → 창 닫기→원래 그래프 | analysis, presentation / migration | 실행 대기 |
| MIG-SAVE | 거주지 이동 조건별 비교안 — 서로 다른 조회 조건의 저장값과 차이를 비교 | 분석용 조건별 비교안 저장·관리 → 조건 다시 적용 → 현재 자료 / 모두 비우기 | analysis / migration | 실행 대기 |
| MIG-SOURCE | 거주지 이동 출처·해석 — 해석 한계·제공 범위·원본을 확인 | 분석 본문 자료 설명 / 시연 근거 정보 보기 → 접기 / 현재 화면 유지 | analysis, presentation / migration | 실행 대기 |
| MIG-TABLE | 거주지 이동 상세 표 — 어느 하위 지역에 값이 있는지 정확히 확인 | 분석용 상세 내역 표 → 행 지역 클릭→지도/추이 | analysis / migration | 실행 대기 |
| COM-MAP | 추정매출 지도 — 어디에 규모·흐름이 집중되는가 | 자료 탭 → 지도 → 상세 분석 / 후보 비교 / 시작 화면 | analysis, presentation / commerce | 실행 대기 |
| COM-TREND | 추정매출 상세 추이 — 선택 지역의 어느 시점에 변화가 있는가 | 보기 상세 분석 / 지역 상세 / 후보 상세 → 지도 선택 / 후보 비교 / 시작 화면 | analysis, presentation / commerce | 실행 대기 |
| COM-CAND | 추정매출 후보 비교 — 어느 후보를 같은 조건으로 비교할 것인가 | 후보 1~3개 담기 → 후보 비교 → 각 후보 상세 / 지도 / 시작 화면 | analysis, presentation / commerce | 실행 대기 |
| COM-TIME | 추정매출 두 시점 비교 — 같은 지역·조건에서 기준 시점과 얼마나 다른가 | 분석 상세 본문 / 시연 두 시점 비교 버튼 → 창 닫기→원래 그래프 | analysis, presentation / commerce | 실행 대기 |
| COM-SAVE | 추정매출 조건별 비교안 — 서로 다른 조회 조건의 저장값과 차이를 비교 | 분석용 조건별 비교안 저장·관리 → 조건 다시 적용 → 현재 자료 / 모두 비우기 | analysis / commerce | 실행 대기 |
| COM-SOURCE | 추정매출 출처·해석 — 해석 한계·제공 범위·원본을 확인 | 분석 본문 자료 설명 / 시연 근거 정보 보기 → 접기 / 현재 화면 유지 | analysis, presentation / commerce | 실행 대기 |
| COM-TABLE | 추정매출 상세 표 — 어느 하위 지역에 값이 있는지 정확히 확인 | 분석용 상세 내역 표 → 행 지역 클릭→지도/추이 | analysis / commerce | 실행 대기 |
| POP-PATTERN | 요일·월중 특성 — 요일·월초/중/말의 같은 시각 하루 평균은 어떻게 다른가 | 생활인구 상세 → 보조 분석 → 요일·월중 특성 → 시연 추이 그래프 / 지도(시간 적용 연결이 있을 때) | analysis, presentation / population | 실행 대기 |
| POP-RESIDENT | 체류·거주 기반 — 머무는 규모와 주민등록 거주 기반을 구분 | 생활인구 상세 → 보조 분석 → 체류·거주 기반 → 시연 추이 그래프 / 조회·지도 | analysis, presentation / population | 실행 대기 |
| POP-DEMO | 연령·성별 두 대상 — 어떤 대상이 더 많이 머무는가 | 생활인구 상세 → 보조 분석 → 연령·성별 비교 → 대상A/B 조건으로 지도 보기 / 시연 추이 그래프 | analysis, presentation / population | 실행 대기 |
| POP-DIST-SIDE | 두 시점 분포 나란히 — 어느 지역에서 머무는 인구가 늘거나 줄었는가 | 생활인구 상세 → 보조 분석 → 두 시점 분포 지도 → 지역 지도 항목 선택→상세 / 시연 추이 그래프 | analysis, presentation / population | 실행 대기 |
| POP-DIST-DELTA | 인구 증감 지도 — 어느 지역에서 머무는 인구가 늘거나 줄었는가 | 생활인구 상세 → 보조 분석 → 두 시점 분포 지도 → 지역 지도 항목 선택→상세 / 시연 추이 그래프 | analysis, presentation / population | 실행 대기 |
| MOV-CONNECTIONS | 이동 상대지역 — 선택 구와 어디 사이에 이동이 많은가 | 생활이동 상세 → 보조 분석 → 이동 상대지역 → 상대지역 선택 / 후보 비교 / 지도에서 구 선택 | analysis, presentation / mobility | 실행 대기 |
| MIG-DEMO | 전출입 연령·성별 구성 — 어느 집단의 거주지 이동 규모·순이동이 큰가 | 전출입 상세 → 보조 분석 → 연령·성별 구성 → 행 지도에 적용 → 지도 / 시연 추이 그래프 | analysis, presentation / migration | 실행 대기 |
| MIG-SINGLE | 연령 단일연도 안내 — 2025년만 있는 자료로 변화 비교를 오해하지 않도록 안내 | 전출입 인구세분=연령 → 상세 → 구성분석 / 전체인구 전환 | analysis, presentation / migration | 실행 대기 |
| MARKET-MAP | 상권 지도 — 어느 상권에 지표가 집중되는가 | 상단 상권 단위 분석 → 이전 화면으로 / 추이 닫기 / 선택 해제 | analysis-context, presentation-context / market-sales, market-population | 실행 대기 |
| MARKET-DETAIL | 선택 상권 상세 — 이 상권의 현재 지표와 직전 분기 차이는 얼마인가 | 상권 도형 또는 순위 선택 → 이전 화면으로 / 추이 닫기 / 선택 해제 | analysis-context, presentation-context / market-sales, market-population | 실행 대기 |
| MARKET-TREND | 선택 상권 분기 추이 — 같은 상권·업종·조건의 분기 추이는 어떠한가 | 선택 상권 → 상권 추이 보기 → 이전 화면으로 / 추이 닫기 / 선택 해제 | analysis-context, presentation-context / market-sales, market-population | 실행 대기 |
| MARKET-CAND | 상권 후보 비교 — 다른 구의 상권도 같은 조건에서 비교 가능한가 | 선택 상권 후보담기 → 우측후보 → 이전 화면으로 / 추이 닫기 / 선택 해제 | analysis-context, presentation-context / market-sales, market-population | 실행 대기 |
| MARKET-SOURCE | 상권 출처·경계 — 상권의 공간/통계 기간과 중첩 한계는 무엇인가 | 우측 출처·경계·해석 기준 → 이전 화면으로 / 추이 닫기 / 선택 해제 | analysis-context, presentation-context / market-sales, market-population | 실행 대기 |
| OV-QUERY | 단일 조회 편집기 — 결과 질문의 조건을 바꾼다 | 해당 화면의 이름 있는 버튼/요약 → Esc/닫기 → 원래 트리거 | analysis, presentation / population, mobility, migration, commerce, market-sales, market-population | 실행 대기 |
| OV-SEARCH | 검색 내장 선택 — 많은 선택지 중 원하는 항목 찾기 | 해당 화면의 이름 있는 버튼/요약 → Esc/닫기 → 원래 트리거 | analysis, presentation / population, mobility, migration, commerce, market-sales, market-population | 실행 대기 |
| OV-MAP-DISPLAY | 지도 표시 설정 — 원값을 유지하고 공간차이를 읽기 쉽게 표현 | 해당 화면의 이름 있는 버튼/요약 → Esc/닫기 → 원래 트리거 | analysis, presentation / population, mobility, migration, commerce, market-sales, market-population | 실행 대기 |
| OV-LEGEND | 지도 범례 — 현재 색의 수치·부호·결측 의미 읽기 | 해당 화면의 이름 있는 버튼/요약 → Esc/닫기 → 원래 트리거 | analysis, presentation / population, mobility, migration, commerce, market-sales, market-population | 실행 대기 |
| OV-GRAPH | 그래프 표시·축 설정 — 실제값·변화·기준100에 맞는 눈금 선택 | 해당 화면의 이름 있는 버튼/요약 → Esc/닫기 → 원래 트리거 | analysis, presentation / population, mobility, migration, commerce, market-sales, market-population | 실행 대기 |
| OV-LAYOUT | 화면 배치 — 지도와 보조정보 면적을 조절 | 해당 화면의 이름 있는 버튼/요약 → Esc/닫기 → 원래 트리거 | analysis, presentation / population, mobility, migration, commerce, market-sales, market-population | 실행 대기 |
| OV-REGION | 지역 정보 팝업 — 선택지역 값을 읽고 상세·비교로 연결 | 해당 화면의 이름 있는 버튼/요약 → Esc/닫기 → 원래 트리거 | analysis, presentation / population, mobility, migration, commerce, market-sales, market-population | 실행 대기 |
| OV-DOCK | 창 설정·자석 배치 — 본문을 가리지 않도록 창 위치·크기 조정 | 해당 화면의 이름 있는 버튼/요약 → Esc/닫기 → 원래 트리거 | analysis, presentation / population, mobility, migration, commerce, market-sales, market-population | 실행 대기 |
| OV-MEANING | 의미·해석 툴팁 — 수치의 정의·분모·해석한계를 이해 | 해당 화면의 이름 있는 버튼/요약 → Esc/닫기 → 원래 트리거 | analysis, presentation / population, mobility, migration, commerce, market-sales, market-population | 실행 대기 |
| OV-EXPORT | 표 내려받기 — 현재 결과를 정확값으로 가져간다 | 해당 화면의 이름 있는 버튼/요약 → Esc/닫기 → 원래 트리거 | analysis, presentation / population, mobility, migration, commerce, market-sales, market-population | 실행 대기 |

## 화면별 세부 수용 기준

### HOME-A · 분석 시작

근거: `src/Hero.tsx` / `.heroAnalysis`. 범위: 실제 확보 자료 범위.

- 4자료 버튼 각각 올바른 탭
- 자료 기간·단위 읽힘
- 이어보기 조건·현재 보기 유지

### HOME-P · 시연 시작

근거: `src/Hero.tsx` / `.heroPresentation`. 범위: 실제 확보 자료 범위.

- 선택 목록 여닫기
- 4자료 선택
- 시연 상태·조건 복원

### POP-MAP · 생활인구 지도

근거: `src/main.tsx` / `#map-population`. 범위: 실제 확보 자료 범위.

- 기간·대상 변경이 지도·요약·순위에 같은 뜻 반영
- 구/동 지원 단위·확대·축소·복귀
- 지도 선택→정보→상세·후보
- 시연 기본 밀도·지역명 잘림
- 필수 변형: 서울 전체, 선택 구, 행정동(지원 시), 결측, 구·동 경계 미연결

### POP-TREND · 생활인구 상세 추이

근거: `src/TrendExplorer.tsx` / `#trend-population`. 범위: 실제 확보 자료 범위.

- 조회 항목과 그래프 제목·숫자 일치
- 점 선택↔조회 시점 역연동
- 이전·다음·재생·정지
- 시연 한 장·분석 스크롤 역할 유지
- 현재 자료 비활성 때 재생·옵션 종료
- 필수 변형: 실제값, 기준 대비 증감, 기준100, 0·음수 기준값, 결측 시점, 단일 연도

### POP-CAND · 생활인구 후보 비교

근거: `src/main.tsx` / `#shortlist-population`. 범위: 실제 확보 자료 범위.

- 0개 복구 안내·최대3개
- 다른 지역 조회 후 후보 유지
- 조건 변경 시 값 갱신
- 구·동 혼합·긴 이름·큰 금액 가독성
- 각 후보 상세 이동·해제
- 필수 변형: 0개, 1개, 3개, 혼합 구·동, 자료 없음

### POP-TIME · 생활인구 두 시점 비교

근거: `src/TimeComparison.tsx` / `#time-compare-population`. 범위: 이동은 시간대별 추이이며 일계와 별개; 전출입 연령2025 단일연도는 비교 불가 안내.

- 기준 변경·차이·비율 원값 대조
- 0 이하 분모 비율 금지
- 시연 기본 숨김·여닫기 후 그래프 면적 유지
- Esc·재열기·자료 변경 후 이전창 잔존 없음
- 필수 변형: 분석 본문, 시연 플로팅, 0/음수/결측 기준

### POP-SAVE · 생활인구 조건별 비교안

근거: `src/ScenarioWorkbench.tsx` / `.scenarioWorkbench`. 범위: 분석용 전용. 시연 CSS에서 숨김은 의도된 비제공.

- 최대3개 스냅샷 불변
- 조회 변경 후 저장값 유지
- 적용 시 기간·지역·세분·집계 복원
- 삭제 후 맨 위 기준 재설정
- 새로고침 후 초기화 안내

### POP-SOURCE · 생활인구 출처·해석

근거: `src/main.tsx` / `.dataNotes`. 범위: 실제 확보 자료 범위.

- 정의·단위·원자료 링크의 현재 자료 일치
- 결측=0 오해 없음
- 시연 보기마다 실제 접근성 확인
- 인쇄 전후 펼침 상태 복구

### MOV-MAP · 생활이동 지도

근거: `src/ExtraDashboard.tsx` / `#map-mobility`. 범위: 실제 확보 자료 범위.

- 기간·대상 변경이 지도·요약·순위에 같은 뜻 반영
- 구/동 지원 단위·확대·축소·복귀
- 지도 선택→정보→상세·후보
- 시연 기본 밀도·지역명 잘림
- 필수 변형: 서울 전체, 선택 구, 행정동(지원 시), 결측, 구·동 경계 미연결

### MOV-TREND · 생활이동 상세 추이

근거: `src/TrendExplorer.tsx` / `#trend-mobility`. 범위: 실제 확보 자료 범위.

- 조회 항목과 그래프 제목·숫자 일치
- 점 선택↔조회 시점 역연동
- 이전·다음·재생·정지
- 시연 한 장·분석 스크롤 역할 유지
- 현재 자료 비활성 때 재생·옵션 종료
- 필수 변형: 실제값, 기준 대비 증감, 기준100, 0·음수 기준값, 결측 시점, 단일 연도

### MOV-CAND · 생활이동 후보 비교

근거: `src/ExtraDashboard.tsx` / `#shortlist-mobility`. 범위: 실제 확보 자료 범위.

- 0개 복구 안내·최대3개
- 다른 지역 조회 후 후보 유지
- 조건 변경 시 값 갱신
- 구·동 혼합·긴 이름·큰 금액 가독성
- 각 후보 상세 이동·해제
- 필수 변형: 0개, 1개, 3개, 혼합 구·동, 자료 없음

### MOV-TIME · 생활이동 두 시점 비교

근거: `src/TimeComparison.tsx` / `#time-compare-mobility`. 범위: 이동은 시간대별 추이이며 일계와 별개; 전출입 연령2025 단일연도는 비교 불가 안내.

- 기준 변경·차이·비율 원값 대조
- 0 이하 분모 비율 금지
- 시연 기본 숨김·여닫기 후 그래프 면적 유지
- Esc·재열기·자료 변경 후 이전창 잔존 없음
- 필수 변형: 분석 본문, 시연 플로팅, 0/음수/결측 기준

### MOV-SAVE · 생활이동 조건별 비교안

근거: `src/ScenarioWorkbench.tsx` / `.scenarioWorkbench`. 범위: 분석용 전용. 시연 CSS에서 숨김은 의도된 비제공.

- 최대3개 스냅샷 불변
- 조회 변경 후 저장값 유지
- 적용 시 기간·지역·세분·집계 복원
- 삭제 후 맨 위 기준 재설정
- 새로고침 후 초기화 안내

### MOV-SOURCE · 생활이동 출처·해석

근거: `src/ExtraDashboard.tsx` / `.dataNotes`. 범위: 실제 확보 자료 범위.

- 정의·단위·원자료 링크의 현재 자료 일치
- 결측=0 오해 없음
- 시연 보기마다 실제 접근성 확인
- 인쇄 전후 펼침 상태 복구

### MOV-TABLE · 생활이동 상세 표

근거: `src/ExtraDashboard.tsx` / `.extraTable`. 범위: 실제 확보 자료 범위.

- 지역 행 버튼 실제 후속 행동
- 선택행 표시·지역명·값 일치
- 동 자료 없는 연도 공식 구 합계 유지
- 매출 긴 수치 잘림 없음

### MIG-MAP · 거주지 이동 지도

근거: `src/ExtraDashboard.tsx` / `#map-migration`. 범위: 실제 확보 자료 범위.

- 기간·대상 변경이 지도·요약·순위에 같은 뜻 반영
- 구/동 지원 단위·확대·축소·복귀
- 지도 선택→정보→상세·후보
- 시연 기본 밀도·지역명 잘림
- 필수 변형: 서울 전체, 선택 구, 행정동(지원 시), 결측, 구·동 경계 미연결

### MIG-TREND · 거주지 이동 상세 추이

근거: `src/TrendExplorer.tsx` / `#trend-migration`. 범위: 실제 확보 자료 범위.

- 조회 항목과 그래프 제목·숫자 일치
- 점 선택↔조회 시점 역연동
- 이전·다음·재생·정지
- 시연 한 장·분석 스크롤 역할 유지
- 현재 자료 비활성 때 재생·옵션 종료
- 필수 변형: 실제값, 기준 대비 증감, 기준100, 0·음수 기준값, 결측 시점, 단일 연도

### MIG-CAND · 거주지 이동 후보 비교

근거: `src/ExtraDashboard.tsx` / `#shortlist-migration`. 범위: 실제 확보 자료 범위.

- 0개 복구 안내·최대3개
- 다른 지역 조회 후 후보 유지
- 조건 변경 시 값 갱신
- 구·동 혼합·긴 이름·큰 금액 가독성
- 각 후보 상세 이동·해제
- 필수 변형: 0개, 1개, 3개, 혼합 구·동, 자료 없음

### MIG-TIME · 거주지 이동 두 시점 비교

근거: `src/TimeComparison.tsx` / `#time-compare-migration`. 범위: 이동은 시간대별 추이이며 일계와 별개; 전출입 연령2025 단일연도는 비교 불가 안내.

- 기준 변경·차이·비율 원값 대조
- 0 이하 분모 비율 금지
- 시연 기본 숨김·여닫기 후 그래프 면적 유지
- Esc·재열기·자료 변경 후 이전창 잔존 없음
- 필수 변형: 분석 본문, 시연 플로팅, 0/음수/결측 기준

### MIG-SAVE · 거주지 이동 조건별 비교안

근거: `src/ScenarioWorkbench.tsx` / `.scenarioWorkbench`. 범위: 분석용 전용. 시연 CSS에서 숨김은 의도된 비제공.

- 최대3개 스냅샷 불변
- 조회 변경 후 저장값 유지
- 적용 시 기간·지역·세분·집계 복원
- 삭제 후 맨 위 기준 재설정
- 새로고침 후 초기화 안내

### MIG-SOURCE · 거주지 이동 출처·해석

근거: `src/ExtraDashboard.tsx` / `.dataNotes`. 범위: 실제 확보 자료 범위.

- 정의·단위·원자료 링크의 현재 자료 일치
- 결측=0 오해 없음
- 시연 보기마다 실제 접근성 확인
- 인쇄 전후 펼침 상태 복구

### MIG-TABLE · 거주지 이동 상세 표

근거: `src/ExtraDashboard.tsx` / `.extraTable`. 범위: 실제 확보 자료 범위.

- 지역 행 버튼 실제 후속 행동
- 선택행 표시·지역명·값 일치
- 동 자료 없는 연도 공식 구 합계 유지
- 매출 긴 수치 잘림 없음

### COM-MAP · 추정매출 지도

근거: `src/ExtraDashboard.tsx` / `#map-commerce`. 범위: 실제 확보 자료 범위.

- 기간·대상 변경이 지도·요약·순위에 같은 뜻 반영
- 구/동 지원 단위·확대·축소·복귀
- 지도 선택→정보→상세·후보
- 시연 기본 밀도·지역명 잘림
- 필수 변형: 서울 전체, 선택 구, 행정동(지원 시), 결측, 구·동 경계 미연결

### COM-TREND · 추정매출 상세 추이

근거: `src/TrendExplorer.tsx` / `#trend-commerce`. 범위: 실제 확보 자료 범위.

- 조회 항목과 그래프 제목·숫자 일치
- 점 선택↔조회 시점 역연동
- 이전·다음·재생·정지
- 시연 한 장·분석 스크롤 역할 유지
- 현재 자료 비활성 때 재생·옵션 종료
- 필수 변형: 실제값, 기준 대비 증감, 기준100, 0·음수 기준값, 결측 시점, 단일 연도

### COM-CAND · 추정매출 후보 비교

근거: `src/ExtraDashboard.tsx` / `#shortlist-commerce`. 범위: 실제 확보 자료 범위.

- 0개 복구 안내·최대3개
- 다른 지역 조회 후 후보 유지
- 조건 변경 시 값 갱신
- 구·동 혼합·긴 이름·큰 금액 가독성
- 각 후보 상세 이동·해제
- 필수 변형: 0개, 1개, 3개, 혼합 구·동, 자료 없음

### COM-TIME · 추정매출 두 시점 비교

근거: `src/TimeComparison.tsx` / `#time-compare-commerce`. 범위: 이동은 시간대별 추이이며 일계와 별개; 전출입 연령2025 단일연도는 비교 불가 안내.

- 기준 변경·차이·비율 원값 대조
- 0 이하 분모 비율 금지
- 시연 기본 숨김·여닫기 후 그래프 면적 유지
- Esc·재열기·자료 변경 후 이전창 잔존 없음
- 필수 변형: 분석 본문, 시연 플로팅, 0/음수/결측 기준

### COM-SAVE · 추정매출 조건별 비교안

근거: `src/ScenarioWorkbench.tsx` / `.scenarioWorkbench`. 범위: 분석용 전용. 시연 CSS에서 숨김은 의도된 비제공.

- 최대3개 스냅샷 불변
- 조회 변경 후 저장값 유지
- 적용 시 기간·지역·세분·집계 복원
- 삭제 후 맨 위 기준 재설정
- 새로고침 후 초기화 안내

### COM-SOURCE · 추정매출 출처·해석

근거: `src/ExtraDashboard.tsx` / `.dataNotes`. 범위: 실제 확보 자료 범위.

- 정의·단위·원자료 링크의 현재 자료 일치
- 결측=0 오해 없음
- 시연 보기마다 실제 접근성 확인
- 인쇄 전후 펼침 상태 복구

### COM-TABLE · 추정매출 상세 표

근거: `src/ExtraDashboard.tsx` / `.extraTable`. 범위: 실제 확보 자료 범위.

- 지역 행 버튼 실제 후속 행동
- 선택행 표시·지역명·값 일치
- 동 자료 없는 연도 공식 구 합계 유지
- 매출 긴 수치 잘림 없음

### POP-PATTERN · 요일·월중 특성

근거: `src/PopulationPatterns.tsx` / `#population-patterns`. 범위: 2026년1–10월 요약. 공휴일 별도 분리 없음.

- 월·대상 변경 후 이전월 값 미노출
- 요일↔월 구간·기준/비교그룹·시각·축 범위
- 동일그룹 안내·유효/전체일수
- 히트맵 모든시간 읽기·선택
- 시간 적용 버튼 실제 연결 여부
- 필수 변형: 요일별, 월초·월중·월말, 시간대 히트맵, 미지원 지역 코드

### POP-RESIDENT · 체류·거주 기반

근거: `src/ResidentContext.tsx` / `#resident-context`. 범위: 실제 확보 자료 범위.

- 타깃 조회 중에도 전체 연령·성별 표시 명확
- 서로 다른 기준시점과 한국인 범위
- 지역 변경 양쪽카드 연결·미연결 null
- 차이·나눗셈을 외부 방문자로 표현 금지

### POP-DEMO · 연령·성별 두 대상

근거: `src/DemographicComparison.tsx` / `#demographic-population`. 범위: 실제 확보 자료 범위.

- A/B 각각 연령·성별 선택
- 동일대상 안내·결측 차이 금지
- 분모는 지역 전체·대상 겹침 경고
- 지도에 적용 후 같은 숫자·조건

### POP-DIST-SIDE · 두 시점 분포 나란히

근거: `src/DistributionComparison.tsx` / `#distribution-population`. 범위: 실제 확보 자료 범위.

- 기준/비교 시간 변경·주조회 시각 동기
- 나란히 두지도 같은 범위
- 증감=비교−기준·0 중심·결측 불계산
- 범위min/max·±20%·초기화·오류
- 범례/툴팁·지역 클릭·긴 동명
- 필수 변형: 구 분포, 선택 구 동 분포, 두시점공통범위, 증감대칭범위

### POP-DIST-DELTA · 인구 증감 지도

근거: `src/DistributionComparison.tsx` / `#distribution-population`. 범위: 실제 확보 자료 범위.

- 기준/비교 시간 변경·주조회 시각 동기
- 나란히 두지도 같은 범위
- 증감=비교−기준·0 중심·결측 불계산
- 범위min/max·±20%·초기화·오류
- 범례/툴팁·지역 클릭·긴 동명
- 필수 변형: 구 분포, 선택 구 동 분포, 두시점공통범위, 증감대칭범위

### MOV-CONNECTIONS · 이동 상대지역

근거: `src/ExtraDashboard.tsx` / `#mobility-connections`. 범위: 실제 확보 자료 범위.

- 미선택 구 안내복구
- 유입·유출·순이동에 맞는 방향
- 시간기준·집계·분모비중 일치
- 서울 밖 집계 구분
- 상대지역 클릭 실제 조회/추이 연결

### MIG-DEMO · 전출입 연령·성별 구성

근거: `src/MigrationDemographics.tsx` / `#migration-demographic-details`. 범위: 실제 확보 자료 범위.

- 연령/성별 전환
- 2025연령 구만·2021–25성별 구동 지원
- 전입전출쌍/순이동 부호·바 길이
- 행 지도적용 후 연도/차원/세부값 일치
- 미지원 상태 실제복구 경로

### MIG-SINGLE · 연령 단일연도 안내

근거: `src/ExtraDashboard.tsx` / `.timeComparison`. 범위: 연령별2025 자치구만.

- 재생 비활성·한점그래프 설명
- 두시점 비교 버튼 비제공
- 사용 가능한 집단 비교로 이동

### MARKET-MAP · 상권 지도

근거: `src/MarketExplorer.tsx` / `.marketMap`. 범위: 실제 확보 자료 범위.

- 매출/유동인구·분기·구·동·이름·유형·업종·단일 세부 기준 교집합
- 조회 도형수·관측/결측 합계
- 0건 조건별 해제복구·명시적 지도맞춤
- 상권 도형 실제마우스 내부·키보드 선택
- 구 이름 대비·도킹 후 입력중복0

### MARKET-DETAIL · 선택 상권 상세

근거: `src/MarketExplorer.tsx` / `.marketDetails`. 범위: 실제 확보 자료 범위.

- 선택명·조건·원값·직전차이
- 선택해제·후보담기·맞춤·추이 보기
- 선택만으로 지역필터/카메라 변경 금지

### MARKET-TREND · 선택 상권 분기 추이

근거: `src/MarketExplorer.tsx` / `.marketTrendDrawer`. 범위: 실제 확보 자료 범위.

- 분기↔조회·상세 값 동기
- 그래프 옵션·축·재생
- 추이 닫기와 지도조건/선택/카메라 보존
- 유동인구 단위·원본추정치 중복 없음

### MARKET-CAND · 상권 후보 비교

근거: `src/MarketExplorer.tsx` / `.marketDetails`. 범위: 실제 확보 자료 범위.

- 최대3개·중복담기·삭제·비우기
- 지역필터 바꿔도 후보 유지·값은현재자료조건
- 지도에서 보기 동작의 의도적 필터변경 안내

### MARKET-SOURCE · 상권 출처·경계

근거: `src/MarketExplorer.tsx` / `.marketDetails`. 범위: 실제 확보 자료 범위.

- 2023경계와2025매출·2026유동 구분
- 상권합계·면적·방문자 인원 오해금지
- 외부링크 목적지·기준자료 일치

### OV-QUERY · 단일 조회 편집기

근거: `src/MapPanel.tsx` / `.mapOptionsPanel`. 범위: 실제 확보 자료 범위.

- 지도/상세/후보에서 같은입력1개
- 모드·보기·자료전환시 숨김창 잔존 없음
- 날짜/시간/지역/대상 현재조건·결과 동기
- 기본한열·긴이름·키보드초점·검색0건
- 접기/Esc·재열기·데이터 보존

### OV-SEARCH · 검색 내장 선택

근거: `src/QueryControls.tsx` / `.queryPopover`. 범위: 실제 확보 자료 범위.

- 검색/0건/지우기/Enter/Arrow/Home/End
- 현재0건 선택 보존·비선택0건 비활성
- Esc 검색만닫고원래입력복귀
- aria dialog 유형일치·화면경계

### OV-MAP-DISPLAY · 지도 표시 설정

근거: `src/MapCanvas.tsx` / `.mapDisplaySettings`. 범위: 실제 확보 자료 범위.

- 0포함/관측최소여유/직접범위
- 범위invalid기존유지·±20%·reset
- 순이동0대칭/결측비포함
- palette3종·기본/선택미리보기·다른지도동기
- Esc/재열기·지도원값불변

### OV-LEGEND · 지도 범례

근거: `src/MapLegendTooltip.tsx` / `.mapLegendCompact`. 범위: 실제 확보 자료 범위.

- 일반/상권/분포/증감 각각 적용범위일치
- 툴팁 열기·내부읽기·Esc·외부클릭·초점복귀
- 조건·범위·팔레트 변경 동기
- 작은막대·버튼 기본면적 유지

### OV-GRAPH · 그래프 표시·축 설정

근거: `src/TrendExplorer.tsx` / `.graphOptionsPanel`. 범위: 실제 확보 자료 범위.

- 실제값/증감/100·비교기준 적용
- index100중앙·편차10/20/30
- 수동min/max·invalid복구·clipped표시
- 0/음수/결측 기준 설명
- 재생간격·창이동/크기·Esc·자료비활성 종료

### OV-LAYOUT · 화면 배치

근거: `src/LayoutControls.tsx` / `.layoutOptions`. 범위: 실제 확보 자료 범위.

- 55/67/75/85%·경계조절과값동기
- 옵션폭260–360·지도최소540 실제값동기
- 지도높이·보조정보summary/expanded/hidden
- 초기화모든state/표시값일치
- 닫기/Esc·선택/후보/원값유지

### OV-REGION · 지역 정보 팝업

근거: `src/Navigation.tsx` / `.mapPopup`. 범위: 실제 확보 자료 범위.

- 선택지역·값·조건
- 구상세동분포/동상세추이/미지원사유
- 후보추가·해제/3개상한
- 여러창Esc1개·초점복귀
- 자료/시간전환시이전팝업미노출

### OV-DOCK · 창 설정·자석 배치

근거: `src/SupportDockTools.tsx` / `.supportDockTools,.mapQueryAppearance,.marketWindowSettings`. 범위: 실제 확보 자료 범위.

- 좌/우/float·마그넷예고/drop/cancel
- 고정창합산후지도540 확보
- 플로팅가로/세로·경계·초기화
- 배경50–100만·도킹100·분리시이전값복원
- 모든 창 독립위치·활성창Esc·중첩조절

### OV-MEANING · 의미·해석 툴팁

근거: `src/DataMeaning.tsx` / `.dataMeaningTooltip`. 범위: 실제 확보 자료 범위.

- 현재자료·조건·단위·계산식
- 클릭/키보드열기·내부읽기·Esc·외부클릭
- 가장자리/긴내용/가독성·초점복귀

### OV-EXPORT · 표 내려받기

근거: `src/main.tsx` / `button.queryExportAction`. 범위: 실제 확보 자료 범위.

- 현재자료/기간/지역/대상/단위 CSV일치
- 0/결측 빈칸구분·축약이아닌원값
- 구전체/동선택범위정확
- 로딩중이전자료내려받기금지

## 직접 소스 확인 중 전달한 위험

| 번호 | 소스 관찰 | 판정 | 실제 화면 관문 |
|---|---|---|---|
| INV-01 | LayoutControls 기본220/range180–300/reset220와 focused MapPanel 기본280/range260–360이 다름 | 소스 계약 불일치 확정. 제품 동작 실패는 실화면 확인 필요 | 화면 배치 슬라이더 표시값·실제조회폭·초기화 후값을 비교 |
| INV-02 | PopulationPatterns는 선택 시각 지도 적용 `onSelectHour`를 지원하나 main에서 전달하지 않음 | 접점 부재. 미노출 자체가 의도인지 부모 판단 필요 | 특성 비교 시각에서 선택일 지도로 돌아가는 실효적 후속 행동 확인 |

## 범위 주의

- 시나리오 저장 작업대는 분석용 전용으로 CSS에서 숨긴다. 시연에서 노출하지 않는 것을 단순히 오류로 판정하지 않는다.
- 상권 전용 화면은 별도 분석/시연 토글을 숨기므로 두 진입 문맥에서 상속된 모드가 글자·상태·레이아웃에 영향을 주는지 확인한다.
- 전출입 연령은2025년 자치구만 제공해 연도 변화·동 상세가 불가능하다. 미지원 상태의 설명과 가능한 구성 비교를 검사한다.
- 생활이동 일계 지도와 시간별 추이는 다른 집계다. 그래프 선택 시 시간별로 전환되는 뜻을 확인한다.
- 체류·거주 기반은 연령·성별 타깃을 보고 있어도 전체 인구를 보여준다. 분모·기준시점 차이를 유지한다.
- 외부 공식 출처 링크는 실제 사이트 접속 가능성과 잘못된 통계 해석을 구분한다. 링크 대상의 변경 가능성은 이번 제품 내부 화면 판정과 분리한다.
