# W22 소스·목표 배치 대조 메모

읽기 조사만 수행했다. 소스 수정·실행·브라우저·외부 요청·git 쓰기는 하지 않았다. 아래 줄 번호는 2026-11-18 조사 시점 기준이다. 과거 보고의 실행 통과를 현재 서비스 통과로 보지 않는다.

## 현재 → W20 목표

| 현재 근거 | 목표 위치 / 처리 | 보존 조건 |
|---|---|---|
| `src/main.tsx:163–164` 지역 자료 4탭·보기·모드·More와 분기별 헤더 | 상단은 지역/상권/교통예정/부동산예정, 모드는 지역만. 자료·보기는 왼쪽으로 이동 | 예정은 비활성. 자료 4개 탭의 동등 크기와 주제 4개 버튼 동등 크기는 별도 규칙 |
| `src/main.tsx:165` Hero 진입, `src/Hero.tsx` 기존 자료 카드 | W20 최신 히어로로 교체 | 초기 진입은 주제 미선택. 두 시작 버튼/이어보기 유지. 기존 네 자료 카드를 시작 화면에 중복 노출하지 않음 |
| `src/main.tsx:74–79,164–165` 전역 mode·view, marketOpened로 상권을 한 번 마운트 후 숨김 | 주제별 세션 보존. 지역 모드만 표현에 반영 | 상권 갔다 돌아와 지역 mode·필터 보존. 상권은 지역 mode 클래스 영향 차단 |
| `src/main.tsx:163` detailOptions 드롭다운; `src/MarketExplorer.tsx:109` 상권 상세 3종 | 왼쪽 자료별 지도+상세 목록으로 이동 | 지역 8+6+6+5=25 항목 및 상권 자료별 3종 빠짐없이 매핑. 기간별 ‘두 시간/두 연도/두 분기’ 명칭 |
| `src/UnifiedQueryBar.tsx:29–40,62–67,108–110` 한 입력 DOM host, 상단/오른쪽/띄우기 | 중앙 상단 기본 배치로 통합 | 기존 실제 입력을 하나만 이동. 포털 복제로 동명 input/id를 만들지 않음. 고급 배치 제거는 별도 사용자 결정이 필요하므로 More 등으로 접근 유지 |
| `src/MarketExplorer.tsx:95–103` 자료·분기·구·동·검색·유형 및 추가 업종/주변분포 조건 | 자료만 왼쪽, 나머지는 중앙 조회 바·추가 조건 | 업종과 성별/연령/요일/시간 한 항목 비교 제약 유지. 자료 이동 시 period/dimension/band 상태 초기화 규칙 그대로 |
| `src/main.tsx:170`, `src/DockableRanking.tsx:19`, `src/MapWorkspace.tsx:123` 오른쪽 순위/선택 상세 | 오른쪽 300px 선택 지역·핵심값·최대 3후보·해석/출처로 재구성 | 전체 순위/선택 행/순위 클릭/후보 해제/중복 방지/출처 등 기존 기능은 접기 또는 상세에서 접근 가능하게 유지; ‘목업에 없음’을 삭제 사유로 쓰지 않음 |
| `src/MapWorkspace.tsx:124` 상권의 메뉴·조건/배치/지역 분석 지도 버튼 | 상단 주제·More·오른쪽 토글로 통합 | 중복 내비게이션 버튼은 새 경로의 키보드·복귀 검증 후 제거. 고급 배치 조작은 보존 |
| 지도 표시/범례 (`viewport-workspace.css:44–55`, `MarketExplorer.tsx:109`) | 지도 안에 유지 | I01 실제 2px 잘림은 별도 결함으로 수정·실측. 옮기기만 하면 해결되었다고 판단하지 않음 |

## W20 최신 기준과 폭

- `w20-layout-mockup/REPORT.md:60–84`가 최신 히어로 변경분이다. 초기 보고의 2카드 설명보다 우선한다. `mockup.html:63–72`는 지역·상권 세션 분리와 지역만 시연 적용, `:74` 왼쪽 메뉴, `:83–84` 폭 산식/그리드의 근거다.
- `REPORT.md:38–49`: 좌200/접힘64, 우300/접힘0, 중앙 안쪽32+경계2. 1365 양쪽열림 831, 좌접힘967, 우접힘1131, 양쪽접힘1267. 1920에서 각각1386/1522/1686/1822. 현재 서비스가 이 폭을 이미 만족한다는 뜻이 아니다.
- `REPORT.md:70–75`: 316일/427동/보유 경계1650곳/매출6분기. 1650은 최신 관측 상권 수가 아니다. 실제 최신 매출1566·유동1648 및 유동22분기와 구분한다. 목업 116상태+18여정은 실제 조회/CSV/전체화면 검증이 아니다 (`:51–58,:83`).

