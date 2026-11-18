# W40: 4단계(상권 분석을 같은 셸에) 준비 — 읽기 전용 설계 노트

작성: 창4 · 2026-11-18 · **이 노트를 쓰면서 `src/`·`tests/`·`docs/`(이 폴더 밖)와 지하철 트리(`/Users/koscom/workspace2/seoul-human-subway`)는 읽기만 했다. 빌드·테스트·서버는 실행하지 않았고 아무것도 고치지 않았다. 아래는 설계 제안이며 실제 화면·측정은 하지 않았다.**

기준: HEAD `754e736` + 작업 트리의 3단계(w37·w37b, 미커밋). 줄 번호는 이 상태 기준이며 착수 때 다시 확인한다. 지하철은 `c7817c8`(교통 좌측 메뉴, `WorkspaceNav`를 `groups`로 재사용)를 읽었다.
읽은 것: 계획서 2·3·5(4단계)·7절, REQ-22·23, w16 I06, w28 DESIGN 4절, w37/w37b REPORT, `MarketExplorer.tsx`·`MapWorkspace.tsx`·`AnalysisDetailModal.tsx`·`FloatingQueryLayer.tsx`·`UnifiedQueryBar.tsx`·`main.tsx`·`AppShell.tsx`, `market-*.css`·`map-workspace.css`·`market-docking.css`, 현재 E2E 중 상권 관련 줄.

---

## 0. 한눈에 보는 결론 (쉬운 말)

1. **상권은 이미 "작은 앱 하나"다.** 모든 상태(분기·검색·유형·업종·세부 항목·선택·후보·카메라)가 `MarketExplorer.tsx` 안에 있고, 숨김 처리로 계속 마운트되어 있어서(`main.tsx:189`) 서비스를 오가도 유지된다. 4단계는 이 구조를 **그대로 두고**, 그 안의 화면 틀만 지역과 같은 세 칸(왼쪽 메뉴 · 중앙 · 오른쪽 300)으로 바꾼다. 그래서 상태 이전이 거의 필요 없다.
2. **없앨 것은 세 가지**: (a) 헤더 둘째 줄에 포털로 끼워 넣던 상권 헤더(제목·"지역 정보" 토글·"화면 배치"·"지역 분석 지도" 버튼), (b) 지도 옆 내부 3열 틀(`MapWorkspace`의 조회 패널 칸·상세 패널·분할 막대), (c) 상권 지도 안 **상세 select**(왼쪽 메뉴가 대신함). 헤더가 2줄(94px)에서 1줄(52px)로 줄어 지도 높이가 557px에서 **약 590–600px(1a 수준 599)** 으로 돌아올 것으로 예상된다.
3. **새로 풀어야 할 문제 둘**: ① 지도에서 상권을 고를 때마다 오른쪽 정보 패널이 **자동으로 열리는 동작**(`MapWorkspace.tsx:105`)은 사용자가 접은 오른쪽 칸을 다시 열면 안 된다 → 자동 열기를 없애고 접힌 상태 표시로 대체. ② 한 줄 조회 바에 들어갈 조건이 많다(분기·자치구·행정동·검색·유형·업종·세부 항목) → `QueryMore`로 **업종·세부 구성(I06)** 을 접되 이름과 현재 값이 보이게 한다.

---

## 1. 현재 상권 화면 구조 (파일·줄)

### 1-1. 진입과 상태 소유

| 항목 | 위치 | 설명 |
|---|---|---|
| 상권 마운트·숨김 | `main.tsx:87,96,189` | `marketOpened` 후 `<div hidden={view!=='map'}><MarketExplorer active onClose …/></div>`. 한 번 열면 계속 마운트(재마운트 없음) |
| 진입 함수 | `main.tsx:96,98,140` | `openMarket`(전체화면 종료 → `marketOpened` → `lastService='market'` → `view='map'`), `selectService`, `resumeLast`. 상권에서 지역으로 가는 `onClose`는 `main.tsx:189`의 콜백(`setView('analysis')`) |
| 루트 클래스 | `main.tsx`(루트 `className`) | 1b: 상권은 `mode-analysis`(고정 글자 규격) + `service-market`. 지역 `mode` 상태는 건드리지 않음 |
| 모든 상권 상태 | `MarketExplorer.tsx:34–48` | 팔레트·색상 구간·표시 옵션·출처 팝오버·추가 조회 옵션 열림, **자료 `dataset`·분기(`salesPeriod`/`popPeriod`)·구 `gu`·동 `dong`·검색 `query`·유형 `type`·업종 `industry`·비교 항목 `dimension`·세부 `band`·선택 `selected`·후보 `candidates`(≤3)·추이/비교/후보 열림 플래그·`marketFocus`·카메라 `camera`/`parentCamera`** |

### 1-2. 헤더 포털(임시 slot) — 제거 대상

- `AppShell.tsx:18` `<div id="market-header-slot" hidden={service!=='market'}/>`(1b가 둔 slot adapter).
- `MapWorkspace.tsx:16–17` 이 slot을 `MutationObserver`로 찾아 `createPortal(workspaceHeader, slot)`(`:126`).
- `workspaceHeader`(`MapWorkspace.tsx:124`): 제목 `h1` "상권 지도 · 유동인구와 매출"(`MarketExplorer.tsx:112` `title`), **"지역 정보 닫기/열기" 토글**, **"상권 창 배치" details 메뉴**(왼쪽/오른쪽 고정·띄우기·위치 초기화·불투명도), 끝에 **"지역 분석 지도" 버튼**(`onClose`).
- 이 한 줄 때문에 상권 헤더가 2줄(1365에서 **94px**, 1a는 52px)이다. 지도 높이 557px(1a 599px)의 원인.

### 1-3. 내부 3열(`MapWorkspace`) — 제거 대상

- `MapWorkspace.tsx:127–133` `.mapWorkspaceBody`: `gridTemplateColumns = "(조회 칸 폭|0) minmax(0,1fr) (상세 폭|0)"`.
  - **조회 패널 칸**은 `hasControls=topQuery==null`일 때만(`:13`). 상권은 `topQuery`(= `controls`)를 쓰므로 **항상 꺼져 있는 죽은 코드**(`controlsPanel` 등).
  - **상세 패널**(`mapWorkspaceDetails`, `:123`) 기본 폭 `rightWidth=320`(`:44` 근처, 최소 260–최대 520, `:115–117`), 왼쪽/오른쪽 고정·띄우기·불투명도·크기 조절·자석 도킹(540px 안전선, `:53–55`)·분할 막대 `split()`(`:116`).
