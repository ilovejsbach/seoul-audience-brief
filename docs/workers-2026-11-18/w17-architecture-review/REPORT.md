# 프로그램 구조 점검 보고서

## 1. 핵심 결론 (세 줄)

- 지금은 정적 웹 원칙을 유지해도 되지만, 공개 자료가 464개·553,123,082바이트(약 527 MiB)이고 앱 시작 코드가 분석 자료들을 미리 함께 요청해 수평 확장 전에 로더와 데이터 계약을 먼저 정리해야 한다.
- 기능은 `main.tsx`와 `ExtraDashboard.tsx`에 로딩·가공·화면 상태가 함께 있고, 상권 분석은 별도 큰 컴포넌트다. 이번 빌드에서 JS 547.06 kB, CSS 359.64 kB로 JS 경고가 다시 났으며 실제 코드 분할은 없다.
- 권고는 공통 계약·자료 등록부·버전 있는 로더를 만들고 주제별 가공/화면으로 나누는 점진 이전이다. 서버는 공개 정적 파일로 더는 감당되지 않는 조회/갱신 요구가 실측될 때 검토한다.

## 2. 현재 구조 지도

```text
공식 API·파일 → scripts/collect-*.py → data/raw (gitignore, 원본 보관)
                                      ↓
                   scripts/prepare-*.py → public/data (JSON/GZip·GeoJSON)
                                      ↓
                scripts/validate-*.py + tests/ → 정적 빌드 → dist → Pages
                                      ↓
        src/main.tsx·MarketExplorer·ExtraDashboard → fetch → 화면 계산·표시
```

### 계층별 책임과 계약

| 계층 | 실제 위치 | 입력 → 출력 | 계약 위치·중복/빈틈 |
|---|---|---|---|
| 수집·원본 | `scripts/collect-*.py` (인구, 생활이동, 주민이동, 상권·경계별 수집기), `data/raw/`, `data/*-manifest.json` | 공식 응답/파일 → 원본 파일, 수집 기록 | 일부 manifest에 출처 URL, 해시, 바이트, 기간이 있지만 공통 형식이 아니다. 수집기는 대상별로 나뉘어 요청·재시도·출처 기록 방식이 반복된다. `data/raw`는 공개 저장소 밖이다. |
| 정제·배포자료 | `scripts/prepare-population.py`, `prepare-population-history-daily.py`, `prepare-population-patterns.py`, `prepare-commerce.py`, `prepare-market-areas.py`, `prepare-market-population.py`, `prepare-paired-design.py` 등 | 원본/매니페스트 → `public/data` JSON·GZip·GeoJSON 및 각 자료의 index | 자료별 코드가 스키마를 암묵적으로 정의한다. 생활인구는 `columns`+배열 `rows`, 나머지는 대체로 `periods`+객체 `records`; 단위·공간 수준·결측 규칙은 각 파일의 `notes`, 속성명, 설명 문자열에 분산. |
| 카탈로그 | `data/catalog-*.json`, `scripts/build-catalog.py`, `data/catalog.json` | 주제별 내부 카탈로그 → 합쳐진 내부 카탈로그 | `build-catalog.py`는 `data/catalog-*.json`만 합친다. 화면 로더가 이 파일을 조회하지 않으며 공개 `public/data`의 선택/버전 목록과 별도다. population과 pattern은 독립 index도 갖는다. 즉 “catalog”와 실행에 쓰는 “index”가 둘 이상이다. |
| 검증 | `scripts/validate-data.py`, `validate-market-data.py`, `validate-population-history.py`, `check-*.py`, `tests/` | 공개 산출물과 일부 원본/독립식 → 검증 결과 | 인구 그리드, 상권 원본 합계 등 강한 대조가 있으나 자료별 검증이 별도 구현이다. null/기간/코드/출처 검사는 각 validator에 반복되며 범용 JSON Schema는 확인되지 않았다. |
| 배포 | `scripts/publish-pages.py`, Vite `dist/` | 빌드 출력 → Pages 브랜치 | 스크립트는 `dist`를 복사해 업로드하며 raw/API 키는 복사하지 않도록 설명한다. 이 점검에서는 publish 스크립트를 실행하지 않았다. |
| 로딩·캐시 | `src/main.tsx:61-62, 86-89`, `src/PopulationPatterns.tsx:19-28`, `src/MarketExplorer.tsx:50` | URL → `fetch`/JSON 파싱 → React state | `main.tsx`의 제네릭 `load`와 pattern/market의 직접 `fetch`가 공존한다. 공통 취소·캐시·오류/응답 버전 검증 레이어가 없다. 인구 날짜는 응답과 날짜를 함께 보관해 낡은 응답 표시를 막지만 일반 자료는 그렇지 않다. |
| 화면·계산 | `src/main.tsx`, `src/ExtraDashboard.tsx`, `src/MarketExplorer.tsx` 및 작은 공유 컴포넌트 | 로드된 원자료 → 필터·집계·지도/표/상세 | 뷰의 선택 상태와 도메인 집계가 같은 컴포넌트에 있다. 재사용 UI는 늘었지만 두 주제의 계산·자료 계약 계층은 분리되지 않았다. |

