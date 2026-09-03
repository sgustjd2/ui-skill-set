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
- `DESIGN.md` §1~§2(제품 한 줄, 액센트 색 설명)를 채운다.

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
2. `:root`의 `--ui-accent-100`(가장 밝음)~`--ui-accent-900`(가장 어두움)을 브랜드 램프로 교체.
3. `:root[data-theme="dark"]`의 같은 토큰도 다크용 값으로 교체(다크는 보통 라이트를 뒤집은 명도).
4. **대비 확인**(필수):

```bash
node .claude/hooks/tokens-contrast.mjs --tokens src/styles/tokens.css
```

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

## 검사 도구 요약

전부 순수 Node(≥18), 의존성 0(런타임 감사만 playwright 선택). 언제 쓰나:

| 도구 | 언제 | 명령 |
|---|---|---|
| `design-lint --all` | 커밋 전·CI. 하드/소프트 룰 + 토큰 커버리지 | `node .claude/hooks/design-lint.mjs --all` |
| `tokens-contrast` | 브랜드 색 바꾼 뒤·CI. 시맨틱 색 쌍 WCAG(정적) | `node .claude/hooks/tokens-contrast.mjs --tokens src/styles/tokens.css` |
| `design-audit` | dev 서버 떠 있을 때. 대비·오버플로·터치타겟(런타임) | `node .claude/hooks/design-audit.mjs http://localhost:5173` |
| `consistency` | 같은 화면 여러 번 만든 결과의 토큰 일치도 | `node eval/consistency.mjs <runsDir> --roles` |
| `figma-sync` | Figma 변수 → tokens.css 색 반영 | `FIGMA_TOKEN=… node templates/figma-sync.mjs --file <key> --tokens …` |

- **`design-lint`(정적)** = 문자열로 잡히는 것. **`design-audit`(런타임)** = 렌더링해야 아는 것(대비 등). **`tokens-contrast`(정적)** = 런타임 감사가 못 보는 조합(빈 placeholder 등)까지 토큰 레벨에서. 셋이 사각지대를 메운다.

### 런타임 감사 상세

```bash
npm i -D playwright && npx playwright install chromium   # 최초 1회
node .claude/hooks/design-audit.mjs http://localhost:5173
```

뷰포트 375/768/1280에서: 대비 4.5:1(큰 글자 3:1) 미달·가로 스크롤·`<html lang>`/viewport 누락은 **blocker(exit 1)**; 44px 미만 터치타겟·안 보이는 포커스·이름 없는 버튼·alt 없는 이미지·h1 개수는 **warn**. playwright가 없으면 안내 후 exit 0(CI를 안 깬다).

### Figma 토큰 동기화

디자이너가 Figma 변수로 색 팔레트(라이트/다크)를 관리하면 그 값을 tokens.css의 scale 색 토큰에 반영한다. 색만 대상, 시맨틱·간격·라디우스는 안 건드린다.

```bash
FIGMA_TOKEN=xxxx node templates/figma-sync.mjs --file <fileKey> --tokens ./src/styles/tokens.css        # dry-run(변경만 출력)
FIGMA_TOKEN=xxxx node templates/figma-sync.mjs --file <fileKey> --tokens ./src/styles/tokens.css --write # 반영
```

변수 이름은 `gray/500`·`accent/600` 규칙을 따라야 `--ui-<ramp>-<step>`에 매핑된다. 반영 뒤 `tokens-contrast`로 대비를 재확인한다. 참고: Variables REST API는 **Figma Enterprise 전용**이라 그 외 플랜은 플러그인 export를 `--from <export.json>`으로 넘긴다. `FIGMA_TOKEN`이 없으면 건너뛴다.

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
2. `DESIGN.md` §8 "허용 예외" 표에 한 줄 기록.
3. 스킬은 예외를 추가하기 전에 사용자에게 한 줄로 확인한다.

이유 없는 마커·훅 비활성화·tokens.css 밖의 원색 추가는 예외로 인정되지 않는다. 같은 파일·같은 룰로 3회 연속 차단되면 4번째는 경고로 통과한다(데드락 방지).

