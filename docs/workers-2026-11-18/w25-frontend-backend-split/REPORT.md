# W25 프론트엔드·백엔드 분리 방안 분석

작성 2026-11-18 · **분석·제안만**. src/, public/, scripts/, tests/, data/, 기존 docs는 수정하지 않았다. git 쓰기·배포·서버 실행·설치·가입은 하지 않았다. 외부 요청은 공식 문서·요금 페이지 읽기뿐이다(하위 읽기 도우미 2개).
표기: **확인** = 이번에 파일·소스·공식 페이지에서 직접 본 것. **추정** = 계산·판단. **미확인** = 못 본 것.

## 1. 핵심 결론 3줄

1. **지금은 서버를 만들 이유가 없다.** 공개 집계 자료뿐이고 계산이 브라우저 안에서 끝난다. 먼저 할 일은 "서버"가 아니라 **데이터 접근 계층 + 자료 manifest**를 끼워 화면 코드가 "파일 경로"를 모르게 만드는 것이다. 이 계층이 있으면 정적 → 객체 저장소 → API로 바꿔도 화면은 그대로다.
2. **교통 1차(지하철)는 A안(정적 유지 + 데이터 분리 호스팅 준비) + B안(질의 단위로 미리 자른 파일)이 맞다.** 지하철 자료는 작다(월 CSV 약 1.2MB 표본). 용량보다 "선로딩 중단·상권 46MB 단일 파일 분할"이 먼저다.
3. **상업 서비스(광고주 로그인·비공개 자료·유료)로 가는 순간 GitHub Pages는 약관상 쓸 수 없는 쪽으로 기운다.** 그때는 D안(Cloudflare Workers + R2, 필요하면 D1)이 비용·운영 대비 가장 현실적이다(추정). 서버+DB(C안)는 조합형 질의·동시 사용자·인증이 실제로 생긴 뒤에 고른다.

## 2. 현재 경계 진단

### 2.1 데이터 흐름 지도 (확인)

```text
[공식 API·파일]
   │  scripts/collect-*.py (9개)         → data/raw/ (gitignore, 원본 보관)
   ▼
scripts/prepare-*.py (9개)・extend/register-*  → public/data/  (464파일, 553,123,082B)
   │    일별 인구 317개(354.6MB, .gz 285) · 패턴 133개(122.6MB) · 상권 3개(68.2MB)
   │    생활이동 2 · 주민이동 3 · 행정동 매출 1 · 경계/지역표 4
   ▼
scripts/validate-*.py · tests/ (자료별 별도 검증)
   ▼
npm run build → dist (555.35MB, W18) → scripts/publish-pages.py → gh-pages → GitHub Pages
   ▼
브라우저: fetch(상대경로) → JSON 파싱 → React state → 브라우저에서 집계·순위·비교 → 지도/그래프
```

- 별도 서버·API·인증키 없음. 데이터 URL을 알면 누구나 받는다(W18).
- `vite.config.ts`는 `base:'./'` 한 줄뿐이다. 환경별 데이터 주소(base URL) 개념이 없다.

### 2.2 불러오는 곳 (확인, 줄은 현재 HEAD 기준)

| 위치 | 하는 일 | 문제 |
|---|---|---|
| `src/main.tsx:61-62` `load()` | 상대경로 fetch, `.gz`면 `decodeStaticJson` | 캐시·취소·버전 검증 없음. 일반 자료는 오래된 응답 방지 없음 |
| `main.tsx:86-88` | 시작할 때 경계 2 + 인구 index + 지역표 + 구 경계 + 생활이동 2 + 주민이동 + 행정동 매출을 한꺼번에 요청 | 지역 자료를 고르기 전에 받음. W18 실측 18요청·3.26MB |
| `main.tsx:89` | 선택 날짜 인구 1일치(gz 약 0.98MB) | 날짜 응답 일치 검사는 이미 있음(좋은 점) |
| `ExtraDashboard.tsx:35` | 주민이동 인구구성 파일을 **직접 fetch** | `load()`를 안 거침 |
| `MarketExplorer.tsx:50` | 구 경계 + 상권 매출(46.2MB) + 유동(16.0MB) + 상권 경계(6.0MB)를 한 번에 | 상권 첫 진입 추가 4요청·19.4MB 전송, 해제 68.2MB. 분기 선택과 무관하게 전 기간을 받음 |
| `PopulationPatterns.tsx:21-22` | 패턴 index 후 월 파일 | 모듈 Map 캐시 키가 파일 경로뿐(W17 P2) |
| `ResidentContext.tsx:10` | 주민등록 파일 직접 fetch | 같음 |

