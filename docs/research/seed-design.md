# seed-design (daangn) — 분석 보고서

- 저장소: https://github.com/daangn/seed-design · 커밋 `714ab67` (2026-09-01) · Apache-2.0 + NOTICE 상표 조항
- 분석일: 2026-09-02 · 경로는 저장소 루트 상대
- PRD 연결: §5.1 (토큰 2계층·스케일 값), §5.3 (훅 패턴), §7.4 (한국어 폰트 스택), §8.7 (✅/⚠️/🚫), 부록 A

Monorepo, Bun workspaces. Package `@seed-design/project`.

---

## 1. Agent harness — the wiring pattern

### 1.1 Layout
```
CLAUDE.md                      → 3-line pointer, delegates to AGENTS.md/TECH.md
AGENTS.md                      → repo-wide agent contract (Boundaries + Git rules)
TECH.md                        → architecture, commands, test matrix
skills/                        → SINGLE SOURCE OF TRUTH (15 skills)
.claude/skills       →symlink→ ../skills
.agents/skills       →symlink→ ../skills
.claude/plugins/seed-design/skills →symlink→ ../../../skills
.claude/settings.json          → hooks only (no permissions block)
.claude/hooks/                 → 3 hooks, .sh wrapper around .ts
.claude/agents/                → 4 subagents
.claude/plugins/seed-design/   → plugin manifest + 6 slash commands
.mcp.json                      → 3 MCP servers
```

**The symlink trick.** `skills/AGENTS.md:3`: *"레포 루트 기준 `skills/`는 seed-design 스킬의 단일 원천(source of truth)이다. `.claude/skills`, `.claude/plugins/seed-design/skills`, `.agents/skills` 모두 이 디렉토리로의 symlink이다."* One body, four consumers.

### 1.2 `.claude/settings.json` — verbatim

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Edit",      "hooks": [{ "type": "command", "command": "bash .claude/hooks/generated-files-guard.sh" }] },
      { "matcher": "Write",     "hooks": [{ "type": "command", "command": "bash .claude/hooks/generated-files-guard.sh" }] },
      { "matcher": "MultiEdit", "hooks": [{ "type": "command", "command": "bash .claude/hooks/generated-files-guard.sh" }] },
      { "matcher": "Bash",      "hooks": [{ "type": "command", "command": "jq -r '.tool_input.command' | grep -qE '^(npm|pnpm|yarn)\\s|\\s(npm|pnpm|yarn)\\s|;\\s*(npm|pnpm|yarn)\\s' && { echo '⚠️ Use `bun` instead of npm/pnpm/yarn in this project.' >&2; exit 2; } || exit 0" }] }
    ],
    "PostToolUse": [
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "jq -r '.tool_response.filePath' | xargs bun biome format --write" }] },
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "bash .claude/hooks/post-edit-tasks.sh" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/validation-reminder.sh", "timeout": 2000 }] }
    ]
  }
}
```

No `permissions` key. All enforcement via hooks + `AGENTS.md` prose.

### 1.3 Hooks

| Event | Matcher | Script | Behavior |
|---|---|---|---|
| PreToolUse | `Edit`/`Write`/`MultiEdit` | `generated-files-guard.sh` → `.ts` | Blocks edits to generated files (exit 2) |
| PreToolUse | `Bash` | inline jq+grep | Blocks `npm`/`pnpm`/`yarn` (exit 2) |
| PostToolUse | `Write\|Edit` | inline | `bun biome format --write` |
| PostToolUse | `Write\|Edit` | `post-edit-tasks.sh` | Path-routed rebuild |
| Stop | — | `validation-reminder.sh` → `.ts` (2s) | Non-blocking checklist |

**generated-files-guard** (`.claude/hooks/generated-files-guard.ts:17-52`) — regex → {source, regenerate command}:

```ts
{ pattern: /packages\/css\/(vars|recipes|theming)\/.*/,  source: "packages/rootage/ 또는 packages/qvism-preset/", regenerateCommand: "bun generate:all" },
{ pattern: /packages\/css\/.*\.(css|min\.css)$/,          source: "packages/qvism-preset/",  regenerateCommand: "bun generate:all" },
{ pattern: /packages\/qvism-preset\/src\/vars\/.*/,       source: "packages/rootage/",       regenerateCommand: "bun generate" },
{ pattern: /docs\/registry\/.*\.json$/,                   source: "docs/registry/*.ts",      regenerateCommand: "bun --filter @seed-design/docs generate:registry" },
{ pattern: /.*\/dist\/.*/,                                source: "해당 패키지 소스",        regenerateCommand: "bun build" },
{ pattern: /.*\/__generated__\/.*/,                       source: "생성 스크립트",           regenerateCommand: "해당 generate 스크립트" },
```

On match: boxed message naming the file, the source to edit instead, the exact regen command, then `process.exit(2)`. Wrapped in try/catch that swallows errors so the hook never wedges the session.

**post-edit-tasks.sh** (`:1-74`): `run_with_feedback()` runs a command and `exit 2`s with stderr on failure. Routing by path prefix (`docs/registry/` → registry gen, `packages/rootage/` → rootage+qvism gen, `packages/react/` → build, etc.). At `:68-74` it `exit 2`s **on success too**, listing executed commands, so the agent always learns what regenerated.

**validation-reminder.ts** (`:16-50`) reads `modified_files` from Stop input and emits a domain-specific checklist as `{"systemMessage": ...}` (non-blocking). Three domains: `react_docs`, `headless`, `guidelines`.

### 1.4 `AGENTS.md` — the contract

`/AGENTS.md:44-69` — the three-tier boundary block:

```
- ✅ Always: bun generate:all 실행 후 변경사항 확인 / 패키지 수정 직후 해당 경로 테스트만 실행 / 테스트 실행 후 커밋
- ⚠️ Ask first: 새 패키지 추가 / tsconfig·biome.json 설정 변경 / CI 워크플로우 수정 / 외부 의존성 추가
- 🚫 Never: packages/css/vars·recipes 직접 수정 / packages/qvism-preset/src/vars 직접 수정 /
             .env·API 키·시크릿 커밋 / npm·pnpm·yarn 사용 / dist·node_modules 수정