### 실제 규모와 혼합 지점

- `src`는 TS/TSX/CSS 128개, 4,434줄이다. 모든 텍스트 소스의 파일별 줄 수와 바이트는 [src-inventory.csv](src-inventory.csv)에 기록했다. 핵심 파일: `main.tsx` 186줄(앱 전역 상태, 기본 데이터 요청, 인구 집계, 탭/상세 렌더), `ExtraDashboard.tsx` 159줄(생활이동·주민이동·매출의 조건·집계·표시), `MarketExplorer.tsx` 114줄(상권 요청·분기/업종 집계·지도·상세). 줄 수는 짧아 보여도 한 줄에 JSX와 여러 계산이 압축되어 있어 줄 수만으로 복잡도를 판단하기 어렵다.
- `main.tsx:88-89`는 시작 effect 안에서 기본 경계/지역목록과 생활이동 출발·도착, 거주이동, 매출 파일을 동시에 요청한 다음 선택 날짜 인구를 읽는다. 상권을 열 때 `MarketExplorer.tsx:50`이 상권 매출·유동인구·경계와 자치구 경계를 읽는다. 필요한 화면을 열기 전에 데이터도 내려받는 구조다.
- 변환도 컴포넌트 내부에 있다. `main.tsx:94-105`는 인구 열 인덱스 선택, 구/동 집계, 시간 곡선, 지도 경로를 만든다. `ExtraDashboard.tsx`의 `calculate` 및 `filtered/stats`는 생활이동·주민이동·매출의 집계와 쿼리를 담당한다. `MarketExplorer.tsx:62-67`은 주변분포 선택, 상권코드/기간별 합산, 순위·색상 구간을 계산한다.
- 자료 목록은 `main.tsx:88`의 로더 키/경로 배열과 `main.tsx:163`의 4개 탭/라벨 배열, 상세 종류 배열 및 각 `if` 분기에 하드코딩되어 있다. `ExtraDashboard` 역시 `kind==='commerce'/'mobility'/'migration'` 분기가 반복된다. 추가 주제마다 여러 배열과 분기를 함께 수정할 가능성이 높다.
- 캐시는 브라우저 HTTP 캐시 외에 `PopulationPatterns.tsx:10, 27`의 모듈 Map이 확인된다. 키가 `file.path`뿐이라 내용 버전/해시가 같더라도 경로를 재사용하면 이전 내용이 남을 수 있다는 알려진 P2다. 용량은 최대 4개로 제한한다. 일반 인구·이동·상권 자료에 공통 메모리 캐시는 보이지 않는다.
- 공개 데이터 파일은 464개, 553,123,082바이트다. 상세 파일 목록은 [data-inventory.csv](data-inventory.csv). 주요 묶음: 일별 인구 317개/354,641,335바이트(압축 파일 포함), 인구 특성 133개/122,615,721바이트, 상권 매출 46,190,017바이트, 상권 유동인구 15,983,278바이트, 상권 경계 5,993,077바이트, 생활이동 출발·도착 각 약 2.38MB, 주민이동 1,149,257바이트, 주민이동 인구특성 931,047바이트, 매출 동 자료 469,821바이트. 이 수치는 로컬 파일의 합이며 Pages 저장/전송 제한·압축 전송량을 뜻하지 않는다.
- 첫 화면의 브라우저 실측은 불가했다. 시작 effect가 요청하는 경계·지역목록, 생활이동 2종, 거주이동, 인구특성, 매출 자료의 로컬 파일 합은 7,646,396바이트다. 이후 최신 일 인구 gzip 979,040바이트와 316개 날짜 목록이 추가 요청된다. 합계는 약 8.6MB 이상(날짜 목록 크기는 별도)이며, Vite 브라우저 요청에서 측정한 전송·파싱 메모리 수치가 아니다. Playwright Chromium 실행이 macOS `bootstrap_check_in ... Permission denied`로 시작하지 못했다. 측정 스크립트는 [measure-first-load.mjs](measure-first-load.mjs)에 두었다. 상권 화면 진입은 여기에 추가로 46.2MB 매출, 16.0MB 상권 인구, 6.0MB 경계, 자치구 경계를 읽도록 코딩되어 있다.
- 이번 `npm run build -- --outDir docs/workers-2026-11-18/w17-architecture-review/build`는 성공, 150 모듈 변환. JS `index-CobtncSk.js` 547.06 kB( gzip 172.94 kB), CSS `index-C4FDrChi.css` 359.64 kB(gzip 59.02 kB). 각각 하나의 JS/CSS 번들이며 주제별 동적 import/code split은 없다. 폰트 파일도 각각 약 434–440 kB로 3개가 출력됐다. Vite가 JS 500 kB 경고를 표시했다. 결과는 [build/](build/)에 있다.

