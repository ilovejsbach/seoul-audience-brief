# W26 보고: 레이아웃 이전 1a단계 (문서 동기화 + 표시 설정 잘림 I01 수리)

작성: 창4 · 2026-11-18 · 커밋·배포는 하지 않았다(감독자 몫). 검증은 창3(w27)이 따로 한다.

## 1. 핵심 결론

1. I01은 **재현됐고 고쳤다.** 열린 "색상·표시 설정"이 8가지 조합(1365/1920 × 분석/시연 × 일반/전체화면) 모두에서 폭 2px였고, 수리 후 모두 340px이며 지도 영역 안에 들어온다. CSS 한 줄만 바꿨다.
2. 요구서(REQ-22·23 신설 + 5개 행 개정)와 개발 규칙(R04·R05·R06·R07·R10·R15·R20·기간 부록)을 고쳤고, 충돌하던 옛 설계 문서 7개에 현행 표지를 달았다. 셸·왼쪽·오른쪽은 모두 "목표(1b 이후 구현 예정)"로 표시했다.
3. G 관문 전부 종료 코드 0: 빌드, 단위 71/71, 데이터 검증 2종, PC E2E **48/48**(기존 16 + 새 표시 설정 32). 수리 전 코드로 되돌리면 새 검사 32개가 **32/32 실패**한다.

## 2. 바꾼 파일과 이유

| 파일 | 이유 |
|---|---|
| `src/viewport-workspace.css` (54줄) | I01 수리. 열린 표시 설정 규칙에 `grid-column:1/-1;grid-row:1/-1;` 추가 |
| `tests/e2e/screen-rules.spec.mjs` (+75줄, 끝에 추가) | 표시 설정 검사 신설. 기존 테스트는 건드리지 않음 |
| `docs/DEVELOPMENT_REQUIREMENTS.md` | REQ-22·23 신설, REQ-04·07·08·13·20 개정, 말미에 결정 요약 |
| `docs/DASHBOARD_DEVELOPMENT_RULES.md` | R04·R05·R06·R07·R10·R15·R20 체크리스트·기간 부록 개정, 최신 요구 표에 행 추가 |
| `NEXT-SESSION.md` | 맨 위에 11-18 최신 상태와 W26 링크, 공개 자산이 11-17 기록과 다르다는 주의 |
| `docs/map-workspace-design.md`, `tableau-query-options-plan.md`, `interaction-design.md`, `expansion-ia-audit.md`, `expansion-workspace-design.md`, `tableau-query-acceptance.md`, `free-query-acceptance.md` | I10 정리. 맨 위에 "현행 표지" 인용문 한 단락만 추가(본문·과거 보고서는 그대로) |
| 이 폴더의 `probe-i01.mjs`, `baseline/`, `control/`, `gate/`, `e2e/`, `e2e-dev/`, 검증 JSON | 증거 |

`tableau-query-integration.css`는 고치지 않았다. 그 규칙은 `data-query-layout=focused` 패널용(옛 `MapPanel`)이고 실제 문제 화면은 `unified` 패널이라 해당 없음. 다른 작업자 변경인 `w20-layout-mockup/1365-region-analysis.png`는 손대지 않았다.

## 3. I01 원인과 수정 전후

- **원인:** `viewport-workspace.css:46`이 표시 설정(`.mapDisplaySettings`)에 `grid-column:3; grid-row:3`을 주고, `:54`의 열린 상태 규칙은 `position:absolute; width:min(340px, calc(100% - 16px))`를 쓴다. 절대배치 요소의 퍼센트 폭은 **자기 그리드 칸**(3열, 폭 0px)을 기준으로 계산되어 2px가 됐다(`mapWrap` 열: `1100px 187px 0px`). `interaction-contrast.css:27`의 `grid-column:1/-1`은 더 높은 우선순위인 `:46`에 밀렸다.
- **수정:** `:54` 규칙에 `grid-column:1/-1;grid-row:1/-1;`을 넣어 그리드 전체를 기준으로 삼게 했다. 계산·데이터·입력 ID·수치는 바꾸지 않았다.
- **측정**(`baseline/before/measurements.json` → `baseline/after/measurements.json`, 실제 Enter로 열기):

| 조합 | 수리 전 폭 | 수리 후 폭 | 부모(`mapWrap`) 안에 맞음 |
|---|---|---|---|
| 1365 분석 일반 / 전체화면 | 2 / 2 | 340 / 340 | 예 |
| 1365 시연 일반 / 전체화면 | 2 / 2 | 340 / 340 | 예 |
| 1920 분석 일반 / 전체화면 | 2 / 2 | 340 / 340 | 예 |
| 1920 시연 일반 / 전체화면 | 2 / 2 | 340 / 340 | 예 |

  스크린샷: `baseline/before/*.png`, `baseline/after/*.png`. 수리 후 1365 시연 화면을 눈으로 확인했다. 패널이 열린 동안 위쪽 지도 도구 줄을 일부 덮는 것은 원래 설계("지도 위에 뜬다")이다.

## 4. 문서 개정 요약

