# ui-skill-set

프로젝트에 한 번 설치하면 **누가 Claude를 돌려도 같은 토큰·같은 규칙·같은 검사**를 거쳐 UI가 나오게 하는 Claude Code 스킬 세트.
"AI 그라데이션"은 설득이 아니라 파일에 닿기 전에 막는다.

- 설계 문서: [docs/PRD.md](docs/PRD.md) · 레퍼런스 분석: [docs/research/](docs/research/)
- 상태: **M1** (하드 룰 4 + 소프트 룰 15 + `/ui-init` 설치기 + 토큰 커버리지). 플러그인 배포·골든 프롬프트는 M2.

## 구조

```
skills/
  ui-design/                 ← UI 작업 스킬 (절차만). SKILL.md + references/
    references/              ← craft-floor · preflight · korean-typography · banned · states-and-a11y
  ui-init/                   ← 설치 스킬. install.mjs 를 실행
templates/                   ← 프로젝트에 복사되는 것
  DESIGN.md                  ← 프로젝트 계약. frontmatter는 린터가 읽음
  tokens.css                 ← 원색은 이 파일만. 2계층(scale→semantic), light/dark, Tailwind v4 @theme 브릿지
  design-lint.mjs            ← 훅. PreToolUse 차단(R1~R4) + Stop 1회 점검(R1~R4 + S1~S15) + --all(CI). 순수 Node ≥18
  install.mjs                ← 설치기. settings.json 병합·frontmatter 채우기·CLAUDE 멱등 추가
  *.test.mjs                 ← node templates/design-lint.test.mjs · node templates/install.test.mjs
  settings.json              ← .claude/settings.json 훅 배선
  CLAUDE.snippet.md          ← 프로젝트 CLAUDE.md에 붙이는 규약
```

## 하드 룰 (편집 전 차단)

| | 룰 | 잡는 것 | 고치는 법 |
|---|---|---|---|
| R1 | `gradient` | `linear-gradient(…)`, `bg-linear-to-*`, `bg-gradient-to-*` | 단색 토큰. 예외는 `/* ui-lint-allow gradient: <이유> */` |
| R2 | `ai-purple` | `#7c3aed` 등 hex 9개, `text-indigo-*` 등 | 브랜드 토큰. 브랜드가 보라면 `brand_hue: purple` |
| R3 | `hardcoded-color` | 컴포넌트의 hex/rgb/oklch, `bg-blue-500` 류 팔레트 클래스 | `var(--ui-color-…)` / `bg-brand-solid` |
| R4 | `hardcoded-font` | `font-family: Inter`, Google Fonts 링크, `font-['…']` | `var(--ui-font-sans)` / `font-sans` |

## 소프트 룰 (종료 전 1회 지적)

`--stop`에서만 발화하고 한 번만 block한다(고친 뒤 다시 종료하면 통과). CI(`--all`)는 소프트로 실패하지 않는다.

`glass-decorative` · `emoji-as-icon` · `heavy-shadow` · `bounce-easing` · `h-screen` · `z-arbitrary` · `transition-all` · `eyebrow` · `side-tab` · `img-hover-scale` · `pure-bw` · `em-dash` · `break-all`(한글) · `korean-tracking` · `buzzword`(한/영).

## 설치

대상 프로젝트 루트에서:

```bash
node /path/to/ui-skill-set/templates/install.mjs --target . --mode operate --stack react-tailwind4 --hue blue
```

레거시 프로젝트는 `--legacy`(하드코딩 색 경고로 시작), 재설치는 `--update`(훅·스킬만 갱신). Claude Code 안에서는 `/ui-init`이 질문 3개로 같은 일을 한다.

그다음:
1. `DESIGN.md` §1~§2를 채운다 (제품 한 줄, 액센트 색). `tokens.css`의 `--ui-accent-*`를 브랜드 램프로 바꾼다.
2. CSS 엔트리에서 `@import "tailwindcss";` 다음 줄에 `@import "./styles/tokens.css";` (Tailwind가 아니면 그냥 import).
3. Pretendard를 셀프호스트하고 `@font-face`를 `tokens.css` 상단에 추가한다.
4. `<html lang="ko">`에 다크모드 스크립트 한 줄 (tokens.css 주석 참조).
5. 확인: `node .claude/hooks/design-lint.mjs --all` — 토큰 커버리지와 위반 0 확인.

플러그인 설치(`claude plugin marketplace add sgustjd2/ui-skill-set`)는 M2.

## 예외

파일에 `/* ui-lint-allow <rule>: <이유> */` (이유 필수) + `DESIGN.md` §8 표에 기록. 레거시 프로젝트는 `DESIGN.md`에서 `tailwind_palette: allow`, `hardcoded_color: warn`으로 시작해 점진 전환.

## 테스트

```bash
node templates/design-lint.test.mjs
```

## 라이선스

MIT. 스케일 값·정규식 일부는 daangn/seed-design, pbakaus/impeccable (Apache-2.0)에서 가져왔다. [NOTICE](NOTICE) 참조. seed-design의 이름·로고·캐럿 색은 상표라 포함하지 않는다.
