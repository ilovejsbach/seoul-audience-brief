# 창4 인수인계

## 맡았던 작업과 상태

- **w3 완료:** 미커밋 문서·증거를 분류하고 커밋 검토 단위를 제안했다. 실제 정리·커밋은 하지 않았다. 산출물: `docs/workers-2026-11-17/w3/REPORT.md`, 같은 폴더 `inventory.json`과 미리보기 이미지.
- **w7 완료:** `scripts/prepare-paired-design.py`의 개인 절대경로 쓰기를 제거하고 임시 폴더에서 생성 결과가 기존과 같은지 확인했다. 검사 날짜만 바뀐 JSON은 채택 보류를 권고했으며 직접 되돌리지 않았다. 산출물: `docs/workers-2026-11-17/w7-cleanup/REPORT.md`.
- **w8 중단·정리 완료:** 사용자 지시로 모바일 작업을 멈췄다. 제품 소스를 고치지 않아 되돌릴 기존 파일은 없었고, 직접 만든 검사 파일·캡처와 서버를 정리했다. 산출물: `docs/workers-2026-11-17/w8-mobile-fix/REPORT.md`. 모바일 작업을 임의로 재개하지 말 것.
- **w12 완료, 검수 한계 있음:** 생활인구 최신 제공분을 추가했고 생활이동은 공식 최신일을 유지했다. 당시 PC 전체 검사는 대비/균등 크기 항목에서 실패했으며 전체 통과로 보고하지 않았다. 산출물: `docs/workers-2026-11-17/w12-population-mobility-refresh/REPORT.md`와 같은 폴더 원문·재현·실행 증거. 반영 범위와 당시 수치는 이 보고서를 따른다.
- **w15 완료:** 대비 검사의 장식 제외·판정 불가·실제 미달을 분리했다. 당시 PC16 통과, 낮은 대비를 일부러 넣은 대조 실험은 실패하는 것을 확인하고 CSS를 복원했다. 산출물: `docs/workers-2026-11-17/w15-contrast-assert-fix/REPORT.md`, 같은 폴더 `e2e/`, `control/`. 현재 버전의 재검증 결과는 아니다.
- **w18 조사 완료:** Pages 용량·성장·로딩·캐시·공개 범위와 대안을 조사했다. 제품 변경·배포는 하지 않았다. 산출물: `docs/workers-2026-11-18/w18-pages-deploy-limits/REPORT.md`, `storage-audit.json`, `network-measurements.json`, `growth-scenarios.json`, `compression-probe.json` 등.
- **w22 계획 완료·구현 미착수:** 확정 w20 배치를 실제 서비스로 옮길 계획을 썼고 독립 Codex 검토의 보완을 반영했다. 산출물: `docs/layout-migration-plan.md`, `docs/workers-2026-11-18/w22-layout-migration-plan/REPORT.md`, `source-mapping-notes.md`, `independent-plan-review.md`, `document-checks.json`.

## 미완료·보류와 다음 단계

- 새 작업자는 `NEXT-SESSION.md`부터 읽고 현재 사용자 지시·요구서·개발 규칙을 확인한다. 이 인계는 구현 착수 명령이 아니다. 다음 배정이 오면 해당 범위만 수행한다.
- w22의 다음 구현 순서는 결정 기록 → 현행 문서 동기화·표시 설정 I01 선수리 → 셸/히어로·상권 모드 상속 I04 해결 → 왼쪽 → 오른쪽 → 상권 → 마감이다. 선로딩 중단은 별도 변경으로 분리했다. 자세한 변경 파일·검증·되돌리기는 `docs/layout-migration-plan.md`에 있다.
- 사용자 결정이 남은 세부 정책은 시연 전환 때 왼쪽을 매번 접을지, 수동 선택을 유지할지와 기존 고급 비율/도킹의 장기 유지 여부다. 계획은 첫 시연 기본 접힘 이후 수동 선택 유지, 고급 기능 보존을 권고한다. 확정 w20 배치를 다시 승인받을 필요는 없다.
- w18의 압축·분할·요청 시점 개선·Actions 전환은 제안만 했다. 데이터 형식/호스팅을 레이아웃 작업과 동시에 바꾸지 말 것.

## 미확인과 알려진 위험

- w22는 문서·소스 검토만 했다. 새 셸의 실제 지도/그래프, 의미 대조, 인쇄, 전체화면, 공개 사이트는 미검사다. 양쪽 패널을 열면 지도831px라는 기준은 `docs/workers-2026-11-18/w20-layout-mockup/REPORT.md`의 목업 근거이며 실제 가독성 합격이 아니다.
- 지역 상세25개와 상권 상세3개는 별도다. 기존 PC16에는 행정동 매출이 빠져 있고 상권에 지역 모드를 요구한다. 새 PC18 및 별도 모드 비상속 검사가 필요하다. 개수·ID·테스트 줄 근거는 `docs/layout-migration-plan.md`의 기능 목록/테스트 이식 절에 있다.
- `.app`의 지역 모드 클래스, `MapWorkspace`의 클래스 관찰, `FloatingQueryLayer`의 스타일 복제를 함께 분리해야 한다. 모드 버튼만 숨겨서는 상권 상속이 해결되지 않는다. 포털 호스트 이동·같은 상세 children 유지·중복 폭 차감도 주요 위험이다.
- 모바일은 사용자 중단 상태이며 지도 높이가 사라지는 원인이 남아 있다. 당시 상단/조회/제목이 공간을 차지한 근거는 `docs/workers-2026-11-17/w8-mobile-fix/REPORT.md`에 있다.
- w18의 공개 측정은 당시 기존 dist를 대상으로 했다. 현재 소스 전체의 배포 검증이 아니다. 원격 gh-pages 이력 크기, 재방문304/실제 월 전송량/최대 메모리, 자료별 현재 이용 조건 전수는 미확인이다. 성장·압축 수치는 추정/실험이며 적용 결과가 아니다(`docs/workers-2026-11-18/w18-pages-deploy-limits/REPORT.md`).