fetch 호출이 **5개 파일에 흩어져** 있다. 분리의 첫 걸림돌은 서버가 아니라 이 흩어짐이다.

### 2.3 표시와 계산이 섞인 곳, 이전 판정 (확인 + 판단)

판정 기호: **P** = 사전 집계(prepare 단계에서 미리 계산해 파일로) 후보, **S** = 서버/엣지 함수로 옮길 만한 후보(상업 단계), **B** = 브라우저에 남김(표시 상호작용 성격).

| 위치 | 하는 계산 | 판정 | 이유 |
|---|---|---|---|
| `main.tsx:94-95` | 열 이름 정규식(`남자`·`(\d+)[~세]`)으로 성·연령 열 선택, null 있으면 합계 null | **P** | 열 이름 문자열 규칙이 화면 코드에 있음. 자료 정의 계약(집단→열 목록)으로 올려야 함. null→null 규칙은 유지 |
| `main.tsx:97-99` | 427동×24시 행을 구/동으로 합산 | **P/S** | 구 단위 합계는 미리 계산 가능. 현재는 일 파일 1MB를 받아 매번 합산 |
| `main.tsx:101-103` | 선택 지역 시간곡선, 순위 정렬 | **B** | 이미 받은 하루치 위의 가벼운 계산. 순위는 표시 상호작용 |
| `ExtraDashboard.tsx:78-85` `calculate` | 생활이동 출발·도착을 구/동별로 합산, 유입·유출·순증 | **P** | 출발·도착 각 2.4MB를 매번 합산. 구·동·시간·누적 조합은 유한해서 미리 계산 가능 |
| `ExtraDashboard.tsx:106,112,115-118` | 후보 통계, 추이 곡선, 연결(유입/유출 상대 구), 합계 | **B(+P)** | 연결 상위 N 등은 사전 집계로 줄일 수 있으나 우선순위 낮음 |
| `ExtraDashboard.tsx:38-41` | 연령·성별 제공 기간에 맞춰 기간/구 자동 보정 | **B** | 화면 정책. 단, "무엇이 제공되는가"는 manifest(`dimensions`·`periods`)에서 읽게 바꿔야 함 |
| `MarketExplorer.tsx:62` | 지표 선택(전체/시간/연령/요일/성별 × 매출/유동) | **P** | 레코드 구조(`timeSales`, `ageSales` 등)를 화면이 직접 안다. 접근 계층이 "측정값 조회"로 가려야 함 |
| `MarketExplorer.tsx:63-66` | 6분기 × 상권 × 업종 합산, 직전 분기, 순위, 눈금 구간 | **P/S** | 가장 무거움. 46MB 전체를 받아 업종 필터·합산. 분기별·업종별로 미리 자른 파일이 정답 후보. 눈금(색 구간)은 B |
| `DistributionComparison.tsx:26-27`, `TrendExplorer.tsx:56,82` | 최대값·정점·눈금 | **B** | 순수 표시 |

요약: **무거운 합산은 4곳**(`main.tsx:97`, `ExtraDashboard.tsx:78`, `MarketExplorer.tsx:63`, 그리고 상권 전 기간 로드). 나머지는 브라우저에 두어도 된다. 집계 규칙(null 처리 포함)이 화면 파일 안에 있는 점은 데이터 원칙상 위험이다. 지금 `aggregate()`가 "한 칸이라도 null이면 null"을 지키는 것을 확인했다(`main.tsx:97`, `MarketExplorer.tsx:63`). 이 규칙은 분리 후에도 **순수 함수 + 고정 시험**으로 한 곳에 남아야 한다.

### 2.4 이전 대상 판정 요약

- **백엔드(서버)로 옮겨야 하는 것: 현재 없음.** 모두 공개 집계이고 계산량도 브라우저가 감당한다(측정은 미확인).
- **사전 집계로 옮길 것: 상권 분기·업종 분할, 생활이동 구 단위 합계, 인구 구 합계.**
- **먼저 바로잡을 것: 선로딩(주제 진입 때 읽기), fetch 5곳의 통합, 캐시 키에 해시 포함.**

## 3. 선택지 비교표 (A–D)

