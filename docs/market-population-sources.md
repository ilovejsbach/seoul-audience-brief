# 상권 길단위인구 실제 확보 결과

확인·확보일: 2026-11-14. **전체 실제 자료를 확보했다. API 인증키나 샘플 건수 제한을 우회하지 않았다.**

## 확보 방법

[서울 열린데이터광장 OA-15568](https://data.seoul.go.kr/dataList/OA-15568/S/1/datasetView.do)의 FILE 탭에는 파일이 없지만, [Sheet 화면](https://data.seoul.go.kr/dataList/sheetView.do?infId=OA-15568&srvType=S&serviceKind=1)의 **CSV 내려받기**는 공개 제공된다. 화면이 사용하는 전체 다운로드 폼을 그대로 POST했다.

- 다운로드 URL: `https://datafile.seoul.go.kr/bigfile/iot/sheet/csv/download.do`
- 원본 폼: `srvType=S`, `infId=OA-15568`, `serviceKind=1`, `pageNo=1`, `gridTotalCnt=`, `ssUserId=SAMPLE_VIEW`, `strWhere=`, `strOrderby=STDR_YYQU_CD DESC`, `txtFilter=`
- 여기서 SAMPLE_VIEW는 공개 Sheet가 기본으로 넣는 다운로드 폼 값이다. API sample 키로 전체 레코드를 반복 조회한 것이 아니다.
- 원본 CSV: `data/raw/commerce/market-population-public-download.csv`, CP949, **8,543,807 bytes**.
- 실제 전체 행수 **36,281**로 공식 미리보기 `totalCount=36281`과 일치한다. 분기·상권 코드 조합의 중복은 없다.
- 요청 원문: `data/raw/commerce/market-population-public-request.json`; 해시·출처·분기별 경계 연결·정제 검증: `data/raw/commerce/market-population-manifest.json`.

[공공데이터포털 15147350](https://www.data.go.kr/data/15147350/fileData.do)은 기관 자체 다운로드로 연결하는 목록이며 별도의 독립 CSV를 발견하지 못했다. [서울 허브 1831](https://data.seoul.go.kr/bsp/wgs/dataView/data300View/1831.do)도 외부 제공처 연결 유형이었다. 이번 실제 확보 경로는 위 공식 공개 Sheet 다운로드다.

## 기간·공간과 연결 범위

**2021년 1분기~2026년 2분기, 총 22개 분기**다. 전체 기간 고유 상권 코드는 1,650개이며 기존 공식 상권 경계 `OA-15560_5.zip`의 `TRDAR_CD`와 모두 연결된다. 코드 미일치는 0이다.

| 분기 | 인구 자료의 상권 수 | 경계 연결 수 | 원본 행이 없는 경계 코드 |
|---|---:|---:|---|
| 2025 Q1 | 1,650 | 1,650 | 없음 |
| 2025 Q2 | 1,649 | 1,649 | 3110946 |
| 2025 Q3 | 1,648 | 1,648 | 3110946, 3111002 |
| 2025 Q4 | 1,648 | 1,648 | 3110946, 3111002 |
| 2026 Q2 | 1,648 | 1,648 | 상세는 manifest 참조 |

없는 행을 0으로 추가하지 않았다. 상권 유형은 골목상권·발달상권·전통시장·관광특구다. 경계는 과거 수정 ZIP이고 대표 구/동 연결도 그 DBF 기준이다. **코드가 일치한다는 사실과 최신 표준단위구역의 형상이 동일하다는 보장은 다르다.** 구·동 소속의 과거 변경과 상권 간 영역 겹침을 별도로 검증해야 한다.

매출 자료는 현재 2025년이고 인구는 2026 Q2까지 있다. 두 자료를 함께 보여 줄 때는 같은 분기를 명시적으로 선택해야 한다. 서로 다른 최신 분기를 자동으로 묶어 비교하지 않는다.

## 정제 파일과 계약

`public/data/market-population.json`에 다음 구조로 저장했다. 전체 분기를 포함하며 약 16MB다.

- 최상위: `sourceUrl`, `title`, `unit`, `periods`, `timeBands`, `ageBands`, `weekdayLabels`, `records`, `coverage`, `notes`, `provenance`, `definitionReferences`.
- 행: `period`, `code`, `name`, `marketTypeCode`, `marketTypeName`, `districtCode`, `districtName`, `dongCode`, `dongName`, `total`, `male`, `female`, `agePopulation`, `timePopulation`, `weekdayPopulation`.
- `period`는 20254처럼 기준년분기 코드이고, `code`는 상권 코드 문자열이다. `districtCode`/`dongCode`는 경계 DBF의 대표 행정구역 연결이다.
- 연령 배열 순서: 원본 10대 분류, 20대, 30대, 40대, 50대, 60대 이상. 첫 분류의 정확한 최저 연령 경계는 매뉴얼 확인 전까지 임의로 10~19세로 고정하지 않는다.
- 시간 배열 순서: 00~06, 06~11, 11~14, 14~17, 17~21, 21~24.
- 요일 배열 순서: 월~일.
- 원본 숫자 그대로 정수로 옮겼다. 성·연령·시간·요일은 **각각의 분포**이며 모두 결합된 교차표가 아니다. 예를 들어 여성 20대 금요일 18시 인구를 이 파일만으로 계산하지 않는다.

최종 검증에서 **36,281행 전부**의 총계·남녀·연령 6개·시간 6개·요일 7개 값을 원본 CSV와 필드별로 비교해 일치했다. 원본/정제 SHA-256과 바이트 수를 manifest에 보존했다. 원본 CSV는 다운로드 후 변경하지 않았다.

## 숫자의 의미: 확정한 내용과 미확정한 내용

[공식 제공정보 PDF](https://golmok.seoul.go.kr/images/seoul_info.pdf)는 분기 단위 제공과 서울시·KT 생활인구에서 10m 길이 단위로 배분한 유동인구라는 정의를 제시한다. 원문 PDF를 `data/raw/commerce/market-population-official-seoul-info.pdf`에 보존했다. [공식 데이터 출처](https://golmok.seoul.go.kr/source.do)는 집계구 생활인구를 50×50 그리드로 배분하고 집객시설·배분 로직을 거쳐 길단위 자료를 만든다고 설명한다.

[공식 서비스 메인](https://golmok.seoul.go.kr/)에는 일평균 유동인구라는 표시가 있다. 그러나 공식 리포트에는 3개월간 유동인구라는 축 설명도 있으며, 이번 공개 CSV의 `총_유동인구_수`가 화면 일평균과 정확히 어떻게 연결·환산되는지 명시한 식은 확인하지 못했다. 확인한 PDF도 그 환산식까지 제시하지 않는다. 따라서 다음과 같이 보수적으로 표시해야 한다.

- 권장 지표명: **분기 제공 유동인구 지표**.
- 권장 단위: **명(원본 추정치)**.
- 즉시 보일 설명: 원본 집계값이며 특정 시각 체류 인구·하루 고유 방문자·출입 인원수가 아니다. 일평균 환산은 검증하지 않았고 임의 나눗셈을 하지 않았다.
- 성·연령·시간·요일별 값은 해당 분포의 원본 수치다. 서로 겹치는 상권을 더해 서울 고유 인구를 만들지 않는다.
- 특정 상권의 동기간 증감·유형 내 비교와 시간/요일 분포를 탐색하는 데 사용한다. 광고 노출·도달·구매전환의 확정 수치로 표현하지 않는다.

포털 메타데이터의 갱신주기 “월간”은 조회 시간 해상도가 월이라는 뜻이 아니다. 실제 키와 제공정보는 분기다. PDF의 과거 제공기간 안내보다 2026년 공식 데이터 페이지의 2021년 이후 제공 공지가 우선한다.

## 재현과 독립 검증

정제 재현은 [prepare-market-population.py](../scripts/prepare-market-population.py)를 사용한다. 네트워크 요청 없이 보존된 공식 CSV와 경계 DBF, manifest의 출처·표시 설정으로 같은 공개 JSON을 만든다.

```sh
python3 scripts/prepare-market-population.py --check
python3 scripts/prepare-market-population.py
python3 scripts/validate-market-data.py
```

첫 명령은 파일을 변경하지 않고 현재 공개 JSON과 바이트가 같은지 검사한다. 두 번째는 공개 JSON만 재생성하며 원본 CSV/ZIP을 수정하지 않는다. 현재 출력은 **15,983,278 bytes**, SHA-256 `17b552987738359be7d770ee431f81b1b49711a74f5de74079c5a1895f49be66`으로 바이트 재현 검사를 통과했다.

독립 검증 [validate-market-data.py](../scripts/validate-market-data.py)는 정제 스크립트를 가져다 쓰지 않고 원본 CSV·매출 ZIP을 별도로 읽는다. 인구 **36,281행**, 매출 **85,732행**의 키·원값·성별·연령·시간·요일 배열을 전수 대조했으며 **불일치 0**이다. 기간·상권코드·업종코드 62개·경계 코드 일치와 공덕역 원본 기대값도 검사한다.

결과는 [market-data-validation.json](../tests/e2e-artifacts/market-data-validation.json)에 저장했다. 성별·연령·6개 시간구간·요일 분포의 합계와 총계 차이는 진단 결과로 별도 기록하며, 항상 같다고 가정하거나 차이를 0으로 강제하지 않는다. 이 검증은 코드·원값 전달의 정확성을 확인하며 경계의 최신성이나 원자료의 일평균 환산 정의까지 보증하지 않는다.
