# GitHub Pages 전체 데이터 배포의 한계와 가능성

조사일2026-11-18 · W18 · **조사·읽기 전용 실측만 수행**. 기존 소스·데이터·문서·Git 이력은 수정하지 않았고 배포하지 않았다.

## 1. 핵심 결론 3줄

현재 정적 묶음은 **555.35MB**다. 현행 형식으로 인구·요약을1년 더 보관하면 **1.047GB**로 추정되어 Pages의1GB 한도 부근이다(10진 환산 기준 초과·1GiB 환산 기준 미만).
메모리 압축 실험에서는 **384.01MB**, 같은 압축을 적용한1년 후 **799.12MB**까지 줄일 여지가 있었다. 분할·지연 로딩·Actions로 공개 시안을 계속 운영할 가능성은 있다.
다만 **광고주별 비공개 자료·로그인·상업 SaaS 운영**이 필요하면 용량과 별개로 전환해야 한다. 데이터만 옮기는 것으로 Pages의 용도 제한까지 해결되지는 않는다.

이하 MB/GB는10진수(1MB=1,000,000B), MiB/GiB는2진수다. 공식 Pages 문서는 GB의 정확한 바이트 환산을 명시하지 않아 성장표에 두 기준을 구분했다.

## 2. 현재 실측

### 범위와 방법

- 시작/종료 HEAD는 `e7422c16a0b86d0f37ec3b13dc0a05153f59ea6c`, main이다. README 배포 절, publish-pages.py, vite.config.js, Pages Actions 예시, NEXT-SESSION을 읽었다.
- **새 빌드를 하지 않았다.** 기존 dist(2026-11-17 23:24 파일)를 전용 Vite preview4190에서 측정했다. `--configLoader runner`로 설정 임시 번들 생성을 피했다. 다른 작업자의 서버는 사용하거나 종료하지 않았다. 직접 띄운4190 preview는 측정 후 종료했다.
- Playwright Chromium, 실제 CSS뷰포트1365×768, DPR1, scale1의 새 익명 문맥을 사용했다. 로컬/공개 각각 시작 화면→생활인구→상권 최초 진입, gzip파일1개를 추가 조회했다.
- 외부 브라우저 요청은 공개 사이트의 같은 경로 GET으로만 제한했다. 공개 실제 **23GET**, 차단0·오류0이다. 공식 문서 요청은 docs.github.com만 읽었다.
- allow-list 가로채기는 HTTP 캐시를 비활성화하므로 **차가운 최초 로딩** 측정이다. 재방문 캐시 효과를 측정한 결과가 아니다. TLS·TCP 전체 패킷 크기 대신 Resource Timing의 **encodedBodySize 합**을 전송 본문 기준으로 삼았다. 원시 request.sizes는 HTTP/2 헤더 처리와 chunk 오버헤드 차이가 있어 보조 기록으로만 보존했다.

### 저장된 파일

| 자료 묶음 | 파일 수 | 용량B | MB | 실제 .gz 파일 |
|---|---:|---:|---:|---:|
| 생활인구 일별+인덱스 | 317 | 354,641,335 | 354.64 | 285 |
| 요일·월구간 요약+인덱스 | 133 | 122,615,721 | 122.62 | 0 |
| 상권 매출·유동·경계 | 3 | 68,166,372 | 68.17 | 0 |
| 생활이동 출발·도착 | 2 | 4,761,660 | 4.76 | 0 |
| 행정동 매출 | 1 | 469,821 | 0.47 | 0 |
| 주민등록·전출입·인구구성 | 3 | 2,130,810 | 2.13 | 0 |
| 일반 경계·지역표·메타 | 4 | 334,611 | 0.33 | 0 |
| 관광 표본 | 1 | 2,752 | 0.003 | 0 |
| **public/data 전체** | **464** | **553,123,082** | **553.12** | **285** |
| **기존 dist 전체** | **471** | **555,347,631** | **555.35** | **285** |