- **REQ-22(신설)** 확정 w20 구조·기본 좌200/접힘64, 우300/접힘0, 예정 주제 비활성, 사용자 결정 (a). **REQ-23(신설)** 상권 무모드·비상속·왕복 보존. 둘 다 "목표(1b 이후 구현 예정)". 쓰기 전 `docs` 전체에서 ID 중복 없음을 확인했다.
- **REQ-20** 현재 구현과 개정 목표를 나눠 적음. **REQ-04·13**: 기본 치수와 고급 조절 구별, 결정 (b) 반영, 540px는 안전선일 뿐 읽기 합격 아님. **REQ-07·08**: 왼쪽 상세 메뉴와 콤보 연결, 상세 25+3 ID 불변.
- **R04** 가로/세로 동위 그룹 검사(수직 메뉴에 centerY 금지, 항목 수 먼저 확인), 접힌 64px 접근성. **R05** 75:25·280px는 고급 조절 계약으로 보존, 새 기본·결정 (a)(b)·"복원"과 "초기화" 구별. **R06** 새 역할 배치와 접기≠최소화. **R07** 시연4/분석6 유지, 상권은 분석형 6종. **R10** 양쪽 열림 라벨 가독성은 구현 때 실측. **R15** 왼쪽 메뉴·서비스 왕복 보존.
- **R20 체크리스트** 표시 설정 검사 항목(I01 재발 방지)과 새 행렬(지역 16 + 상권 2 = 18) 항목 추가.
- **기간 부록** "1–10월 304일 고정" → 현재 index 기준. 실제 파일 확인: `public/data/population`에 2026-01-01~11-12 일별 316개.
- I10: 옛 문서 7개에 표지. 과거 실행 보고서는 수정하지 않았다.

## 5. G 관문 결과 (증거: `gate/`)

| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `npm run build` | 0 | 성공(청크 크기 경고만) — `gate/build.log` |
| `node --test tests/*.test.mjs` (12개 파일) | 0 | 71개 중 71 통과, 실패 0, 건너뜀 0 — `gate/unit-tests.log`, 파일별 `gate/unit-tests-per-file.txt` (9·4·2·8·4·4·4·5·2·9·16·4) |
| `python3 scripts/validate-data.py > data-validation.json` | 0 | 6개 검사 모두 passed |
| `python3 scripts/validate-market-data.py --output <이 폴더>/market-data-validation.json` | 0 | 판매 128,053행, 기본 출력 파일은 덮어쓰지 않음 |
| `PLAYWRIGHT_EVIDENCE_DIR=<이 폴더>/e2e npm run test:e2e -- --project=desktop-1365 --project=desktop-1920` | 0 | **48 통과 / 0 실패** (기존 16 + 새 32), 2.8분 — `gate/e2e.log`, `e2e/results.json` |

- **새 검사 32개** = 4자료(생활인구·생활이동·거주지 이동·행정동 추정매출) × 분석/시연 × 일반/전체화면 × 1365/1920. 각각: 표시 설정 1개만 보이는지 개수 확인 → 실제 Enter로 열기 → 폭≥300·부모 안·뷰포트 안 → "최솟값 아래 여유" 150 입력(오류 경고 표시) → 20 입력(경고 사라짐, 20% 반영) → 색상 최솟값=최댓값(오류) → 중간값(적용·`data-color-high` 일치) → 초기화 → Esc로 닫고 초점이 요약으로 복귀 → 포인터 클릭으로 다시 열기·재측정.
- **실행하지 않은 것:** 패드(1024)·모바일(390) 프로젝트(범위 밖), 공개 사이트 화면 확인(변경이 아직 배포 전), 독립 원자료 의미 대조(레이아웃 CSS·문서 변경이라 데이터는 안 바꿈; validator·data 해시만 기록), 상권(`MarketExplorer`) 지도의 표시 설정(해당 컴포넌트에 없음), 인쇄.
- **기준선(G-1):** HEAD `aaaa7fa`. 내가 건드릴 파일의 수정 전 dirty 상태 없음(`baseline/dirty-my-files.txt` 빈 파일). 공개 자산 `assets/index-CobtncSk.js`·`assets/index-C4FDrChi.css`(`baseline/public-assets.txt`) — NEXT-SESSION의 11-17 기록(`index-DtotdIpr.js`)과 다름. `public/data` 464개 파일 해시 `baseline/data-sha256.txt`(수정 안 함).

## 6. 대조 실험

수리 줄만 되돌린 CSS(`control/viewport-workspace.reverted.css`)로 같은 새 검사 32개를 실행했다: **32/32 실패**(`control/control-run.log`). 실패 메시지는 `keyboard Enter` 단계에서 폭 2px와 `host` 폭 922px를 보여 준다. 그 뒤 수리 CSS(`control/viewport-workspace.fixed.css`)를 복원했고 `cmp`로 동일함을 확인했다. 복원 후 E2E 48/48이 위 5절 결과다.

## 7. 미확인과 위험

- 열린 패널이 부모 오른쪽 끝보다 약 21px 안쪽에 놓인다(`right:8px`보다 더 안쪽). 부모 안에는 들어오며 원인은 확인하지 않았다. 외관 문제로 보이면 w27 검증에서 판단해 달라.
- 열린 패널은 지도 위쪽 도구 줄 일부를 가린다(설계 의도). 가림 자체의 사람 가독성 판정은 하지 않았다.
- 새 검사의 전체화면은 Playwright 헤드리스 환경에서 실행됐다. 실제 Chrome 네이티브 전체화면 대 대체(fallback) 방식 중 어느 것이었는지는 구분 기록하지 않았다.
- 글자 크기 집합·대비는 이번 새 검사에서 측정하지 않았다(기존 PC16의 a–h는 통과, 다만 표시 설정을 연 상태는 포함하지 않음).
- 문서의 "목표" 문구는 구현이 진행되면 1b 이후 단계에서 현재 동작 기술로 바꿔야 한다. `Hero.tsx`의 "2026.01–10" 문구는 소스 수정이 범위 밖이라 그대로다(C-후보로 남음).
- 소스 중 의미 대조·공개 화면은 확인하지 않았다. 커밋·배포는 하지 않았다.

W26 DONE