레거시 프로젝트는 `DESIGN.md`에서 `tailwind_palette: allow`, `hardcoded_color: warn`으로 시작해 점진 전환.

---

## 레퍼런스

### 하드 룰 (편집 전 차단, PreToolUse)

| | 룰 | 잡는 것 | 고치는 법 |
|---|---|---|---|
| R1 | `gradient` | `linear-gradient(…)`, `bg-linear-to-*`, `bg-gradient-to-*` | 단색 토큰. 예외는 `/* ui-lint-allow gradient: <이유> */` |
| R2 | `ai-purple` | `#7c3aed` 등 hex 9개, `text-indigo-*` 등 | 브랜드 토큰. 브랜드가 보라면 `brand_hue: purple` |
| R3 | `hardcoded-color` | 컴포넌트의 hex/rgb/oklch, `bg-blue-500` 류 팔레트 클래스 | `var(--ui-color-…)` / `bg-brand-solid` |
| R4 | `hardcoded-font` | `font-family: Inter`, Google Fonts 링크, `font-['…']` | `var(--ui-font-sans)` / `font-sans` |

### 소프트 룰 (종료 전 1회 지적, Stop)

`--stop`에서만 발화하고 한 번만 block한다(고친 뒤 다시 종료하면 통과). CI(`--all`)는 소프트로 실패하지 않는다.

`glass-decorative` · `emoji-as-icon` · `heavy-shadow` · `bounce-easing` · `h-screen` · `z-arbitrary` · `transition-all` · `eyebrow` · `side-tab` · `img-hover-scale` · `pure-bw` · `em-dash` · `break-all`(한글) · `korean-tracking` · `buzzword`(한/영).

### 스택별 설치

`tokens.css`는 프레임워크 무관이고 **브릿지만 스택별**이다. 설치기가 스택에 맞는 것만 넣는다.

| 스택 | `--stack` | 브릿지 | CSS 엔트리 |
|---|---|---|---|
| Tailwind v4 (기본) | `react-tailwind4` | `theme.css`(@theme) | `@import "tailwindcss"` → tokens.css → theme.css |
| Tailwind v3 | `react-tailwind3` | `tailwind.ui-preset.cjs` | config에 `presets: [require('./tailwind.ui-preset.cjs')]` + tokens.css import |
| 순수 CSS/기타 | `react-css` · `plain` | 없음 | tokens.css만 import, `var(--ui-*)` 직접 사용 |

세 경로 모두 `bg-brand-solid`·`text-4`·`rounded-control`(또는 `var(--ui-*)`)가 같은 `--ui-*`를 참조하므로 다크모드 전환이 동일하게 동작한다. 재설치는 `--update`(훅·스킬만 갱신, tokens.css·DESIGN.md 보존).

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
  tokens-contrast.mjs        ← 정적 대비 검사
  figma-sync.mjs             ← Figma 변수 → tokens.css
  install.mjs                ← 설치기
  settings.json · CLAUDE.snippet.md
eval/                        ← 골든 프롬프트 + 일관성 측정 + 실측 기준선
docs/                        ← PRD + 레퍼런스 분석
```

DESIGN.md frontmatter(린터가 읽는 정책): `mode_default` · `stack` · `token_prefix` · `brand_hue` · `font_families` · `gradient_policy` · `tailwind_palette` · `hardcoded_color` · `radius_scale`.

---

## 테스트

```bash
node templates/design-lint.test.mjs        # 하드/소프트 룰
node templates/install.test.mjs            # 설치기
node templates/design-audit.test.mjs       # 런타임 감사 대비 수학
node templates/tokens-contrast.test.mjs    # 정적 대비
node templates/figma-sync.test.mjs         # Figma 파싱/반영
node eval/consistency.test.mjs             # 일관성 측정 로직
```

## 라이선스

MIT. 스케일 값·정규식 일부는 daangn/seed-design, pbakaus/impeccable (Apache-2.0)에서 가져왔다. [NOTICE](NOTICE) 참조. seed-design의 이름·로고·캐럿 색은 상표라 포함하지 않는다.