```

Doc-role separation (`:36-40`): `AGENTS.md` = conventions (AI), `TECH.md` = architecture (AI), `README.md` = usage (humans). Hierarchy rule (`:26-28`): **"상위 AGENTS는 얕고 넓게, 하위 AGENTS는 깊고 좁게"**. Git: commit messages **must be English**, Conventional Commits.

**33 `AGENTS.md` files**. `CLAUDE.md:2`: *"AGENTS.md files exist in every directory that matters - always read it first."*

Notable child AGENTS.md:
- `packages/rootage/AGENTS.md:14-21` — token naming `$type.category.name`, both `theme-light`/`theme-dark` mandatory, prefer `strokeColor` over `border*`, never hardcode `300ms`/`ease-in-out`, half-step separator is `_`.
- `packages/qvism-preset/AGENTS.md:15-16` — **`engaged` first, not `active`**: hover on hover-capable, active on touch.
- `packages/qvism-preset/AGENTS.md:30` — **"로딩 중 상태에 `display: none`을 걸지 않는다"** (removed layout box → `loading="lazy"` never intersects → LCP slips). Cites `#1258 → #1428 → #1791`.
- `docs/AGENTS.md:25-41` — cascade-layer playbook; never `!important` in `global.css`.

### 1.5 `.claude/agents/` — 4 subagents
`breeze-developer` (write), `docs-auditor` (read-only), `structure-mapper` (read-only), `workflow-keeper` (generated-file protection; agent-level twin of the hook).

### 1.6 Plugin + commands
`plugin.json`: `{"name": "seed", "version": "0.1.0", …}`. Six slash commands, each a 3-5 line stub delegating to a skill. Frontmatter pattern: `description` holds **argument names** (`$COMPONENT_ID $COMPONENT_NAME $WITH_HEADLESS`), `allowed-tools` scopes the command.

### 1.7 `.mcp.json`
Three stdio servers: `seed-design` (published), `seed-design-local` (dev), `playwright`.

### 1.8 The 15 skills
All under `skills/<name>/SKILL.md`, `seed-*` prefix. Minimal frontmatter (`name` + `description`, plus `user-invocable: true` and `argument-hint` on three).

