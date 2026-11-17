# 비활성 버튼 대비 수정 보고

## 수정

`src/readability.css`의 지정된 세 값만 바꿨다.

```diff
- placeholder 색: #617287
+ placeholder 색: #5b6b80
- .app button:disabled 글자색: #617287
+ .app button:disabled 글자색: #5b6b80
- .app .scenarioWorkbench button:disabled 글자색: #617287
+ .app .scenarioWorkbench button:disabled 글자색: #5b6b80
```

다른 소스 파일은 수정하지 않았다.

## 대비 실측

WCAG 대비 계산 결과:

| 글자색 | 배경색 | 대비 |
|---|---|---:|
| `#5b6b80` | `#edf1f5` | **4.794:1** |
| `#5b6b80` | `#ffffff` | **5.441:1** |

1365×768 브라우저에서 “선택 구 동 지도”와 “−” 버튼은 여전히 `disabled=true`였고, 계산된 글자/배경은 `rgb(91,107,128)` / `rgb(237,241,245)`였다. 두 버튼은 모두 4.794:1이다.

검색 입력의 실제 placeholder는 `rgb(117,117,117)`, 바탕은 `rgb(255,255,255)`로 측정되어 4.608:1이었다. 이 입력은 `.app` 바깥에 있는 팝오버 안에 있어 지정한 `.app input::placeholder` 선택자가 적용되지 않았다. 실제 대비는 4.5:1을 넘지만, 바뀐 `#5b6b80`이 현재 placeholder에는 적용되지 않는 점을 한계로 남긴다. brief의 수정 범위가 세 선언으로 한정돼 있어 선택자 범위는 바꾸지 않았다.

## 화면 비교

- 수정 전 1365×768: [before-disabled-controls-1365.png](</Users/koscom/workspace2/seoul human/docs/workers-2026-11-17/w14-disabled-contrast-fix/before-disabled-controls-1365.png>) — W10 저장 화면.
- 수정 후 1365×768: [after-disabled-controls-1365.png](</Users/koscom/workspace2/seoul human/docs/workers-2026-11-17/w14-disabled-contrast-fix/after-disabled-controls-1365.png>).
- 수정 후에도 버튼 바탕과 테두리는 연한 회색이고 활성 지도 버튼은 파랑으로 남아, 두 대상이 비활성인 상태는 구분된다. 수치와 뷰포트는 [after-measurements.json](</Users/koscom/workspace2/seoul human/docs/workers-2026-11-17/w14-disabled-contrast-fix/after-measurements.json>)에 기록했다.

## 명령 결과

### PC Playwright

명령:

```sh
PLAYWRIGHT_EVIDENCE_DIR=docs/workers-2026-11-17/w14-disabled-contrast-fix/e2e npm run test:e2e -- --project=desktop-1365 --project=desktop-1920
```

- 종료 코드 **1**: 16개 여정 모두 Playwright 실패로 표시됐다.
- 규칙 a–f의 측정 판정은 모두 통과: a 200, b 272, c 200, d 184, e 32, f 200.
- 균등 크기 h는 **28/28 묶음 통과**.
- 대비 측정에서 신뢰 가능한 미달은 **0건**이다. 지정한 두 비활성 버튼은 재검사에서 4.794:1로 통과했다.
- Playwright의 g 단언은 `aria-hidden` 장식용 브랜드 표시 `▦`를 글자로 오인해 16개 여정에서 실패했다. 지도 SVG 지역명 400건, 초점 테두리 16건, 장식 표시 16건(총 432건)은 판정 불가로 분리했다. 원자료와 화면 증거는 [e2e 결과](</Users/koscom/workspace2/seoul human/docs/workers-2026-11-17/w14-disabled-contrast-fix/e2e/RESULTS.md>) 및 `e2e/test-results/`에 있다.

### 빌드

- 명령: `npm run build`
- 종료 코드 **0**: 빌드 성공. 500KB가 넘는 번들 안내가 있었으나 빌드는 완료됐다.

### 단위 테스트

- 명령: `node --test tests/*.test.mjs`
- 종료 코드 **0**: **71개 통과, 0개 실패**.

## 미검사 범위와 한계

- 모바일은 요청대로 검사하지 않았다.
- 수정 전 화면은 W10 당시 저장된 1365×768 캡처를 사용했다. 수정 후 화면은 같은 1365×768, 생활인구 지도 조건으로 다시 캡처했다.
- W10 검사기는 장식 로고를 제외하지 않아 Playwright 종료 코드는 1이다. 신뢰 가능한 대비 미달 0건, h 28/28, a–f 통과와 전체 E2E 프로세스 종료 상태를 구분해 기록했다.
- 팝오버 입력의 placeholder는 현재 `.app` 범위 밖이라 변경한 선택자 색이 적용되지 않는다. 실제 측정 대비 4.608:1은 통과지만, 해당 필드에 새 색을 직접 적용하는 수정은 허용된 세 선언 범위를 벗어나므로 하지 않았다.
