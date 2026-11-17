# 미커밋 문서·증거 정리 목록

2026-11-17 · 작업자3 · 삭제·이동·스테이징·커밋·푸시·배포·외부 요청 없음

## 핵심 판단

- 대상은 **69파일**이다. 추적 수정5개와 미추적64개이며, 미추적은 증거53개·모형5개·새 문서5개·생성기1개다.
- 과거 운영 검수와 제안 설계, 초기 모형, 새 전후 시안을 나눠 여섯 커밋 검토 단위로 제안한다. 혼합 수정은 문단별로 나눌 수 있다.
- 오래된 설명·개인 경로를 쓰는 생성기·날짜만 바뀐 검사 기록을 별도 표시했다. 이번 결과는 정리 목록이며 파일 정리 실행이나 현재 품질 통과가 아니다.

## 방법·현재 기준

- NEXT-SESSION.md와 지정 brief.txt를 먼저 끝까지 읽고 AGENTS.md를 확인했다. 연결된 피드백·요구·실행 문서의 관련 내용도 참고했다. 시작은 main, HEAD `467a3e2`였다.
- git status/diff와 미추적 개별 경로를 확인하고, 문서·스크립트·HTML·JSON을 읽어 소속 작업과 의존성을 분류했다. JSON15개(증거14+표본자료1)는 파싱했다.
- 이미지36개를 모두 디코딩하고 묶음 미리보기5장으로 before/after와 화면 종류를 육안 분류했다. 작은 미리보기로 대비·글자·잘림을 정밀 검수한 것은 아니다.
- README와 수정/신규 Markdown 총9개에서 로컬 링크 대상 존재를 검사했다. 누락0개다. 링크 내용의 최신성이나 외부 웹 연결 확인을 뜻하지 않는다.
- 생성 스크립트는 실행하지 않았다. 그 치환 절차만 메모리에서 계산했고, 현재 템플릿·자료·before 이미지로 얻는 HTML2종이 저장된 생활인구/상권 HTML과 각각 일치했다.
- 파일별 크기·SHA256·상태는 [inventory.json](inventory.json)에 있다. 동시 작업자 파일은 별도 발견 목록으로만 기록했다. 작성 중 package.json/package-lock.json 변경이 새로 보여 최초 대상69개에는 넣지 않았다. 다른 작업자의 변경을 취소하지 않았다.

## 제안하는 커밋 단위 — 실행하지 않음

| 단위 | 포함 제안·목적 | 경계·주의 |
|---|---|---|
| A 글자 규칙 검수 기록 | responsive-type-review.md + evidence/responsive-type 전부 + design-reference diff + interaction의 색/가독성 문단 + map-workspace 글자 문단 | 7761734/681c7ab 당시 범위. 현재 통과로 소급하지 않음 |
| B 상권 연속 탐색 검수 기록 | market-continuity-review.md + evidence/market-continuity 전부 + interaction/map-workspace의 상권 확대·복귀 수정 | 5c8983e/d84de17/6778355 당시 수정. 실패 before도 함께 보존 |
| C 후순위 IA와 개선 단계 설계 | expansion-ia-audit.md + evidence/expansion-ia + expansion-workspace-design.md + interaction 첫 안내 + README 첫 안내 | 운영 반영이 아닌 제안. 문서 안 현재 상태 설명의 시점 차이를 아래에 명시 |
| D 초기 구조 모형 | prototypes/workspace-design.html + evidence/workspace-design | 초기 설명 모형 별도 보존. 최신 G1 시안이나 운영 구현 아님 |
| E 생활인구·상권 네 조합 시안 | paired-design-review.md + evidence/paired-design 전부 + paired-* 모형4파일 + prepare-paired-design.py + README 둘째 안내 | 템플릿·자료·생성 HTML·before/after·검수 기록을 함께 검토. 생성기의 개인 경로는 후속 정리 대상 |
| F 기존 자료 검사 시각 변경 | tests/e2e-artifacts/market-data-validation.json 단독 보류 검토 | 날짜만 바뀜. 당시 명령·소스·범위와 연결 확인 후 판단. 현재2026 검증으로 취급하지 않음 |