- dist/data464파일은 현재 public/data와 **SHA256 전부 일치**했다. 앱·서체·CSS 등 나머지는2,224,549B다. JS/CSS가 모든 현재 소스로 재빌드됐다는 보증과는 구분한다.
- .gz285개 합은279,470,446B다. 10월31일은 평문JSON이고,1–9월 및11월12일이gzip이다. 요약133파일도 평문이다.
- 최대 파일은 `market-sales.json` **46,190,017B(약44.05MiB)**, 다음은 `market-population.json`15,983,278B, `market-areas.geojson`5,993,077B다.
- 전체 목록·최대20파일·각 해시는 [storage-audit.json](storage-audit.json), 읽기용 표는 [storage-audit.md](storage-audit.md)에 있다.

### 첫 로딩과 주제 진입

| 실행 구간 | 로컬 요청 | 로컬 압축 전송 본문 | 공개 요청 | 공개 압축 전송 본문 |
|---|---:|---:|---:|---:|
| 첫 시작 화면, 비동기 로딩 안정 후 | 18 | 3,474,383B | 18 | **3,261,309B** |
| 생활인구로 전환, 추가분 | 0 | 0 | 0 | 0 |
| 상권을 처음 열 때, 추가분 | 4 | 23,312,116B | 4 | **19,396,251B** |
| gzip 파일1개 형식 점검, 추가분 | 1 | 978,321B | 1 | 978,321B |

- 사용자가 생활인구를 고르기 전에 최신 일별 파일과 생활이동·전출입·행정동 매출·주민등록/인구구성·경계가 이미 내려온다. 생활인구 전환0요청은 자료가 필요 없다는 뜻이 아니라 **시작 화면에서 먼저 받았기 때문**이다.
- 상권은 처음 진입할 때 매출·유동·경계·자치구 경계4개를 받는다. 공개에서 압축된 매출만13,955,869B이고, 매출·유동·경계4파일은 브라우저 전송압축 해제 후 **68,217,768B**다. JSON 파싱 뒤 JS 객체 메모리·최대 힙은 미측정이다.
- 첫 시작→상권의 일반 경로 합은 공개 **22요청·22,657,560B(22.66MB)**다. 별도 gzip 점검1회는 일반 경로 합에서 제외했다.
- 세 서체 합1,312,840B로 첫 시작 압축 본문의 약40.3%다. 지역 자료의 분할·지연 로딩은 이미 일부 되어 있으므로 ‘모든553MB를 첫 화면에서 받는다’는 설명은 틀리다.
- 공개 전송압축 해제 합은 첫 시작10,958,472B다. .json.gz의 앱 내부 추가 해제까지 이 수치가 포함하는 것은 아니다.
- 공개 JS/CSS 이름은 로컬 dist와 같은 `index-CobtncSk.js`/`index-C4FDrChi.css`였다. NEXT-SESSION의 예전 자산명과 구분한다. 공개464파일 전체를 받아 일치 확인한 것은 아니다.

[정규화 전송량·응답 헤더](network-measurements.json) · [로컬 원시 기록](local-loading.json) · [공개 원시 기록](public-loading.json) · [공개 시작 화면](public-landing.png) · [공개 상권](public-market.png).

### 캐시와 gzip

| 공개 응답 표본 | Cache-Control | ETag | Content-Encoding | 해석 |
|---|---|---|---|---|
| HTML | max-age=600 | `W/"6afc640d-22e"` | gzip | 현재10분 신선도 |
| JS | max-age=600 | `W/"6afc640d-858f2"` | gzip | 해시 파일명이지만 응답TTL은600초 |
| 생활이동JSON | max-age=600 | `W/"6afc640d-244e0b"` | gzip | 평문파일의 전송압축 |
| 2026-01-01.json.gz | max-age=600 | `"6afc640c-eed91"` | 없음 | gzip파일 자체를 전송 |