## 포털·전체화면·상태 위험

1. **포털 host 계약:** `MapWorkspace.tsx:16–17,126`은 전역 `market-header-slot`을 찾아 헤더를 포털한다. `UnifiedQueryBar.tsx:33–40`은 전역 `active-query-summary`, `:66–67`은 `.app > header .analysisHeadingActions`를 찾는다. 새 셸에서 stable host를 명시하고 기존 host를 새 위치에 먼저 제공해야 한다. 한 번에 selector/DOM/컴포넌트를 모두 제거하면 입력·도구가 없어질 수 있다.
2. **상세가 지도를 대체하는 본문:** `AnalysisDetailModal.tsx:59`는 `.marketMap` 또는 `.dashboardContent`를 1회 탐색. `:69–75,121–122`는 동일 children host를 팝업/본문 사이 이동하여 차트 로컬 상태 보존. 새 셸에서 재마운트로 대체하지 않는다. `:79–95`는 직계 app헤더+로컬헤더+조회행 높이로 정렬/높이 계산한다. sticky 구조 변경 시 중복 높이 차감·잘림을 실측한다.
3. **복귀·포커스·스크롤:** `AnalysisDetailModal.tsx:14–31`은 여러 상세 owner의 종료를 기다리고 scroll/focus 복원; `:33–46,97–112`는 dialog body overflow 잠금과 중첩 Escape 처리를 한다. 신규 left/right 접기 트리거로 포커스가 사라지는 경우 fallback도 갱신해야 한다.
4. **native/fallback 전체화면:** `UnifiedMapPanel.tsx:14–28`은 `.app` native host를 사용하고 dataset 전환 때 map-fullscreen-transfer를 받으며 fallback도 지원한다. `main.tsx:76–77`은 상권 진입 전 전체화면 종료. `fullscreen-map.css:51–58`은 앱 헤더와 main을 숨긴 뒤 활성 map만 보인다. 새 셸 wrapper 때문에 native에서 조회창/도구가 배경 visibility:hidden을 상속하지 않는지 검증한다.
5. **띄운 창의 주제 소유권:** `FloatingQueryLayer.tsx:15–25,34`는 활성 fullscreen/overlay/dialog와 ancestor의 hidden/class/data 상태, app의 테마/변수를 복제한다. 셸 새 data 속성은 observer/복제 목록에 반영해야 하며, 상권에 지역 시연 클래스를 복제하지 않아야 한다. 바깥 `.app` clone까지 루트 셸 CSS로 잡으면 화면 전체 grid가 중복 생성된다 (`viewport-workspace.css:1–7`의 root-only 구분 유지).
6. **지역 시연 누수:** `main.tsx:164`의 root `.mode-${mode}`는 상권에도 남는다. `MapWorkspace.tsx:108–109`는 이 클래스를 관찰하여 상권 controlsOpen까지 바꾼다. 모드 버튼만 숨기는 해결은 불충분하다. 지역 상태를 지우지 않고 상권 표면/스타일/관찰 효과를 분리해야 한다.
7. **접기 의미가 서로 다름:** `DockableRanking.tsx:19`의 ‘줄이기’는 기본에서 floating으로 전환한다. 새 우측300px→0px 접기는 별도 셸 상태여야 한다. `MapWorkspace.tsx:105`의 선택 시 상세 자동열기, `:124` 토글 aria-expanded/controls와 복귀 focus도 이어받는다.
8. **이중 폭·자동 floating:** `MapWorkspace.tsx:28–34,112–118`은 내부 기본280/320px, 최소지도540px, 좁으면 자동floating. `LayoutControls.tsx:7–11,15`는 지도55–85%와 secondary hidden을 app에 적용. `UnifiedQueryBar.tsx:41–60`은 순위최소280 및 share까지 빼고 지도540px 검사. 새200/300셸을 바깥에 추가하고 기존 내부 폭을 그대로 남기면 중앙이 두 번 줄어든다.
9. **기존 CSS 우선순위:** `integrated-analysis-header.css:3–27` 직계 헤더·4탭·market slot, `viewport-workspace.css:4–27,39–60,64–80` 루트100dvh/내부scroll/지도grid, `query-placement.css:50–58` 오른쪽 조회dock 차감, `support-docking.css:1` 순위dock grid 강제, `map-workspace-shell.css:2–33` 이전 왼쪽 조회rail, `resizable-workspaces.css:5–6` <=950/700px 레이아웃 강제. 새 셸에 scope를 부여해 구형 규칙을 단계별 해제하고 기존 규칙 위로 !important를 계속 쌓지 않는다.
10. **I01 2px 결함:** `viewport-workspace.css:40,46,54`에서 표시설정이 0폭 3열 grid-area를 유지하면서 절대배치 width%를 계산하고 `tableau-query-integration.css:31–36`의 focused 규칙과 겹친다. 레이아웃 단계마다 열기→실제폭/scrollWidth/클릭/ESC/포커스 복귀를 검사한다.