## 3. 확장 부담 평가

정확한 파일 수는 지금과 같은 구현 규칙을 가정한 변경 예상치이며 실측 개발 기간이 아니다. 아래는 기존 두 도메인에 새 화면이 완전히 연결된 시점까지 필요한 것으로 보이는 파일 수다.

| 새 주제 | 예상 수정·추가 파일 | 어디를 손댈지 / 부담 |
|---|---:|---|
| 지하철역 승하차 (역 점, 일·시간) | 8–12 | 새 `collect/prepare/validate` 각각 1–3개, 공개 index와 자료 1–2개, 탭/제목·로더·상태(`main.tsx:79,88,163`), 계산 렌더 분기(`ExtraDashboard.tsx`), 점 지도·역 검색/상세 2–4개. 역 코드·좌표, 노선, 시간 기준이 기존 행정동 폴리곤 계약과 다르다. |
| 버스 정류장·노선 (점·선, 시간) | 10–15 | 위 파이프라인 외에 정류장/노선 ID 연결·좌표·경로 검증, 점/선 지도 레이어가 필요하다. 정류장 승하차와 차량 통행/승객 이동은 다른 뜻이어서 단순 재사용 시 오해가 생긴다. 기존 지도는 구/동 행정구역 중심이라 위치 자료 모듈 추가가 필요하다. |
| 부동산 거래·시세 (단지·필지, 월) | 10–16 | 수집은 지역·기간·거래종류별 자료, 중복/취소/실거래일 검증이 늘어난다. 월별 시계열·단지/필지 코드, 금액/면적 단위, 위치 연결/비공개 처리용 변환과 상세가 필요하다. 현 `periods`는 문자열만으로 주기·거래 조건·공간 수준을 나타내지 못한다. |

공통 단계를 세 주제에서 재사용하지 않으면 총 28–43 파일 변경/추가가 될 수 있다(각 범위 단순합). 이후 공통 계약·등록부를 만들면 각 주제의 프론트 연결부를 3–5개 파일 정도로 제한할 수 있다는 목표치다. 이를 보장하는 현재 추상화는 없다.