공개 .json.gz는978,321B이고 본문 첫 바이트가 `1f8b`였다. **이 표본에서는 이중 gzip이 아니다.** Vite preview는 같은 파일을 Content-Encoding:gzip으로 보내 브라우저가2,425,474B JSON으로 자동 해제했다. 공개는 application/gzip으로 보내 앱이 해제한다. 기존 decodeStaticJson이 두 경우를 처리하는 구조다. 다른 모든 gz파일·브라우저·CDN 경로까지 전수 검사한 것은 아니다.

600초는 현재 응답의 freshness이며, ‘10분마다 반드시 파일 전체를 다시 받는다’는 뜻이 아니다. ETag가 있지만 조건부GET/304·실제 재방문·파일별 사용자 지정TTL 지원 여부는 이번에 확인하지 않았다. 로컬의 Cache-Control:no-cache를 공개 정책으로 간주하지 않는다.

### Git와 배포 이력

`git count-objects -vH`는 loose **36.82MiB**, pack **363.06MiB**, pack3개다. 로컬 전체 객체 표현은 약399.88MiB이며 **gh-pages 전용 크기가 아니다.**

로컬에는 gh-pages/origin-gh-pages ref와 보고서의 배포 커밋 객체가 없다. 따라서 요청한 `git rev-list --objects gh-pages`의 **실제 원격 이력 크기는 미확인**이다. 허용 외부 범위 밖인 GitHub 원격 Git 요청이나 fetch는 하지 않았다.

대신 읽을 수 있는 main 데이터 이력18개 스냅샷을 대조했다. 스냅샷 용량을 전부 합하면6.37GB지만, 고유 데이터blob은470개·584,621,637B다. 현재 데이터보다 과거 전용6blob·**31,498,555B**가 더 남고, 대부분 확장 전 매출31,051,569B다. 이 값은 **논리 객체 바이트**이며 pack의 추가 물리 용량과 같지는 않다.

publish-pages.py는 임시 저장소에서 이전 gh-pages를 fetch하고 soft reset으로 부모를 연결한 뒤 일반 push한다. 따라서 **바뀐/삭제된 옛 큰 파일과 옛 빌드 자산은 이력에 남는 구조**다. 그러나 같은 바이트는 같은blob을 재사용하며 main/public와도 내용이 같으면 같은 객체이므로 ‘매 배포마다553MB씩 복제’되지는 않는다. 소스 public/data도 main 이력에 남기므로 gh-pages만 orphan으로 바꿔도 모든 데이터 이력이 사라지지 않는다.

## 3. 공식 한도 — 확인일2026-11-18