| Skill | What it encodes |
|---|---|
| `seed-design` (✅ invocable) | Umbrella router. Owns 10 `rules/*.md` and the Doctor report contract. |
| `seed-component-map` | Read-only script mapping one component across all layers. Deterministic JSON. |
| `seed-api-parity` | Diffs React vs Lynx. Distinguishes real gaps from platform constraints. |
| `seed-token-analysis` | Read-only color-token analysis + WCAG contrast. |
| `seed-create-component` | Router, 17 reference docs. "모든 참고 문서를 순서대로 읽지 않는다." |
| `seed-change-plan` (✅) | Read-only impact analysis + PR base choice. |
| `seed-submit-change` (✅) | Consumes that contract: rebase, commit, push, PR. Refuses if inconsistent. |
| `seed-changeset` | Requires user approval of bump + message. |
| `seed-snapshot-release` | Posts `/snapshot`, reports tarball URLs. |
| `seed-deprecation` / `seed-migrate-component-docs-from-figma` / `seed-write-lynx-component-docs` / `seed-verify-lynx-component` / `seed-verify-figma-mcp-transports` / `seed-dev-figma-v3-migration-plugin` | Specialized. |

**Cross-skill composition contract.** `seed-change-plan` → `seed-changeset` → `seed-submit-change` with typed handoff.

**Install:** `npx skills add https://github.com/daangn/seed-design --skill seed-design` (`docs/content/ai-integration/skill/index.mdx:33`).

**The anti-duplication doctrine** — the single most transferable idea. `docs/content/ai-integration/skill/index.mdx:8`: *"**문서에 이미 있는 것은 스킬에 옮겨 적지 않습니다.** 셋업 절차나 컴포넌트 목록, 토큰 이름은 공식 문서와 `docs` CLI가 원본이고 복사본은 원본보다 먼저 낡습니다."* The skill holds routing and judgment only; facts come from live `llms.txt`. `:80`: *"기억한 경로나 URL 조합으로 leaf 문서를 만들지 않습니다."*

**Doctor rules** (`skills/seed-design/rules/*.md`, 10 files) — verdict vocabulary: `pass | fail | unknown:no-threshold | unknown:runtime-dependent | unknown:not-in-code | unknown:doc-conflict | not-verified | not-applicable`. `component-guidelines.md:60`: *"`coverage.expected != coverage.judged`면 실행 결함입니다."*

`foundation-contract.md:19-25`:
> ## 하지 않는 판단
> - 하드코딩 값이 나쁜지
> - semantic token 선택이 디자인 맥락에 적절한지
> - 토큰 값 자체가 화면 의도에 맞는지
>
> Doctor는 존재·공개성·제거·내부 API 의존 같은 계약 위반만 판정합니다.

**Sticking policy** (`skills/seed-create-component/references/sticking-policy.md`) — forbidden when blocked (`:7-12`): ad-hoc workarounds, mock substitution, `as any`, `it.skip`, "fix later" comments, partial pattern application. `:14`: *"이 룰이 깨지면 ground truth가 깨진다."* Six named blockers force a hard stop. "통증 메모" template. `:48`: same blocker twice → update `references/` or `AGENTS.md`.

### 1.9 CI-side
`.github/workflows/claude-code-review.yml` — `/claude-review` comment trigger, `anthropics/claude-code-action@v1`, XML review rubric, stance: *"당신은 이 프로젝트를 함께 만들어가는 동료입니다. 비평가가 아닌 협력자로서…"*, scope-creep bans.

---

## 2. Token architecture

### 2.1 Source of truth & format
`packages/rootage/*.yaml` — **custom YAML, not DTCG**. Envelope `kind` / `metadata` / `data`:

```yaml
kind: Tokens
metadata:
  id: color
  name: Color
  lastUpdated: 26-06-15
data:
  collection: color
  tokens:
    $color.palette.gray-00:
      values:
        theme-light: "#ffffff"
        theme-dark: "#000000"
```

Generated JSON (`__generated__/color.json`) adds DTCG-ish `{type, value}` wrappers. Published as `@seed-design/rootage-artifacts`.

### 2.2 Tier structure — two tiers
`docs/content/foundations/design-token/index.mdx:21-27`: *"SEED 디자인 토큰은 유연성을 위해 크게 2단계로 계층화하여 사용합니다."*
- **Scale Token** — `$color.palette.gray-500`, `$dimension.x4`, `$font-size.t5`.
- **Semantic Token** — `$color.bg.brand-solid`, `$dimension.spacing-x.global-gutter`.

Component values live in `kind: ComponentSpec` (105 files), not a third tier.