**정적 JSON의 버팀 기준(운영 제안이지 플랫폼 제한값이 아님):** 현 상태는 이미 527 MiB다. 새 화면이 필요한 파일만 읽더라도 앱 공통 시작에서 8.6MB 이상을 요청하고, 상권 첫 진입은 추가 68MB 수준의 원본 JSON을 요청한다. 압축 전 JSON 텍스트와 파싱된 객체는 브라우저 메모리에서 함께 살아 있을 수 있으나 실제 배수는 브라우저/스키마/화면에 따라 달라 미측정이다. 아래를 전환 검토 신호로 삼는다: 새 주제별 첫 방문 전송량 20MB 초과, 전체 앱 첫 방문 10MB 초과, 상호 독립 화면 두 개를 함께 쓸 때 유지 메모리 300MB 초과(실기기 측정), 또는 공개 총량 1GB에 도달. 이는 제품팀이 먼저 정할 제안 기준이며 GitHub Pages의 보장 한계라고 단정하지 않는다. 대용량 원본 JSON 전체를 지도 진입마다 읽는 현 상권 경로는 이미 분할/사전집계 우선 대상으로 본다.

## 4. 목표 구조

### 데이터 관리

한 개의 `DatasetManifest`를 각 자료의 정본으로 삼고, 공개 catalog와 화면 registry를 그 manifest에서 생성한다. 적어도 다음을 구조화한다.

```json
{
  "id": "population.daily",
  "schemaVersion": 1,
  "files": [{"path":"data/population/...json.gz","sha256":"...","bytes":979040}],
  "source": {"id":"OA-23016","url":"...","retrievedAt":"..."},
  "measure": {"name":"생활인구","unit":"명","definition":"..."},
  "period": {"kind":"day","start":"...","end":"...","timezone":"Asia/Seoul"},
  "space": {"kind":"administrative-dong","codeSystem":"...","boundaryVersion":"..."},
  "dimensions": ["hour","age","sex"],
  "nullPolicy": "원본 결측/비공개는 null 유지; 부분합은 모두 확인된 경우만 계산",
  "encoding": "gzip-json",
  "updatedAt": "..."
}
```

검증은 공통 필수 항목(파일 해시/크기, 기간, 공간 코드, 단위, null 금지값)을 먼저 검사한 뒤 주제별 규칙(인구 427×24 그리드, 매출 원문 집계)을 실행한다. 원본 파일 불변, 기존 레코드 불변, 독립 원자료 대조를 유지한다. 출력은 임시 디렉터리에 생성·검증하고 동일 해시/승인 뒤 승격한다. 현재 `prepare-commerce.py`는 `--check`와 기본 쓰기 경로(`scripts/prepare-commerce.py:142-148`)를 제공하며 공통 승격 계약은 아니다. 브리프가 알려진 P2로 든 null 부분 합계는 이번 소스에서 `aggregate()`가 한 칸이라도 null이면 결과를 null로 유지하는 코드(`scripts/prepare-commerce.py:39,43`)를 확인했다. 그러므로 이 결함은 이번 검사에서 재현하지 못했고 이미 반영된 것으로 보인다(validator 실행은 안 함). 회귀 픽스처로 보존할 가치가 있다. 반면 `prepare-population-patterns.py:96`은 파일을 교체하고 기존 파일이 있어도 덮어쓰기를 막지 않는다(알려진 P2).

단일 manifest 생성기가 주제별 원본 manifest와 준비자료 계약을 받아 공개 `public/data/catalog.json` 하나와 각 파일의 해시/크기 인덱스를 만든다. `data/catalog.json`은 개발자 카탈로그이고 실행 화면에 미사용이므로 혼동을 없앤다. 캐시 키는 `dataset id + schema version + content hash`로 한다. immutable content-hash 파일은 장기 캐시, catalog는 짧은 캐시로 배포하고 데이터 내용이 달라지면 경로도 바뀌게 한다.

### 백엔드 선택

