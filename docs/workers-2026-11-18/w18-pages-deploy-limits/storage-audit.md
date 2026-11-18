# 배포 데이터·로컬 Git 저장공간 실측

확인시각(UTC): 2026-11-18T00:02:09.300574+00:00. HEAD `e7422c16a0b86d0f37ec3b13dc0a05153f59ea6c`. 외부 요청·빌드·배포·Git 쓰기 없음. 산출물 폴더에만 스크립트/JSON/이 문서를 작성했다.

## 핵심 사실

- `public/data`는 464파일 **553,123,082B(553.123MB / 527.499MiB)**, `dist`는 471파일 **555,347,631B(555.348MB / 529.621MiB)**다. `dist/data`464파일은 public 원본과 SHA256이 모두 같다.
- 로컬에는 gh-pages 및 origin/gh-pages ref가 없다. 기존 보고서의59630fc/766957d/68c8cd1 객체도 없으므로 **실제 원격 gh-pages 이력 크기는 미확인**이다. fetch나 원격 요청은 하지 않았다.
- 배포 스크립트는 이력을 연결해 일반 push하므로 변경된 과거 파일은 남는다. 다만 바이트가 같은 파일은 같은 Git blob을 재사용하므로 배포마다 전체553MB가 새 blob으로 중복 저장되는 구조는 아니다.

## 파일 실측

표의 MB는1,000,000B이고 MiB는1,048,576B다. 파일 크기는 payload 길이이며 디스크 할당량·HTTP 전송량과 다르다. gz는 저장 파일의 접미사이며 실제 HTTP Content-Encoding과 구분한다.

| 자료/폴더 | 파일 수 | 총 B | 총 MB | .gz 파일 수 | 가장 큰 파일(B) |
|---|---:|---:|---:|---:|---|
| `commerce.json` | 1 | 469,821 | 0.470 | 0 | `commerce.json` (469,821) |
| `districts.geojson` | 1 | 51,396 | 0.051 | 0 | `districts.geojson` (51,396) |
| `dongs-metadata.json` | 1 | 2,161 | 0.002 | 0 | `dongs-metadata.json` (2,161) |
| `dongs.geojson` | 1 | 249,651 | 0.250 | 0 | `dongs.geojson` (249,651) |
| `living-mobility-arrival.json` | 1 | 2,382,385 | 2.382 | 0 | `living-mobility-arrival.json` (2,382,385) |
| `living-mobility.json` | 1 | 2,379,275 | 2.379 | 0 | `living-mobility.json` (2,379,275) |
| `market-areas.geojson` | 1 | 5,993,077 | 5.993 | 0 | `market-areas.geojson` (5,993,077) |
| `market-population.json` | 1 | 15,983,278 | 15.983 | 0 | `market-population.json` (15,983,278) |
| `market-sales.json` | 1 | 46,190,017 | 46.190 | 0 | `market-sales.json` (46,190,017) |
| `population` | 317 | 354,641,335 | 354.641 | 285 | `population/250_LOCAL_RESD_ADMDONG_20261010.json` (2,427,250) |
| `population-patterns` | 133 | 122,615,721 | 122.616 | 0 | `population-patterns/202603-all-all.json` (1,007,417) |
| `regions.json` | 1 | 31,403 | 0.031 | 0 | `regions.json` (31,403) |
| `resident-population.json` | 1 | 50,506 | 0.051 | 0 | `resident-population.json` (50,506) |
| `residential-migration-demographics.json` | 1 | 931,047 | 0.931 | 0 | `residential-migration-demographics.json` (931,047) |
| `residential-migration.json` | 1 | 1,149,257 | 1.149 | 0 | `residential-migration.json` (1,149,257) |
| `tourism.json` | 1 | 2,752 | 0.003 | 0 | `tourism.json` (2,752) |

전체 .gz는 **285개·279,470,446B**다. 인구 폴더317파일은 일별316개+index1개이며, 패턴133파일은11개월×12코호트+index1개다. `dist`에서 데이터 외 부분은2,224,549B다. 현재 최대 단일 파일은 `market-sales.json`46,190,017B다.

## Git 실측과 해석

`git count-objects -vH` 원문:

```text
count: 424
size: 36.82 MiB
in-pack: 1956
packs: 3
size-pack: 363.06 MiB
prune-packable: 0
garbage: 0
size-garbage: 0 bytes
```