### 2.3 Naming
- YAML: `$type.category.name`
- CSS: `--seed-` + dot-to-dash — `--seed-color-bg-layer-default`, `--seed-dimension-x0_5`
- TS: `import { bg } from "@seed-design/css/vars/color"` → `bg.layerDefault`
- Recipe: `.seed-{name}` / `.seed-{name}__{slot}`

Semantic color grammar **property → role → variant → state**:
`property` ∈ {`fg`, `bg`, `stroke`} · `role` ∈ {`brand`, `neutral`, `positive`, `warning`, `critical`, `informative`, `magic`, `layer`, `disabled`, `placeholder`, `overlay`, `transparent`} · `variant` ∈ {`solid`, `weak`, `muted`, `subtle`, `contrast`, `inverted`, `alpha`} · `state` ∈ {`pressed`, `selected`}. (`docs/content/foundations/color/color-role.mdx:7`)

199 color tokens.

### 2.4 Pipeline (`TECH.md:46-59`)
```
[Figma] → [rootage YAML] → [qvism-preset] → [css] → [react]
```
`bun figma:sync` → `bun rootage:generate` → `bun qvism:generate` → `bun generate:all`.

### 2.5 Modes (`packages/rootage/collections.yaml:5-28`)
```yaml
- name: global          modes: [default]
- name: color           modes: [theme-light, theme-dark]
- name: motion          modes: [preferred, reduced]
- name: viewport-width  modes: [base, sm, md, lg, xl]
```
**No brand axis.** Runtime: `:root[data-seed-color-mode="light-only"]` / `"dark-only"` / `"system"` + `data-seed-user-color-scheme`. Extra axes: `[data-seed-platform="ios"]`, `[data-seed-font-scaling="enabled"]`.

### 2.6 Ten sample semantic color tokens (`packages/rootage/color.yaml`)

```yaml
$color.fg.brand:            { theme-light: $color.palette.carrot-600, theme-dark: $color.palette.carrot-700 }   # :385
$color.fg.neutral:          { theme-light: $color.palette.gray-1000,  theme-dark: $color.palette.gray-1000 }   # :419
$color.fg.neutral-muted:    { theme-light: $color.palette.gray-800,   theme-dark: $color.palette.gray-800 }    # :429
$color.fg.placeholder:      { theme-light: $color.palette.gray-600,   theme-dark: $color.palette.gray-600 }    # :439
$color.bg.brand-solid:      { theme-light: $color.palette.carrot-600, theme-dark: $color.palette.carrot-700 }   # :463
$color.bg.critical-solid:   { theme-light: $color.palette.red-700,    theme-dark: $color.palette.red-600 }     # :483
$color.bg.layer-basement:   { theme-light: $color.palette.gray-200,   theme-dark: $color.palette.gray-00 }     # :527  "가장 낮은 0단계의 '대지'"
$color.bg.layer-default:    { theme-light: $color.palette.gray-00,    theme-dark: $color.palette.gray-100 }    # :532  "basement 바로 위에 놓이는 기본 표면"
$color.bg.neutral-solid:    { theme-light: $color.palette.gray-1000,  theme-dark: $color.palette.gray-300 }    # :571
$color.bg.overlay:          { theme-light: $color.palette.static-black-alpha-700, theme-dark: same }          # :608
```

**Light/dark inversion:** `gray-00` is `#ffffff` light / `#000000` dark (`:9-12`). The palette flips, so most semantic tokens need no per-mode branch.

Palettes: `gray` (00,100..1000 = 11 steps), `carrot`, `blue`, `red`, `green`, `purple` (100..1000), `static-black`/`static-white` + `-alpha-*`.

### 2.7 Scales — actual values

**Dimension** (`dimension.yaml:8-88`). 4px base, `x{n}` = 4n px, half-steps `_`:

| `x0_5` | `x1` | `x1_5` | `x2` | `x2_5` | `x3` | `x3_5` | `x4` | `x4_5` | `x5` | `x6` | `x7` | `x8` | `x9` | `x10` | `x12` | `x13` | `x14` | `x16` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 24 | 28 | 32 | 36 | 40 | 48 | 52 | 56 | 64 |