- 조회 줄은 `MapWorkspace.tsx:127` `<div className="mapWorkspaceTopQuery">{topQuery}</div>`.

### 1-4. 조회 입력(`controls`, `MarketExplorer.tsx:94–105`)

`UnifiedQueryFields scope="market"` 안에 입력 한 벌: 자료 select(`#market-query-dataset`, 추정매출/유동인구) · 분기(`#market-query-period`) · 자치구(`#market-query-gu`) · 행정동(`#market-query-dong`) · 상권 검색(`#market-query-name`, 지우기 ×) · 상권 유형(`#market-query-type`) · **"추가 조회 옵션" 버튼 + `QueryPopover`**(`:101–104`)에 **업종(`#market-query-industry`, 매출만) · 비교 항목(`#market-query-dimension`: 전체/시간대/성별/연령대/요일) · 세부 항목(`#market-query-band`)**. 버튼 옆에는 비기본값일 때 `marketAdvancedSelection` 텍스트가 붙는다(`:101`). `query-control-open` 이벤트(`:40`)가 업종/비교 항목/세부 입력 포커스 요청 때 팝오버를 연다.

### 1-5. 지도 영역(`marketMap`, `MarketExplorer.tsx:109,112`)

- **`mapToolbar`(`:109`)**: 서울→구→상권 breadcrumb, 단위, `DataMeaning`, 결과 건수·자료 없음 개수(`resultFeedback`), **결과 도구**(상세 select `상권 상세 분석 선택`, "지도 표시" 팝오버, 출처 ⓘ 팝오버, "표 내려받기"), 같은 이름 지역 바(`marketMatchedDistricts`).
- **지도 svg**(`:112`): 구 배경(경로 `data-district-code`, 라벨 `data-district-label-code`, 클릭·Enter/Space로 `navigateDistrict`), 상권 경로 `data-market-code`(선택 `selectArea`, 키보드 Enter/Space), 포커스 윤곽, 확대/이동 `camera`. 0건이면 `.marketNoResults`(조건 해제 버튼들). `marketZoom` 도구(−, %, +, 원래 범위, 범위 맞춤, 필터 해제), `marketHover`, 범례 `MapLegendTooltip`.
- 선택·탐색 함수: `selectArea`(`:79`: 포커스·카메라 초기화·`setSelected`·**`setDetailVersion(v=>v+1)`**), `returnToRegion`(`:80`, `parentCamera` 복원), `navigateDistrict`(`:82`), `showCandidate`(`:87`), `add`(`:86`, 중복/3개 제한 안내 `notice`).

### 1-6. 상세 3개(모두 `AnalysisDetailModal`, 팝업↔본문)

| ID | 위치 | 제목(현재) | 콤보 라벨(현재) |
|---|---|---|---|
| `trend` | `MarketExplorer.tsx:112` `TrendExplorer` | 선택 상권 분기별 추이 | 선택 상권 추이(`!chosen`이면 비활성) |
| `comparison` | 같은 줄 `TimeComparison` + 집계 기준 `DataMeaning` | 선택 상권 두 분기 비교 | 두 분기 비교(비활성 조건 동일) |
| `candidates` | `:110` `candidateComparison`(후보 카드·값·비우기) | 후보 상권 비교 | 후보 상권 비교 (n/3) |

- 옵션 배열은 `DetailNavigationProvider options=…`(`:112` 시작)에 있고, 팝업/본문 콤보와 지도 위 select가 같은 상태를 쓴다. 본문은 `.marketMap`을 대상으로 한다(`AnalysisDetailModal.tsx:58–59`), 높이 계산은 `.mapWorkspace`의 `:scope > .mapWorkspaceHeader`·`.mapWorkspaceTopQuery` 높이를 뺀다(`:80–82`), 닫을 때 초점 폴백은 `.mapWorkspace .analysisDetailSelect`(`:28`).

### 1-7. 오른쪽 상세 패널 내용과 "정보 자동 열기"

- 내용(`details`, `MarketExplorer.tsx:111`): `notice`(`role=status`, 후보 안내 등) · 선택 전: "{지역} 상위 5개 상권"(+ 선택 유지 버튼) · 선택 후: 선택 상권명·위치 ⓘ·값(`marketValue`)·정확한 값 `details`·조건 문장·**직전 분기 대비**(`marketDeltaLine`, `quarterChange` 설명)·"선택 상권에 맞춤/현재 선택 해제/후보 담기" · 상위 5개 순위(`marketRank` 버튼 = `selectArea`).
- **자동 열기:** `MarketExplorer.tsx:112`가 `revealDetails={detailVersion}`을 넘기고, `MapWorkspace.tsx:105`가 이 값이 바뀔 때마다 `setDetailsOpen(true);setFloatingFront('details');revealFloating('details')`와 스크롤 맨 위로. 즉 상권을 고르면 **닫아 둔 정보 패널이 다시 열리거나 떠 있는 창이 앞으로 나온다.**

### 1-8. 중복·충돌이 생기는 곳(요약)

| # | 중복/충돌 | 새 구조에서의 처리 |
|---|---|---|
| ① | 헤더 포털 slot과 상단 주제 메뉴의 "지역 분석" | slot·"지역 분석 지도" 제거(5절) |
| ② | 내부 3열 상세 패널(320) vs 셸 오른쪽 칸(300) | 상세 패널을 셸 칸으로 옮김(2-3절). 이중 차감 방지 |
| ③ | 지도 위 상세 select vs 왼쪽 메뉴 "보기" | select 제거 |
| ④ | 조회 바의 "자료" select vs 왼쪽 메뉴 "자료" | 왼쪽 메뉴가 담당, select 제거 |
| ⑤ | 자동 열기 vs 사용자가 접은 오른쪽 칸 | 자동 열기 제거(3-3절) |
| ⑥ | `AnalysisDetailModal`이 `.mapWorkspace` 헤더·조회 줄 높이에 의존 | 새 몸체 기준으로 교체(6절, 위험 2) |

