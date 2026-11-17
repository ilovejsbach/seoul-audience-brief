# 생활인구·생활이동 최신 날짜 확인 및 반영

2026-11-17 · W12 · 시작/최종 확인 HEAD `556592942e2b8e1e78001d9150691b4da25bd41f` / main. 커밋·푸시·배포 없음. 모바일은 사용자 지시에 따라 미실행.

## 결과

1. **생활인구는 공식 최신 관측일 2026-11-12까지 반영했다.** 11/01–12의122,976행을 추가해 일별316일·요약11개월이다. 기존304일 파일과120개 요약은 모두 바이트 불변이다.
2. **생활이동은 공식 최신 파일인2026-10-31을 유지했다.** 공식 F 목록1400개에서11월 파일은 없고 S 주소도 같은 F로 전환된다. 최신 원본을 새 파일로 다시 받아 기존 원본과 SHA256 일치 및 출발/도착 전 레코드 일치를 확인했다.
3. **자료 검사·단위검사71개·빌드와 새 날짜 대표 화면은 통과했다.** 요청한 PC 전체 E2E는16여정을 모두 실행했으나 추가된 대비(g)/동위크기(h) 검사에서20판정이 실패해 종료코드1이다. 기존 a–f 항목1088판정은 모두 통과했다. 전체 E2E 통과·R20 전체 승인·공개 배포 완료로 보고하지 않는다.

## 방법과 공식 최신일 판단