Semantic spacing (`:65-88`):
```yaml
$dimension.spacing-x.between-chips:      $dimension.x2    # 8px
$dimension.spacing-x.global-gutter:      $dimension.x4    # 16px — 화면 전체 기본 수평 padding
$dimension.spacing-y.component-default:  $dimension.x3    # 12px
$dimension.spacing-y.nav-to-title:       $dimension.x5    # 20px
$dimension.spacing-y.screen-bottom:      $dimension.x14   # 56px
$dimension.spacing-y.between-text:       $dimension.x1_5  # 6px
```

**Radius** (`radius.yaml:8-40`): `r0_5` 2, `r1` 4, `r1_5` 6, `r2` 8, `r2_5` 10, `r3` 12, `r3_5` 14, `r4` 16, `r5` 20, `r6` 24, `full` 9999px.

**Font size** (`font-size.yaml`), rem @16px, `t11`+ for `sm`+ only:

| t1 | t2 | t3 | t4 | t5 | t6 | t7 | t8 | t9 | t10 | t11 | t12 | t13 | t14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 11px | 12 | 13 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28 | 32 | 40 | 48 |

Each has a `-static` px twin (font-scaling resistant). 28 tokens.

**Line height** (`line-height.yaml`), t1–t14: 15, 16, 18, 19, 22, 24, 27, 30, 32, 35, 38, 42, 52, 60 px.

**Font weight**: `regular` 400, `medium` 500, `bold` 700.

**Duration** (`duration.yaml`): `d1` 50ms, `d2` 100, `d3` 150, `d4` 200, `d5` 250, `d6` 300; semantic `color-transition` → `d3`, `pressed-scale` → `d3`.

**Timing function** (`timing-function.yaml`):
```
linear            [0, 0, 1, 1]
easing            [0.35, 0, 0.35, 1]      # functional micro-motion
enter             [0, 0, 0.15, 1]
exit              [0.35, 0, 1, 1]
enter-expressive  [0.03, 0.4, 0.1, 1]
exit-expressive   [0.35, 0, 0.95, 0.55]
pressed-scale     [0, 0, 0.15, 1]
```

**Shadow** (`shadow.yaml`), only 3, dark far heavier:
```
s1  0 1px 4px  0  #00000014 (light) / #00000080 (dark)
s2  0 2px 10px 0  #0000001a         / #000000ad
s3  0 4px 16px 0  #0000001f         / #000000cc
```

---

## 3. Component inventory

### 3.1 Packages
`rootage` (token+spec YAML, source), `qvism-preset` (web recipes, source), `css` (generated), `react-headless` (42 sub-packages), `react` (styled), `lynx-*` (parallel stack), `cli`, `mcp`, `docs-mcp`, `figma`, `tailwind3-plugin`, `tailwind4-theme`, `stackflow`, bundler plugins, `codemod`.

### 3.2 Styling — custom recipe engine "qvism"
Panda/Chakra-style recipes in TS, compiled AOT to static CSS (`TECH.md:178-193`): `defineRecipe({ name, base, variants, compoundVariants, defaultVariants })` → `.seed-{name}`. Ships unlayered (`all.css`) and `@layer` (`all.layered.css`). Pseudo vocabulary: `active` (hover/pressed — "모바일 우선이므로 hover보다 권장"), `disabled`, `focus`, `focusVisible`, `loading`, `checked`, `selected`, `engaged`.

### 3.3 Components
**Rootage specs (105)**, **React styled (88)**: Accordion, ActionButton, ActionChip, ActionSheet, Avatar, Badge, BottomSheet, Callout, Checkbox, Chip, ChipTabs, Dialog, Divider, Fab, Field, HelpBubble, InlineBanner, List, Menu, PageBanner, ProgressCircle, PullToRefresh, RadioGroup, SegmentedControl, Select, SidePanel, Skeleton, Slider, Snackbar, Switch, Tabs, TextField, TimePicker, ToggleButton, WheelPicker, … **Headless (42)**.

### 3.4 Registry — shadcn-style
`docs/registry/` with `schema.ts`. Served at `https://seed-design.io/__registry__/{react|lynx}/{registryId}/{itemId}.json`. CLI: `init` then `add ui:action-button`. Snippets are **stable public API** (`docs/AGENTS.md:16-20`).

---

## 4. Design principles / guidelines