---

## 2. 목표 구조

### 2-1. 한눈에

```
[상단 막대: 브랜드 · 지역 분석/상권 분석/교통/부동산 · (모드 없음) · 더보기]   ← 헤더 한 줄(52px)
[왼쪽 200|64]  [중앙: 한 줄 조회 바 + 지도 영역(breadcrumb·도구·지도·범례)]  [오른쪽 300|0]
 자료: 상권 추정매출 / 상권 유동인구                                          선택 상권 · 핵심 지표
 보기: 지도 · 선택 상권 추이 · 두 분기 비교 · 후보 상권 비교                  후보 3 · 상위 5 · 해석·출처
```

- 상권은 **모드 전환이 없다**(REQ-23). 글자 규격은 1b의 파생 클래스(`mode-analysis` 고정, 분석형 6종 이내)를 그대로 쓰고, 지역 `mode` 상태는 건드리지 않는다.
- 폭 계산은 지역과 같다: **지도 표면 = 뷰포트 − 좌 − 우 − 32 − 2**. 좌우 4상태 1365: 831 / 967 / 1131 / 1267(REQ-22).

### 2-2. 왼쪽 메뉴(`WorkspaceNav` 재사용)

지하철 트리의 `c7817c8`이 `WorkspaceNav`에 **`groups` 계약**을 넣었다. 상권은 이 계약을 쓴다(지역은 `registry` 경로).

```
NavGroup = {title, kind:'data'|'view', aria, items: NavItem[]}
NavItem  = {id, label, short, current, disabled?, onSelect}
props    = {collapsed, onToggle, groups, ariaLabel, heading}
```

| 그룹 | 항목(전체 이름 / 접힘 2글자) | 동작(기존 상태 그대로) |
|---|---|---|
| 자료 (`kind:'data'`, `aria-pressed`) | 상권 추정매출 / 매출 · 상권 유동인구 / 유동 | `setDataset('sales'|'population')`(기존 `:69` 효과가 추이·비교·후보 열림을 닫음 — 유지) |
| 보기 (`kind:'view'`, `aria-current="page"`) | 지도 / 지도 · 선택 상권 추이 / 추이 · 두 분기 비교 / 분기 · 후보 상권 비교 / 후보 | 지도 = 상세 모두 닫기(`returnToMap`), 나머지 = 기존 `trend`/`comparison`/`candidates` 열기. **추이·비교는 선택 상권이 없으면 `disabled`**(기존 `disabled:!chosen`과 같음) |

- `ariaLabel="상권 자료와 보기"`, `heading="자료와 보기"`. 짧은 이름 유일성: 매출·유동 / 지도·추이·분기·후보는 서로 겹치지 않음(지하철은 `label.slice(0,2)`를 쓰므로 8절 참고).
- 접힘 상태 `marketLeftOpen`: **하나**(모드 없음), 기본 열림, 탭 세션 중 유지. 접힌 64px의 이름·초점 안내·화살표 키·Esc로 접지 않음은 지역과 같다(컴포넌트 공유).
- **상세 이름 통일(I05와 같은 방식):** 지금 팝업 제목(`선택 상권 분기별 추이`/`선택 상권 두 분기 비교`/`후보 상권 비교`)과 콤보 라벨(`선택 상권 추이`/`두 분기 비교`/`후보 상권 비교 (n/3)`)이 어긋난다. 메뉴·콤보·창 제목을 **한 정의**로: `선택 상권 분기별 추이`(지역 매출 "선택 지역 분기별 추이"와 짝) · `두 분기 비교` · `후보 상권 비교`. 후보 개수는 이름이 아니라 오른쪽 패널의 `n / 3곳`이 보여 준다. ID(`trend`·`comparison`·`candidates`)는 불변. 상권 등록부는 `dataset-view-registry`가 아니라 `MarketExplorer` 옆 작은 상수(3개 + 자료 2개)로 두고, 지역 registry는 건드리지 않는다(상권은 지역 registry를 모른다, w30 합의).

### 2-3. 중앙: 한 줄 조회 바 (`QueryMore` 재사용)

- 입력 한 벌 원칙(REQ-03)은 그대로: `UnifiedQueryFields`의 같은 입력을 그대로 쓰고 **자료 select만 제거**(왼쪽 메뉴가 담당). 조회 줄은 `MapWorkspace` 밖으로 나와 중앙 칸 맨 위에 둔다.
- **한 줄 구성(권고):** 분기 · 자치구 · 행정동(자치구 선택 시) · 상권 검색 · 상권 유형 · `조건 더보기`(**업종·비교 항목·세부 항목**을 `QueryMore`로). I06은 4절.
- **폭 예산(중앙 865, 막대 안쪽 약 807px, 글자 크기 불변):**

| 필드 | 예상 폭 | 비고 |
|---|---|---|
| 분기 | 150–178 | "분기 · 2026년 2분기" |
| 자치구 | 152 | 서울 전체/구 이름 |
| 행정동 | 172 | 구 선택 때만 보임(비활성이면 `display:none` 규칙이 이미 있음) |
| 상권 검색 | 150–180 | 입력, 예 "홍대, 공덕" |
| 상권 유형 | 140–160 | 선택 |
| 조건 더보기 | 120–150 | 업종·구성(I06) |
| 간격 5×6 | 30 | |
| **합계** | 기본(동 없음) ≈ 750, **동 있음 ≈ 920** | 807 초과 |

  동이 보일 때 807을 넘는다. 계획서·감독자 기준은 "줄바꿈 완화 금지"이므로 **착수 직후 실측**(w37b 방식)해 다음 순서로 줄인다: ① 필드 안쪽 여백·간격(w37b와 같음) → ② 상권 검색 입력을 `flex` 가변 폭(최소 120)으로 → ③ 그래도 넘으면 **상권 유형을 `QueryMore`로 같이 접고**(필터 교집합은 그대로, 배지·요약으로 표시). 어느 쪽이든 입력 ID·동작은 불변.
- 조회 결과 줄(`marketMapTitle`: breadcrumb·단위·건수·결과 도구)은 지도 영역 맨 위에 그대로 두되 **상세 select를 제거**한다. 도구는 "지도 표시"·출처 ⓘ·"표 내려받기" 3개로 줄어든다.