| 항목 | 확인된 수치/조건 | 공식 출처 |
|---|---|---|
| 게시 사이트 | **최대1GB** | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| Pages source 저장소 | **1GB 권장** | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| 월 대역폭 | **100GB soft limit** | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| 빌드 횟수 | **시간당10회 soft**, custom Actions workflow는 예외 | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| 배포 시간/독립 배포 횟수 | **10분 timeout** / 별도 일·월별 횟수는 **미확인** | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| 현행 Git 경로의 파일 | **50MiB 초과 경고,100MiB 초과 차단**. 별도 Pages per-file상한은 **미확인** | [Large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) |
| 일반 저장소 권장 크기 | 이상적으로1GB 미만,5GB 미만 강력 권장. 일반 Git2GB push제한은 이번 조사에서 별도 확인하지 않음 | [Large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) |
| 비공개 저장소 Pages | Pro/Team/Enterprise 등 플랜 조건. source private와 site private는 별개 | [What is Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) |
| private site | Enterprise Cloud 조직의 private/internal project site 등 조건, 방문자에 source repo read권한 필요 | [Privately published sites](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/about-privately-published-github-pages-sites) |
| 상업 용도 | 온라인 사업·전자상거래·상업 거래 중개·상업 SaaS가 주목적인 무료 호스팅 용도는 허용되지 않음 | [추가제품약관 Pages절](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#pages) |

상업적 활용이 조금이라도 있으면 전부 금지라는 뜻은 아니다. 현재 서비스가 해당 범주인지 영업·계약·운영 성격을 확인해야 한다. 광고주 대상 유료 SaaS라면 데이터 분리만으로 이 조건을 해소하지 못한다. 불명확한 사용은 GitHub Support 확인이 필요하며 이번에 문의는 하지 않았다.

Actions용 Pages artifact의 tar<10GB 문구는 **포장 단계 조건**이지 게시 사이트1GB 제한을 없애는 예외가 아니다. Git LFS도 Pages에서 사용할 수 없다고 명시돼 있어 현재 배포의 우회책으로 보지 않는다. [Custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Git LFS](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage).

상세22개 확인 항목과 미확인은 [official-limits.md](official-limits.md), [official-limits.json](official-limits.json)에 있다. 다른 업체의 가격표·한도는 허용된 외부 조사 범위 밖이라 조회하지 않았다.

## 4. 성장 시나리오 표

### 관측값에 근거한 증가

- 일별gzip285개의 평균은 **980,598B/일**이다.365일 추가357.92MB다.
- 완성된1–10월 패턴의12코호트 합은 평균 **11.185MB/월**이다. 부분월11월은 평균 계산에서 제외했다.12개월 추가134.22MB다.
- 두 가지 합은 연 **492.14MB**다. 상권·생활이동·새 주제는 그대로 둔 최소 모델이다. 신규 제공 지연·행정동 수·형식·깊이 변경은 반영하지 않았다.

| 시나리오 | 전제 | 1년 후 사이트 | 먼저 만날 조건/시점 | 첫 로딩 예상 | Git 크기 예상 |
|---|---|---:|---|---|---|
| 인구 기간·현행 요약만1년 추가 | 현재 형식·모든 과거 파일 유지 | **1.047GB** | 1e9B 기준약330일(11개월),1GiB기준약384일 | 일별파일만 읽는 현재 방식이면 시작3.26MB 내외+인덱스 증가. 전체를 받지는 않음 | 고유 데이터 논리량약492MB 추가. 실제pack크기 미확인 |
| 지하철·버스 추가 **가정** | 위 증가+초기100MB,월30MB 추가 | **1.507GB** | 초기 적재 후약148~179일 | 새 주제를 요청 시 읽으면 기존 첫 화면 유지 가능. 일괄선로딩이면 추가 전송량만큼 증가, 수치미확인 | 새 논리 데이터약952MB,pack미확인 |
| 부동산 추가 **가정** | 위 기본 증가+초기200MB,분기50MB 추가 | **1.447GB** | 초기 적재 후약129~168일 | 거래기간/지역 분할 여부에 따라 달라 미확인 | 새 논리 데이터약892MB,pack미확인 |
| 위 두 주제를 함께 추가 **가정** | 초기300MB+월/분기 예산 합 | **1.907GB** | 약50~76일 | 모든 새 자료를 첫 화면에 넣으면 불리함. 실측 전 판단불가 | 새 논리 데이터약1.352GB,pack미확인 |
| 생활이동도 매일 누적 **가정** | 현재1일분 두JSON4.762MB를 분할 없이 매일 추가 | **2.785GB**(인구 증가 포함) | **새 날짜44일 추가 시 각 단일JSON이100MiB 초과**가 사이트 전체 한도보다 먼저 | 시작 화면에서 두JSON을 모두 받는 현재 구조는 날짜 수에 비례해 증가 | 신규 논리자료 약2.23GB,pack미확인 |

교통·부동산의100/200MB·월30/분기50MB는 **실제 파일 예측이 아닌 예산 대조용 가정**이다. 자료 확보·제공 차원·기간·필드·정밀도가 정해지지 않아 실제 수치와 비용은 미확인이다. 계산식·두 바이트 기준은 [growth-scenarios.json](growth-scenarios.json)에 있다. 월·분기 배치도 일별로 고르게 증가한다고 환산한 근사 시점이며, 실제 파일이 들어오는 날짜를 예측한 것이 아니다.

기존 상권 매출도 단일파일이다. 현재6분기46.19MB의 평균 밀도가 같다는 추가 가정에서 다음1분기 추가 시약53.89MB로 Git의50MiB 경고선을 넘고,4분기 추가는약76.98MB,8분기 추가는100MiB 차단선을 넘는다. 공식 자료가 언제 나오거나 같은 행 밀도를 유지할지는 이번에 확인하지 않았다. 다른 자료를 고정한 위1.047GB보다 실제 수직확장은 더 빠를 수 있다.

Git의 미래 물리 크기를 사이트 용량과 같은 숫자로 쓰지 않았다. 현재 local pack/loose 약400MiB에 새 gzip·JSON의 압축과delta효율이 다르게 작용한다. gh-pages 원격 이력 자체도 미확인이므로1년 후 정확한 저장소 사용량은 산출할 수 없다.

### 압축으로 가능한 연장

기존 JSON/GeoJSON179파일을 **메모리에서만 gzip(level6,mtime0)** 했고, 해제 바이트가 전부 원본과 같음을 확인했다.

| 묶음 | 현재 평문 | 메모리gzip | 잠재 절감 |
|---|---:|---:|---:|
| 10월 일별31개 | 75.108MB | 30.368MB | **44.740MB** |
| 패턴133파일 | 122.616MB | 51.993MB | **70.623MB** |
| 기타JSON/경계 및 인덱스 | 나머지 | 나머지 | 약55.98MB |
| **합계** | 273.653MB | 102.310MB | **171.342MB** |

현재 배포 파일을 해당gzip 표현으로 대체할 수 있다면 dist는 약 **384.005MB**다. 미래 월패턴도 같은 압축을 쓰는1년 뒤 모델은 **799.124MB**다. 작은 인덱스/encoding 메타 증가·배포 이전 버전 보존 공간은 제외한 근사치다. [압축 실험](compression-probe.json).

이는 변경 없이 켤 수 있는 옵션이 아니다. 모든 소비자·인덱스의encoding/path·일반JSON/gzip 양쪽 처리·과거 URL 호환성을 검증해야 한다. 먼저10월 일별은 이미 gzip 지원 로더를 쓰므로 상대적으로 작은 범위다. 전체 패턴/상권 압축은 별도 변경 묶음으로 검증한다. 공개 서버가 평문JSON도 이미 전송gzip하므로 **디스크 절감171MB가 첫 로딩171MB 절감이라는 뜻은 아니다.** Git의 옛 평문 이력도 자동으로 사라지지 않는다.

### 대역폭 기준

현재 공개의 차가운 본문만 단순 환산하면100GB soft limit은 시작 화면약 **30,662회**, 시작→상권약 **4,413회**에 해당한다. 사용자 수·허용 접속 수가 아니라 **캐시 없는 전송량의 환산값**이다. 실제로는 재방문/304·추가 날짜·패턴·CSV·다운로드·자동 수집 등이 달라진다. 운영 월 대역폭은 미측정이며, 이 수치를 정액 보장으로 사용하지 않는다.

## 5. 공개 범위 점검

현재 익명 GET으로 데이터가 내려왔고 서버·인증키가 없다. UI에서 숨긴 주제·파일도 정적 URL을 알면 내려받을 수 있다. 소스 저장소를 private로 바꾸는 것만으로 공개 Pages 파일을 보호할 수 없다. Enterprise private Pages는 조건과 repo read권한이 붙으며 광고주별 고객 로그인/자료 분리와 다른 모델이다.

저장돼 있던 공식 원문을 읽어 확인한 범위:

- OA-23016 생활인구와 OA-22300 생활이동의 로컬 공식 페이지에는 **공공누리1유형·출처표시·상업적 이용/변경 가능** 표시가 있었다.
- 저장된 상권 유동 공공데이터포털 페이지에도 출처표시1유형이 있었다.
- 반면 동 경계 메타에는 **별도 경계 라이선스 문구가 없어 재배포 범위 확인 필요**라고 남아 있다. 모든 자료·서체·경계·향후 교통/부동산의 이용 조건을 전수 확인한 것은 아니다.

[기존 원문·해시 점검](public-scope-audit.json). 이번 외부 허용 범위에 Seoul/공공누리 사이트 재조회는 없어 **기존 저장본 증거이며 현재 약관의 최종 확인이 아니다.** 출처·변경/집계 방식·결측 보존을 파일 단위로 명확히 제공하고 자료별 재배포 조건을 관리해야 한다.

공공자료 공개 자체가 광고주 분석 도구와 반드시 충돌하지는 않는다. 다만 광고주 전용 후보·메모·비공개 매체 가격·계약·구매자료·개인정보·서버 비밀키를 같은 public/data에 넣으면 분리가 되지 않는다. 브라우저의메뉴 숨김·프런트 비밀번호·번들에 넣은 키는 접근 제어가 아니다.

공개 공통 데이터는 정적으로 유지하고, private 객체 저장소+로그인/권한 검증+짧은 서명URL 또는 API로 보호된 부분만 나누는 구조는 가능하다. 권한을 확인하는 외부 서비스가 필요하며 현행 무인증 Pages만으로 구현되는 기능은 아니다. 상업 SaaS의 Pages 용도 제한과 데이터 원본의 상업 이용 허용은 **서로 다른 조건**이다.

## 6. 대안 비교와 전환 기준

다른 업체의 가격·용량·대역폭은 허용된 docs.github.com 밖이라 **모두 미확인**이다. 아래 운영/전환 난이도는 현재 코드에 근거한 설계 판단이며 상품 보장을 뜻하지 않는다.

| 대안 | 비용 | 용량·대역폭 | 접근·캐시 제어 | 운영 부담 / 전환 난이도 |
|---|---|---|---|---|
| ① 현행+분할/지연/압축 | 기존계정 실제청구 미확인 | Pages1GB/100GB soft는 그대로 | 현재공개·600초. 내용해시·버전경로 가능, 임의헤더 지원은미확인 | 낮음~중간. 공통로더·인덱스·기존URL 회귀 필요 |
| ① Actions artifact 배포 | 표준public runner/Pages 무료 안내, 플랜/저장과금 실제적용은미확인 | 사이트1GB 유지,tar<10GB는 포장조건. custom Actions는10builds/h 예외 | 공개범위·Pages캐시 그대로 | 낮음~중간. 기존workflow 예시 활용,gh-pages 스냅샷 추가커밋은 피할 수 있음. **main에 둔 데이터 이력/100MiB는 남음** |
| ① orphan·단일커밋 강제푸시 | 직접가격 미확인 | 최신사이트 제한 그대로. 브랜치과거 이력만 축소 가능 | 공개범위·캐시 그대로 | 중간~높음. 되돌리기·백업 영향,서버객체 즉시삭제 보장없음. main이력도별도라 우선순위 낮음 |
| ② S3/R2/GCS 등 데이터 분리 | **금액미확인**, 사용량견적 필요 | 각상품 수치미확인. Pages는작은화면만 남길 수 있음 | 저장소/CDN·권한기능 검증 필요,서명URL/만료정책 설계 | 중간. 데이터baseURL·CORS·manifest·해시·실패복구·원자적버전 관리 |
| ② GitHub Releases | 계정실제비용미확인 | 공식release당1000assets·각<2GiB,전체용량/대역폭제한없음 명시 | 직접브라우저JSON·CORS·리디렉션·캐시·private접근은미검사 | 중간. 장기자료/내려받기묶음 후보. 상시JSON CDN으로 바로 채택하기 전 실험 필요 |
| ③ Cloudflare Pages/Netlify/Vercel | **모두미확인** | **모두미확인** | 실제인증·헤더·요금제·상업조건 미확인 | 중간. 단순정적 화면 이전은 작지만 데이터/CDN/권한/약관까지 함께 검증 |
| ④ 서버·API/서버리스 | **미확인**, 견적필요 | 구현/호스팅별미확인 | 서버에서고객별권한·쿼리범위·캐시를 통제할 수 있는 설계 | 높음. 인증·비용통제·관측·백업·정의/결측/집계 회귀 필요 |

[Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), 확인2026-11-18. Releases의한도는상시웹데이터용SLA나무제한운영보장을뜻하지않는다.

**권고 순서**는 공개 프로젝트 시안이라면①로 낭비를 줄이면서②를 준비하고, 아래 조건에서 넘기는 것이다. 전체 API를 당장 만들 필요는 없지만, 상업/권한 조건이 생기면②의데이터이동만으로 끝내지 않는다.

| 내부 전환 기준 제안(공식 한도가 아님) | 판단/행동 |
|---|---|
| 광고주별 비공개 자료·민감자료·고객별 권한이1건이라도 필요 | 용량과 무관하게public파일 적재를 중단하고 인증/보호저장소/API 설계. Pages사업용도도먼저검토 |
| 상업 SaaS가 주목적이 되거나 해당성이 불명확 | Pages계속사용을 용량만으로 결정하지 말고 공식조건/Support확인. 필요하면③+④ 또는적합한정적호스팅 |
| dist700MB 또는90일내800MB 예측 | 새주제 적재 전②의실증·이전 준비. 월별증가량과실제배포시간 기록 |
| dist800MB 도달 | 1GB를기다리지말고 데이터이전/배포묶음축소완료 목표. 여유는캐시전환·구버전·성장오차용 |
| 월전송50GB 또는cold상권수천회/월 예측 | 100GBsoft의 절반을운영검토선으로설정,캐시/조회범위/데이터CDN 검토 |
| 단일파일80MiB, 또는다음배치가100MiB를넘김 | 분기/날짜/지역분할 또는 Git밖 데이터호스팅. 경고50MiB때부터계획 |
| 새주제3개이상 혹은 한 화면에서 읽지 않는 대형파일 선로딩 | 주제 수자체를서버필수조건으로삼지않고,주제별데이터계약/지연로딩/분할을적재전확인 |

## 7. 즉시 개선안 — 제안만, 미적용

| 제안 | 향후 바뀔 파일 | 검증 방법 |
|---|---|---|
| 배포 전 용량 예산·대형 파일 점검 | `scripts/publish-pages.py` 앞단의 새 읽기 전용 검사 스크립트, 향후 CI workflow | dist 총 바이트·최대 파일·전월 증가·raw 포함0을 기록. 경고와 중단을 구분하고 현재555.35MB 재현 |
| gh-pages 추가 이력 대신 Actions artifact 검토 | 새 `.github/workflows/pages.yml`을 기존 `docs/pages-workflow-example.yml`에서 준비. 배포 안내는 감독자가 수정 | artifact의 데이터 해시·원본/비밀키 제외·배포 권한·롤백 검증. 이번에는 활성화하거나 배포하지 않음 |
| 10월 일별31일 gzip 통일 | `scripts/prepare-population-history-daily.py`, 일별 인덱스/encoding, 배포 파일 선택 | 기대44.740MB 절감. 해제 바이트·원값 불변,31일 조회·월 경계·두 응답 형식·과거 URL/캐시 확인. 구파일까지 함께 배포하면 절감되지 않으므로 보존 기간과 배포 목록을 함께 설계 |
| 쓰지 않는 자료 선로딩 줄이기 | `src/main.tsx`, `src/ExtraDashboard.tsx`, `src/ResidentContext.tsx` 등의 주제별 조회 시점 | 시작18요청·3.261MB와 비교. 첫 진입/재진입·같은 상태·오류 복구·응답 순서·원자료 값 확인. w17 구조 점검과 합쳐 결정 |
| 큰 상권 자료의 날짜/분기 분할 | 수집/prepare 스크립트, 데이터 manifest, `src/MarketExplorer.tsx` | 상권 첫 진입19.396MB를 기준으로 선택·비교 분기만 읽는지 확인. 후보·CSV·0건·결측·공통 눈금도 대조 |
| 전체 JSON/경계 사전gzip는 별도2차 검증 | 해당 prepare, 공통 로더 `src/static-json.ts`, 패턴/상권 소비자·manifest |179파일 해제 일치에 더해 실제 공개 응답·버전 호환성 검증. 잠재171.342MB는 파일 표현의 절감이며 로더 수정은 필수 |
| 내용 해시 경로·캐시 버전 통일 | `src/main.tsx`, `src/PopulationPatterns.tsx`, `src/MarketExplorer.tsx`, prepare manifest | 최신 인덱스와 자식 파일의 버전 일치, 오래된 HTML/index가 참조하는 파일 존재,600초 캐시 전환 중404/혼합 버전0 확인. 사용자 지정TTL 지원을 가정하지 않음 |
| gh-pages는 원격 실측 후 별도 이력 정리 검토 | 향후 배포·이력 정리 절차. 이번에는 변경 없음 | 허용 범위에서 원격 크기를 읽고 백업·롤백·main 이력 영향을 확인. orphan/강제push/gc를 안전한 자동 정리로 취급하지 않음 |

공개 공통 자료가 지금처럼 배치로 갱신된다면 정적 배포 자체를 바로 버릴 필요는 없다. 다만 압축·Actions를 적용했다고 용량·상업 조건·권한 문제가 모두 해결되는 것은 아니다.

## 8. 미검사 범위와 한계

- 로컬에 gh-pages ref·객체가 없어 그 브랜치의 실제 크기·기간별 증가는 미확인이다. 금지된 원격 Git 요청/fetch를 수행하지 않았고, main 이력으로 대신 확정하지 않았다.
- 공개464파일 전수, 실제 월 트래픽, 조건부304·재방문, 다른 망/지역·저속망·부하·최대 메모리·전체 배포 시간은 미검사다. 공개 측정은23GET의1회 cold 흐름이다.
- 새 빌드·배포·단위검사·화면 E2E 전수는 이번 범위가 아니다. 기존 dist와 public의 파일 일치 및 로딩 측정이며, 최신 소스와 공개 화면 전체의 품질 승인이 아니다.
- 모든 원본의 현재 라이선스, 광고주 서비스의 법적 분류, 계정 요금제·청구액, 다른 업체의 한도·SLA는 미확인이다. 특히 경계 재배포 조건과 Pages의 상업 SaaS 조건은 별도 확인해야 한다.
- 미래 크기는 관측 평균의 외삽과 명시한 예산 가정이다. 교통·부동산 실자료를 측정한 것이 아니며 Git 물리pack이 같은 크기로 증가한다고 가정하지 않았다.
- 실행 범위는 기존 파일·Git 읽기, 메모리 압축, 로컬 preview, 격리 Playwright GET, 허용 공식 문서 읽기다. 산출물은W18 폴더에만 썼다. src/public/scripts/data/기존 docs는 수정하지 않았고 commit/push/reset/checkout/clean/gc·publish-pages는 실행하지 않았다. 다른 작업자의 서버·파일도 건드리지 않았다.

원시 근거는 각 JSON과 `loading.log`, 재현 스크립트 `storage-audit.py`·`measure-loading.mjs`·`growth-scenarios.py`·`compression-probe.py`에 남겼다. 프로그램 구조 전반은 w17 결과와 감독자가 함께 판단할 범위다.

독립 Codex 읽기 검토에서 실측 수치와 가정 구분을 대조했다. 치명적 수치 오류·요구 누락은 발견되지 않았고, GB/GiB 차이와 월·분기 배치의 균등 증가 가정을 보완했다.