공통 전제(확인): 현재 553MB·464파일, 시작 3.26MB, 상권 첫 진입 +19.4MB(전송). 연 증가 약 492MB(W18 외삽). 지하철 표본 월 CSV 1.2MB, 일별 시간대 연 파일 24~31MB(W23 목록 표기). 버스는 수치 미확인(W24).

### A. 정적 유지 + 데이터만 분리 호스팅 (R2/S3/Releases)

```text
브라우저 ─ 앱 파일(작음) ──▶ GitHub Pages 또는 Cloudflare Pages
   │
   └─ manifest.json ─▶ 데이터 주소·버전·해시
   └─ 데이터 JSON ───▶ 객체 저장소 + CDN (R2 공개 버킷+커스텀 도메인 등)
pipeline(scripts) ─ 검증 후 업로드(버전 폴더, 이전 버전 보존)
```

- 비용(확인된 요금으로 계산, 월): R2 저장 $0.015/GB-월, 무료 10GB, **송신 무료**(developers.cloudflare.com/r2/pricing). 1.5GB 저장은 무료 구간 안(추정 $0). 100GB를 넘겨도 약 $1.4 수준(추정). S3는 이번에 표준 요금표를 읽지 못해 **미확인**(무료 100GB/월 인터넷 송신 문구만 확인).
- 운영 부담: 낮음~중간. 업로드 스크립트, CORS, 원자적 버전 교체, 실패 복구.
- 성능: 첫 진입은 현재와 같거나 CDN 덕에 개선. 상권 첫 진입은 분할 없이는 그대로 19.4MB. 지도 전환은 클라이언트 계산이라 변화 없음.
- 보안: 공개 파일은 공개 그대로. 키 보관 불필요. 비공개 자료는 서명 URL 등이 필요해 이 안만으로는 부족.
- 상업 이용: **데이터 용량 문제만 풀린다.** 화면(앱)을 GitHub Pages에 두면 약관 문제는 남는다. 앱도 Cloudflare Pages 등으로 옮기면 약관은 해당 업체 약관으로 바뀐다(Cloudflare Pages 상업 이용 조항은 이번에 **못 찾음**, 미확인). 한 파일 25MiB 제한이 Cloudflare Pages에 있어(확인) 큰 JSON은 R2에 둬야 한다.
- 교통·부동산: 주제마다 폴더·manifest만 추가. 쉬움.
- 데이터 원칙: 원본 불변은 업로드 시 해시 고정으로 지키기 쉬움. null≠0은 파일 그대로. 자료 정의 계약은 manifest로.
- 이전 난이도: **낮음.** 로더 한 곳 + 기본 주소(base URL) 설정.

### B. 정적 "API" (질의 단위로 미리 자른 파일, 필요하면 DuckDB-WASM/Parquet/PMTiles)

```text
pipeline: raw → 집계 → 분할 파일  (예) market/sales/{분기}/{업종}.json
                                      population/summary/{구}.json
브라우저 ─ manifest ─▶ "이 조건이면 이 파일" ─▶ 필요한 조각만 fetch
(선택) Parquet + HTTP range + DuckDB-WASM : 브라우저에서 SQL
```

- 비용: A와 같다(저장·송신만). 파일이 작아 전송은 줄어든다.
- 운영 부담: 중간. 분할 규칙·manifest 생성기·검증이 늘어남. 서버는 없음.
- 성능: **가장 큰 개선 지점.** 상권 첫 진입이 "선택 분기·업종 조각"으로 줄 수 있음(구체 크기는 미확인). 지도 전환은 조각 요청 1회.
- DuckDB-WASM(확인): 메모리 4GB 상한, 기본 단일 스레드. 필요한 바이트 범위만 읽는 구현은 JS httpfs에 한정되고 내장 httpfs는 파일 전체를 받을 수 있다는 이슈가 문서에 있음. → **실험 전에는 채택하지 않는다.** 사전 분할 JSON이 먼저.
- 보안: 공개 집계만 가능. 숨긴 자료도 URL을 알면 받음.
- 상업 이용: 호스팅이 어디냐에 달림(A와 동일).
- 교통·부동산: 좋음. 월·노선·정류장 단위 분할이 자연스러움. 단 질의 조합이 많아지면 파일 수가 폭증(Cloudflare Pages는 무료 20,000파일 제한, 확인. R2에는 해당 없음).
- 데이터 원칙: 분할은 prepare 단계에서만. 분할 전후 합계 대조를 검증기에 넣으면 지킬 수 있다.
- 이전 난이도: 중간. prepare·화면의 상권/이동 부분이 함께 바뀜.