### 2-4. 오른쪽: 300 셸 칸(`SupportSections` 재사용)

상권 몸체(`MarketExplorer`가 직접 그림)에 `.marketSupport` 칸을 두고 지역과 같은 폭 규칙(`--right-panel-width` 300/0)을 쓴다. 상태(`selected`, `candidates`)가 같은 컴포넌트 안이라 **포털이 필요 없다**(지역은 자료 컴포넌트가 몸체 밖이라 포털을 썼다).

| 구역 | 내용(현재 `details`에서 이동) |
|---|---|
| 알림 | `notice`(`role=status`) — 후보 담기/제외 안내 |
| 선택 상권 + 핵심 지표 | 선택 전: "{지역} 상위 5개 상권" 안내. 선택 후: 이름·위치 ⓘ·값(`marketValue`, 정확값 `details`)·조건 문장·**직전 분기 대비**(+ `quarterChange` 설명)·"선택 상권에 맞춤/선택 해제" |
| 후보 | `SupportCandidates` 그대로(`items`=`candidates` 코드 → `{code,name,value}`, 값은 현재 자료·분기·업종·세부 기준. `onAdd`=`add(selected)`, `onRemove`, `onOpen`=후보 비교 열기). 3곳 제한·"후보에 담김"·"최대 3곳 선택됨"·0후보 안내는 지역과 같은 문구/동작. 상권 `add`의 안내 문구(`notice`)는 유지 |
| 순위 | 현재 조건 상위 5개(`marketRank` 버튼 = `selectArea`). 5행이 1365×768에 들어오도록 w37b 압축 규칙을 그대로 적용 |
| 해석·출처 | `SupportSource`(한 줄 + "출처·해석 보기"=`sourceInfo` 팝오버). 지도 툴바의 출처 ⓘ도 유지 |

- 접기(0px)·다시 열기 버튼·고급 도킹/띄우기는 지역과 같은 컴포넌트·규칙을 쓴다. 상권의 `rightOpen`은 **상권 서비스 안에서 하나**(모드 없음). 지역의 `rightOpen`과는 **별도 상태**로 둔다(서비스별 상태 보존, REQ-23): 하나를 공유하면 지역에서 접은 것이 상권에서도 접힌다.
- 지도 안 후보 막대(`MapCandidateTray` 해당 UI): 상권에는 현재 없다(후보 칩은 상세에만). 지역 규칙(오른쪽이 접히면 지도 안에 후보 수·해제·열기를 다시 보임)을 상권에도 적용할지는 결정 사항 6.

### 2-5. 고급 배치(사용자 결정 b)

상권 헤더의 "상권 창 배치" 메뉴(`MapWorkspace.tsx:124`, 왼쪽/오른쪽 고정·띄우기·위치 초기화·불투명도)와 상세 패널의 이동·크기 조절·자석 도킹은 **같은 기능을 `DockableRanking`/`SupportDockTools`(지역 오른쪽 패널의 창 설정)로 옮겨 보존**한다. 상권 패널도 기본은 셸 오른쪽 칸이고, "창 설정"에서 붙이기·떼어내기·투명도·줄이기를 고른다. 더보기의 "화면 배치"(비율 55–85·고급 비율 끄기·기본 배치 복원)는 이미 앱 전역 이벤트(`workspace-map-share`, `workspace-layout-restore`)이므로 상권 몸체도 같은 이벤트를 받도록 하고, `data-ratio`/`--support-share`는 **활성 서비스 몸체에 적용**한다(결정 사항 5: 비율 상태를 지역과 공유할지).

---

## 3. 상태 보존 방법

### 3-1. 지금도 유지되는 것(변경 금지)

`MarketExplorer`의 모든 상태(분기·검색·유형·업종·세부·선택·후보·카메라·`marketFocus`·`parentCamera`·표시 옵션)는 컴포넌트 내부 `useState`이고, `main.tsx:189`가 숨김만 한다. **재마운트 방지 규칙(1b 규칙과 같음):**
1. `MarketExplorer`를 조건부 렌더로 바꾸지 않는다(`marketOpened&&<div hidden>` 유지).
2. 새 몸체를 `MarketExplorer` **안**에서 그린다. 서비스별로 다른 루트 요소로 바꾸지 않고 `key`를 두지 않는다.
3. 왼쪽 메뉴·오른쪽 칸 상태(`marketLeftOpen`, `marketRightOpen`)도 `MarketExplorer`의 `useState`로 둔다(탭 세션 중 유지, 새로고침 복원 없음).
4. 서비스·히어로를 오가며 **상세 팝업은 닫히는 기존 동작**은 유지(`:71` `active` 효과가 추이·비교·후보·표시·추가조회·출처를 닫음). 조건·선택·후보·카메라는 유지된다.
5. `FloatingQueryLayer`의 스타일 복제 범위 선택자(`FloatingQueryLayer.tsx:10` `.mapShell,.mapWorkspace`)는 새 몸체 클래스를 포함하도록 바꾼다(위험 1).

### 3-2. 카메라·선택

- 카메라(`camera`, `parentCamera`)와 `marketFocus`는 지도 컴포넌트 상태이므로 **왼쪽/오른쪽 접기로 중앙 폭이 바뀌어도 초기화하지 않는다.** 폭이 바뀌면 `labelScale`만 `ResizeObserver`(`:49`)로 갱신된다 — 이 옵서버가 접기 전후 폭 변화에서 동작하는지 N04로 확인.
- 자료 전환(`dataset`)은 기존대로 추이·비교·후보 열림과 hover·notice를 닫고(`:69`), **선택 `selected`·후보는 유지**(코드·기간 공유). 후보는 자료·분기·업종·세부 기준으로 값을 다시 계산해 보인다.

### 3-3. 자동 열기 충돌 해결(결정 필요: 7-3의 1번)

