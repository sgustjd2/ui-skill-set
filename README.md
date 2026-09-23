# ui-skill-set

프로젝트에 한 번 설치하면 **누가 Claude를 돌려도 같은 토큰·같은 규칙·같은 검사**를 거쳐 UI가 나오게 하는 Claude Code 스킬 세트.
"AI 그라데이션"(보라 그라데이션·글래스 카드·이모지 아이콘·하드코딩 색)은 설득이 아니라 **파일에 닿기 전에** 막는다. 한국어 타이포가 기본값이다.

- 설계 문서: [docs/PRD.md](docs/PRD.md) · 레퍼런스 분석: [docs/research/](docs/research/) · 실측 기준선: [eval/results.md](eval/results.md)
- 상태: **완성** — PRD FR-1~16 구현·검증. 실제 Vite+React+Tailwind 앱 도그푸딩, 골든 프롬프트 5개 실측 전부 PASS, 플러그인 설치 검증 완료.

---

## 이게 뭘 해주나

문제: 같은 프로젝트라도 작업자마다 Claude가 만든 화면의 색·간격·버튼이 다르고, "예쁘게" 만들려 하면 보라 그라데이션·이모지 아이콘·3열 동일 카드 같은 **AI 기본 미학**이 튀어나온다. 리뷰에서 잡아도 다음 세션에 또 나온다.

해결: 프롬프트로 부탁하는 대신 **세 겹**으로 강제한다.

| 계층 | 무엇 | 하는 일 |
|---|---|---|
| ① 에셋 | `DESIGN.md` + `src/styles/tokens.css` | 무엇이 "우리 프로젝트의 것"인지. 원색·폰트·간격은 tokens.css에만 존재 |
| ② 룰 | `ui-design` 스킬 | Claude가 UI를 만들 때 읽고 따르는 절차·판단(토큰만, 상태 5종, 한국어 타이포…) |
| ③ 하네스 | `.claude/hooks/design-lint.mjs` (훅) | 그라데이션·하드코딩 색·AI-purple·하드코딩 폰트를 **편집 직전에 차단** |

핵심은 ③이다. 스킬(②)이 프롬프트라면 지나칠 수 있지만, 훅(③)은 프로젝트에 커밋되므로 **플러그인이 없는 작업자도, 심지어 Claude가 규칙을 잊어도** 같은 검사를 받는다.

---

## 빠른 시작 (5분)

React + Tailwind v4 프로젝트 기준. 다른 스택은 [스택별 설치](#스택별-설치)를 본다.

### 1. 설치

대상 프로젝트 루트에서 이 저장소의 설치기를 실행한다:

```bash
node /path/to/ui-skill-set/templates/install.mjs --target . --mode operate --stack react-tailwind4 --hue blue
```

설치기가 넣는 것:
- `DESIGN.md` (프로젝트 계약, frontmatter 채워짐)
- `src/styles/tokens.css` (+ v4면 `theme.css`)
- `.claude/hooks/design-lint.mjs` · `design-audit.mjs` · `tokens-contrast.mjs`
- `.claude/skills/ui-design/` (작업 스킬 — 이 프로젝트를 여는 모든 Claude 세션이 자동 로드)
- `.claude/settings.json` (훅 배선, 기존 설정이 있으면 **병합**)
- `CLAUDE.md`에 UI 규약 추가(멱등)

> Claude Code 안에서라면 설치기를 직접 부르는 대신 `/ui-init`을 쓰면 질문 3개(모드·스택·액센트)로 같은 일을 한다.

### 2. 브랜드 색·폰트 채우기

- `src/styles/tokens.css`의 `--ui-accent-100…900`을 **브랜드 색 램프**로 바꾼다(기본값은 채도 낮은 파랑 플레이스홀더).
  - 액센트 색조가 보라 계열이면 `DESIGN.md` frontmatter의 `brand_hue: purple`로 바꿔 AI-purple 룰(R2)이 오탐하지 않게 한다.
- Pretendard Variable을 셀프호스트하고 `@font-face`를 tokens.css 상단에 추가한다(폰트 스택은 이미 tokens.css에 있다).
- `DESIGN.md`의 Overview·Colors(제품 한 줄, 액센트 색 설명)를 채운다.

### 3. CSS 엔트리에서 import

```css
/* src/index.css 등 */
@import "tailwindcss";
@import "./styles/tokens.css";
@import "./styles/theme.css";   /* Tailwind v4 브릿지 */
```

### 4. 다크모드 스크립트

`index.html`의 `<html lang="ko">` 안, 최상단에 한 줄(깜빡임 방지):

```html
<script>
  document.documentElement.dataset.theme =
    matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
</script>
```

다크모드는 `[data-theme="dark"]`에서 **scale 팔레트만 반전**되고 시맨틱 토큰은 자동으로 따라온다. 컴포넌트에 `dark:` 분기를 쓰지 않는다.

### 5. 확인

```bash
node .claude/hooks/design-lint.mjs --all           # 하드/소프트 위반 0, 토큰 커버리지 확인
node .claude/hooks/tokens-contrast.mjs --tokens src/styles/tokens.css   # 브랜드 색이 WCAG 넘는지
```

둘 다 통과하면 준비 끝. 이제 Claude에게 UI를 시키면 된다.

---

## 일상 사용 — 실제로 어떻게 느껴지나

설치 뒤에는 특별한 명령이 필요 없다. Claude Code로 UI를 부탁하기만 하면 된다.

**1) 부탁한다.**