### C. 경량 API 서버 + DB (FastAPI/Node + DuckDB 또는 Postgres/PostGIS)

```text
브라우저 ─ HTTPS ─▶ API 서버(상시) ─▶ DB(DuckDB 파일 / Postgres+PostGIS)
                        ▲ 서버 쪽에 인증키·사용자 권한
pipeline → DB 적재(검증 후)
```

- 비용(월): 소형 VM/컨테이너 + DB + 백업. 이번에 해당 업체 요금을 읽지 않아 **미확인**. Supabase Pro는 시작가 **$25/월**(디스크 8GB 포함, 송신 250GB, 확인). 자체 VM은 추정 $10~40 수준이나 근거 없음(추정).
- 운영 부담: **높음.** 패치·장애·백업·마이그레이션·모니터링.
- 성능: 첫 진입은 필요한 질의만 받아 작아짐. 상시 서버라 첫 요청 대기 없음. 서버 거리·질의 최적화에 달림(미측정).
- 보안: 키·권한을 서버가 보유(장점). 대신 공격면과 책임이 생김.
- 상업 이용: 해결(앱·API를 상업 허용 호스팅에 두는 한).
- 교통·부동산: 가장 유연. 조합형 질의, OD, 공간 결합(PostGIS)이 쉬움.
- 데이터 원칙: DB로 옮기면 원본 불변·null 구분·정의 계약을 **스키마·마이그레이션으로 다시 구현**해야 함. 독립 대조(원문 재계산)는 오히려 쉬워짐.
- 이전 난이도: **높음.** 계산 로직 일부를 서버로 이식하고 같은 값임을 전수 대조해야 함.

### D. 서버리스·엣지 함수 + 저장소 (Cloudflare Workers + R2/D1, Supabase)

```text
브라우저 ─▶ CDN/엣지(Workers) ─▶ R2(조각 파일) 또는 D1(작은 표)
              ▲ 비밀키는 Workers 비밀값
pipeline → R2/D1 업로드·적재
```

- 비용(확인된 공식 요금): Workers 무료 10만 요청/일, CPU 10ms. 유료 **최소 $5/월**(1천만 요청·CPU 3천만 ms 포함, 초과 요청 100만당 $0.30). R2 저장 $0.015/GB-월, 송신 무료. D1 무료 5GB·읽기 500만 행/일, 유료 5GB 포함 후 $0.75/GB-월, **DB 1개 최대 10GB**, 질의 결과 최대 50MB. Supabase Free는 500MB DB·2프로젝트·1주 미사용 시 중지, Pro $25/월(확인).
  → 월 추정: 초기 시안 **$0~5**, 광고주 수십 명 규모 **$5~30**(추정, 사용량 미측정).
- 운영 부담: 낮음~중간. 서버 관리는 없고 배포·로그·한도 관리만. 한 업체에 종속.
- 성능: 엣지 캐시로 반복 요청이 빠름. Workers CPU/메모리(128MB) 때문에 46MB JSON을 함수 안에서 합산하는 방식은 부적합 → **미리 자른 조각을 R2에서 그대로 전달**하는 형태가 적합(B와 결합).
- 보안: 비밀키는 Workers 비밀값. 로그인은 직접 구현하거나 외부 인증 사용. 비공개 자료는 함수에서 권한 확인 후 서명 URL로 전달 가능.
- 상업 이용: 해결 가능(업체 상업 약관 확인 필요, 이번에는 Cloudflare Pages/Workers 상업 조항을 못 찾음 → **미확인**).
- 교통·부동산: 좋음. 주제별 폴더+함수 라우트.
- 데이터 원칙: D1은 SQL이라 null 구분이 자연스럽다. 단 D1 10GB 상한 때문에 지하철·버스 일별 원자료 전체는 못 담고 **집계표만** 담는 구조(추정).
- 이전 난이도: 중간. A→B가 끝난 뒤 "경로를 함수로 감싸기"라서 증분 이전이 됨.

### 한눈 비교