## 단계별 영향 파일 제안 (계획용, 아직 변경 없음)

| 단계 | 파일 경계 / 검증 위험 |
|---|---|
| 0 기준선 | 읽기: `main.tsx:74–89,152–170`, `ExtraDashboard.tsx`, `MarketExplorer.tsx:44,95–109`; 25+3종 항목/조건/계산 fixtures와 현재화면 기록. W16 I01 실제 결함을 baseline blocker로 등록 |
| 1 공통 셸·상단·히어로 | `main.tsx:163–166`, `Hero.tsx`, `hero.css`, `integrated-analysis-header.css`, `viewport-workspace.css`, 새 전용 셸 컴포넌트/CSS(계획명). 기존 stable header/query/detail hosts 먼저 보존. 지역/상권 상태 모델 분리와 mode 누수 검증 |
| 2 좌측 자료·보기 | `main.tsx:152–163`, `ExtraDashboard.tsx` 상세 선택, `MarketExplorer.tsx:95,109`, `DetailNavigation.tsx`; 자료/상세 registry 최소화. `UnifiedMapPanel.tsx:25` fullscreen dataset 선택은 남기거나 동일선택기를 연결. 4자료+2상권×상세 매핑 전수 확인 |
| 3 중앙 조회·지도·상세 | `UnifiedQueryBar.tsx:29–81,96–110`, `UnifiedMapPanel.tsx`, `AnalysisDetailModal.tsx:59–95,121–122`, `MarketExplorer.tsx:95–109`, `tableau-query-integration.css`, `viewport-workspace.css:39–60`, `fullscreen-map.css`, `query-placement.css`. 한 입력 host 유지·I01 수정·fullscreen/native/fallback·상세 popup/main 왕복 |
| 4 우측 정보·후보·접기 | `main.tsx:170`, `ExtraDashboard.tsx` ranking, `DockableRanking.tsx`, `MapWorkspace.tsx:105,112–134`, `LayoutControls.tsx`, `support-docking.css`, `map-workspace.css`, `map-candidate-tray.css`. 셸300px와 내부순위폭 이중계산 제거·3후보·선택복원·기존 dock/floating 유지 |
| 5 정리·최종검수 | `style.css` import 순서와 위 CSS scope; 헤더/조회/순위 중복 경로 삭제는 실제 E2E 후. print·짧은높이·1365/1920·키보드·복귀를 검증. source/data/loader 계산 변경은 이 단계에 끼워넣지 않음 |
| 별도 로딩 결정 | `main.tsx:87–89`가 최초 지역 경계·index·모든 타자료를 함께 불러오는 현재 경계. W17 권고의 topic loader·cache/manifest는 배치와 분리하여 후속 진행여부 결정. 레이아웃 중 preload를 임의 삭제하지 않음 |

W16 대응은 `w16-ia-midpoint-review/REPORT.md:134–144` I01–I11 및 `:146–148` 실제 결함/상태분리 설명에 근거한다. I03 지역 행정동 매출과 상권 매출 명칭, I05 기간 단위, I06 고급 조회 발견성, I08 히어로 최신 범위, I09 More 설명 일치, I11 지도 단계 버튼 균등 크기를 새 구조의 검수 항목으로 남긴다. W17의 loader/registry 권고는 신규 범용 아키텍처 구현을 이 계획의 선행 필수로 삼는 근거가 아니다.