- 지정 brief.txt, AGENTS.md, NEXT-SESSION.md, 개발 규칙 R13/R18/R19/R20, 요구 정본, README의 데이터/기간 절, 수집/준비/픽스처 검사 스크립트, 기간·기본값·캐시 소비 src를 읽었다. 생활인구 확보·재생성은 Codex 하위 작업자가 담당했고 부모가 별도로 신규 수치 전체와 패턴 표본·UI를 대조했다.
- 허용 외부 요청은 `data.seoul.go.kr`, `datafile.seoul.go.kr`의 OA-23016/OA-22300에만 수행했다. 별도 API키·로그인·다른 외부 도메인을 사용하지 않았다. 샌드박스 DNS/Chromium 권한 실패는 승인 재실행으로 처리했고 제품 검사 실패와 구분했다.
- [OA-23016 파일 목록](https://data.seoul.go.kr/dataList/OA-23016/F/1/datasetView.do)의 최신 월 ZIP은202610이다. 그러나 [같은 자료의 공식 Sheet](https://data.seoul.go.kr/dataList/OA-23016/S/1/datasetView.do)의 최신순 미리보기는20261112이며, 화면의 CSV 내려받기로11월 전체 제공분을 확보했다. 페이지 갱신일11/16·월 ZIP10월·실제 Sheet 관측일11/12를 구분했다.
- [OA-22300 파일 목록](https://data.seoul.go.kr/dataList/OA-22300/F/1/datasetView.do)의 최대 통계일은20261031, 해당 파일 수정일은2026-11-05다. S/1 주소는 HTTP302로 같은 OA-22300 F/1에 돌아온다. 목록에 없는11월 날짜를 임의로 요청하거나 제공 완료로 만들지 않았다.
- 요청 URL·방법·매개변수·시각·바이트·SHA256은 [생활인구 manifest](population-source-manifest.json), [생활이동 획득 기록](mobility-acquisition.json)에 있다. 새 원문은 `data/raw/`의 새 경로에만 저장했다. 기존 raw는 덮어쓰지 않았다.

| 자료 | 신규 보존 원문 | 크기(B) | SHA256 |
|---|---|---:|---|
| 생활인구 공식 Sheet CSV | `data/raw/population-refresh-20261117/OA-23016-202611-sheet.csv` | 37,200,665 | `c800f73164cb817371046d6a579350e6f9e661f6146118025ab0a60e3f3ac942` |
| 생활이동 최신 ZIP 재확인 | `data/raw/living-mobility/OA-22300-20261031-refresh-20261117.zip` | 75,117,693 | `899ec22fd22746ec5f26d406ea0de46c271fa8d2aba20b93e03a8f22905ed4aa` |

생활인구 raw 폴더에는 공식 페이지·Sheet 설명·미리보기·다운로드 응답 헤더·manifest도 신규 보존했다. 생활이동 공식 페이지도 신규 raw 이름으로 보존했다. raw는 공개 배포용이 아니다.

## 생활인구 변경과 기존 자료 보존

- 원문12일은 매일427동×24시간=10,248행이다. 중복0·결측기호2257칸을 확인하고 결측은null로 유지했다. 11/13 이후는 만들지 않았다.
- `public/data/population/`에 일별gzip12개(11,747,456B)와 인덱스12항목을 추가했다. 전체316일·3,238,368행·gzip285개이며10/31→11/01 날짜 공백이 없다.
- `public/data/population-patterns/`에202611의12코호트(10,736,431B)와 인덱스 항목을 추가했다. 지역453개(427동+25구+서울)를 유지했다.
- 11월의 실제 제공 요일 수는 월–일 순서2/2/2/2/1/1/2다. 월초10일·월중2일·월말0일을 사용한다. `partialMonth=true`, `availableThrough=20261112`, `calendarDays=30`을 기록하고 아직 미제공인 날을 분모·평균에 넣지 않았다. 빈 월말은 평균null·유효일수0이다.
- 기존424파일(일별304+요약120)의 SHA256은 모두 불변이다. 신규26파일(12일별+12요약+인덱스2)을 임시 폴더에서 재생성해 전부 바이트 동일함을 확인했다. 기존10월 ZIP을 수정된 요약 준비기에 넣은12개 결과도 기존 파일과 바이트 동일했다. [재현 결과](population-reproduction.json) · [기존 해시](population-before-hashes.json).
- 부모의 독립 대조는 신규 CSV122,976행의29개 수치열 **3,566,304칸 전수**다. JSON 키 누락/추가0·수치 차이0·결측2257칸null 일치. 준비기 코드는 가져다 쓰지 않았다. [전수 대조](population-independent-audit.json).
- 별도 Decimal 평균 표본4건도 통과했다. 서울 월초12시11,587,662.52명(10/10일), 강남 월중18시1,049,759.55명(2/2일), 종로 여성 월초0시90,479.58명(결측9일 제외한1/10일), 미제공 월말null(0/0일). [평균·유효일수 독립 대조](november-pattern-independent.json).

## 생활이동 유지 판단과 회귀

- 앱은 `Dataset.periods`를 날짜 선택기에 나열하고 선택 날짜로 records를 거른다. 따라서 여러 날짜를 지원하는 구조다. 요구 정본의 같은 조건 비교·현재 조건 보존 원칙에 따라 새 날짜가 제공되면 **기존 날짜를 보존하고 선택지로 추가**하는 것이 맞다. 이번에는 공식 최신이 이미 보유한10/31이므로 교체·추가하지 않았다. 화면 재설계도 하지 않았다.
- 새로 받은 공식 ZIP은 기존 ZIP과 바이트/해시가 같다. CSV6,317,901행을 전부 다시 읽어 출발 `st_time_cd`와 도착 `fns_time_cd` 각각을 Decimal로 독립 재집계했다. 양쪽 모두 원본포함 합26,402,774.57건이며 출발15,837/도착15,846개 키·값·지역명이 현재 공개 JSON과 전부 일치했다. [독립 재집계](mobility-offline-audit.json).
- 서울 밖→서울 밖1,501,689행은 기존대로 제외한다. 구내 이동9,078,852.13건은 원본 OD에는 보존되고 화면의 경계 유입·유출 계산에서는 기존 `originCode===destinationCode` 제외를 유지한다. 원본과 UI 집계의 이 차이를 임의로 바꾸지 않았다.
- 도착일은 계속 원본 `etl_ymd` 기준이고 자정을 넘긴 달력 도착일은 미검증이다. 임의 날짜 보정·고유 방문자 해석을 하지 않았다.
- `living-mobility.json`, `living-mobility-arrival.json`, `collect-living-mobility.py`, `ExtraDashboard.tsx`는 시작 해시와 같다. README/NEXT-SESSION도 그대로다. [실행·보존 기록](execution-summary.json).

## 수정 파일

| 파일·묶음 | 수정 이유 |
|---|---|
| 신규 `scripts/collect-population-refresh.py` | 월 ZIP 이후 공식 Sheet 수집. 명시적 download/오프라인check, 기존 raw 덮어쓰기 거부, 요청·해시·기간·수치 검증 |
| `scripts/prepare-population-history-daily.py` | CSV·제공 종료일·별도 manifest/임시 출력 지원. 기존 날짜가 달라지면 쓰기 거부 |
| `scripts/prepare-population-patterns.py` | CSV·부분월 실제 제공일·메타 지원. 기존 Decimal 평균/결측 전파 유지 |
| `scripts/validate-data.py` | 고정304일 기대 범위를 이번 공식 제공316일로 갱신. 전일자·행수·중복·값·코드 검사 유지 |
| 일별gzip12개+인덱스,11월요약12개+인덱스 | 공식 제공12일과 그 유효일 요약 추가 |
| `src/main.tsx` | 일별 인덱스 캐시 키를 `daily-20260101-20261112`로 갱신. 기본일은 기존처럼 인덱스 마지막 날짜 |
| `src/Hero.tsx` | 생활인구 기간1/01–11/12·316일 표시만 변경 |
| `src/PopulationPatterns.tsx` | 인덱스 캐시 키와 부분월의 ‘12일까지12일 관측’ 기간 안내만 추가 |
| `tests/population-daily-history.test.mjs` | 실제 새 제공 범위316일/11개월/285gzip/3,238,368행 기대값 갱신 |
| `tests/population-pattern-model.test.mjs` | 11개월/132요약 기대값과 빈 월말 전지역24시간null·분모0 검사 추가 |
| W12 산출물 | 원문 요청·해시·독립 대조·재현·실행 로그·실화면 캡처·이 보고서 |

상권·행정동 매출 자료, README, NEXT-SESSION, 다른 작업자의 `tests/e2e/`·Playwright 설정·디자인 코드는 수정하지 않았다. 기존 `data/population-history-manifest.json`도 그대로이며 신규 Sheet 재생성에는 별도 source manifest를 명시한다. 동시 작업 흔적은 보존했다.

## 검증 결과

| 실제 실행 | 결과·근거 |
|---|---|
| 공식 raw 오프라인check | 생활인구122,976행·원문4응답 해시 통과 |
| 일별/패턴 오프라인 재생성 | 신규26파일·과거10월요약12파일 바이트 일치 |
| 독립 생활인구/패턴/생활이동 대조 | 전필드 차이0·표본평균4건·양시각 OD 전키 일치 |
| `python3 scripts/validate-data.py` | 종료0·모든 검사 통과. [로그](data-validation.log) |
| `node --test tests/*.test.mjs` | 71/71 통과, 실패/건너뜀0. [로그](unit-tests.log) |
| `npm run build` | 종료0, JS `index-BldHVmeh.js` / CSS `index-7CTjbMjC.css`. 기존500kB 초과 번들 경고는 남음. [로그](build.log) |
| `npm run test:e2e -- --project=desktop-1365 --project=desktop-1920` | 전체16여정 실행·건너뜀0·재시도0·차단0. g/h 실패로16여정 실패·종료1. [원본 결과](pc-e2e/results.json) · [요약](pc-e2e/summary.json) |
| 새 날짜 대표 확인,1365×768 분석/시연 | 양모드 성공: 기본/최대일11/12·12시서울값·CSV강남원값·추이동일·부분월안내·상세복귀·10/31↔11/01·날짜입력1벌. [기록](new-date-browser-results.json) |

PC E2E는 `PLAYWRIGHT_EVIDENCE_DIR`를 W12 경로로 지정하여 다른 작업자의 과거 증거를 덮지 않았다. 해당 시점 검사기에는 다른 작업자가 추가한 g/h가 들어 있다. 기존 a–f와 새 항목의 결과를 분리하면 다음과 같다.

| 규칙 | 통과 | 실패 |
|---|---:|---:|
| a 가로 넘침 | 200 | 0 |
| b 주정보 첫 화면 | 272 | 0 |
| c 상세 콤보·복귀 | 200 | 0 |
| d 조건 유지 | 184 | 0 |
| e 추이 축 | 32 | 0 |
| f 글자 종류 | 200 | 0 |
| g 텍스트 대비 | 0 | 16 |
| h 동위 도구 크기 | 12 | 4 |

남은 g는 지도 SVG 배경을 자동판정 불가로 기록한 항목도 포함한다. 일부 흰 글자 버튼은 자동 기록의 배경이 밝은색으로 잡혀1.09를 보고한다. h4건은 상권 두 모드/두 크기의 ‘market map tools’ 묶음에서 다른 행과 역할의 도구까지 함께 비교한 상태다. 이는 **이번 검사기 보고의 내용**이며, 전부 신규 자료로 생긴 실제 대비 결함이라고 확정하지 않았다. 검사기·제품 CSS를 바꾸거나 기준을 낮추지 않았다. 상세 실패20건·측정·PNG는 요약 defects와 test-results에 있다. 해당 대비/동위 규격의 독립 검토는 감독자가 다른 담당 결과와 함께 판단해야 한다.

대표 화면: [분석 최신 지도](analysis-latest-map.png), [시연 최신 지도](presentation-latest-map.png), [분석11월패턴](analysis-november-patterns.png), [시연11월패턴](presentation-november-patterns.png).11/12 12시서울원값11,887,067.79명은 화면에서11,887,068명으로 표시하고 CSV의 강남구 원값1,156,301.83은 보존됨을 확인했다.

## 재현과 통합 문구 제안

```sh
python3 scripts/collect-population-refresh.py --raw-dir data/raw/population-refresh-20261117 --check
python3 scripts/prepare-population-history-daily.py --source-manifest docs/workers-2026-11-17/w12-population-mobility-refresh/population-source-manifest.json --months 202611
python3 scripts/prepare-population-patterns.py --source-manifest docs/workers-2026-11-17/w12-population-mobility-refresh/population-source-manifest.json --months 202611
python3 docs/workers-2026-11-17/w12-population-mobility-refresh/population-independent-audit.py
python3 docs/workers-2026-11-17/w12-population-mobility-refresh/november-pattern-independent.py
python3 docs/workers-2026-11-17/w12-population-mobility-refresh/mobility-offline-audit.py
```

- README 데이터 절 제안: “생활인구 OA-23016은2026-01-01~11-12,316일을 제공합니다.1–10월은 월 ZIP,11/01–12는 같은 자료의 공식 Sheet CSV입니다.11월 요일·월구간 평균은 제공12일의 부분월이며 유효일수를 표시합니다. 생활이동 OA-22300은11/17 공식 확인 기준 최신 파일인2026-10-31을 유지합니다.”
- NEXT-SESSION 제안: “W12에서 생활인구316일·패턴11개월 추가. 빈11월말은null·분모0, 기존424파일 바이트보존. 생활이동은 공식최신10/31 유지 및 원문전수 재집계 일치. 자료검사/71tests/build/새날짜양모드 통과. PC a–f 통과이나 새 g/h 자동판정20건 남아 전체 E2E 종료1. 커밋·공개 배포 미수행, 세부는W12 REPORT 참조.”

## 한계

이번 것은 현재 공유 소스와 로컬 격리 Chromium에서의 실행이다. 사용자 Chrome·공개 사이트·실물기기·모바일·인쇄·모든조회조합·실사용자 가독성·전체 합성색 대비를 통과로 보고하지 않는다. 공식 최신일은11/17 확인 당시의 제공 상태다.11월 전체 자료가 아니며, 후속 월 ZIP이 나왔을 때 Sheet와의 일치 여부는 별도 확인해야 한다. 기존 자료와 새 표본을 억지로 보정하지 않았다. 상권·행정동 매출의 검증을 새로 수행하거나 과거 통과를 이번 변경에 소급하지 않았다.

결론: 생활인구 최신12일 반영과 생활이동 최신일 확인은 완료했다. 자료·재생성·대표 실행은 확인했고, PC 전체 E2E의 g/h20판정은 해결되지 않은 별도 검토 항목으로 남겼다.