> "계정 설정 화면 만들어줘. 프로필·알림 토글·계정 삭제·저장 버튼."

**2) 스킬이 뜬다.** `ui-design` 스킬이 자동 로드되어 Claude가 `DESIGN.md`를 읽고 **디자인 리드 한 줄**을 선언한 뒤(예: `읽기: 설정 화면 · 모드 Operate · 다이얼 4/3/5`), tokens.css의 시맨틱 토큰(`bg-brand-solid`, `text-fg-neutral`, `rounded-control`…)만으로 구현한다. 상태 5종(hover·disabled·loading·error·empty)을 같이 만든다.

**3) 슬롭을 쓰려 하면 훅이 막는다.** Claude가 습관적으로 `bg-gradient-to-br from-indigo-500`이나 `#6b7280`을 쓰려 하면, 파일에 저장되기 **직전에** 차단되고 이런 메시지가 돌아간다:

```
[ui-lint] 차단: src/components/Settings.tsx (2건)
  R1 gradient         L3  bg-gradient-to-br
     → 단색 토큰으로 (bg-brand-solid / var(--ui-color-bg-brand-solid)). …
  R3 hardcoded-color  L4  #6b7280
     → 시맨틱 토큰으로: var(--ui-color-{fg|bg|stroke}-…) 또는 text-fg-* …
```

Claude는 이 메시지를 받아 **토큰으로 고쳐서** 다시 저장한다. 당신은 대개 아무것도 안 해도 된다.

**4) 끝낼 때 한 번 더 본다.** 세션이 끝나면(Stop) 소프트 룰(글래스·이모지 아이콘·아이브로우·bounce·한글 자간…)을 **한 번** 점검한다. 진짜 문제는 고치고, 정당한 것은 이유를 남긴다.