## 커밋되지 않은 파일

- 인계 작성 직전 `git status --short --untracked-files=all`로 읽기 확인했다. 당시 HEAD는 `41b6e68`(`Add layout migration plan for the confirmed w20 structure`)이며 `docs/layout-migration-plan.md`는 dirty 목록에 없다. 이 창은 커밋하지 않았다.
- w22 미추적: `docs/workers-2026-11-18/w22-layout-migration-plan/document-checks.json`.
- w18 미추적: `docs/workers-2026-11-18/w18-pages-deploy-limits/` 안의 `completion-check.json`, `storage-audit.json`/`.py`, `network-measurements.json`, `official-limits.json`, `public-scope-audit.json`, `measure-loading.mjs`, `loading-summary.json`, `loading.log`, `local-loading.json`, `public-loading.json`, `growth-scenarios.json`/`.py`/`.log`, `compression-probe.json`/`.py`/`.log` 및 `local-*.png`, `public-*.png` 캡처가 남아 있다.
- w3 미추적: `docs/workers-2026-11-17/w3/inventory.json`과 `contact-expansion-ia.jpg`, `contact-market-continuity.jpg`, `contact-paired-design.jpg`, `contact-responsive-type.jpg`, `contact-workspace-design.jpg`.
- w12 미추적 증거: `docs/workers-2026-11-17/w12-population-mobility-refresh/`의 `pc-e2e/`, 로그·JSON·재현 스크립트·화면 PNG·CSV·`population-REPORT.md` 등이 남아 있다. 대표 경로는 `execution-summary.json`, `population-source-manifest.json`, `population-independent-audit.json`, `mobility-offline-audit.json`, `new-date-browser-results.json`이다.
- w15 미추적 증거: `docs/workers-2026-11-17/w15-contrast-assert-fix/`의 `e2e/`, `control/`, 실행/정책 JSON·로그, `readability-before.css`와 복원 확인 diff, `run-control.py`, `verify-policy.mjs` 등이 남아 있다. 개별 전체 경로는 해당 폴더를 지정한 `git status --short --untracked-files=all -- <폴더>`로 확인한다.
- w7/w8 폴더는 당시 dirty 목록에 없다. 다른 작업자의 `docs/workers-2026-11-18/w20-layout-mockup/1365-region-analysis.png` 수정과 다른 작업 폴더의 미추적 증거도 있다. 정리·덮어쓰기·일괄 restore/clean을 하지 말 것. 이 인계 파일도 새 미추적 파일로 남긴다.

## 환경·명령·함정

- 작업 폴더는 `/Users/koscom/workspace2/seoul human`, zsh다. 경로의 공백을 인용하고 캡처 저장 경로에 `%20`이 들어가 별도 폴더가 생기지 않게 확인한다. `src/main.tsx` 등은 한 줄에 코드가 길어 줄 수만으로 작업 규모를 판단하면 안 된다.
- 향후 검사 명령은 `npm run build`, `node --test tests/*.test.mjs`, PC 한정 `npm run test:e2e -- --project=desktop-1365 --project=desktop-1920`. bare `node --test`는 과거 E2E 혼입 위험이 있어 피한다. 실행 증거는 `PLAYWRIGHT_EVIDENCE_DIR`로 새 폴더에 보존하고 기존 서버/증거를 재사용하지 않는다.
- `python3 scripts/validate-data.py`는 stdout JSON을 새 파일에 저장한다. `python3 scripts/validate-market-data.py --output <새경로>`는 출력 경로를 지정한다. 후자를 기본 실행하면 기존 검사 보고서를 덮어쓴다.
- 대비 판정 불가와 장식 제외는 실패/통과와 별도다. 클래스명만으로 일반 글자를 제외하거나 판정 불가를 통과로 바꾸지 않는다. 수직 메뉴에는 기존 가로 탭의 centerY 동일 검사를 그대로 적용하지 않는다. 선택자가 사라져 대상이 없는데 통과하는 검사도 막아야 한다.
- 실제 화면을 브라우저로 확인하는 배정이라면 적용 가능한 `orca-cli` 스킬을 먼저 읽는다. 로컬 preview와 공개 Pages의 gzip 응답 처리가 달랐으므로 둘을 같은 것으로 가정하지 않는다(`docs/workers-2026-11-18/w18-pages-deploy-limits/REPORT.md`의 캐시/gzip 절).
- 사용자에게는 쉬운 한국어로 짧게 설명한다. 원자료 의미·현재 실행·과거 실행·공개 확인을 구분하고, 다른 작업자의 소스/데이터/문서/서버를 건드리지 않는다. 이번 인계에서는 이 파일만 새로 썼고 git 쓰기·배포·외부 요청을 하지 않았다.