| 항목 | A 데이터 분리 | B 사전 분할 | C API+DB | D 서버리스+저장소 |
|---|---|---|---|---|
| 월 비용(추정) | $0~소액 | $0~소액 | $25~수십 | $0~30 |
| 운영 부담 | 낮음 | 중간 | 높음 | 낮음~중간 |
| 첫 진입 | 현재 수준 | 개선 | 개선 | 개선 |
| 상권 첫 진입 | 그대로 | **크게 개선** | 개선 | 개선(B 결합 시) |
| 키·비공개 자료 | 불가 | 불가 | 가능 | 가능 |
| 상업 약관 | 호스팅 이전 시 해결 | 같음 | 해결 | 해결 |
| 교통·부동산 확장 | 쉬움 | 쉬움(파일 수 주의) | 가장 유연 | 쉬움 |
| 데이터 원칙 | 쉬움 | 쉬움 | 재구현 필요 | 중간 |
| 이전 난이도 | 낮음 | 중간 | 높음 | 중간 |

비용 수치는 위 공식 페이지에서 읽은 단가를 쓴 **추정 계산**이며 실제 사용량·환율·세금·AWS 표준 요금은 반영하지 않았다.

## 4. 데이터 계약과 접근 계층 초안

### 4.1 자료 manifest (자료 1개당 항목)

W17의 `DatasetManifest` 제안을 이어 필요한 필드를 확정한다. 정본은 pipeline이 생성하고, 화면의 메뉴·상세 목록·기간 선택기가 여기서 만들어진다.

```json
{
  "id": "market.sales",
  "topic": "market",
  "title": "상권 추정매출",
  "schemaVersion": 1,
  "version": "2026q2-20261117",
  "period": {"kind": "quarter", "start": "2025Q1", "end": "2026Q2", "timezone": "Asia/Seoul"},
  "space": {"kind": "market-area", "codeSystem": "서울시 상권코드", "boundaryVersion": "2026"},
  "measures": [{"id": "sales", "label": "추정매출", "unit": "원", "nullMeaning": "원문 결측·비공개. 0이 아님. 합계에 포함되면 합계도 null"}],
  "dimensions": ["industry", "time", "age", "sex", "weekday"],
  "partitions": {"by": ["period", "industry"], "pathTemplate": "market/sales/{period}/{industry}.json"},
  "files": [{"path": "market/sales/2026Q2/all.json", "sha256": "...", "bytes": 0, "encoding": "json|gzip"}],
  "source": {"id": "OA-xxxxx", "url": "...", "license": "공공누리1유형", "retrievedAt": "..."},
  "rawRef": {"sha256": "...", "path": "data/raw/..."},
  "updatedAt": "2026-11-17",
  "supersedes": null
}
```

- **필수 항목:** id, 주제, 기간, 버전·해시, 단위, null 의미, 출처, 갱신일 (브리프 요구) + 공간 코드 체계, 파일 목록(경로·바이트·해시·인코딩), 라이선스, 원본 참조.
- **불변 규칙:** 한 번 올린 `version` 폴더는 덮어쓰지 않는다(새 버전 폴더 추가). 파일 경로에 내용 해시나 버전을 넣어 장기 캐시. manifest만 짧은 캐시.
- **null 의미는 필수 문자열이다.** 비어 있으면 검증 실패(0으로 채우기 방지).
- **전체 목록 `catalog.json`** 은 위 manifest들의 색인. 공개 catalog와 개발자 `data/catalog.json`을 하나로 정리(W17 제안 재확인).

### 4.2 접근 계층(인터페이스) 초안 — 화면은 이것만 부른다

```ts
// packages/contracts 또는 src/data-access/types.ts (제안, 구현 아님)
interface DataAccess {
  catalog(): Promise<CatalogEntry[]>;                         // 자료 목록·기간·제공 조건
  manifest(datasetId: string): Promise<DatasetManifest>;
  // 가장 낮은 층: 조각 읽기. 화면은 경로를 모른다.
  readSlice<T>(q: SliceQuery, opt?: {signal?: AbortSignal}): Promise<SliceResult<T>>;
}
type SliceQuery = {
  dataset: string;                    // 'population.daily' | 'market.sales' | ...
  period: string;                     // '2026-11-12' | '2026Q2'
  space?: {level: 'district'|'dong'|'market'|'station'; codes?: string[]};
  filter?: Record<string, string|number>;   // industry, sex, ageBand ...
  measure?: string;                   // 'sales' | 'population' ...
};
type SliceResult<T> = {rows: T; meta: {version: string; unit: string; nullMeaning: string; source: string; fromCache: boolean}};
```

