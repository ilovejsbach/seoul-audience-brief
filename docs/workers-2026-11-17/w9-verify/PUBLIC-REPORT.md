# GitHub Pages 공개 배포 검증

검사 시각: 2026-11-17T03:57:54.083337+00:00. 대상: `https://ilovejsbach.github.io/seoul-audience-brief/`. 외부 요청은 `ilovejsbach.github.io`로 제한했다. 공개 브라우저 실행은 설치된 Chrome에서 1365×768, DPR 1로 수행했다.

## 정적 배포 파일

- 공개 `index.html`: HTTP 200, text/html; charset=utf-8, 558바이트. 기대 자산 `./assets/index-DtotdIpr.js`와 `./assets/index-7CTjbMjC.css`를 모두 참조한다.
- 공개 `data/commerce.json`: HTTP 200. 공개·로컬 모두 469821바이트이며 SHA256은 `e32d6d0840b21907d9cef398a1dd33e038ef23d81d054f90817c2888b5239543`로 같다.

## 공개 화면 여정

- 브라우저: Chrome 157.0.8103.79. 분석·시연 상태: **passed / passed**. 각 여정의 판정 수는 14 / 14이다.
- 측정한 뷰포트: 분석 1365×768, 시연 1365×768, 배율 1. 요청 화면 크기와 실제 innerWidth/innerHeight가 일치했다.
- 두 모드에서 2026Q2, 서울 합계, 종로1·2·3·4가동 매출과 여섯 시간대 값을 로컬 독립 원자료 기대값과 대조했다. 동명 표기, 출처 안내, 추이→본문→지도 복귀와 조건 보존도 통과했다.
- 외부 URL 요청 시도: 0. 페이지 오류: 0. 브라우저 외부 요청은 공개 호스트만 허용했다.

캡처: `public-analysis-seoul-2026q2.png`, `public-analysis-jongno-dong-2026q2.png`, `public-analysis-source-notice.png`, `public-analysis-trend-popup.png`, `public-analysis-return-map-2026q2.png`, `public-analysis-return-map-2026q1.png`; 시연 화면도 같은 이름 앞에 `public-presentation-`을 붙여 저장했다. 수치와 요청·오류 상세는 `public-browser-results.json`, HTML/자료 해시는 `public-static-check.json`에 있다.

**판정: 공개 검증 통과.** 공개 HTML 자산, 공개 자료 파일 해시 및 1365×768 분석·시연 대표 여정이 기대값과 일치했다. 이 판정은 요청된 대표 여정 범위에 한정된다.