`selectArea`가 `detailVersion`을 올려 오른쪽 패널을 여는 동작은 새 구조의 "접기는 사용자가 한다"와 충돌한다.
- **권고:** `revealDetails`/`setDetailVersion` 자동 열기를 **제거**한다. 선택 사실은 (a) 지도 위 breadcrumb 마지막 칸(이미 있음, `:109`), (b) 접힌 상태일 때 지도 도구의 "보조정보" 버튼에 **작은 점 표시**("선택됨"), (c) 후보/상세 왼쪽 메뉴 항목의 활성화(추이·비교가 선택 시 풀림)로 알린다. 오른쪽이 열려 있으면 선택 순간 패널 맨 위로 스크롤(`detailsContentRef.scrollTo`)만 유지한다.
- 떠 있는 창(advanced floating) 모드에서는 선택 시 창을 앞으로 가져오는 기존 동작을 **떠 있는 모드에 한해** 유지할 수 있다(사용자가 이미 떼어낸 창이므로). 이것은 접기와 다른 상태다.

---

## 4. I06: 업종·주변분포 옵션이 숨어 있는 문제

현재: 업종·비교 항목(= 주변분포: 시간대·성별·연령대·요일)·세부 항목이 "추가 조회 옵션" 팝오버(`MarketExplorer.tsx:101–104`) 안에 있어 한 번 더 열어야 한다. 비기본값이면 버튼 옆 `marketAdvancedSelection`이 값을 보여 주지만 **무엇이 안에 있는지는 버튼 이름("추가 조회 옵션")으로는 알 수 없다.**

해결안(권고, `QueryMore` 재사용 + 이름·상태 노출):
1. **버튼 이름을 내용으로:** `조건 더보기` 대신 **`업종·세부 구성`**(매출은 업종 + 구성, 유동은 구성만). 툴팁/접근성 이름은 "업종·성별·연령·요일·시간 조건. 현재: 전체 업종 · 전체".
2. **현재 값이 버튼에 보이게:** 기본값(전체 업종·전체 구성)이면 이름만, 비기본값이면 w37b 방식으로 **강조 + 배지 개수 + 현재 값 요약**("한식음식점 · 시간대 17–21시"). 기존 `marketAdvancedSelection` 텍스트는 이 요약으로 대체.
3. **팝오버 안 설명 유지:** "성별·연령·요일·시간은 한 가지씩 비교합니다" + `meaningContent.marginal`(기존 `marketMarginalHint`).
4. **포커스 이벤트 호환:** `query-control-open`(`:40`)이 `-industry|-dimension|-band` ID를 요청하면 `QueryMore`가 열리도록 `open` 제어 prop 또는 이벤트 수신을 추가(기존 동작 보존).
5. **조회 요약이 결과 근처에도 남게:** 현재 `condition` 문장(`:76`, "2026년 2분기 · 한식음식점 · 시간대 17–21시")이 오른쪽 패널·CSV·범례 요약에 이미 쓰인다 — 변경 없음.
6. (선택) 업종이 매출의 핵심 조건이므로 매출 자료일 때만 업종 select를 한 줄 바에 직접 두는 안이 있으나 폭 예산(2-3)상 권고하지 않는다. 결정 사항 3.

테스트: 비기본값을 설정하면 버튼 배지·요약이 바뀌고 되돌리면 사라짐, 접힌 값이 CSV·지도 색·후보 값에 반영, `query-control-open`으로 열기.

---

## 5. 포털과 임시 slot 제거 순서 ("지역 분석 지도" 중복 버튼 포함)

원칙(계획서): **새 호스트가 먼저 동작한 다음 옛 경로를 제거한다.** 각 단계는 빌드·E2E 통과 후 다음으로.

| 순서 | 작업 | 확인 |
|---|---|---|
| 1 | 상권 몸체(3칸 격자)를 `MarketExplorer` 안에 추가하고 **왼쪽 메뉴(`groups`)와 오른쪽 `marketSupport` 칸을 옛 경로 옆에** 둔다. 옛 `MapWorkspace`는 아직 그대로(상세 패널 숨김 가능) | 왼쪽 메뉴가 같은 상태를 바꾸는지(자료·상세 열기), 오른쪽 칸 내용이 옛 패널과 같은 값인지 |
| 2 | 상세 패널(`details`)을 오른쪽 칸으로 **이동**, 지도 위 상세 select·조회 바의 자료 select 제거, 조회 줄을 중앙 칸 위로 | 조회 값·선택·후보·카메라 불변(N07), 지도 폭 4상태 |
| 3 | **헤더 포털 제거:** `MapWorkspace`의 `createPortal(workspaceHeader, slot)`·`workspaceHeader` 삭제, `AppShell`의 `#market-header-slot` 삭제(1b에서 임시로 둔 것). 제목 `h1`은 중앙 칸의 스크린리더용 제목(지역의 `accessibleAnalysisTitle`과 같은 방식)으로 이동. **"지역 분석 지도" 버튼·"지역 정보" 토글·"상권 창 배치" 메뉴 제거**(지역으로 가는 길은 상단 주제 메뉴가 같은 상태 보존·전체화면 종료·키보드 복귀를 제공함 — 3단계까지 N01/I04 테스트로 이미 확인됨. 지역 정보 토글은 오른쪽 칸의 접기/열기가, 창 배치는 창 설정·더보기가 대체) | 상권→지역→상권 왕복(I04), 헤더 높이 52px, 상단 메뉴 `aria-pressed` |
| 4 | **내부 3열 제거:** `MapWorkspace.tsx`의 조회 칸(죽은 코드)·상세 칸·분할 막대·도킹 로직을 삭제. 상권 전용이므로 파일 자체를 제거하고 `MarketExplorer`가 몸체를 직접 그린다(`MapWorkspace`를 import하는 곳은 `MarketExplorer` 하나) | 번들·타입 오류 없음, 옛 클래스(`.mapWorkspace*`) 선택자 잔존 점검 |
| 5 | CSS 정리: `map-workspace.css`·`market-docking.css`·`resizable-workspaces.css`의 `.mapWorkspace*` 규칙, `market-explorer.css`의 어두운 패널 색(`.mapWorkspace .marketDetails{color:#c6d7e8}` — 새 흰 패널에서는 대비 반전 주의), `market-unified-query.css`의 `#market-header-slot`·`.mapWorkspaceTopQuery`, `market-query.css`·`responsive-type-tokens.css`·`long-content-layout.css`의 `.mapWorkspaceHeader h1` 등 | 대비·글자 종류 검사(분석 6종), 인쇄 |
| 6 | 테스트 선택자 이식(7절) | PC18 + 상권 여정 |