- 값은 항상 `number | null`. `null`을 0으로 바꾸는 코드는 계층 안에도 만들지 않는다.
- **집계 규칙(null이 하나라도 있으면 합계 null)은 `domain/aggregate.ts` 순수 함수 한 곳**에 두고, 단위 시험을 고정한다(현재 `main.tsx:97`, `MarketExplorer.tsx:63` 등에 복제).
- 구현체는 교체 가능: `StaticHttpDataAccess`(지금), `CdnDataAccess`(base URL만 다름), `ApiDataAccess`(서버/엣지). 같은 `SliceQuery`에 같은 `SliceResult`.
- 공통 기능은 이 계층이 맡는다: 취소(AbortSignal), 중복 요청 합치기, 캐시 키 `dataset+version+sha256`, gzip/평문 판별(현 `decodeStaticJson`), 오류 분류(없음/네트워크/버전 불일치).

### 4.3 정적에서 서버로 바뀌어도 화면 코드가 그대로이게 하는 방법

1. 화면은 `readSlice(query)`와 `catalog()`만 부른다. 경로·URL·`.gz`·fetch는 화면에 없다.
2. 구현체를 환경 설정 한 곳(`DATA_MODE=static|cdn|api`)에서 고른다. 같은 질의가 정적 모드에서는 "조각 파일 1개 읽기", API 모드에서는 "GET /v1/slice?..."가 된다.
3. 정적 모드의 분할 규칙(`pathTemplate`)과 API의 쿼리 파라미터는 **같은 `SliceQuery`에서 생성**한다. 그래서 단순 정적 조각이 처음부터 "질의 하나"의 모양을 갖는다.
4. 계약 시험: 같은 질의를 정적 구현·API 구현에 던져 **응답 값이 같은지** 대조하는 시험을 둔다(데이터 원칙의 독립 대조).
5. 서버가 생겨도 화면이 하던 순수 계산(눈금·순위)은 그대로 둔다. 서버로 옮기는 건 "조각을 만드는 일"이지 화면 계산이 아니다.

## 5. 저장소 구조안과 이전 순서

### 5.1 목표 구조 (제안)

```text
apps/web/            현 src/, index.html, vite 설정 (표시와 상태)
  src/data-access/   DataAccess 구현체 (static, cdn, api)
  src/domain/        순수 계산 (aggregate, rank, compare) + 단위 시험
  src/topics/        region, market, (transit, realestate) 모듈
pipeline/            현 scripts/ (collect, prepare, validate, publish)
packages/contracts/  manifest 스키마, SliceQuery 타입, 단위/기간 정의
api/                 필요할 때만 (Workers 또는 FastAPI). 처음엔 비어 있음
data/                raw·prepared (gitignore 유지)
```

폴더를 한 번에 옮기지 않는다. **경로 이동은 맨 마지막**이다. 먼저 `src/` 안에서 `data-access/`와 `domain/` 폴더를 만들고 `pipeline/`·`packages/contracts`는 이름만 합의한다(이유: 레이아웃 이전이 `src/main.tsx` 등을 계속 고치는 중이라 경로 이동은 충돌을 키운다).

### 5.2 단계 순서 (제안)

| 단계 | 내용 | 바꾸는 파일 범위 |
|---|---|---|
| S0 | 이 보고의 manifest·인터페이스 합의 | 문서만 |
| S1 | 데이터 접근 계층 신설, **생활인구 1개만** 연결(W17의 "지금 바로"와 동일) | `src/data-access/*` 신규, `main.tsx` 로드 한 곳 |
| S2 | 공개 `catalog`/manifest 생성기(`pipeline`), 캐시 키에 해시 | scripts 신규 + 소비자 3곳 |
| S3 | 나머지 fetch 5곳을 계층으로 통합, **선로딩을 진입 시 로딩으로** | `main.tsx`, `ExtraDashboard.tsx`, `ResidentContext.tsx` |
| S4 | 상권 분기·업종 분할(B안), `MarketExplorer`를 `readSlice`로 | prepare + `MarketExplorer.tsx` |
| S5 | `domain/aggregate` 추출(null 규칙 고정), 순수 함수 시험 | `main.tsx`, `ExtraDashboard.tsx`, `MarketExplorer.tsx` |
| S6 | 데이터 기본 주소 설정화 → R2/CDN 이전(A안) | 설정 + 업로드 스크립트 |
| S7 | 교통 1차: 처음부터 topic 모듈 + manifest로 추가 | 신규 위주 |
| S8 | (상업 단계) `ApiDataAccess` + Workers/R2(D안) | `api/` 신규 + 구현체 1개 |
| S9 | 폴더 이동(apps/web, pipeline, packages) | 전체. 레이아웃 이전 종료 후 |

