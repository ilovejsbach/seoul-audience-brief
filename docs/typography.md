# 대시보드 서체 기준

2026-11-14 사용자 승인에 따라 IBM Plex Sans KR로 통일했다. 분석용과 시연용은 같은 서체를 사용하고 크기·여백으로 구분한다.

- 서체: 공식 `@ibm/plex-sans-kr` 1.1.0 패키지의 complete/hinted WOFF2 원본. Regular 400, Medium 500, SemiBold 600만 사용한다.
- 배포: 외부 글꼴 서버 대신 사이트 자체 파일로 제공한다. Vite가 글꼴 경로를 빌드하므로 GitHub Pages의 하위 경로에서도 동작한다. 글꼴이 준비되는 동안에는 운영체제의 한글 고딕으로 표시한다.
- 라이선스: SIL Open Font License 1.1. 원본 파일을 수정하지 않았으며 `public/fonts/IBM-Plex-OFL.txt`에 저작권과 라이선스를 보존한다.
- 분석용: 본문 16px, 표 15px, 주요 제목 24–28px. 시연용: 본문 16px, 주요 제목 28px, 핵심 수치 40px를 중심으로 구성한다. 지도·축·각주처럼 밀도가 높은 요소는 더 작게 둔다.
- 굵기: 본문 400, 조작부 500, 제목·핵심 수치 600. 지나친 음수 자간을 줄이고 숫자는 자릿수를 맞춰 비교한다.

공식 출처: https://github.com/IBM/plex/tree/master/packages/plex-sans-kr

검증: Chrome에서 400·500·600 글꼴 로딩과 실제 적용 서체를 확인했다. 분석용·시연용 각각 1440×900, 1280×800에서 페이지 및 27조원대 매출 수치의 가로 넘침이 없었다. 시작 화면, 생활인구 조건, 매출 조건, 시연 페이지 이동 회귀 4건이 통과했다. 기록: `tests/e2e-artifacts/typography-results.json`.