**Elevation** (`docs/content/foundations/elevation.mdx`) — strongest doc:
- Global L0 `layer-basement` → L1 `layer-default` → L2 Bottom Sheet / Menu → L3 Alert Dialog.
- `:98-99`: same-level conflict → don't raise elevation; add shadow or line for "구분감".
- Three ways (`:110`): Surface color, Shadow, Stroke.
- **`:129`** (bolded in source): *"**Shadow의 경우 다크 모드에서 잘 보이지 않는다는 한계가 있습니다. shadow를 써야하는 영역(화면 전체에서 주목도가 높은 몇 안 되는 요소)에서만 사용합니다.**"*
- `:146`: *"다크 모드에서는 고도가 높을수록 더 밝아지는 규칙을 따릅니다."*

**Typography** (`typography.mdx:89-94`):
> - **일관성 유지**: 정의된 토큰과 컴포넌트 사용
> - **명확한 계층 구조**
> - **상대 단위 사용**: px 대신 rem
> - **시맨틱 우선**: 화면 제목, 게시물 본문 등은 시맨틱 텍스트 스타일

`:79`: t1–t5 body, t6–t10 headings, t11–t14 large headings `sm`+ only. System font stack (`:24-28`): `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", Roboto, ...`.

**Layout** (`layout.mdx`):

| Density | Grid | Column | Gutter | Margins | Max-width |
|---|---|---|---|---|---|
| Low | Centered | 8 | 24px | 32px | 720px |
| Middle (base) | Centered | 12 | 24px | 32px | 1040px |
| High | Fluid | Full | – | 32px | 1040px (min) |

| Breakpoint | Viewport | Gutters | Margins |
|---|---|---|---|
| base | 0–479px | 16px | 12px |
| sm | 480–767px | 16px | 12px |
| md | 768–1279px | 32px | 24px |
| lg | 1280–1439px | 32px | 24px |
| xl | 1440+px | 32px | 24px |

`:79`: *"SEED는 Mobile First 원칙을 따릅니다."*

**Motion** (`motion.mdx:13`): *"마이크로 모션은 0.2초 이하, 매크로 모션은 0.2초를 초과합니다."*

**Gradient** (`gradient.mdx`) — token table only. Gradients scoped to AI/"magic": `$gradient.glow-magic`, `highlight-magic` (`#ff6600 → #d25aca`), `shimmer-magic` / `shimmer-neutral` (skeletons). **No decorative-gradient vocabulary at all.**

**Component Do/Don't** as MDX attributes (`docs/content/components/*.mdx`, 56 files): `<DontImage body="…" />`. E.g. `action-button.mdx:123` *"무분별하게 Brand 컬러를 사용하지 않습니다."*, `:162` *"버튼을 4개 이상 나란히 사용하지 않습니다."*, `:218` *"아이콘을 무분별하게 사용하지 않습니다."*, `:223` *"라벨의 앞과 뒤에 아이콘을 동시에 표시할 수 없습니다."* — machine-harvested by `component-guidelines` Doctor rule into `{docId}.dont-N` ids. **Design guidelines authored as MDX attributes become machine-checkable lint rules.**

---

## 5. Figma link
`ecosystem/figma-extractor` — generic config-driven Figma REST extraction (`.source → .filter → .sort → .transform → .write`). **Figma → tokens sync exists**: `package.json:38`:
```json
"figma:sync": "bun figma-extractor --config=scripts/.config/figma-extractor.config.ts scripts/data variables && bun run ./scripts/figma-to-rootage.ts"
```
One-way, Figma → code. Nightly `.github/workflows/sync-figma-entities.yml` (KST 11:00).

---

## 6. Reusing the token set

### License
**Apache-2.0**. `NOTICE:4`: *"이 소프트웨어는 Apache License 2.0에 따라 배포되며, 상업적 목적을 포함하여 자유롭게 사용, 수정, 재배포할 수 있습니다."* **But `NOTICE:9-18` carves out trademark** — logos, trade name, characters, anything identifiable as Daangn: non-commercial only absent agreement, revocable, no implied affiliation.

**Practical read: token values safely reusable; name, logo, character, carrot are not.** Include license copy + carry forward NOTICE attribution.

### Files to take (~50KB YAML)
```
packages/rootage/collections.yaml     600B
packages/rootage/color.yaml          32KB   199 tokens
packages/rootage/dimension.yaml      2.1KB
packages/rootage/radius.yaml         668B
packages/rootage/font-size.yaml      3.9KB
packages/rootage/line-height.yaml    4.0KB
packages/rootage/font-weight.yaml    277B
packages/rootage/duration.yaml       748B
packages/rootage/timing-function.yaml 1.1KB
packages/rootage/shadow.yaml         1.5KB
packages/rootage/gradient.yaml       3.7KB
packages/rootage/LICENSE, NOTICE
```
Compiled alternatives: `packages/css/base.css`, `packages/tailwind4-theme/index.css` (1035 lines mapping every `--seed-*` into `@theme`).