### 5.3 레이아웃 이전(w22: 0 → 1a → 1b → 2 → 3 → 4 → 5, L)과 맞물림

w22 계획서(확인)의 파일 겹침 지점은 `main.tsx`, `ExtraDashboard.tsx`, `MarketExplorer.tsx`, `MapWorkspace.tsx`, 상세 호스트다. 같은 파일을 동시에 고치지 않도록 다음처럼 맞춘다.

| 분리 단계 | 레이아웃 단계와의 관계 |
|---|---|
| S0 (문서) | 언제든 가능, 충돌 없음 |
| S1·S2 (신규 파일 위주) | 1a/1b와 **병행 가능**. 단 `main.tsx`의 `load()` 호출 한 줄 교체는 1b 커밋과 분리해 별도 커밋 |
| **S3 = 계획서의 L** | L은 "5 완료 후 기본 배정"(`layout-migration-plan.md` 5절). **S3와 L은 같은 작업이므로 하나로 합친다**(선로딩 중단+로더 통합). 이름은 L로 유지 |
| S4 (상권 분할) | 4단계(상권 같은 셸)와 같은 파일(`MarketExplorer.tsx`)을 건드림 → **4 완료 후**. 순서: 4 → S4 |
| S5 (domain 추출) | 2·3·4 모두와 파일이 겹침 → **5 완료 후** L과 함께 |
| S6 (R2 이전) | 코드 변경 거의 없음(설정). 레이아웃과 독립, 단 배포 변경이므로 별도 승인 |
| S7 (교통) | w22 "교통(예정)" 메뉴 자리를 쓰는 신규 파일. 1b 이후 가능. 새 `topics/transit/`는 레이아웃 파일과 겹치지 않음 |
| S9 (폴더 이동) | 레이아웃 5 + L + S5 완료 후 |

원칙: 한 시점에 `main.tsx`를 고치는 작업자는 한 명. 분리 쪽 작업은 **신규 파일(data-access, contracts, pipeline 생성기)** 로 먼저 쌓고, 기존 파일 교체는 레이아웃 담당자와 일정으로 순서를 잡는다(소유 구분은 감독자가 정함).

## 6. 시점별 권고와 전환 기준

### 6.1 시점별 권장안

| 시점 | 권장안 | 이유 |
|---|---|---|
| **지금** | **A의 준비 + B의 일부.** 서버 없음. S0~S3(+S4) | 공개 집계·서버 불필요. 선로딩·상권 단일 46MB 파일이 실제 병목(확인). 접근 계층이 이후 모든 선택지의 전제 |
| **교통 1차(지하철) 추가** | **B + A.** 주제 모듈+manifest로 추가하고, 월·역 단위로 분할 파일. 사이트 800MB 근접 시 데이터만 R2로(S6) | 지하철 표본이 작아(월 CSV 1.2MB) 서버 불필요. 혼잡도(30분)·승하차·좌표는 정의가 달라 manifest의 `measures`로 구분. 일별 시간대 연 파일 24~31MB는 분할 필수(Git 50MiB 경고선 주의). 버스는 규모 미확인 → 추가 직전 재측정 |
| **상업 서비스 전환** | **D(Workers+R2, 필요 시 D1).** 공개 집계는 R2+CDN, 광고주 전용은 Workers 권한 확인 후 서명 URL | GitHub Pages 약관상 상업 SaaS 목적 사용 금지 문구 확인. 비공개 자료·로그인은 서버 쪽이 필요. 운영 인력이 적으면 C보다 D가 현실적(추정) |

C(API+DB)는 위 어느 시점의 기본안이 아니다. 아래 전환 기준을 만족할 때 택한다.

### 6.2 전환 기준

