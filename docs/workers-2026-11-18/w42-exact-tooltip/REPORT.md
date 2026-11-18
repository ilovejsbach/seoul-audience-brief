# W42 보고: "정확한 수치" 펼침(▼)을 툴팁으로 바꾸기

작성: 창4 · 2026-11-18 · 작업 트리 `/Users/koscom/workspace2/seoul-human-tooltip`, 브랜치 `exact-tooltip`(시작 main `754e736`), 포트 4196만 사용. 메인 트리·지하철 트리는 수정하지 않았다(읽기와 단위 시험 1파일 읽기 실행만).

## 1. 결론 3줄

1. 지역 정보 팝업과 상권 정보의 **"▼ 정확한 수치/정확한 값" 펼침을 모두 없애고**, 큰 숫자(줄인 표기) 자체가 **정확한 값을 보여 주는 툴팁**이 됐다(기존 `DataMeaning` 툴팁 재사용: 마우스, 키보드 초점, Esc, 화면 안 위치 보정, `aria-describedby`).
2. 줄인 표기가 정확한 값과 같으면(작은 수, 자료 없음) 툴팁을 만들지 않는다. 인쇄에서는 툴팁이 안 나오므로 **정확한 값이 괄호로 함께 인쇄**된다.
3. G 관문 모두 통과(빌드, 단위 79/79, 데이터 검증 6개 통과, PC E2E **80/80**). 단 `validate-data`와 단위 시험에서 **작업 트리 환경 때문에 생긴 실패 2건**이 있었고 원인과 재실행 결과를 8절에 적었다.

## 2. 바꾼 곳 전수 목록 (이 브랜치)

### 2-1. 새 부품
| 파일 | 내용 |
|---|---|
| `src/ExactValue.tsx` (새) | 줄인 숫자 + 툴팁. 줄인 표기와 정확한 값이 같으면 그냥 글자. 접근성 이름 `"{줄인 표기}, 정확한 값 {정확한 값}"`. 인쇄 전용 괄호 `.exactPrint` |
| `src/exact-value.css` (새) | 버튼을 큰 숫자의 글자 크기·굵기·색으로 보이게(점선 밑줄), 인쇄 규칙. 타이포 레이어(`dashboardTypography`) 규칙에 눌리지 않도록 같은 레이어에도 규칙 추가 |
| `src/DataMeaning.tsx` | 선택 속성 `buttonClass`/`anchorClass`만 추가(기존 동작 불변) |

### 2-2. "펼침(details)"을 없앤 곳
| 위치 | 전 | 후 |
|---|---|---|
| `Navigation.tsx` 지역 정보 팝업 | `<strong title>`+`<details.popupExact>정확한 수치` | `<ExactValue>` |
| `MarketExplorer.tsx` 상권 정보(선택 상권 값) | `<details.marketExact>정확한 값 보기`(값 + 직전 분기 대비 정확값) | 값은 `<ExactValue>`, 직전 분기 대비도 `<ExactValue prefix="+">`(정확값이 툴팁에 있음) |
| `MarketExplorer.tsx` 후보 상권 카드 | `<details.marketExact>정확한 값` | `<ExactValue>` |
| `ScenarioWorkbench.tsx` 현재 값·저장 비교안 표 | `<details.scenarioExact>정확한 값` ×2 | `<ExactValue>` ×2 |
| CSS | `.popupExact`, `.marketExact`, `.scenarioExact` 규칙 | 삭제 |

### 2-3. 브라우저 기본 `title`만 쓰던 큰 숫자(키보드·화면 읽기에서 못 보던 것)도 같은 툴팁으로
`TimeComparison.tsx`(두 시점 값 3개), `ExtraDashboard.tsx`(핵심 지표 3개), `PopulationPatterns.tsx`(카드 3개), `TrendExplorer.tsx`(선택 시점 값). 값·단위·부호 표시는 그대로다(`+`는 `prefix`로 유지, null은 "자료 없음").

### 2-4. 일부러 바꾸지 않은 곳(브라우저 `title` 유지)
순위 행의 값(`ExtraDashboard` 1곳, 버튼 안 값 `MarketExplorer` 순위), 표 칸(`ExtraDashboard`), 지도 호버 말풍선(`MapCanvas`, `MarketExplorer`), 후보 칩(`MapCandidateTray`), 그래프 설명 줄(`TrendExplorer` `chartFacts`). 이유: 한 화면에 수십 개가 반복돼 Tab 정지점이 폭증하거나, 버튼 안에 버튼을 넣을 수 없거나, 이미 마우스 호버로 잠깐 뜨는 말풍선이다. 필요하면 후속 작업으로 분리한다(7절 목록 아래 "남은 title-only" 참고).

## 3. 툴팁 동작