### What to strip / rename
1. **`--seed-` prefix** → own.
2. **`carrot` palette** + brand semantics (`fg.brand`, `bg.brand-solid`, `-pressed`, `-weak`, `stroke.brand-*`). Swap the palette and all semantics follow.
3. **`$color.manner-temp.*`** — 20 tokens, Daangn's reputation thermometer.
4. **`$color.banner.*`** — 10 campaign colors.
5. **`$gradient.*-magic`** — `#ff6600 → #d25aca`. Keep `shimmer-neutral`.
6. `lastUpdated` metadata, `@deprecated` notes.
7. Korean `description:` fields — genuinely good token docs; keep.

Everything else — gray/blue/red/green/purple ramps, static alphas, the `fg`/`bg`/`stroke` grammar, all scales, light/dark inversion — is brand-neutral. For Korean-market: system-font stack (`Apple SD Gothic Neo` first), 4px grid, px `-static` twins already tuned.

---

## 7. Superpowers / plans
`docs/superpowers/` — obra/superpowers convention (`brainstorm → spec → plan → implement`), date-prefixed specs.
`docs/plans/2026-08-31-seed-tools-to-skills-migration-plan.md` ← **the design doc for the entire skill harness**. Key decisions: `skills/` single source, no client copies; only repeatable *lookups* become scripts; explicit non-goals (no MCP server, no separate index, no compat layer); handoff prompt for the next agent.

Every skill with a script has a colocated test: `skills/*/scripts/*.test.ts`.

---

## 8. Gaps — Daangn-specific

| Not reusable | Where |
|---|---|
| `manner-temp` tokens + components | `color.yaml`, `packages/react` |
| Carrot palette + brand semantics + `-magic` gradients | `color.yaml`, `gradient.yaml` |
| `banner.*` campaign colors | `color.yaml` |
| Figma file keys, `<FigmaImage id>` node ids | workflows, docs |
| `seed-design.io` domain, `llms.txt` routing | `skills/seed-design/SKILL.md` |
| Branch model `dev`/`minor`/`major`, `/snapshot` | `TECH.md`, skills |
| `bun`-only enforcement | `.claude/settings.json` |
| Korean-language everything | repo-wide (a plus for us) |
| Biome, `ultra`, `knip`, Fumadocs, Chromatic | tooling |

**Mobile-first / Stackflow assumptions leak**: `active` > `hover`; press-scale feedback system; iOS/Android data attributes in base CSS; mobile-native component vocabulary (BottomSheet, ActionSheet, PullToRefresh, WheelPicker); Lynx parallel stack. Stackflow itself is opt-in (`packages/stackflow`); coupling is in examples and `AppScreen`/`AppBar` snippets.

**Other gaps**: no brand/theme axis; no a11y/contrast gate in token pipeline (on-demand only); `packages/design-token` is legacy; Doctor rules deliberately refuse to judge "is hardcoding bad" — exactly the judgment a generic UI skill needs to add.

---

## What to lift (ranked)
1. **`skills/` single source** into `.claude/skills`, `.agents/skills`, plugin — one body, every consumer.
2. **PreToolUse regex table → exit 2 with "edit this source instead, run this command"** — `.claude/hooks/generated-files-guard.ts:17-52`.
3. **PostToolUse path-router that `exit 2`s on success too** — `.claude/hooks/post-edit-tasks.sh`.
4. **✅Always / ⚠️Ask first / 🚫Never triad** — `AGENTS.md:44-62`.
5. **Design guidelines as machine-harvestable MDX attributes.**
6. **"Don't copy facts into the skill; route to the live index"** — `docs/content/ai-integration/skill/index.mdx:8`.
7. **Verdict vocabulary with `unknown:` sub-reasons** — `rules/component-guidelines.md:51-60`.
8. **Sticking policy + pain-note template.**
9. **Two-tier tokens (scale → semantic) with palette inversion for dark mode.**
10. **`npx skills add <repo> --skill <name>`** as install story.