같은 문서의 혼합 수정은 표에 적은 문단별로 나눌 수 있다. 서로 링크하는 C/D는 같은 검토 묶음으로 보거나 D→C→E처럼 대상 파일이 먼저 들어오는 순서를 권한다. 이 문서는 커밋 실행 지시나 승인이 아니다.

## 파일별 목록

경로는 저장소 루트 기준이다. 단위 A–F는 위 제안과 연결된다.

| 상태 | 파일 | 무엇인지·소속 | 단위 | 크기(B) |
|---|---|---|---|---:|
| M | `README.md` | 설계v2·IA 참고안·생활인구/상권 전후 시안으로 가는 링크 두 문단 추가 | C/E | 14,748 |
| M | `docs/design-reference.md` | 연속 픽셀 제안을 기기·역할별 현행 글자 토큰 안내로 교체 | A | 4,989 |
| ?? | `docs/evidence/expansion-ia/current-home.jpg` | 당시 운영 시작 화면의 자료 진입 구조 | C | 86,915 |
| ?? | `docs/evidence/expansion-ia/current-layout-controls.jpg` | 당시 생활인구 지도·조회·배치 조절 | C | 108,252 |
| ?? | `docs/evidence/expansion-ia/kepler-loaded-workspace.jpg` | Kepler 표본을 불러온 지도·레이어 참고 화면 | C | 219,312 |
| ?? | `docs/evidence/expansion-ia/kepler-public-demo.jpg` | Kepler 공개 데모의 표본 선택창 참고 화면 | C | 119,324 |
| ?? | `docs/evidence/expansion-ia/metabase-filter-scope-reference.jpg` | Metabase 필터 범위 설명용 공식 참고 이미지 | C | 73,763 |
| ?? | `docs/evidence/market-continuity/before-blank-trend.jpg` | 수정 전 추이 빈 화면 실패 장면 | B | 70,711 |
| ?? | `docs/evidence/market-continuity/before-overlapping-panels.jpg` | 수정 전 조회·정보창 겹침 실패 장면 | B | 80,920 |
| ?? | `docs/evidence/market-continuity/local-female-trend.jpg` | 로컬 여성 유동 추이·2,678,264명 | B | 118,012 |
| ?? | `docs/evidence/market-continuity/local-height-cases.json` | 로컬1512×724/1920×1080 두 높이의 지도·작업공간 치수 | B | 968 |
| ?? | `docs/evidence/market-continuity/local-hierarchy-roundtrip.json` | 로컬 구→상권→구 왕복 카메라·경계·조건과 복원 bool | B | 7,932 |
| ?? | `docs/evidence/market-continuity/local-selected-market.jpg` | 로컬 종로3가역 선택·정보창 | B | 92,046 |
| ?? | `docs/evidence/market-continuity/public-direct-map-click.json` | 공개 도형 클릭 좌표·경로·코드·표시값 | B | 533 |
| ?? | `docs/evidence/market-continuity/public-district-return.jpg` | 공개 구 복귀 후 목록·선택 유지 | B | 86,338 |
| ?? | `docs/evidence/market-continuity/public-floating-roundtrip.json` | 공개 두 플로팅 창→추이 숨김→재열기→복귀 상태 | B | 2,247 |
| ?? | `docs/evidence/market-continuity/public-full-height.jpg` | 공개 작업공간 하단 높이 장면 | B | 77,013 |
| ?? | `docs/evidence/market-continuity/public-height.json` | 공개1512×771 작업공간 치수·당시 JS 식별 | B | 334 |
| ?? | `docs/evidence/market-continuity/public-market-trend.jpg` | 공개2025Q3 매출 추이·3,156.42억원 | B | 110,380 |
| ?? | `docs/evidence/market-continuity/public-native-after-dataset-detail-menu.txt` | 자료 변경·상세 왕복 뒤 Chrome 전체화면 종료 메뉴 | B | 1,257 |
| ?? | `docs/evidence/market-continuity/public-native-after-query-menu.txt` | 조회 변경 뒤 Chrome 전체화면 종료 메뉴 | B | 1,257 |
| ?? | `docs/evidence/market-continuity/public-native-selected-market.jpg` | 네이티브 Chrome 전체화면 선택·유동5,792,307명 | B | 482,222 |
| ?? | `docs/evidence/market-continuity/public-panel-boundaries.json` | 창 경계 제한·좁은 폭·창 전환 상태 | B | 1,374 |
| ?? | `docs/evidence/market-continuity/public-results.json` | source d84de17, 두 모드 매출/여성 유동4사례 및 자동 도킹 | B | 5,873 |
| ?? | `docs/evidence/market-continuity/public-selected-market.jpg` | 공개 종로3가역 매출 선택·확대·정보창 | B | 103,154 |
| ?? | `docs/evidence/paired-design/after-market-analysis.jpg` | 상권 실무 after 시안 | E | 83,404 |
| ?? | `docs/evidence/paired-design/after-market-consult.jpg` | 상권 현장 협의 after 시안 | E | 77,899 |
| ?? | `docs/evidence/paired-design/after-pop-analysis.jpg` | 생활인구 실무 after 시안 | E | 101,503 |
| ?? | `docs/evidence/paired-design/after-pop-consult.jpg` | 생활인구 협의 after 시안 | E | 99,357 |
| ?? | `docs/evidence/paired-design/before-market-analysis.jpg` | 실제 공통 상권·조회창 열림, 모형에 내장 | E | 102,873 |
| ?? | `docs/evidence/paired-design/before-market-consult.jpg` | 실제 같은 상권·조회창 닫힘, 별도 운영 협의모드 아님 | E | 99,711 |
| ?? | `docs/evidence/paired-design/before-market-trend.jpg` | 실제 상권 유동 추이 before | E | 121,076 |
| ?? | `docs/evidence/paired-design/before-pop-analysis-selected.jpg` | 실제 생활인구 분석·강남 선택, 모형에 내장 | E | 102,505 |
| ?? | `docs/evidence/paired-design/before-pop-analysis.jpg` | 실제 생활인구 분석 기본 지도 | E | 103,268 |
| ?? | `docs/evidence/paired-design/before-pop-consult-selected.jpg` | 실제 생활인구 시연·강남 선택, 모형에 내장 | E | 117,175 |
| ?? | `docs/evidence/paired-design/before-pop-consult.jpg` | 실제 생활인구 시연 기본 지도 | E | 106,856 |
| ?? | `docs/evidence/paired-design/before-pop-trend.jpg` | 실제 강남18시 생활인구 추이 | E | 85,342 |
| ?? | `docs/evidence/paired-design/data-check.json` | 표본 해시·출처7개·기대값17개·결측 집계 교정207칸·한계 | E | 8,508 |
| ?? | `docs/evidence/paired-design/live-checks.json` | 당시 공개 index-BSZ-nqvv.js의 화면·뷰포트·SVG4표본 | E | 3,850 |
| ?? | `docs/evidence/paired-design/prototype-checks.json` | 시안 글자·넘침·상태7표본, 390px 요청은 실제 폭 미적용 | E | 6,692 |
| ?? | `docs/evidence/responsive-type/local-font-results.json` | 로컬 기기/경계 폭 글자·입력·넘침20표본 | A | 19,490 |
| ?? | `docs/evidence/responsive-type/mobile-graph-options.jpg` | 모바일 그래프 옵션·입력 | A | 33,654 |
| ?? | `docs/evidence/responsive-type/mobile-options.jpg` | 모바일 자료·분기 조회 옵션 | A | 34,245 |
| ?? | `docs/evidence/responsive-type/mobile-show-trend-clipped.jpg` | 모바일 끝눈금 잘림 중간 실패 상태 | A | 33,563 |
| ?? | `docs/evidence/responsive-type/mobile-show-trend-final.jpg` | 모바일 추이 수정 뒤 상태 | A | 33,498 |
| ?? | `docs/evidence/responsive-type/public-endpoint-labels.json` | 공개 index-DaxBuOEq.js의 시작/끝눈금·SVG치수 | A | 1,024 |
| ?? | `docs/evidence/responsive-type/public-final-native-menu.txt` | 공개 최종 화면 Chrome 네이티브 메뉴 기록 | A | 110 |
| ?? | `docs/evidence/responsive-type/public-font-results.json` | 공개 index-N_302KBs.js의 입력16px·모바일/PC시연3장면 | A | 3,101 |
| ?? | `docs/evidence/responsive-type/public-mobile-options.jpg` | 공개 모바일 그래프 옵션 | A | 33,654 |
| ?? | `docs/evidence/responsive-type/public-mobile-trend.jpg` | 공개 모바일 매출 추이 | A | 33,662 |
| ?? | `docs/evidence/responsive-type/public-pc-selected.jpg` | 공개 PC 종로3가역2025Q4 매출3,313.2억원 | A | 106,156 |
| ?? | `docs/evidence/workspace-design/analysis-trend.jpg` | 초기 모형 분석 추이·선택 정보 | D | 65,925 |
| ?? | `docs/evidence/workspace-design/briefing.jpg` | 초기 모형 브리핑 추이 | D | 59,835 |
| ?? | `docs/evidence/workspace-design/checks.json` | 초기 모형 글자·넘침4표본, 운영 전체 기능 통과 아님 | D | 678 |
| ?? | `docs/evidence/workspace-design/home.jpg` | 초기 모형 두 목적 선택 시작 화면 | D | 51,778 |
| ?? | `docs/expansion-ia-audit.md` | 메뉴·공간·정보 전개 문제와 외부 제품 참고를 정리한 후순위 IA 제안 | C | 21,945 |
| ?? | `docs/expansion-workspace-design.md` | 공간·가독성·동작 개선 v2 설계, A/B 트랙·G0–G4 단계·상태 계약 | C | 48,893 |
| M | `docs/interaction-design.md` | 첫 안내는 설계v2(C), 상권 확대·상위 복귀는 B, 글자 규칙 링크는 A의 혼합 수정 | A/B/C | 13,255 |
| M | `docs/map-workspace-design.md` | 기기별 글자 규격 링크는 A, 상권 확대·부모 복귀 계약은 B | A/B | 21,876 |
| ?? | `docs/market-continuity-review.md` | 상권 확대·추이·플로팅·부모 복귀·높이 수정의 당시 실행 보고 | B | 5,044 |
| ?? | `docs/paired-design-review.md` | 생활인구/상권 × 실무/협의 네 조합의 before/after 시안 보고 | E | 8,870 |
| ?? | `docs/prototypes/paired-market.html` | 생성된 상권 모형: 종로74상권, before 이미지2개 내장 | E | 652,630 |
| ?? | `docs/prototypes/paired-population.html` | 생성된 생활인구 모형: 구·동 표본, before 이미지2개 내장 | E | 487,980 |
| ?? | `docs/prototypes/paired-review-data.json` | 2일·25구·24시간·6집단, 강남22동, 종로74상권·경계·출처 메타 | E | 468,867 |
| ?? | `docs/prototypes/paired-template.html` | HTML·CSS·조작 코드 공통 원본, 치환 자리표시자5종 | E | 37,014 |
| ?? | `docs/prototypes/workspace-design.html` | 초기 구조 설명 모형:25구·대표3상권, 시작/분석/상세/브리핑 | D | 151,288 |
| ?? | `docs/responsive-type-review.md` | 기기별 글자 토큰·모바일 축 정렬의 당시 실행 보고 | A | 2,956 |
| ?? | `scripts/prepare-paired-design.py` | 템플릿·표본 JSON·before JPEG로 독립 HTML2종 생성. 개인 절대경로에도 기록함 | E | 1,769 |
| M | `tests/e2e-artifacts/market-data-validation.json` | 기존 검사 결과는 그대로, validatedAt만11/14→11/16으로 수정 | F | 4,899 |