**5) 정말 필요한 예외는 근거를 남긴다.** 브랜드 히어로에 그라데이션이 꼭 필요하면 — [예외](#예외) 참조.

이게 전부다. "촌스럽게 하지 마"라고 매번 프롬프트에 쓸 필요가 없다. 규칙이 파일 레벨에서 강제된다.

---

## 브랜드 색 바꾸기 (가장 흔한 커스터마이징)

1. `src/styles/tokens.css`를 연다. **원색은 이 파일에만** 있다.
2. `:root`의 `--ui-accent-100`(가장 밝음)~`--ui-accent-900`(가장 어두움)을 브랜드 램프로 교체. 램프를 새로 만든다면 OKLCH로 명도(L) 단계를 gray 스케일과 맞추고, 범위를 벗어나면 채도만 줄인다(토스 TDS 컬러 시스템, 2025-12). 브랜드가 없다고 크림+테라코타·검정+형광 초록을 고르지 않는다. 보라 다음으로 흔한 AI 기본값이다.
3. `:root[data-theme="dark"]`의 같은 토큰도 다크용 값으로 교체(다크는 보통 라이트를 뒤집은 명도).
4. **대비 확인**(필수):

```bash
node .claude/hooks/tokens-contrast.mjs --tokens src/styles/tokens.css
```

대비가 통과하면 DESIGN.md의 design.md 호환 토큰도 갱신한다: `node .claude/hooks/design-md-sync.mjs`.

primary 버튼의 흰 글자가 액센트 배경 위에서 4.5:1을 넘어야 한다. 밝은 색을 골랐다면 `--ui-color-bg-brand-solid`가 `--ui-accent-700`처럼 한 단계 어두운 스텝을 가리키게 조정한다(기본 매핑이 그렇게 되어 있다). 이 검사가 "버튼 글자가 안 보이는" 흔한 사고를 커밋 전에 잡는다.

디자이너가 Figma 변수로 팔레트를 관리한다면 [Figma 동기화](#figma-토큰-동기화)로 자동 반영할 수 있다.

**바꾸지 않는 것**: 시맨틱 토큰(`--ui-color-*`)은 역할 매핑이라 건드리지 않는다. 간격·라디우스·타이포 스케일도 그대로 둔다(seed-design 기반의 검증된 값).

---

## 팀에 퍼뜨리기

`install.mjs`가 넣은 `.claude/` 폴더(훅·스킬·settings.json)와 `DESIGN.md`·`tokens.css`를 **커밋**한다.

```bash
git add .claude DESIGN.md src/styles/tokens.css CLAUDE.md && git commit -m "chore: ui-skill-set 설치"
```

그러면:
- **모든 팀원**이 이 프로젝트를 Claude Code로 열면 같은 훅·같은 스킬을 받는다. 개인이 플러그인을 깔 필요 없다.
- 손으로(Claude 없이) 쓴 코드나 훅을 우회한 코드는 **CI**가 잡는다:

```yaml
# 예: GitHub Actions 한 스텝
- run: node .claude/hooks/design-lint.mjs --all        # 하드 위반 시 exit 1
- run: node .claude/hooks/tokens-contrast.mjs --tokens src/styles/tokens.css
- run: node .claude/hooks/design-md-sync.mjs --check        # DESIGN.md 토큰이 tokens.css와 같은지
```

- 레거시 코드가 많은 프로젝트는 `--legacy`로 설치해 `hardcoded_color: warn`·`tailwind_palette: allow`로 시작하고, `DESIGN.md`에서 점진적으로 `block`/`deny`로 조인다.

### 플러그인으로 배포(선택)

프로젝트에 파일을 커밋하는 대신(또는 함께) 스킬을 마켓플레이스로 배포할 수도 있다:

```bash
claude plugin marketplace add sgustjd2/ui-skill-set
```

`/plugin install ui-skill-set@ui-skill-set`으로 `ui-design`·`ui-init` 스킬이 들어온다. Cursor·Codex 등은 `npx skills add https://github.com/sgustjd2/ui-skill-set`. **단, 실제 강제(훅)는 여전히 `/ui-init`(=install.mjs)이 프로젝트에 넣어야** 동작한다. 플러그인은 스킬만 배포한다.

> 설치 검증됨(2026-09-03, Claude Code 2.1.237): 마켓플레이스 추가 → 플러그인 설치 → 컴포넌트 인벤토리에 Skills 2개(ui-design·ui-init) 노출 확인. Hooks·Agents 0은 의도된 것(훅은 프로젝트로).

---

## 기존 프로젝트 업데이트

`--update`(또는 `/ui-init --update`)는 **훅과 스킬만** 바꾸고, 프로젝트가 소유한 파일(`DESIGN.md`·`tokens.css`·`theme.css`/프리셋)은 건드리지 않는다. 버전마다 손으로 옮길 것을 아래에 적는다. 0.1에서 올라오면 **0.1 → 0.2 → 0.3 → 0.4 순서**로 한다.

### 0.3 → 0.4

깨지는 변경은 없다. `--update` 뒤 원하는 것만 고른다.

```bash
node /path/to/ui-skill-set/templates/install.mjs --target . --update    # 훅에 design-md-sync.mjs 추가, --stats·모노레포·APCA 포함
```

| 선택 | 할 일 |
|---|---|
| design.md(Stitch) 호환 | `node .claude/hooks/design-md-sync.mjs` 한 번. frontmatter 끝에 `version`·`name`·`colors`·`typography`·`rounded`·`spacing`이 붙는다. 섹션 제목까지 맞추려면 [템플릿](templates/DESIGN.md)처럼 `## 1. 제품과 모드` → `## Overview`, `## 2. 색` → `## Colors`, `## 3. 타이포` → `## Typography`, `## 4. 레이아웃·간격` → `## Layout`, `## 5. 형태·깊이` → `## Elevation & Depth` + `## Shapes`, `## 6. 모션` → `## Motion`, `## 7. 컴포넌트 규약` → `## Components`, `## 8. 금지와 허용 예외` → `## Do's and Don'ts`. 린터는 제목을 읽지 않으니 안 바꿔도 동작한다. 그다음 CI에 `design-md-sync.mjs --check` |
| 모노레포 | 앱마다 `install.mjs --target apps/<앱> --app`. 기존 루트 DESIGN.md는 그대로 기본값이 된다. 앱 DESIGN.md에는 `ui_skill_set:` 줄이 있어야 인정된다 |
| 스크롤 가장자리 페이드 | tokens.css `--ui-gradient-shimmer` 아래에 `--ui-fade-size`·`--ui-fade-stops`·`--ui-gradient-fade-x`·`--ui-gradient-fade-y` 네 줄을 [템플릿](templates/tokens.css)에서 복사. 사용: `[mask-image:var(--ui-gradient-fade-x)]` |
| 발동 통계 | 할 일 없음. 이제부터 `.claude/ui-lint/`에 쌓이고 `design-lint.mjs --stats`로 본다 |

### 0.2 → 0.3

보류했던 두 가지를 반영한 버전이다([조사 보고서 §5](docs/research/2026-09-trends.md)).

**1. 훅·스킬 갱신** 후 바로 `--all`을 돌린다:

```bash
node /path/to/ui-skill-set/templates/install.mjs --target . --update
node .claude/hooks/design-lint.mjs --all
```

`globals.css`와 `tailwind.config.*`를 이제 **검사한다**. 0.2까지는 두 파일을 통째로 건너뛰어서, `bg-[#7c3aed]`가 막히면 `@theme`에 `--color-hero: #7c3aed`를 정의하고 `bg-hero`로 쓰는 우회가 가능했다. 그래서 CI에서 새로 걸릴 수 있다:

| 새로 잡히는 곳 | 고치는 법 |
|---|---|
| `globals.css`에 남은 create-next-app 기본값 (`--background: #ffffff`, `font-family: Arial`) | 지운다. 배경·글자색은 tokens.css가 `html`에 이미 준다 |
| `globals.css`의 `@theme`에 원색 (`--color-x: #…`) | 값을 tokens.css로 옮기고 `var(--ui-…)`로 참조 |
| `tailwind.config.js` `theme.extend.colors`의 원색 (v3) | 같다. 색은 `tailwind.ui-preset.cjs`가 준다 |

토큰을 원래 `globals.css`에 두는 프로젝트라면 DESIGN.md의 `tokens_path`를 그 파일로 지정한다(예: `tokens_path: app/globals.css`). 그 파일만 검사에서 빠진다.

**2. tokens.css에 고대비 규칙 추가**(`@media (prefers-contrast: more)` 블록 바로 위):

```css
@media (forced-colors: active) {
  :where(button, [role="button"]) { outline: 1px solid; outline-offset: -1px; }
}
```

윈도우 고대비 모드는 배경색을 시스템 색으로 덮는다. 그래서 Tailwind preflight(`border: 0`) 위에 배경색으로만 만든 버튼은 **글자만 남는다**. 안쪽 outline이라 레이아웃은 안 밀리고, 포커스 때는 `:focus-visible` 링이 이긴다.

**3. design-audit**가 고대비 에뮬레이션 패스를 한 번 더 돈다(warn). 위 규칙이 있으면 기본 버튼은 통과한다. 경고가 나오면 대개 `focus-visible:ring-*`만 쓰고 outline을 지운 곳이다. ring은 box-shadow라 고대비에서 사라진다.

### 0.1 → 0.2

0.2는 [2026-09 동향 조사](docs/research/2026-09-trends.md)를 반영한 버전이다. 훅·스킬 갱신(자동) 다음에 프로젝트 파일 반영(수동)을 한다.

#### 1단계: 훅·스킬 갱신 (자동)

```bash
node /path/to/ui-skill-set/templates/install.mjs --target . --update
```

Claude Code 안이면 `/ui-init --update`. 이걸로 `.claude/hooks/`(design-lint·design-audit·tokens-contrast)와 `.claude/skills/ui-design/`이 0.2가 된다. `settings.json`·`CLAUDE.md`는 0.2에서 바뀐 게 없어 손댈 필요가 없다.

> 플러그인만 업데이트하면 스킬만 새것이 되고 **훅은 0.1 그대로**다. 훅은 프로젝트에 있으므로 이 단계를 꼭 한다.

**먼저 CI 영향부터 본다.** 하드 룰이 넓어져서(아래 표) 전에는 통과하던 코드가 `--all`에서 exit 1이 될 수 있다. 커밋 전에 돌려서 확인한다:

```bash
node .claude/hooks/design-lint.mjs --all
```

| 새로 잡히는 하드 위반 | 고치는 법 |
|---|---|
| `bg-linear-(--x)` 축약 문법 (R1) | 단색 토큰, 또는 `ui-lint-allow gradient: <이유>` |
| `bg-mauve-*`·`olive`·`mist`·`taupe`, `scrollbar-thumb-*`·`text-shadow-*` 색 (R3) | 시맨틱 토큰 (`bg-neutral-weak` 등) |
| `hwb()`, `color(display-p3 …)`, `light-dark(white, black)` (R3) | tokens.css로 옮기고 `var(--ui-…)` |
| `font-[Open_Sans]`, `font-(family-name:--x)` (R4) | `font-sans` |
| DESIGN.md `font_families`에 없는 `next/font/google`·`@fontsource/*` import (R4) | 쓰는 폰트면 `font_families`에 선언, 아니면 제거 |

반대로 `color-mix(in oklab, var(--ui-…) 20%, transparent)`처럼 토큰에서 파생한 색은 0.1에서 오탐이었고 이제 통과한다.

> **1단계만 하고 커밋하지 않는다.** 새 `tokens-contrast`는 0.1 `tokens.css`의 placeholder(라이트 3.42:1)를 미달로 잡아 exit 1을 낸다. CI에 이 검사가 있으면 빨간불이 들어온다. 2단계 tokens.css ①까지 하고 같이 커밋한다.

#### 2단계: 프로젝트 파일 반영 (수동)

| 파일 | 할 일 | 필수? |
|---|---|---|
| `src/styles/theme.css` (v4) | 브레이크포인트·그림자 네임스페이스·`dark:` 변형 추가 | 권장. 단 브레이크포인트는 아래 주의 |
| `tailwind.ui-preset.cjs` (v3) | `screens`·`darkMode` 추가 | 권장. 같은 주의 |
| `src/styles/tokens.css` | placeholder 대비, 고대비 대응, text-wrap | **placeholder는 필수**(WCAG 미달) |
| `DESIGN.md` | `copy_register` 한 줄 | 선택. 없으면 `auto`(혼용만 지적) |

**theme.css (Tailwind v4).** 직접 고친 적이 없으면 통째로 교체한다:

```bash
cp /path/to/ui-skill-set/templates/theme.css src/styles/theme.css
```

고친 적이 있으면 `@theme inline { … }` 안 `--shadow-3` 줄 아래에 이것을 넣고,

```css
  --inset-shadow-*: initial;
  --drop-shadow-*: initial;
  --text-shadow-*: initial;

  --breakpoint-*: initial;
  --breakpoint-sm: 30rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 80rem;
  --breakpoint-xl: 90rem;
```

`@theme` 블록 **밖**, 파일 맨 끝에 이것을 넣는다:

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

**tailwind.ui-preset.cjs (Tailwind v3).** 직접 고친 적이 없으면 템플릿으로 교체한다. 고쳤으면 `module.exports`에 `darkMode: ['selector', '[data-theme="dark"]']`를 넣고, `theme` 안(`extend` 밖)에 `screens: { sm: '480px', md: '768px', lg: '1280px', xl: '1440px' }`를 넣는다.

> **⚠ 브레이크포인트는 화면이 바뀐다.** 0.1에서는 DESIGN.md §4의 480/1280/1440이 실제로 적용되지 않고 Tailwind 기본값(640/1024/1280/1536)이 쓰이고 있었다. 새 값을 넣으면 `sm:`은 640→480px, `lg:`는 1024→1280px, `xl:`은 1280→1440px에서 켜지고 `2xl:`은 **사라진다**.
> - 새 프로젝트이거나 화면이 적으면: 넣고 375/768/1280에서 한 번 훑는다. `2xl:`을 쓰는 곳은 `grep -rn "2xl:" src`로 찾아 `xl:`로 바꾼다.
> - 화면이 이미 기본값에 맞춰져 있으면: 브레이크포인트 블록(`--breakpoint-*` 5줄, v3의 `screens`)만 **빼고**, 대신 DESIGN.md §4를 실제 값(sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536)으로 고친다. 계약과 실제가 같기만 하면 된다.

**tokens.css.** 세 군데:

```css
/* ① :root 안 — placeholder도 텍스트라 4.5:1 (0.1의 gray-700은 라이트에서 3.42:1로 미달) */
--ui-color-fg-placeholder: var(--ui-gray-800);

/* ② @media (prefers-reduced-motion) 블록 바로 위 — 고대비 요청 시 한 단계 진하게 */
@media (prefers-contrast: more) {
  :root {
    --ui-color-fg-neutral-subtle: var(--ui-gray-800);
    --ui-color-stroke-neutral: var(--ui-gray-600);
  }
}

/* ③ 파일 끝 전역 규칙 옆 — 제목 줄 균형, 본문 외톨이 방지 */
:where(h1, h2, h3, h4) { text-wrap: balance; }
:where(p, li, figcaption, blockquote) { text-wrap: pretty; }
```

①은 placeholder가 보조 텍스트(`fg-neutral-muted`)와 같은 색이 된다는 뜻이다. 입력값과 헷갈리지 않게 하는 건 색이 아니라 내용(예시 형식만)으로 한다. ③은 제목 줄바꿈 위치가 바뀔 수 있으니 긴 제목이 있는 화면을 한 번 본다. 반영한 뒤:

```bash
node .claude/hooks/tokens-contrast.mjs --tokens src/styles/tokens.css
```

**DESIGN.md.** frontmatter에 한 줄 추가:

```yaml
copy_register: haeyo      # 해요체 제품. 합니다체면 hamnida. 줄이 없으면 auto(한 파일 안의 혼용만 지적)
```

원하면 본문에도 옮긴다(템플릿 [templates/DESIGN.md](templates/DESIGN.md) 참고): §3 카피 한 줄, §4 safe area 한 줄, §7 `user-invalid:`와 "닫기 vs 취소" 두 줄.

#### 3단계: 확인·커밋

```bash
node .claude/hooks/design-lint.mjs --all
node .claude/hooks/tokens-contrast.mjs --tokens src/styles/tokens.css
node .claude/hooks/design-audit.mjs http://localhost:5173    # dev 서버가 떠 있으면
git add .claude DESIGN.md src/styles/tokens.css src/styles/theme.css && git commit -m "chore: ui-skill-set 0.2"
```

Tailwind v3면 `theme.css` 대신 `tailwind.ui-preset.cjs`를 add한다.

design-audit는 0.2에서 blocker가 늘었다. 24px 미만 타겟(WCAG 2.5.8, 모든 뷰포트)과 확대 차단(`user-scalable=no`·`maximum-scale=1`)이 새로 exit 1을 낸다. 또 계산된 색이 `oklab()`으로 오던 요소(Tailwind v4의 `/opacity` 등)를 0.1은 대비 검사에서 **조용히 건너뛰었다.** 0.2에서 처음으로 대비 미달이 보일 수 있는데, 새로 생긴 문제가 아니라 원래 있던 결함이다.

#### 팀원이 체감하는 변화

- **종료 전 점검(Stop)이 조용해진다.** 이번 세션에서 추가·수정한 줄만 지적하고, 규칙은 4종까지 묶어서 보여 준다(접근성 먼저). 레거시 파일의 기존 부채는 `--all`에서만 보인다.
- **소프트 룰 8개가 늘었다.** 임의값 `p-[13px]`(대체 클래스 제안), 확대 차단, 크기·여백 전이, `dark:` 분기, CTA 끝 `→`, `<div onClick>`, aria-label 불일치, 존댓말 혼용. 정당한 경우는 기존처럼 `/* ui-lint-allow <id>: <이유> */`.
- 한글 파일명(`src/화면/설정.tsx` 등)이 Stop 검사에서 빠지던 문제가 고쳐졌다. 그래서 전에는 안 보이던 지적이 나올 수 있다.

---

## 검사 도구 요약

전부 순수 Node(≥18), 의존성 0(런타임 감사만 playwright 선택). 언제 쓰나:

| 도구 | 언제 | 명령 |
|---|---|---|
| `design-lint --all` | 커밋 전·CI. 하드/소프트 룰 + 토큰 커버리지 | `node .claude/hooks/design-lint.mjs --all` |
| `tokens-contrast` | 브랜드 색 바꾼 뒤·CI. 시맨틱 색 쌍 WCAG(정적). `--apca`면 APCA Lc 참고값 표 | `node .claude/hooks/tokens-contrast.mjs --tokens src/styles/tokens.css` |
| `design-md-sync` | 브랜드 색 바꾼 뒤·CI(`--check`). DESIGN.md의 design.md 호환 토큰을 tokens.css에서 생성 | `node .claude/hooks/design-md-sync.mjs` |
| `design-lint --stats` | 규칙이 실제로 지켜지는지 볼 때. 규칙별 차단·수정·예외·포기와 수정률 | `node .claude/hooks/design-lint.mjs --stats` |
| `design-audit` | dev 서버 떠 있을 때. 대비·오버플로·터치타겟(런타임) | `node .claude/hooks/design-audit.mjs http://localhost:5173` |
| `consistency` | 같은 화면 여러 번 만든 결과의 토큰 일치도 | `node eval/consistency.mjs <runsDir> --roles` |
| `figma-sync` | Figma 변수 → tokens.css 색 반영 | `FIGMA_TOKEN=… node templates/figma-sync.mjs --file <key> --tokens …` |

- **`design-lint`(정적)** = 문자열로 잡히는 것. **`design-audit`(런타임)** = 렌더링해야 아는 것(대비 등). **`tokens-contrast`(정적)** = 런타임 감사가 못 보는 조합(빈 placeholder 등)까지 토큰 레벨에서. 셋이 사각지대를 메운다.

### 모노레포

앱마다 디자인이 다르면(마케팅 사이트는 그라데이션 허용, 어드민은 금지 등) 앱 폴더마다 DESIGN.md를 둔다. 린터는 **편집하는 파일에서 가장 가까운 DESIGN.md**를 적용하고, 없으면 루트 것을 쓴다.

```bash
node /path/to/ui-skill-set/templates/install.mjs --target . --stack react-tailwind4                 # 저장소 루트: 훅·스킬·settings 한 번
node /path/to/ui-skill-set/templates/install.mjs --target apps/admin --stack react-tailwind4 --app  # 앱마다: DESIGN.md·tokens.css·브릿지만
```

앱 DESIGN.md의 `tokens_path`는 앱 폴더 기준이다. 하위 폴더의 DESIGN.md는 frontmatter에 `ui_skill_set:`이 있을 때만 인정한다(API 설계 문서 같은 다른 DESIGN.md를 오인하지 않게).

### 규칙 발동 통계

훅이 차단·지적할 때마다 `.claude/ui-lint/log.jsonl`에 한 줄 남긴다(폴더가 스스로 gitignore). 그 뒤 같은 파일이 통과하면 "수정", 마커로 풀면 "예외", 3회 연속 차단 후 통과시키면 "포기"로 기록한다. 종료 전 지적은 다음 종료 때 남은 수와 비교한다.

```bash
node .claude/hooks/design-lint.mjs --stats
```

수정률이 낮거나 예외가 많은 규칙은 메시지가 모호하거나 규칙이 틀렸다는 신호다(토스 기술블로그 "AI가 팀 규칙을 지키도록", 2026-09). 끄려면 DESIGN.md `lint_log: off` 또는 `UI_LINT_LOG=0`.

### design.md(Stitch) 호환

DESIGN.md의 섹션 제목(Overview·Colors·Typography·Layout·Elevation & Depth·Shapes·Components·Do's and Don'ts)과 frontmatter 아래쪽 토큰(`colors`·`typography`·`rounded`·`spacing`)은 [google-labs-code/design.md](https://github.com/google-labs-code/design.md) 포맷을 따른다. 그래서 Stitch 같은 도구와 다른 에이전트도 같은 계약을 읽는다(공식 CLI `npx @google/design.md lint DESIGN.md` 오류 0·경고 0, `export --format css-tailwind`도 동작). 토큰의 원본은 tokens.css이고, 브랜드 색을 바꾼 뒤 `design-md-sync`로 다시 생성한다. CI에는 `--check`를 넣어 둘이 어긋나지 않게 한다.

### 런타임 감사 상세

```bash
npm i -D playwright && npx playwright install chromium   # 최초 1회
node .claude/hooks/design-audit.mjs http://localhost:5173
```

뷰포트 375/768/1280에서 한 번씩, 그리고 윈도우 고대비(forced-colors) 에뮬레이션으로 한 번 더 연다. 뷰포트에서는: 대비 4.5:1(큰 글자 3:1) 미달·가로 스크롤·`<html lang>`/viewport 누락·확대 차단(`user-scalable=no`)·24px 미만 타겟(WCAG 2.5.8, 문장 속 링크 제외)은 **blocker(exit 1)**; 44px 미만 터치타겟(모바일)·안 보이는 포커스(포커스 전후 비교)·이름 없는 버튼·alt 없는 이미지·h1 개수는 **warn**. 계산된 색이 `oklab()`/`oklch()`/`color(srgb …)`로 와도(Tailwind v4 `/opacity` 등) 캔버스로 정규화해 대비를 잰다. 고대비 패스는 배경·그림자가 시스템 색으로 덮인 뒤 **윤곽이 없는 버튼**(배경색으로만 구분)과 **안 보이는 포커스**(box-shadow 링)를 warn으로 낸다. playwright가 없으면 안내 후 exit 0(CI를 안 깬다).

### Figma 토큰 동기화

디자이너가 Figma 변수로 색 팔레트(라이트/다크)를 관리하면 그 값을 tokens.css의 scale 색 토큰에 반영한다. 색만 대상, 시맨틱·간격·라디우스는 안 건드린다.

```bash
FIGMA_TOKEN=xxxx node templates/figma-sync.mjs --file <fileKey> --tokens ./src/styles/tokens.css        # dry-run(변경만 출력)
FIGMA_TOKEN=xxxx node templates/figma-sync.mjs --file <fileKey> --tokens ./src/styles/tokens.css --write # 반영
```

변수 이름은 `gray/500`·`accent/600` 규칙을 따라야 `--ui-<ramp>-<step>`에 매핑된다. 반영 뒤 `tokens-contrast`로 대비를 재확인하고 `design-md-sync`로 DESIGN.md 토큰을 갱신한다. 참고: Variables REST API는 **Figma Enterprise 전용**이라 그 외 플랜은 플러그인 export를 `--from <export.json>`으로 넘긴다. `FIGMA_TOKEN`이 없으면 건너뛴다.

### 일관성 측정

같은 프롬프트를 레이아웃만 다르게 여러 번 구현한 뒤, 같은 역할에 같은 토큰을 쓰는지 잰다. 골든 프롬프트 5개는 [eval/prompts/](eval/prompts/), 절차는 [eval/README.md](eval/README.md).

```bash
node eval/consistency.mjs runs/01-settings              # 전역 Jaccard
node eval/consistency.mjs runs/01-settings --roles      # 역할별(코어) 일치 — 기능 차이를 불일치로 오판 안 함
```

첫 실측 기준선([eval/results.md](eval/results.md)): 5개 프롬프트 전부 **코어 역할 일치 100%, 하드 위반 0, PASS**. 발산이 코어로 새면 DESIGN.md 규약을 조이라는 신호다.

---

## 예외

브리프가 이긴다 — 사용자가 명시적으로 요구한 것은 룰보다 우선한다. 단 근거를 파일에 남겨야 한다.

1. 파일에 마커(**이유 필수**): `/* ui-lint-allow gradient: 브랜드 히어로, 승인됨 */`
2. `DESIGN.md` 맨 아래 Do's and Don'ts의 "허용 예외" 표에 한 줄 기록(0.4 이전 템플릿은 §8).
3. 스킬은 예외를 추가하기 전에 사용자에게 한 줄로 확인한다.

이유 없는 마커·훅 비활성화·tokens.css 밖의 원색 추가는 예외로 인정되지 않는다. 같은 파일·같은 룰로 3회 연속 차단되면 4번째는 경고로 통과한다(데드락 방지).

레거시 프로젝트는 `DESIGN.md`에서 `tailwind_palette: allow`, `hardcoded_color: warn`으로 시작해 점진 전환.

---

## 레퍼런스

### 하드 룰 (편집 전 차단, PreToolUse)

| | 룰 | 잡는 것 | 고치는 법 |
|---|---|---|---|
| R1 | `gradient` | `linear-gradient(…)`, `bg-linear-*`(`-to-r`·`-45`·`-(--x)`), `bg-gradient-to-*`, `bg-radial`·`bg-conic` | 단색 토큰. 예외는 `/* ui-lint-allow gradient: <이유> */` |
| R2 | `ai-purple` | `#7c3aed` 등 hex 9개, `text-indigo-*` 등 | 브랜드 토큰. 브랜드가 보라면 `brand_hue: purple` |
| R3 | `hardcoded-color` | 컴포넌트의 hex/rgb/oklch/hwb/`color(display-p3 …)`, `bg-blue-500` 류 팔레트 클래스(v4.2 `mauve`·`olive`·`mist`·`taupe`, `scrollbar-thumb-*` 포함). 토큰 파생 `color-mix(in oklab, var(--ui-…) …)`은 허용 | `var(--ui-color-…)` / `bg-brand-solid` |
| R4 | `hardcoded-font` | `font-family: Inter`, Google Fonts 링크, `font-['…']`·`font-[Open_Sans]`, DESIGN.md에 없는 `next/font/google`·`@fontsource/*` | `var(--ui-font-sans)` / `font-sans` |

검사 대상은 UI 파일(tsx·jsx·vue·svelte·astro·html·css…)과 **`globals.css`·`tailwind.config.*`**(`@theme`·`theme.extend`에 원색을 정의해 우회하는 통로). 제외는 `tokens.css`, DESIGN.md `tokens_path`로 지정한 파일, 테스트·스토리.

### 소프트 룰 (종료 전 1회 지적, Stop)

`--stop`에서만 발화하고 한 번만 block한다(고친 뒤 다시 종료하면 통과). **이번 세션에서 추가·수정한 줄만** 보고(레거시 파일의 기존 부채는 `--all`로), 규칙은 **최대 4종**으로 묶어 보여 준다(한 번에 주입하는 규칙이 적어야 지켜진다). CI(`--all`)는 소프트로 실패하지 않는다.

`glass-decorative` · `emoji-as-icon` · `heavy-shadow` · `bounce-easing` · `h-screen` · `z-arbitrary` · `transition-all` · `eyebrow` · `side-tab` · `img-hover-scale` · `pure-bw` · `em-dash` · `break-all`(한글) · `korean-tracking` · `buzzword`(한/영) · `arbitrary-value`(`p-[13px]`→`p-3` 제안) · `zoom-disabled` · `layout-transition` · `dark-branch` · `trailing-arrow`(CTA 끝 `→`) · `div-click` · `label-in-name`(WCAG 2.5.3) · `copy-register`(해요체/합니다체 혼용, 과한 경어).

### 스택별 설치

`tokens.css`는 프레임워크 무관이고 **브릿지만 스택별**이다. 설치기가 스택에 맞는 것만 넣는다.

| 스택 | `--stack` | 브릿지 | CSS 엔트리 |
|---|---|---|---|
| Tailwind v4 (기본) | `react-tailwind4` | `theme.css`(@theme) | `@import "tailwindcss"` → tokens.css → theme.css |
| Tailwind v3 | `react-tailwind3` | `tailwind.ui-preset.cjs` | config에 `presets: [require('./tailwind.ui-preset.cjs')]` + tokens.css import |
| 순수 CSS/기타 | `react-css` · `plain` | 없음 | tokens.css만 import, `var(--ui-*)` 직접 사용 |

세 경로 모두 `bg-brand-solid`·`text-4`·`rounded-control`(또는 `var(--ui-*)`)가 같은 `--ui-*`를 참조하므로 다크모드 전환이 동일하게 동작한다. 재설치는 `--update`(훅·스킬만 갱신, tokens.css·DESIGN.md 보존). 버전을 올릴 때 프로젝트 파일에 옮길 것은 [기존 프로젝트 업데이트](#기존-프로젝트-업데이트)를 본다.

### 저장소 구조

```
skills/
  ui-design/                 ← UI 작업 스킬(절차만). SKILL.md + references/
    references/              ← craft-floor · preflight · korean-typography · banned · states-and-a11y
  ui-init/                   ← 설치 스킬(install.mjs 실행)
templates/                   ← 프로젝트에 복사되는 것
  DESIGN.md                  ← 프로젝트 계약(frontmatter는 린터가 읽음)
  tokens.css                 ← 원색은 이 파일만. 2계층(scale→semantic), light/dark, 전역 규칙
  theme.css                  ← Tailwind v4 브릿지(@theme)
  tailwind.ui-preset.cjs     ← Tailwind v3 브릿지(theme.extend)
  design-lint.mjs            ← 편집 훅 + CI 린터
  design-audit.mjs           ← 런타임 감사(playwright)
  tokens-contrast.mjs        ← 정적 대비 검사(+ APCA 참고값)
  design-md-sync.mjs         ← tokens.css → DESIGN.md의 design.md 호환 토큰
  figma-sync.mjs             ← Figma 변수 → tokens.css
  install.mjs                ← 설치기
  settings.json · CLAUDE.snippet.md
eval/                        ← 골든 프롬프트 + 일관성 측정 + 실측 기준선
docs/                        ← PRD + 레퍼런스 분석(2026-09 업계 동향 반영 포함)
```

DESIGN.md frontmatter(린터가 읽는 정책): `mode_default` · `stack` · `token_prefix` · `brand_hue` · `font_families` · `gradient_policy` · `tailwind_palette` · `hardcoded_color` · `radius_scale` · `copy_register`(`haeyo` 기본 · `hamnida` · `auto`=혼용만 지적, `--legacy` 설치 시 auto) · `lint_log`(`off`면 발동 로그 끔). `ui_skill_set`은 이 파일이 우리 계약이라는 표시(모노레포 하위 폴더 판별), `name`·`version`·`colors`… 는 design.md 포맷 키.

---

## 테스트

```bash
node templates/design-lint.test.mjs        # 하드/소프트 룰
node templates/install.test.mjs            # 설치기
node templates/design-audit.test.mjs       # 런타임 감사 대비 수학
node templates/tokens-contrast.test.mjs    # 정적 대비
node templates/design-md-sync.test.mjs     # design.md 호환 토큰 생성·드리프트
node templates/figma-sync.test.mjs         # Figma 파싱/반영
node eval/consistency.test.mjs             # 일관성 측정 로직
```

## 라이선스

MIT. 스케일 값·정규식 일부는 daangn/seed-design, pbakaus/impeccable (Apache-2.0)에서 가져왔다. [NOTICE](NOTICE) 참조. seed-design의 이름·로고·캐럿 색은 상표라 포함하지 않는다.