- **마우스:** 큰 숫자에 올리면 "정확한 값 / 685,071,154,019 원" 말풍선이 뜬다. 올림이 끝나면 닫힌다.
- **키보드:** 큰 숫자는 버튼이라 Tab으로 초점이 가고, 초점이 오면 같은 말풍선이 뜬다. 초점 윤곽 표시 있음.
- **Esc:** 말풍선만 먼저 닫는다(기존 규칙: 열린 `DataMeaning` 툴팁이 있으면 지역 정보 창의 Esc 처리를 양보). 팝업은 그대로 남는다.
- **화면 밖 보정:** `DataMeaning`의 위치 계산을 그대로 쓴다. E2E가 말풍선이 창 안에 있음을 확인.
- **화면 읽기:** 버튼 이름이 "6,850.71억 원, 정확한 값 685,071,154,019 원"이라 초점만 가도 읽는다. 열리면 `aria-describedby`가 말풍선(`role="tooltip"`)을 가리킨다.
- **줄인 표기 = 정확한 값일 때:** 툴팁도 버튼도 만들지 않고 글자만 보인다(판단 근거와 이유는 `ExactValue.tsx` 맨 위 주석: 두 글자를 만드는 곳이 `display-number` 하나라 비교가 어긋나지 않는다). null은 "자료 없음"으로 같으므로 툴팁이 없고 0으로 바뀌지 않는다.
- **인쇄:** 화면에서는 숨기고 인쇄에서만 `(685,071,154,019 원)`을 값 옆에 보인다(E2E가 `print` 미디어에서 확인, 화면에서는 숨김 확인). 기존 인쇄 규칙은 `details.dataNotes`만 펼치므로 이 값들은 따로 보장해야 했다.
- 글자 크기 종류와 대비: 큰 숫자 버튼은 주변의 글자 크기·굵기·색을 그대로 물려받는다. 기존 R05–R07 검사(글자 종류 분석 6/시연 4, 대비 4.5:1)가 모두 통과했다.

## 4. G 관문 (증거 `gate/`)

| 명령 | 결과 |
|---|---|
| `npm run build` | 종료 코드 0 |
| `node --test tests/*.test.mjs` | **79/79 통과**(재실행 기준, `gate/unit-tests-rerun.log`). 첫 실행에서 `population-daily-history` 1개가 `Z_DATA_ERROR`로 실패했으나 같은 파일 단독 실행과 전체 재실행은 모두 통과(일시적 실패로 판단, 8절) |
| `python3 scripts/validate-data.py` | 이 작업 트리에는 gitignore된 원본 `data/raw`가 없어 "commerce equality" 1개가 파일 없음으로 실패(`data-validation.json`). 메인 트리의 `data/raw`를 **읽기 전용 심볼릭 링크**로 잠시 연결해 재실행하면 **6개 모두 passed**(`data-validation-with-raw.json`). 링크는 삭제했고 데이터는 수정하지 않았다 |
| `E2E_PORT=4196 PLAYWRIGHT_EVIDENCE_DIR=<결과>/e2e npm run test:e2e -- --project=desktop-1365 --project=desktop-1920` | 종료 코드 0, **80 통과 / 0 실패 / 0 건너뜀**(크기당 40개 = 기존 37 + 새 3) |

새 E2E 3개(`tests/e2e/screen-rules.spec.mjs` 끝): ① 지역 팝업 ② 상권 정보(선택 값·직전 분기 대비·후보 카드, 값을 `market-sales.json`에서 독립 계산해 비교) ③ 지표·두 분기 비교·작은 값(툴팁 없음)·인쇄. 각 검사는 마우스·키보드·툴팁 문구(원본 `exactNumber`와 같은 자릿수 문자열)·`aria-describedby`·창 안 위치·Esc를 확인하고, `details.popupExact/marketExact/scenarioExact`가 0개임을 단언한다. 대상이 없으면(`toHaveCount(1)`) 실패한다. `playwright.config.mjs`는 지하철 커밋 `04cbac1`과 같은 `E2E_PORT` 방식으로 바꿨다.

## 5. 스크린샷 (`screens/`)
- 전: `1365-region-popup-before.png`, `1920-region-popup-before.png`, `1365-market-info-before.png`, `1920-market-info-before.png`(▼ 펼친 상태, 사용자 첨부와 같은 모습).
- 후(툴팁이 열린 상태): `…-after.png` 4장.
- 재현 스크립트: `capture.mjs`.

## 6. 다른 트리에 남은 같은 패턴
- **지하철 트리**(`/Users/koscom/workspace2/seoul-human-subway`, 고치지 않음): 지하철 전용 화면(`src/topics/transit`)에는 정확한 값 펼침이 없다. 다만 이 브랜치가 바꾼 **공용 파일에 같은 패턴이 그대로** 있다: `Navigation.tsx`(popupExact), `MarketExplorer.tsx`(marketExact ×2), `ScenarioWorkbench.tsx`(scenarioExact ×2), `TimeComparison.tsx`·`ExtraDashboard.tsx`·`PopulationPatterns.tsx`·`TrendExplorer.tsx`(title만), CSS 3곳. 이 브랜치를 병합하면 해결된다.
- **메인 트리**: 같은 파일들에 같은 패턴(수정하지 않음).

## 7. 커밋
`exact-tooltip` 브랜치에 로컬 커밋 1개(아래 `git log`). push·main 조작·배포는 하지 않았다.

## 8. 미확인
- 남은 `title`만 쓰는 값(2-4절)은 키보드에서 정확값을 못 본다. 필요하면 별도 작업.
- 말풍선이 값 아래의 버튼(예: "선택 상권에 맞춤")을 잠시 가린다(마우스를 치우면 닫힘). 위치는 `DataMeaning` 기본 규칙을 따른다.
- 인쇄는 `print` 미디어 에뮬레이션으로만 확인했고 실제 인쇄 미리보기는 하지 않았다.
- 이 브랜치는 3단계(오른쪽 패널 이동) 이전 상태라, 3단계 이후 화면의 지표 구역(`SupportSections` 등)에는 아직 적용되지 않았다. 병합 후 `ExactValue`를 쓰는 새 위치가 생기면 같은 부품을 쓰면 된다.
- 첫 단위 시험 실패(`Z_DATA_ERROR`)의 정확한 원인은 확인하지 못했다(재실행 통과, 단독 실행 통과, 모든 gzip 파일 디코드 확인).

W42 DONE