- 위 수치는 **이 로컬 저장소 전체 객체**의 loose/pack 상태다. gh-pages만의 크기도, GitHub 원격이 청구/제한에 세는 정확한 크기도 아니다. shallow 저장소는 아니지만 gh-pages ref를 받지 않은 상태다.
- 로컬 전체 객체2380개 중 blob1804개는 논리적 원문627,473,124B, 해당 로컬 객체 표현의 합417,893,007B다. delta·공유 객체 때문에 표현 크기를 브랜치별 전용 사용량으로 해석하면 안 된다.
- `git rev-list --objects gh-pages`는 ref 부재로 사용할 수 없었다. 외부/쓰기 금지 때문에 fetch하지 않았다. `git cat-file --batch-all-objects`로 로컬 commit99개도 확인했으나 배포 스크립트의 Publish/Update verified Seoul briefing dashboard 커밋은 발견되지 않았다.
- 대조 가능한 **main의 public/data 이력**만 별도 측정했다. 이것은 gh-pages 이력의 대체 실측이 아니며, Git의 중복 제거와 변경 파일 보존을 설명하는 보조 근거다.
- main의 데이터 변경 스냅샷은18회다. 각 스냅샷 바이트를 단순 합하면6,370,573,130B지만, 고유 데이터 blob은470개·**584,621,637B**다. 현재464파일553,123,082B보다 과거 전용6blob·**31,498,555B**가 추가로 남아 있다.
- 과거 전용 데이터의 대부분은 확장 전 `market-sales.json`31,051,569B다. 나머지는 예전 commerce/resident/index다. 실제 디스크에서는 압축·delta가 적용될 수 있으므로 이31.5MB를 pack의 추가 크기라고 단정하지 않는다.
- 배포 스크립트는 임시 저장소에서 기존 gh-pages를 fetch하고 soft reset으로 부모를 연결한 뒤 새 커밋을 만든다. `git add`가 같은 파일에 새 blob을 항상 만드는 것은 아니다. 신규 날짜는 새 blob을 더하고, 기존 파일의 값/직렬화/압축 결과가 바뀌면 이전 blob과 새 blob이 함께 이력에 남는다.
- 따라서 증가 위험은 **신규 날짜의 누적 + 수정된 큰 단일 JSON의 과거 버전 + 빌드 자산 이력**이다. 동일 데이터로 화면만 자주 배포한다고553MB×배포횟수로 증가한다고 추정해서는 안 된다.

## 성장 계산에 사용할 입력

- gzip 일별285개 합279,470,446B, 평균 **980,598.06B/일**, 최소977,670B·최대983,299B다.
- 완성된1–10월 패턴12코호트는 월평균 **11,185,065.2B/월**이다. 부분월11월(12일)은10,736,431B이므로 완성월 성장 평균에서 제외했다.
- 현재 방식 그대로365일과12개월 요약을 더하면 일별 **357,918,290B** + 패턴 **134,220,782B**, 합 **492,139,073B**가 추가된다. 다른 자료·앱 자산을 고정한 `dist` 추정은 **1,047,486,704B (약1.047GB)**다.
- 이 값은 현재 행정동/시간/코호트/JSON 직렬화와 모든 과거 자료를 유지한다는 단순 외삽이다. 제공 지연·행정동 증감·형식 변경·요약 재설계·저장소 delta효율을 예측한 값이 아니다. 사이트 한도는 부모가 확인하는 공식 문서의 단위와 비교해야 한다.
- 현재10월은31개 일별 JSON이 평문으로 남아 합 **75,108,452B**다. 같은 바이트를 메모리에서 gzip(level6,mtime0)하면 **30,368,252B**, **44,740,200B (약44.740MB)**를 줄일 수 있었다. 실제 public/dist 파일은 바꾸지 않았다. 인덱스 encoding/bytes/sha·브라우저 해제·기존 원값 불변을 검증해야 하는 개선 후보다.

## 한계와 재현

- `storage-audit.json`에 모든 파일 크기/SHA256, 자료별 합계, 최대20파일, pack 파일 크기, 전체 객체 유형, main 이력 변경 스냅샷, 과거 blob, 성장 입력을 저장했다. 재현 스크립트는 같은 폴더의 `storage-audit.py`다.
- 측정 전후 HEAD가 같고 public/dist 파일 크기·mtime 변동은0개였다. 신규 빌드하지 않았으므로 **기존 dist 실물**을 측정한 결과다. dist/data는현재public와일치하지만, dist의JS/CSS가모든최신소스수정으로재빌드됐다는주장은하지않는다.
- `.git/objects`의 파일시스템 할당량 `du -sk`는409,568KiB, pack 폴더371,860KiB였다. sparse/메타데이터/할당 단위 때문에 count-objects의 논리적 객체 표현과 조금 다를 수 있다.
- 공개 웹 요청 수·전송량·Content-Encoding·캐시는 부모의 Playwright/GET 측정 담당이며 여기서 추정하지 않았다. GitHub 원격 저장소 크기·gh-pages 실제 누적 이력은 미확인이다.