주의: `AnalysisDetailModal.tsx:28,58–59,80–82`(초점 폴백, 본문 대상, 높이 계산)이 `.mapWorkspace` 구조를 이름으로 안다. 3단계에서 지역을 `.workspaceNav`로 바꾼 것처럼 상권 몸체 클래스로 대체해야 하며, 4번 단계 전에 먼저 바꾼다.

---

## 6. 1365에서 상권 지도 폭·높이 예상과 측정 방법

### 6-1. 예상

| 항목 | 현재(실측, w28·w32 보고) | 4단계 후 예상 |
|---|---|---|
| 헤더 | 94px(상단 막대 + 상권 slot 줄) | **52px** |
| 지도 폭 1365 | 928px(상세 패널 320 도킹) | 좌200/우300 열림 **831**, 좌접힘/우열림 967, 좌열림/우접힘 1131, 둘 다 접힘 1267 |
| 지도 높이 1365×768 | **557px**(1a 599, 1b 549) | 헤더 −42px → **약 590–600px**. 단 지도 도구 줄·조회 바·breadcrumb 줄 높이가 바뀌면 달라짐(조회 바가 한 줄이면 큰 차이 없음) |
| 1920 | 지도 폭 1438·높이 869 | 폭 1386(양쪽 열림)·높이 약 910 |

- 폭 식이 맞으려면 상권 지도 둘레의 가로 여백이 정확히 34px(중앙 패딩 8+8 + 컨테이너 테두리·내부 여백 18)이어야 한다. 상권은 `.marketMap`/`.marketMapViewport` 둘레 여백이 지역 `.mapPanel`과 다르므로 **착수 직후 여백 분해표**(w37 방식)를 만들고 필요하면 여백을 조정한다.

### 6-2. 측정 방법(재사용 스크립트 설계)

1. **여백 분해표:** `.marketMapSvg` 폭 − 중앙 칸 폭을 항목별(`.analysisView` 대응 중앙 칸 패딩, `.marketMap`, `.marketMapViewport`, svg `viewBox 1000×700`의 `meet` 여백)로 분해. 단 `viewBox` 종횡비가 1000:700이라 **svg 요소 폭과 실제 그려진 지도 폭이 다를 수 있다**(높이가 제한되면 좌우 여백이 남음). 측정은 svg 요소 폭을 기준으로 하되 **실제 도형 bbox 폭**도 함께 기록한다.
2. **4상태 폭:** `probe-widths.mjs` 방식(좌 200/64 × 우 300/0, 1365/1920)으로 칸 폭·중앙 칸·svg 폭·도형 bbox 폭을 기록, 기대값 표 ±1px.
3. **첫 화면 높이:** 기존 `first screen` 테스트의 market 행(헤더 높이·svg 높이·지도 하단이 뷰포트 안).
4. **가독성(831px 관문과 같은 항목):** 구 25 라벨(`data-district-label-code`, 14px 고정 라벨 `--market-context-label-size`)의 겹침·밖으로 나감, 줌 100%에서 상권 도형 선택 가능, 범례·도구(`marketZoom`·`marketCompactLegend`)와의 겹침, 구 이동 후 상권 지도(구 하나)의 읽힘. 스크린샷과 사람 읽기 판정을 따로 기록.
5. **조회 바:** w37b의 `barState`(높이≤40, 필드 세로 위치 차이≤4, 가로 넘침 없음) — 기본/구 선택(동 보임)/업종·구성 비기본값 상태.

---

## 7. 테스트

### 7-1. 깨지는 선택자

| 현재(줄은 w37b 이후 재확인) | 대체 |
|---|---|
| `.mapWorkspaceTopQuery`(`screen-rules.spec.mjs` querySnapshot, `marketProbe`) | 중앙 칸의 조회 바(`.unifiedQueryBar` 보이는 것) |
| `.mapWorkspaceHeader h1`, `.mapWorkspaceHeaderActions button:last-child`(`marketProbe`, I04) | 새 중앙 제목/지도 툴바 버튼. I04의 "지역 분석 지도 버튼으로 복귀"는 **상단 주제 "지역 분석"** 으로만(버튼 제거) |
| `getByRole('combobox',{name:'상권 상세 분석 선택'})`(상권 상세 3개 열기, 복귀 후 재열기) | 왼쪽 메뉴 보기 버튼 이름: `선택 상권 분기별 추이`·`두 분기 비교`·`후보 상권 비교` |
| `.integratedMarketHeader .integratedBrand`(초점 시작점) | 상단 브랜드/현재 자료 항목 |
| `left menu absent in the market (stage 4)`(2단계 임시 검사) | **반대로**: 상권에서 왼쪽 메뉴가 보이고 자료 2·보기 4(지도+상세 3) 이름이 기대표와 같다 |
| `uniformity`의 `.marketZoom button` 그룹 | 유지(줌 쌍은 지도 도구라 별도). 세로 메뉴 그룹 검사에 상권 자료 2·보기 4 추가(개수 먼저) |
| `#market-query-dataset` | 제거(자료는 왼쪽 메뉴). 이 ID를 쓰는 테스트가 없음을 착수 때 확인 |

### 7-2. 새·이식 여정

