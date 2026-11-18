# 창3 인수인계

## 1. 맡았던 작업과 상태

- **w5 Playwright 검수 — 완료.** `docs/workers-2026-11-17/w5-playwright/REPORT.md`와 실행 결과 파일이 있습니다.
- **w9 공개 화면 검증 — 완료.** `docs/workers-2026-11-17/w9-verify/REPORT.md`, `PUBLIC-REPORT.md` 및 브라우저 검수 근거가 있습니다.
- **w10 대비·균등 검사 — 완료.** `docs/workers-2026-11-17/w10-contrast-uniform/REPORT.md`에 판정 오류, 판정 불가, PC 두 크기 실행 내용을 기록했습니다.
- **w14 비활성 요소 대비 수정 — 완료.** `docs/workers-2026-11-17/w14-disabled-contrast-fix/REPORT.md`와 전후 화면·측정 자료가 있습니다. 현재 `src/readability.css`는 git status에서 변경 표시가 없습니다.
- **w17 구조 검토 — 완료.** `docs/workers-2026-11-18/w17-architecture-review/REPORT.md`가 있습니다.
- **w21 책 디자인 원칙 — 미완료/산출물 확인 안 됨.** 요청은 있었지만 현재 `docs/workers-2026-11-18/`에 w21 폴더나 보고서가 없습니다. 다음 작업자는 brief 경로와 존재 여부부터 확인해야 합니다.
- **w23 지하철 자료 가능성 조사 — 완료.** `docs/workers-2026-11-18/w23-subway-data-feasibility/REPORT.md`와 표본 매니페스트가 있습니다. 표본 원본은 `data/raw/transit/subway/`에 있습니다.

## 2. 미완료·보류 및 다음 단계

- ~~w21은 완료로 간주하지 말고 brief를 다시 확인해 필요하면 이어서 작성하세요.~~
  - **감독자 정정(2026-11-18):** w21은 사용자 지시로 **취소**됐고 폴더도 삭제됐다. 이어서 하지 않는다. 책 온톨로지는 사용자가 따로 만들며, 완성되면 감독자가 참조 작업을 배정한다.
- 모바일 작업은 사용자 지시로 보류 상태입니다. PC 검수에 모바일 통과를 덧붙이지 마세요.
- w23 후속 구현·수집은 요청되지 않았습니다. 화면·원자료 적용 전에 OD 범위/이용 조건, 성별 자료, 좌표·역 코드 연결을 추가 확인해야 합니다. 세부 항목은 w23 `REPORT.md` 7절에 있습니다.

## 3. 미확인과 알려진 위험

- w23에서 월별 승하차 원본은 역명이 노선마다 반복되고 행 자체에는 역 코드가 없습니다. 역명만으로 병합하지 말고 노선·역 코드 대응을 확인하세요.
- w23 혼잡도는 30분 정원 대비 비율이며 승하차 수와 다른 값입니다. 승하차 건수를 혼잡도나 고유 방문자로 해석하지 마세요.
- w23의 연령 성격 자료는 권종/승객유형 범주이며 실제 나이·성별 정보가 아닙니다. 서울 전체 OD 시간·운영기관 범위도 미확인입니다.
- w10의 과거 검사 결과는 그 실행 버전의 결과입니다. 새 변경이나 현재 공개 상태를 보증하지 않습니다. 해당 보고서에서 현재 검사 범위를 확인하세요.

## 4. git status에서 본 미커밋 상태

- w5, w9, w10, w14, w17, w23의 대표 보고서 경로와 `src/readability.css`는 확인 당시 `git status` 변경 표시가 없었습니다.
- 저장소 전체에는 다른 작업의 미추적 증거 파일이 다수 있고 `docs/workers-2026-11-18/w20-layout-mockup/1365-region-analysis.png` 변경 표시도 있었습니다. 일괄 추가·삭제·복원하지 말고 소유 작업을 확인하세요.
- `data/raw/`는 gitignore 대상이라 w23 표본 CSV/XLSX는 일반 status 목록에 나오지 않습니다. 파일 해시와 바이트는 `data/raw/transit/subway/MANIFEST.json`에 있습니다.

## 5. 새 작업자가 알아둘 점

- 작업 루트는 `/Users/koscom/workspace2/seoul human`이며 zsh 환경입니다. 다음 세션 지침은 `NEXT-SESSION.md`, 데이터 계약은 `docs/DASHBOARD_DEVELOPMENT_RULES.md`를 우선 확인하세요.
- 기능 검증이 필요하면 프로젝트에서 안내하는 `npm run build`, `node --test tests/*.test.mjs`, `python3 scripts/validate-data.py`, `python3 scripts/validate-market-data.py`를 변경 영향에 맞춰 사용합니다. 과거 로그를 새 실행 결과처럼 쓰지 마세요.
- w23 표본은 `OA-12914` CSV(UTF-8 BOM, 이름 있는 6개 열 뒤 빈 미명명 열)와 `OA-12928` XLSX(평일·토요일·일요일 3시트)입니다. 원본 파일은 수정하지 마세요.
- 이 handoff 작업에서는 `pane3.md`만 새로 만들며, 다른 파일을 고치거나 커밋·배포·외부 요청을 하지 않습니다.