| 선택 | 비용 | 운영 부담 | 보안 | 현재 서버/키 없는 원칙과 충돌 | 채택 기준 |
|---|---|---|---|---|---|
| ① 정적 유지 + 사전 집계/파일 분할 | 현재 최소. 빌드/저장/전송 비용은 트래픽에 좌우(구체 요금 미확인) | 낮음. 배치 검증·발행 필요 | 공개해도 되는 집계만 포함하면 키 보관 불필요 | 없음 | 기본값. 20MB/주제 첫 로딩, 1GB 공개 총량 제안 신호 전까지 우선 |
| ② 정적 Parquet + DuckDB-WASM | 저장은 정적과 유사, 브라우저 CPU/메모리 사용 증가 | 데이터 파일·쿼리·WASM 버전 관리; 서버 없음 | 원본이 브라우저에 모두 전달되므로 기밀 데이터에는 부적합 | 낮음(정적 공개 유지) | 파일 분할/사전 집계에도 탐색 쿼리가 늦고, 브라우저에서 100MB 이하 작업 세트가 실제로 가능할 때 프로토타입 후 검증 |
| ③ 서버리스 API | 요청·실행·저장 요금과 무료 구간은 공급자별 최신 확인 필요 | 배포·모니터링·캐시·오류 처리 중간 | 키는 서버 비밀 저장소에만, 브라우저에 공급자 키를 넣지 않음; 공개 API 남용 방지 필요 | 큼(서버 코드·운영이 생김) | 요청별 필터/개인화나 대용량 전송을 서버에서 줄일 때, 정적 분할 후에도 1회 20MB/응답이나 응답 지연 3초를 넘는 경우 검토 |
| ④ API 서버 + DB | 상시 실행·DB·백업·모니터링 비용이 가장 큼(견적 미확인) | 가장 큼. 보안 패치, 장애 대응, 스키마/마이그레이션 | 권한·비밀키·개인정보·쿼리 제한 관리가 필수 | 매우 큼 | 인증·갱신 빈도·조합형 쿼리·동시 사용자 요구가 명확하고 서버리스로 한계가 확인된 뒤에만 선택 |

수치는 현재 배포 설정/Pages 무료 구간 또는 브라우저 메모리 한계를 말하는 것이 아니다. 비용은 사용량과 공급자에 따라 확인이 필요하다. 서버/인증키 없는 현 원칙이 우선이고, 공개 집계만 다루는 동안 정적+사전 집계·분할을 유지한다.

### 프론트엔드

1. `data-access`: 단일 로더, 압축 판별, schema/version/hash 검증, abort, 요청 중복 제거, 캐시, 에러 분류.
2. `domain`: `population`, `mobility`, `migration`, `commerce`, `market` 변환과 집계를 UI에서 분리하고 순수 함수로 검증한다.
3. `workspace-shell`: 기간/공간 선택, 지도, 상세/비교, 시연, 출처를 공통 props/계약으로 연결한다.
4. `topics/<id>`: 주제 모듈은 `id`, 제공 기간/공간/측정 단위, 로더, 변환, 상세 화면을 등록한다. 화면은 registry를 통해 탭/제목/지원 조건을 읽는다. 숫자·단위/기간·공간 의미가 다르면 공통 UI에 억지로 끼우지 않고 주제 전용 기능으로 둔다.
5. 첫 단계 분할: `main.tsx`에서 전역 셸·라우팅·초기화만 남기고 인구 데이터 로딩/집계, 탭 등록, 상세 선택을 분리한다. 상권은 사용자가 진입할 때 동적 import하고, 드물게 쓰는 분석 상세도 열릴 때 가져온다. `ExtraDashboard`는 이동/거주이동/매출 각각의 도메인 모듈과 화면으로 나눈다.

## 5. 단계별 이전 계획

각 단계 완료마다 기존 단위/기능 검사, `npm run build`, `scripts/validate-data.py`, `scripts/validate-market-data.py`, 기존 Playwright PC 16여정(4 주제×분석·시연)을 실행한다. 여기서는 구조만 살펴봤고 회귀검사를 추가 실행하지 않았다. 화면이 바뀌지 않는 단계별로 분리해 진행한다.