| 항목 | 내용 |
|---|---|
| **PC18의 상권×2** | 상권(모드 없음) × 1365/1920 행: 새 셸에서 지도 첫 노출·글자·대비·메뉴 균등·가로 넘침(규칙 a–h), `service-market`+`mode-presentation` 없음 |
| **2자료 × 상세 3개** | 상권 추정매출·상권 유동인구 각각 `trend`·`comparison`·`candidates`를 팝업·본문 두 방식으로 열기, 왼쪽 메뉴/콤보 이동, 복귀 후 조회·선택·카메라 불변(`querySnapshot` + 접은 조건 포함), 본문 추이 축 잘림 없음(우측 300 유지 상태) |
| **검색·구 이동·유형 교집합·0건 복구** | 상권 검색어 + 구 + 유형이 **교집합**으로 적용(건수 일치 — 독립 계산은 `market-areas.geojson` 속성에서 직접), 0건이면 `.marketNoResults`와 해제 버튼 3종으로 복구하고 선택·후보 유지(`:72` 알림), "같은 이름의 지역" 바 |
| **서울→구→상권→부모 + 키보드** | 구 라벨/배경 클릭과 Enter/Space(`data-district-label-code`, `data-district-code`)로 구 이동, 상권 Enter 선택, breadcrumb 부모 버튼으로 `parentCamera` 복귀(카메라 값 동일), 줌/이동 후 접기·펼치기에도 카메라 유지, 화살표·Tab 정거장 |
| **전년동기 vs 직전분기** | 오른쪽 패널의 "직전 분기 대비" = 선택 분기 − **직전 분기**(예: 2026Q2 − 2026Q1); "두 분기 비교"에서 기준 2025Q2, 선택 2026Q2를 골라 **전년 같은 분기** 차이/증감률을 표시. 두 값은 서로 다른 라벨이며 독립 원자료(`market-sales.json`, 같은 코드·업종·세부 기준)에서 `fs`로 계산한 기대값과 같다. 기준이 0/null일 때 증감률 계산 불가 표시(보정 금지) |
| **CSV와 후보 값 일치** | "표 내려받기"로 받은 CSV 행(코드·분기·업종·기준·값·단위)이 화면 순위·지도 색 기준값·후보 카드 값과 같고, 후보 3곳의 값이 원자료와 같다. 길이 14자리·음수/0/null 처리 |
| **오른쪽 패널·후보** | 후보 담기(오른쪽/상위 순위/후보 담기 버튼) 3곳, 4번째 제한·안내, 해제, 0후보, 접기·다시 열기, 접은 채 상권을 고르면 **자동으로 열리지 않음**과 접힘 표시(점) |
| **무모드 재검사(I04/REQ-23)** | 지역 분석용/시연용 두 출발 → 상권의 computed 글자·폭·도구 동일, 모드 UI 없음, 왕복 후 지역 모드·상권 조건 보존. 상권의 좌/우 접힘 상태는 지역과 별개로 유지 |
| **I06** | 4절 테스트 |
| **N04(상권분)** | 좌우 4상태 폭(831/967/1131/1267 ±1), 접힘 접근성, Esc 불접힘, 키보드 |
| **인쇄·전체화면** | 인쇄 때 오른쪽 칸(선택 상권·지표·후보·출처)이 표시되고, 상권은 전체화면 도구가 없음(현재도 없음)을 확인. 팝업/본문에서 같은 조건 |

실행 규모: PC18의 상권 2행은 기존 수준, 상세 3 × 2자료 × (팝업·본문) × 2크기는 50여 개 상태이므로 **1365 전수 + 1920 대표**로 줄이는 지역 방식을 쓴다.

---

## 8. 지하철 브랜치와의 병합 영향

감독자 계획: 지하철은 **3단계 뒤 · 4단계 전에** 메인에 병합. 읽은 `c7817c8` 기준 영향:

1. **`WorkspaceNav`의 `groups` 계약이 상권 요구와 일치한다.** 상권은 데이터 그룹 하나(+ `kind:'view'` 보기 그룹)면 충분하다. 계약의 알아 둘 점: ① `kind:'data'`는 `aria-pressed`, `kind:'view'`는 `aria-current="page"`; ② `disabled` 항목은 화살표 이동에서 제외(`button:not(:disabled)`); ③ `heading`/`ariaLabel`로 서비스 이름 표시; ④ **짧은 이름 유일성 검사가 컴포넌트 안에 없다**(지하철은 `label.slice(0,2)`를 쓰므로 중복 가능). 상권은 고정 2글자(매출/유동/지도/추이/분기/후보)를 직접 주고, 지하철 쪽 짧은 이름은 병합 시 한 번 점검하도록 감독자에게 알린다.
2. **구조 차이:** 지하철은 자체 격자 `.swWorkspace`(`--left`/`--right` 변수, 로컬 `leftOpen/rightOpen`)를 쓰고 3단계의 `.regionBody`·`SupportContext`와 공유하지 않는다. 상권은 3단계 규칙을 따라 **`.regionBody`와 같은 CSS 규칙**(폭 변수 `--left-nav-width`/`--right-panel-width`, `data-support-open`)을 쓰는 `.marketBody`로 한다. 병합 후 장기적으로 세 서비스를 한 `.serviceBody` 격자로 합치는 정리를 5단계 후보로 제안한다(지금 합치지 않음).
3. **`main.tsx` 충돌 지점:** 지하철은 `view==='transport'`, `lastService`에 `'transport'`, `selectService`/`resumeLast`/`modeControl`(교통에도 모드 토글)·루트 클래스의 `service==='transport'`를 추가했다. 상권 4단계의 `main.tsx` 변경은 **`onClose` 제거**와 (필요 시) `marketOpened` 래퍼 유지뿐이어서 충돌이 작다. 단 `selectService`의 `market` 분기와 루트 클래스 파생 식은 두 작업이 같은 줄을 건드리므로 병합 때 한 번 확인한다.
4. **`AnalysisDetailModal.tsx`:** 지하철 커밋도 이 파일을 한 줄 바꿨다(초점 폴백 선택자). 상권 4단계가 같은 함수(`leaveDetail`, 높이 계산)를 크게 건드리므로 **병합 후에** 시작하면 충돌을 피한다.
5. **`service-registry.ts`:** 교통 항목이 `active`로 바뀐다(지하철). 상권 4단계는 이 파일을 건드리지 않는다.
6. **모드 규칙:** 지하철은 모드(분석/시연)를 쓰지만 상권은 쓰지 않는다. 루트 클래스 `mode-${service==='region'||service==='transport'?mode:'analysis'}` 식에서 상권은 분석형 고정 — REQ-23과 맞는다. 상권→교통→상권 왕복의 상태 보존(상권은 숨김 유지)을 N-테스트에 포함.
7. **E2E:** 지하철은 별도 `subway.spec.mjs`와 `screen-rules.spec.mjs` 10줄 수정이 있다. 상권 이식은 같은 파일의 상권 관련 줄(7-1)을 바꾸므로 병합 후 줄 번호를 다시 확인한다.

---

## 9. 커밋 분할, 위험, 감독자 확인 사항

### 9-1. 커밋 분할(권고: 3개)