## 묶기 전에 주의할 점

1. **설계의 시점 차이:** expansion-workspace-design.md는 상단 통합 조회를 아직 확정/운영 적용 전이라고 설명한다. 현재 요구 정본과 NEXT-SESSION은 단일 상단 실제 입력의 구현·배포를 기록한다. interaction-design.md의 기존 문장에는 상권 매출은2025년이라고 남아 있지만 최신 상권 매출은2026Q2까지다. 옛 설계를 현행 조작 계약으로 연결하면 혼동할 수 있다. 이번에는 수정하지 않았다.
2. **표본 자료는 과거 기준:** paired 자료는 매출2025Q1–Q4·85,732행 기반이다. 자료 자체 해시는 data-check와 일치하고 출처7개 중6개 해시는 현재 파일과 같다. 매출 해시만 다르다. 최신2026 확장 후의 차이와 일관되지만 이번에2025 레코드를 전수 대조한 것은 아니다. 손상이나 현재 전체 데이터 검사 실패로 단정하지 않는다.
3. **초기 모형의 결측 한계:** paired data-check는 초기 모형과 달라진 부분 결측 집계207칸을 기록한다. workspace-design 모형을 최신 엄격 결측 집계의 증거로 쓰지 않는다. data-check의 bool은 당시 기록이며 이번 원자료 전수 재판정이 아니다.
4. **생성기 재현 범위:** prepare-paired-design.py는 `/Users/koscom/.codex/visualizations/2026/11/14/01a1d866-1d2b-7dc0-a58b-a48c384c2b55`에도 쓴다. 개인 경로 존재에 의존하고 지정 산출물 폴더 밖 쓰기이므로 실행하지 않았다. 표본 JSON 자체를 원자료에서 다시 만드는 코드는 이30행 생성기에 없다.
5. **이미지 역할 구분:** before-blank/overlapping/clipped는 실패 장면이다. paired after는 별도 모형이다. 상권 paired before의 analysis/consult는 같은 운영 화면의 조회창 열림/닫힘이다. 폭·배율이 다른 캡처로 면적 증가율을 계산하지 않는다.
6. **옛 실행 버전 보존:** market-data-validation의 변경은 validatedAt 한 줄뿐이다. status passed를 이번 실행 결과로 보고하지 않는다. 공개 증거의 JS 자산명도 현재 NEXT-SESSION의 D7d4XnL-와 다르므로 과거 버전의 기록으로 분류했다.