| 기준 | 정적(A/B) 유지 | D로 | C로 |
|---|---|---|---|
| 용량 | 배포 묶음 < 700MB | 700~800MB 도달 또는 90일 내 800MB 예측(W18 제안) → 최소한 데이터는 R2로 | 단일 주제 원자료가 수 GB이고 조각으로 못 줄임 |
| 동시 사용자·전송 | 월 전송 < 50GB(Pages 100GB soft의 절반, W18) | 월 50GB 이상 또는 캐시 제어 필요 | 지속 동시 접속 수십 이상에서 질의 응답 3초 초과(제안 기준, 미측정) |
| 질의 복잡도 | 조건 조합이 사전 분할로 표현 가능 | 조합 일부에만 요청별 계산 필요 | 자유 조합(임의 기간·다중 필터·공간 결합·OD)이 핵심 기능 |
| 비용 | $0 | 월 $5~30 허용 | 월 $50 이상 + 운영 인력 확보 |
| 권한·상업 | 공개 자료만, 비상업 | 로그인·광고주별 자료 1건이라도 필요 / 상업 SaaS | 위에 더해 감사 로그·복잡한 권한 |

수치 중 700/800MB, 50GB, 3초는 W17·W18의 **내부 제안**이며 플랫폼 한도가 아니다. 한도는 GitHub Pages 사이트 1GB·월 100GB(soft)·파일 100MiB 차단(Git 경로)·빌드 시간당 10회(soft)(W18 확인, 이번에 사이트 1GB/100GB/상업 문구를 다시 확인).

## 7. 사용자 결정 질문

1. **상업 서비스인가?** 광고주에게 유료로 제공하거나 사업 목적으로 운영하는가, 시안·공개 연구용인가? (예 → D안 전환 시점이 앞당겨짐. 불명확하면 GitHub Support 확인 필요)
2. **로그인·광고주별 비공개 자료·메모·후보 저장이 필요한가?** (필요 → 정적만으로 불가, 서버 필요)
3. **월 예산 상한은?** ($0 / $5~30 / 그 이상)
4. **운영 인력은?** 장애·보안 패치를 맡을 사람이 있는가? (없다면 C 제외 권고)
5. **교통을 언제까지, 지하철만 먼저인가?** 버스를 확정하면 용량·서버 판단을 다시 해야 한다.
6. **호스팅 업체 선호·제약**(Cloudflare 가능 여부, 국내 호스팅 필요 여부, 가입 담당자)은?
7. **데이터 보관 기간 정책**(생활인구 일별을 계속 쌓을지, 오래된 날은 요약만 남길지)은?
8. **경계 자료의 재배포 조건 확인 담당**은 누구인가? (W18: 경계 라이선스 미확인)
9. 접근 계층(S1~S3)을 레이아웃 이전과 어떤 순서로 둘지(감독자 결정: L 합치기 포함).

## 8. 한계·미확인

**확인한 것 (이번 작업)**
- src의 fetch 위치·집계 위치와 줄 번호(소스 읽기), public/data 구조와 파일 크기(`ls`), scripts 목록, publish-pages.py 동작(읽기).
- W17·W18·W23·W24·layout-migration-plan의 수치(해당 보고서 기준).
- 공식 요금·한도: Cloudflare R2/Workers/D1/Pages(위 날짜 표기 페이지), Supabase 요금, GitHub Pages 한도·상업 문구, DuckDB-WASM 제한.

**추정한 것**
- 모든 "월 비용" 범위(단가×가정 사용량), D1에 일별 원자료를 못 담는다는 판단, 사전 집계가 가능하다는 판단, 상권 분할 후 첫 진입 감소폭(수치 없음).
- C안의 VM/DB 월 비용(근거 없음).

**미확인**
- AWS S3 표준 저장 단가·인터넷 송신 단가·CloudFront 한국 단가(페이지에서 못 읽음), 자체 서버 호스팅 요금.
- Cloudflare Pages/Workers의 상업 이용 약관 문구(Pages 한도 페이지에는 없음), R2 CORS 설정 세부.
- DuckDB 내장 httpfs의 HTTP range 동작(overview 페이지에 언급 없음), Parquet 변환 후 실제 크기·성능.
- 현재 브라우저 메모리·파싱 시간, 재방문 304, 실제 월 트래픽·동시 사용자.
- 버스 자료의 정류장·노선·행 수(W24도 미확인), 지하철 일별 시간대 전체 기간 합계 용량.
- 이전 후 같은 화면 값이 같은지는 **실제로 구현해 보지 않았으므로 미검증**.
- 이 보고는 현재 소스 HEAD(`41b6e68`)의 정적 읽기이며 빌드·테스트·E2E·화면 확인은 하지 않았다. 모바일은 범위 밖.

**실행하지 않은 것:** 빌드, 테스트, 서버 실행, 패키지 설치, 가입·로그인, 파일 다운로드, git 쓰기, 배포, src/public/scripts/tests/data 수정.