| 커밋 | 내용 | 이유 |
|---|---|---|
| **4a 구조** | 상권 몸체 3칸 격자, 왼쪽 메뉴(`groups`), 오른쪽 `marketSupport` 칸(기존 `details` 내용 그대로 이동), 조회 줄을 중앙으로, 자료 select·상세 select 제거, **헤더 포털/slot·"지역 분석 지도"·지역 정보 토글·창 배치 메뉴 제거**, `MapWorkspace` 삭제, `AnalysisDetailModal`·`FloatingQueryLayer` 선택자 교체, 자동 열기 제거 | 폭·높이·헤더가 한 묶음으로 바뀐다. 기능 소실이 없어야 하는 완결 단위 |
| **4b 내용·조회** | `SupportSections`(후보·출처 요약)·핵심 지표 압축, `QueryMore`(업종·세부 구성)와 한 줄 조회 바, I06, 상세 이름 통일, 선택 상태 표시(접힘 점) | 상태·표시 변경이라 4a 통과 뒤에 얹음 |
| **4c 정리** | 옛 CSS(`.mapWorkspace*`, 어두운 패널 색)·죽은 코드 제거, 테스트 마무리 | 되돌리기 쉽게 분리 |

각 커밋은 G 관문 + 영향 E2E 통과가 조건이다. 4a만으로도 배포 가능해야 한다(조회 입력은 옛 한 줄 그대로, 추가 조회 옵션 팝오버 유지).

### 9-2. 위험

1. **`FloatingQueryLayer`의 범위 선택자**(`:10` `.mapShell,.mapWorkspace`): 상권 몸체에 `.mapWorkspace`가 없어지면 떠 있는 패널이 스타일 변수를 잘못 복제한다. 새 클래스를 선택자에 추가하고 떠 있는 창 테스트로 확인.
2. **`AnalysisDetailModal` 본문 상세의 높이·대상**(`:58–59,80–82`): 새 몸체에서 `.marketMap`을 본문 대상으로 유지하되 높이 계산의 `.mapWorkspaceHeader`/`TopQuery` 의존을 `--app-header-height`와 새 조회 줄로 바꿔야 한다. 이중 차감 금지. 25상세 같은 전수 검사는 없지만 3 × 2자료 × 2표시 방식 검사가 방어선.
3. **`marketMap` 크기 계산과 `labelScale`**: 중앙 폭 변화(접기 4상태)에서 `ResizeObserver`(`:49`)가 구 라벨 배율을 다시 계산하는지, 카메라가 초기화되지 않는지.
4. **조회 바 폭(2-3)**: 동이 보일 때 807px 초과 예상. 한 줄 기준을 완화하지 않으므로 유형을 접는 대안이 필요할 수 있다.
5. **어두운 패널 CSS**: `.mapWorkspace .marketDetails{color:#c6d7e8}`·`market-explorer.css` 일부는 어두운 배경을 가정한다. 흰 패널로 옮기면 대비가 무너지므로 새 패널은 지역 패널의 흰 배경 규칙으로 통일하고 옛 규칙은 제거한다.
6. **의미 보존:** 후보 값은 현재 자료·분기·업종·세부 기준으로 다시 계산되어야 한다(`candidateComparison`의 규칙 유지). 상권 코드 연결/형상 동일성 한계 문구(출처·집계 기준)는 해석·출처 구역에서 잃지 않는다.
7. **미확인(이번 읽기 전용 조사의 한계):** `market-explorer.css`·`market-query.css`·`market-unified-query.css` 규칙 전체와 `market-detail-modal.css`를 줄 단위로 읽지 않았다. 상권 지도 인쇄 동작, 구 하나 선택 상태에서의 상권 지도 읽힘, 상권 유동인구(22분기) 추이 축 잘림은 실측하지 않았다.

### 9-3. 감독자께 확인받을 점(권고 포함)

| # | 질문 | 권고 |
|---|---|---|
| 1 | 지도에서 상권을 고를 때 오른쪽 패널이 자동으로 열리는 동작을 **제거**하고, 접힌 상태에서는 "보조정보" 버튼의 점 표시로 알리는 것에 동의하는가(떠 있는 창 모드만 앞으로 가져오기 유지) | **제거**. 접기는 사용자가 하는 상태(3단계 결정 4와 같은 원칙) |
| 2 | 상권 상세 이름을 `선택 상권 분기별 추이` · `두 분기 비교` · `후보 상권 비교`로 통일(후보 개수는 오른쪽 패널에 표시)하는가 | **통일** |
| 3 | I06: 버튼 이름을 `업종·세부 구성`으로 하고 현재 값 요약·배지를 붙이는 안(업종을 한 줄 바에 직접 두지 않음)에 동의하는가 | **동의**. 폭 예산상 업종 직접 노출은 어렵다 |
| 4 | 조회 바가 동 선택 상태에서 한 줄에 안 들어가면 **상권 유형도 `QueryMore`로 접는** 대안을 허용하는가(필터 교집합·ID는 불변, 배지·요약 표시) | **허용**(실측 후 필요할 때만). 기준 완화(2줄 허용)는 하지 않음 |
| 5 | 상권의 오른쪽 접기 상태(`rightOpen`)는 지역과 **별도**로 두고, 고급 비율(`ratioShare`)은 앱 전역 하나를 공유해도 되는가 | 접기 상태 **별도**, 비율은 **공유**(둘 다 같은 사용자 선호 취지) |
| 6 | 오른쪽을 접으면 지도 안에 후보 수·해제·열기를 다시 보이는 규칙을 상권에도 적용(상권에는 지금 지도 안 후보 막대가 없음)하는가 | **적용**. 접은 상태에서도 후보 경로 필요 |
| 7 | `MapWorkspace`를 삭제하고 고급 창 배치는 `DockableRanking`의 창 설정으로 옮기는 안에 동의하는가 | **동의**. 상권만 쓰는 약 130줄과 죽은 조회 패널을 정리 |
| 8 | 4단계를 지하철 병합 **후**에 시작하는가 | **그렇다.** `WorkspaceNav groups` 계약 재사용과 `AnalysisDetailModal` 충돌 회피 |
| 9 | 전년 같은 분기 대비를 오른쪽 패널에 직접 표시할지(현재는 직전 분기 대비만, 전년동기는 두 분기 비교 화면에서 선택) | **이번에는 추가하지 않음.** 표시는 있는 그대로 두고 라벨만 구별 테스트(데이터 계산 불변) |

W40 DONE
