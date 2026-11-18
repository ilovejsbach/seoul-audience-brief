# GitHub Pages 공식 한도와 공개 범위

확인일: **2026-11-18**. 허용된 `docs.github.com` 문서만 읽었다. 코드·설정·Git은 바꾸지 않았다. 다른 호스팅사의 가격표는 조회하지 않았다.

## 주요 판단

- 게시 사이트 **1 GB**는 상한이다. 월 **100 GB**, 시간당 **10회 빌드**는 soft limit이다. Actions의 빌드 횟수 예외가 사이트 용량도 늘려 주지는 않는다.
- 비공개 저장소에서 Pages를 게시할 수 있다는 것과 사이트 접근을 비공개로 제한할 수 있다는 것은 다르다.
- 서비스가 상업 SaaS나 거래를 주목적으로 하게 되면 용량 이전에 Pages의 용도 제한을 검토해야 한다. 현재 프로젝트가 곧바로 금지에 해당한다고 확정한 것은 아니다.

## 확인된 한도

| 항목 | 공식 값·성격 | 출처·확인일 |
|---|---|---|
| 게시 사이트 | 최대 1 GB | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), 2026-11-18 |
| Pages 원본 저장소 | 1 GB 권장 | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), 2026-11-18 |
| 월 전송량 | 100 GB, soft limit | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), 2026-11-18 |
| 빌드 빈도 | 시간당 10회, soft limit. Custom Actions는 예외 | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), 2026-11-18 |
| 배포 시간 | 10분 초과 시 timeout | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), 2026-11-18 |
| 별도 배포 횟수 | 미확인 | 위 문서에서 일·월별 독립 배포 횟수는 찾지 못함 |
| 일반 Git 파일 | 50 MiB 초과 경고, 100 MiB 초과 차단 | [Large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), 2026-11-18 |
| 브라우저 파일 업로드 | 25 MiB 이하 | [Large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), 2026-11-18 |
| 일반 저장소 크기 | 이상적으로 1 GB 미만, 5 GB 미만 강력 권장 | [Large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), 2026-11-18 |
| Pages 독립 파일 상한 | 미확인 | 100 MiB는 일반 Git 경로의 제약이며 별도 Pages 규칙과 구분 |
| Actions Pages artifact | gzip 안 단일 tar <10 GB. 심볼릭·하드 링크 불가 | [Custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), 2026-11-18 |
| Actions job·workflow 시간 | GitHub-hosted job 6시간, workflow 대기 포함 35일 | [Actions limits](https://docs.github.com/en/actions/reference/limits), 2026-11-18 |
| Actions 포함 artifact 저장 | Free 500 MB / Pro 1 GB / Team 2 GB / Enterprise Cloud 50 GB. Cache는 별도 10 GB/repo | [Actions limits](https://docs.github.com/en/actions/reference/limits), 2026-11-18 |
| Releases | release당 asset 최대 1000개, 개별 <2 GiB. 총 크기·전송량 제한 없음 명시 | [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), 2026-11-18 |

Pages 문서는 GB의 바이트 환산 기준을 명시하지 않는다. 성장표에는 사용할 단위를 붙여야 한다. Actions tar의 10 GB 포장 상한을 사이트 1 GB 제한의 해제로 해석하면 안 된다.

Git은 같은 바이트의 blob을 재사용하고, 바뀐 버전은 이력에 남긴다. 압축 파일이 매번 달라지는지와 실제 이력 증가량은 부모 실측으로 판단한다. Orphan·강제 push 뒤 서버의 기존 객체가 즉시 사라지는지, 언제 정리되는지는 이번 확인으로 보장하지 못한다. 이번 작업에서 실행하지 않았다.

## 비용과 대안

표준 GitHub-hosted runner는 public 저장소 및 GitHub Pages에서 무료라고 안내한다. Larger runner는 public 저장소도 유료다. 현재 계정 플랜·실제 청구액·Pages artifact에 적용되는 저장 과금은 미확인이다. [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), 2026-11-18.

Custom workflow는 배포 결과를 gh-pages에 커밋하지 않는 구성으로 옮기는 수단이다. 사이트 크기·공개 범위·약관 제약은 그대로다. [Custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), 2026-11-18.

Releases는 큰 파일을 Git 이력에서 분리하는 후보지만, 공식 문서의 용도는 소프트웨어 배포 묶음이다. 웹앱의 직접 JSON 조회에 필요한 CORS·리디렉션·캐시 제어·SLA는 미검사다. Large files 문서는 asset 상한을 플랜별 LFS 최대 파일로 안내하는 표현도 있어, 여기서는 보수적으로 Releases 전용 문서의 **2 GiB 미만**을 쓴다. [Large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), [Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), 2026-11-18.

Git LFS는 Pages에 사용할 수 없다고 명시한다. 따라서 Git 파일 상한을 피하려고 LFS를 채택해도 현재 Pages 배포 문제를 해결한다고 볼 수 없다. [Git LFS](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage), 2026-11-18.

S3·R2·GCS·Cloudflare Pages·Netlify·Vercel의 가격·용량·전송량은 허용된 외부 조사 범위 밖이므로 **미확인**이다.

## 비공개 저장소와 사이트 접근 제어

Free 및 Free 조직은 public 저장소의 Pages를, Pro·Team·Enterprise는 public/private 저장소의 Pages를 지원한다. 비공개 저장소에서 게시했다고 사이트도 비공개가 되는 것은 아니다. [What is Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), 2026-11-18.

사이트 비공개는 Enterprise Cloud 조직 소유 private/internal 저장소의 project site에서 가능하다. 방문자는 원본 저장소의 read 권한이 필요하며, organization site에는 이 접근 제어를 쓸 수 없다. 광고주별 외부 고객 로그인과는 다른 권한 모델이다. [Private sites](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/about-privately-published-github-pages-sites), [Visibility](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site), 2026-11-18.

공개 정적 파일은 UI를 숨기더라도 직접 GET할 수 있다는 것은 구조에 따른 기술적 판단이다. 공공데이터 재배포 조건과 광고주 민감자료 권한은 별도로 확인해야 하며, 이번에 해당 외부 원문은 조회하지 않았다.

## 상업적 용도

2026-08-27 시행 추가제품약관의 Pages 절은 개인·조직 프로젝트 소개를 주용도로 설명한다. 무료 호스팅으로 온라인 사업·전자상거래·상업 거래 중개·상업 SaaS가 주목적인 사이트를 운영하는 것은 허용되지 않는다고 적고, 기부 버튼 등 일부 수익화는 허용한다. [추가제품약관 Pages 절](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#pages), 2026-11-18.

공개 프로젝트 시안과 광고주 대상 상시 영업 도구의 운영 성격을 구분해야 한다. 유료 여부 하나만으로 해당성을 확정하지 않는다. 서비스가 상업 SaaS에 해당한다면 데이터만 옮기고 화면을 Pages에 남기는 안도 약관 문제를 자동 해결하지 않는다. 불명확한 용도는 GitHub Support에 확인하라는 공식 안내가 있다. 이번에는 문의나 최종 법률 판단을 하지 않았다.

## 미확인과 한계

- Pages 독립 per-file 상한, GB 환산, 사용자 지정 캐시 헤더, 고정 SLA, 현재 계정 과금 상태.
- Releases의 브라우저 JSON 호스팅 적합성과 다른 사업자 수치.
- 원본별 재배포 라이선스 및 실제 운영 서비스의 법적 분류.

구조화한 22개 사실은 `official-limits.json`에 있다. 다른 외부 도메인은 열지 않았다.