| 시점 | 파일 범위 / 작업 | 회귀·되돌리기 |
|---|---|---|
| 지금 바로 (P2 포함) | `scripts/prepare-commerce.py`: 현재 null 부분 합계 코드는 맞아 보이나 기존 공식 행으로 독립 재현 validator/픽스처가 실제 보호하는지 확인. `src/PopulationPatterns.tsx`: 경로만 쓰는 캐시 키를 manifest 버전/hash 포함으로 변경. `scripts/prepare-population-patterns.py`: 기존 출력 존재 시 기본 중단, 명시적 승인/검증 후 교체. 더해 `src/static-json.ts` 인근에 공통 접근 계층을 만들되 우선 생활인구 한 자료만 연결. `data/catalog*.json` → 공개 catalog 단일 생성기 설계. | 산출물 해시와 기존 데이터 전 레코드 비교; `validate-data`, `validate-market-data`, PC 16여정. 각 작은 변경은 별도 커밋 단위로 하고 실패하면 해당 변경만 되돌린다. (본 작업은 소스 변경 금지라 실행하지 않음.) |
| 수평 확장 직전 | `scripts/collect-*`, `prepare-*`, `validate-*` 새 주제 파일; `public/data` manifest/index; `src/main.tsx`, `ExtraDashboard.tsx`, `MarketExplorer.tsx`의 등록 분기; 새 `src/topics/{subway,bus,real-estate}` 도메인/뷰. 먼저 계약과 registry를 실제 생활인구/상권 두 개에 적용한 다음 새 자료 1개를 시범 연결한다. | 기존 두 주제의 원본 해시/값 및 동일 조건 화면을 기준선으로 저장, validator 독립 대조, PC 16여정 후 수평 확장 자료 여정 추가. 실패 시 registry 이전 전 버전과 정적 자료를 함께 되돌린다. |
| 데이터 규모가 커진 뒤 | 새 정적 분할·사전집계 또는 Parquet 실험; 필요 시 API 경계/서버 코드 별도 폴더, 배포 워크플로. 기존 `src` loader만 백엔드 어댑터로 교체. API/DB 도입은 별도 결정 뒤 수행. | 100MB 작업세트/20MB 첫응답/3초 응답 제안 문턱을 실제 데스크톱·저사양 기기와 사용량으로 검증. API 전환 전 정적 이전본을 유지하고, 요청 실패 시 정적 catalog로 원복 가능한 기간을 둔다. |

**되돌리기:** 자료 형식/해시가 달라지거나 null이 0으로 바뀌거나 기존 두 도메인 결과가 달라지면 데이터 publish를 중단한다. 애플리케이션은 직전 manifest와 정적 자료 경로를 다시 배포하고, 새 API/쿼리 계층은 flag/registry에서 비활성화한다. 공개 데이터 변경 전 이전 버전 파일을 보존해 URL만 되돌릴 수 있게 한다.

## 6. 미검사 범위와 한계

- Playwright 브라우저 첫 로딩·실측 전송 크기·heap을 재려 했으나 Chromium이 이 실행 환경에서 시작 권한 오류로 종료됐다. 따라서 보고서의 첫 화면 데이터 바이트는 코드가 실제 요청하는 로컬 파일의 크기 합이며 브라우저 전송/파싱 측정치가 아니다.
- GitHub Pages의 현 저장용량, 대역폭/요청 제한과 이번 공개 배포 상태는 외부 확인이 금지되어 있어 확인하지 않았다. 1GB 등은 프로젝트 의사결정용 검토 문턱이지 플랫폼 한계가 아니다.
- 서버리스/API/DB의 구체 비용·무료 한도, Parquet/WASM 성능은 최신 공급자·대상 브라우저 측정 없이 확정하지 않았다. 표의 비용은 상대 비교다.
- 전체 128개 소스 파일 줄 수는 CSV에 담았으나 각 작은 UI/CSS 파일의 개별 책임을 모두 추적하지는 않았다. 구조 판단은 데이터 파이프라인, 로더 및 주요 도메인 파일에 집중했다. 다른 작업자 W16의 메뉴/IA 검토는 다루지 않았다.
- `npm run build`만 실행했다. 테스트, validator, 실제 Pages, 모바일, 기기 메모리는 이번에 재실행하지 않았다. 기존 로그나 과거 결과를 이번 실행 통과로 간주하지 않는다.