## 실제 실행·한계

- 수행: Git 상태/diff 조사, 지정 파일 읽기, JSON 파싱, 로컬 링크 존재 검사, 해시 대조, 메모리 HTML 재구성 비교, 기존 이미지 묶음 육안 분류, 이 목록과 파일 명세 작성.
- 미수행: 현재 앱/모형 브라우저 조작, Chrome/E2E, 빌드·단위검사·자료 검사기, 공개 화면·외부 출처 조회, 생성 스크립트 실행, 실사용자 효과 시험. 현재 R20 기능·의미·시각 통과 판정은 하지 않았다.
- 첫 이미지 미리보기 시도는 시스템 python3의 Pillow 부재로 실패했다. 설치/다운로드 없이 기존 로컬 가상환경의 Pillow로 이미지36개를 읽었다.
- 다른 작업자가 동시에 작업 중이므로 workers 폴더의 파일 수는 변할 수 있다. inventory의 workerArtifactsExcludedAtSnapshot은 발견 목록이고 내용 검수·커밋 제안 대상이 아니다. 이번 작업은 지정 w3 폴더에만 썼다.
- 미리보기: contact-expansion-ia.jpg, contact-market-continuity.jpg, contact-paired-design.jpg, contact-responsive-type.jpg, contact-workspace-design.jpg. 원본 분류용이며 신규 운영 검수 증거가 아니다.

결론: 원본을 보존하고69파일의 소속·내용·커밋 단위를 목록으로 정리했다. 삭제·이동·커밋은 수행하지 않았다.
