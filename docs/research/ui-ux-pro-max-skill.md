# ui-ux-pro-max-skill (nextlevelbuilder) — 분석 보고서

- 저장소: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill · 커밋 `f232671` (2026-09-01) · MIT
- 분석일: 2026-09-02 · `<R>` = 저장소 루트
- PRD 연결: §5.1 (토큰 계층 스펙), §7.2 (UX 룰 후보), §4e (안티-그라데이션 룰 부재 확인)

Version **2.13.0** (`<R>/skill.json:5`).

---

## 1. Overview

**Claims** (`<R>/README.md:160-167`): 79 searchable UI styles (50 active), 192 color palettes, 192 product types, 192 industry reasoning rules, 74 font pairings, 25 chart types, 22 tech stacks, 119 UX guidelines, 105 icons, 17 GSAP presets, 1934 Google Fonts. Verified against `src/ui-ux-pro-max/data/catalog-summary.json:3-24`.

**Install paths:**

| Path | Command |
|---|---|
| Claude Code plugin | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` → `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` |
| npm CLI | `npm i -g ui-ux-pro-max-cli` → `uipro init --ai claude` |
| npx | `npx ui-ux-pro-max-cli init --ai {{platform}}` |
| Global | `uipro init --ai claude --global` → `~/.claude/skills/` |

**20 platforms** (`<R>/skill.json:17-37`), one JSON template each in `src/ui-ux-pro-max/templates/platforms/`. Install roots differ: claude→`.claude/skills/`, codex→`.agents/skills/`, copilot→`.github/prompts/`, kiro→`.kiro/steering/`, etc.

**Commercial note:** README upsells Premium (`README.md:202-220`): "Enterprise Architecture: a more comprehensive and scalable Design Token architecture" — the token layer here is deliberately trimmed.

---

## 2. Skill catalog

All 7 SKILL.md under `<R>/.claude/skills/`. Other platform dirs are generated at install time.

| Skill | Lines | Purpose |
|---|---|---|
| **ui-ux-pro-max** (master) | 214 | Orchestrator. Priority table, query contract, `--design-system` workflow, persistence, stack routing. Hand-authored. |
| **design-system** | 244 | 3-tier tokens + 8 slide-decision CSVs. `author: claudekit`. |
| **design** | 314 | Router + logo/CIP/icon/social generators calling **Gemini / Atlas Cloud image APIs**. `author: claudekit`. |
| **ui-styling** | 324 | shadcn + Tailwind reference; ships ~5.8 MB TTF fonts. `author: claudekit`. |
| **banner-design** | 145 | Marketing-asset generator. `author: claudekit`. |
| **brand** | 97 | Brand guidelines → tokens sync. `author: claudekit`. |
| **slides** | 40 | Duplicate of design-system's slide half. `author: claudekit`. |

⚠️ Only `ui-ux-pro-max` is native. The other six are vendored from ClaudeKit; `html-token-validator.py` still hardcodes ClaudeKit brand colors.

---

## 3. Search / data mechanism

**Source of truth:** `<R>/src/ui-ux-pro-max/data/`, mirrored (real copies) into `.claude/skills/ui-ux-pro-max/data/` and `cli/assets/data/`, enforced by CI.

### Files (verified row counts)

| File | Rows | Columns |
|---|--:|---|
| `styles.csv` | 88 | 29 cols incl. `Keywords, Primary Colors, Effects & Animation, Best For, Do Not Use For, Accessibility, AI Prompt Keywords, CSS/Technical Keywords, Implementation Checklist, Design System Variables, Style ID, Status` |
| `ux-guidelines.csv` | 119 | `No, Category, Issue, Platform, Description, Do, Don't, Code Example Good, Code Example Bad, Severity` |
| `ui-reasoning.csv` | 192 | `No, UI_Category, Recommended_Pattern, Style_Priority, Color_Mood, Typography_Mood, Key_Effects, Decision_Rules, Anti_Patterns, Severity, Reasoning, Confidence` |
| `colors.csv` | 192 | shadcn-shaped semantic set |
| `typography.csv` | 74 | incl. `Google Fonts URL, CSS Import, Tailwind Config` |
| `google-fonts.csv` | 1934 | 15 cols |
| `icons.csv` | 105 | incl. `Semantic Role, Allowed Contexts` |
| `charts.csv` | 25 | incl. `Accessibility Grade/Risk/Notes` |
| `motion.csv` | 17 | GSAP snippets |
| `stacks/*.csv` | 22 files, 1260 rows | `Guideline, Do, Don't, Code Good, Code Bad, Severity, Docs URL, Verified At` |

### Search engine
`src/ui-ux-pro-max/scripts/core.py` (993 lines) — **BM25 only, hand-rolled, stdlib only**. `k1=1.5, b=0.75`. Synonym substitution, 24 stopwords.

- **Abstention layer**: per-domain score floors `_DOMAIN_SCORE_FLOORS = {"style": 4.3, "landing": 4.0, "product": 6.0, "icons": 5.8, "react": 3.3}` (`core.py:203-206`) + token-coverage gate. Below threshold → **0 results with explicit "did not hit the database"** (`search.py:79-84`). The most transferable engineering idea.
- Calibration versioned + regression-tested (`_SEARCH_CALIBRATION_VERSION = "2026-08-12-v1"`).

### Invocation (`SKILL.md:41-43`)
```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --domain <domain>
python "…/search.py" "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
python "…/search.py" "<query>" --design-system --persist -p "Project Name" --output-dir "<project-root>"
```
Dials: `--variance/--motion/--density 1-10`.

⚠️ `${CLAUDE_PLUGIN_ROOT}` only set for plugin installs; CLI-generated SKILL.md uses a different path.

### Sample rows

`styles.csv:2` — *Minimalism & Swiss Style*: Best For "Enterprise apps, dashboards, documentation sites, SaaS platforms"; AI Prompt Keywords "…**Avoid shadows and gradients.**"; Design System Variables `--spacing: 2rem, --border-radius: 0px, --shadow: none, --accent-color: single primary only`.

`ux-guidelines.csv:16` (Layout / Z-Index, **High**): Do "Define z-index scale system (10 20 30 50)" · Don't "Use arbitrary large z-index values" · Bad `z-[9999]`

`ux-guidelines.csv:118` (Accessibility / Compact Control Semantics, **Critical**): Do "Prefer a button and expose pressed or selected state" · Bad `<div class='selected' onclick='toggle()'>`

---

## 4. UX rules & anti-patterns (verbatim)

### 4a. `ux-guidelines.csv` — 119 rows
Category distribution: Accessibility 20, Forms 11, Animation 10, Layout 9, Responsive 8, Performance 8, Interaction 8, Typography 7, Content 7, Touch 6, Navigation 6, Feedback 6, AI Interaction 3, others.

- **Touch targets** `:23`: "Use 44pt on iOS and 48dp on Android; for web use the separate WCAG Target Size rule"
- **WCAG 2.2 AA** `:105`: "requires 24 CSS px pointer targets or an applicable exception"
- **Touch spacing** `:24`: "Minimum 8px gap between touch targets"
- **Contrast** `:37`: "Minimum 4.5:1 ratio for normal text" · Good `#333 on white (7:1)` · Bad `#999 on white (2.8:1)`
- **Hover vs tap** `:12`: "Hover effects don't work on touch devices" · Bad `onMouseEnter only`
- **Disabled** `:32`: Good `opacity-50 cursor-not-allowed`
- **Focus** `:103`: Good `outline: 2px solid currentColor; outline-offset: 2px`
- **Auto-rotating** `:109`: "Provide previous next and play/pause; stop on focus or hover and when reduced motion is requested"

### 4b. `references/quick-reference.md` (256 lines)
- `:81` **`no-emoji-icons` - Use SVG icons (Heroicons, Lucide), not emojis**
- `:42` **`cursor-pointer` - Add cursor-pointer to clickable elements (Web)**
- `:104` **`z-index-management` - Define layered z-index scale (0 / 10 / 20 / 40 / 100 / 1000)**
- `:85` **`effects-match-style` - Shadows, blur, radius aligned with chosen style**
- `:88` **`elevation-consistent` - consistent elevation/shadow scale; avoid random shadow values**
- `:91` **`blur-purpose` - Use blur to indicate background dismissal (modals, sheets), not as decoration (Apple HIG)**
- `:92` **`primary-action` - Each screen should have only one primary CTA (Apple HIG)**
- `:125` **`color-semantic` - Define semantic color tokens not raw hex in components**
- `:126` **`color-dark-mode` - Dark mode uses desaturated / lighter tonal variants, not inverted colors**
- `:141` **`transform-performance` - Use transform/opacity only**
- `:143` **`excessive-motion` - Animate 1-2 key elements per view max**
- `:145` **`motion-meaning` - Every animation must express a cause-effect relationship (Apple HIG)**
- `:150` **`exit-faster-than-enter` - Exit ~60–70% of enter duration**
- `:242` **`trend-emphasis` - avoid heavy gradients/shadows that obscure the data**

### 4c. `references/pro-rules.md` (native/mobile scope)
`:13` **No Emoji as Structural Icons** — "Emojis are font-dependent, inconsistent across platforms, and cannot be controlled via design tokens."
`:16` **Stable Interaction States** — no layout-shifting transforms.
`:23` **Icon Contrast** — ≥ 3:1.

Checklist (`:77-96`):
> - [ ] No emojis used as icons (use SVG instead)
> - [ ] All icons come from a consistent icon family and style
> - [ ] Pressed-state visuals do not shift layout bounds
> - [ ] Semantic theme tokens used consistently (no ad-hoc hardcoded colors)
> - [ ] Touch targets ≥44x44pt iOS, ≥48x48dp Android
> - [ ] Primary text contrast ≥4.5:1 in both modes

### 4d. Generated `MASTER.md` forbidden list (`design_system.py:1349-1372`)
> - ❌ **Emojis as icons** — Use SVG icons
> - ❌ **Missing cursor:pointer**
> - ❌ **Layout-shifting hovers**
> - ❌ **Low contrast text** — 4.5:1 minimum
> - ❌ **Instant state changes** — Always use transitions (150-300ms)
> - ❌ **Invisible focus states**
>
> ## Pre-Delivery Checklist
> - [ ] No emojis used as icons · consistent icon set · `cursor-pointer` · hover transitions 150-300ms · contrast 4.5:1 · focus visible · `prefers-reduced-motion` · Responsive 375/768/1024/1440 · no content behind fixed navbars · no horizontal scroll on mobile

### 4e. ⚠️ Gradients & glassmorphism — the honest answer

**There is no global anti-gradient or anti-glassmorphism rule anywhere.**

- Gradient guardrails are **per-industry** strings in `ui-reasoning.csv` `Anti_Patterns`. Distribution: `Excessive decoration` ×29, `3D effects` ×21, `Complex shadows` ×21, **`AI purple/pink gradients` ×14**. So the AI-slop guard fires on only **14/192 (7%)** of product types — banking, healthcare, government, legal, insurance, fintech, senior care.
- `ui-reasoning.csv:2` recommends **`Style_Priority: Glassmorphism + Flat Design` for "SaaS (General)"**. `:132` (AI Photo Generator) prescribes *"AI purple + aurora gradients"*.
- `banner-design/SKILL.md:3` lists "gradient" and "glassmorphism" as **offered styles**.
- The literal phrase "AI slop" appears **zero** times in the skill.

**Implication:** this repo gives the *format* for the rule but not the rule.

---

## 5. Design system skill — strongest reuse candidate

### Token architecture (`references/token-architecture.md:7-26`)
```
Component Tokens   --button-bg, --card-padding        Per-component overrides
Semantic Tokens    --color-primary, --spacing-section Purpose-based aliases
Primitive Tokens   --color-blue-600, --space-4        Raw design values
```

**Naming** (`:139-147`): `--{category}-{item}-{variant}-{state}`. Categories: `color, space, font-size, radius, shadow, duration` (`:151-158`).

**Formats:**
- **CSS custom properties** — `primitive-tokens.md` (203 ln: gray 50-950, blue, status; 4px spacing `--space-0…24`; type xs→5xl; `--leading-*`, `--tracking-*`; radius; shadow sm→2xl; `--duration-75…1000`; **z-index scale** `--z-dropdown:1000, --z-sticky:1100, --z-modal:1200, --z-popover:1300, --z-tooltip:1400` at `:190-203`) and `semantic-tokens.md` (215 ln: shadcn-shaped + `.dark` at `:158-180`).
- **W3C DTCG JSON** — `templates/design-tokens-starter.json` (143 ln, `$value`/`$type`).
- **Tailwind** — `tailwind-integration.md` (251 ln) uses **space-separated HSL channels** (`--primary: 217 91% 60%`) — a *different encoding* from the hex in primitive/semantic docs. Not reconciled.

`references/states-and-variants.md` (241 ln): state priority `disabled > loading > active > focus > hover > default` (`:22-27`); transition table (`:39-45`: color 150ms ease-in-out, transform 200ms ease-out, shadow 200ms ease-out); focus-ring 2px/2px offset (`:52-58`).
`references/component-specs.md` (236 ln): Button 6 variants, 4 sizes (32/40/48px), 6 states.

### `scripts/generate-tokens.cjs` (205 ln)
`node generate-tokens.cjs --config tokens.json -o tokens.css [--format css|tailwind]`.

🐛 **Defect:** `resolveReference` returns the *resolved literal* (`:63-67`), so the emitted semantic layer inlines raw hex instead of `var(--primitive-…)`, defeating the three-layer indirection. Also primitives emitted as `--primitive-color-blue-600` while docs write `--color-blue-600`.

### `scripts/html-token-validator.py` (359 ln)
Validates HTML assets: `design-tokens.css` import present; `FORBIDDEN_PATTERNS` (`:65-72`): hex, `rgb()`, `rgba()`, `hsl()`, hardcoded `font-family` — errors only in `<style>`/inline `style=`, allowed in `<script>`; warns if `var(--…)` count < 5. ⚠️ `ALLOWED_RGBA_PATTERNS` hardcodes ClaudeKit brand triples.
Sibling `scripts/validate-tokens.cjs` (246 ln): scans source for hex/rgb/px/rem; skips `tailwind.config`, `globals.css`, `tokens.*`. **`--fix` only prints suggestions.**

**Verdict:** `token-architecture.md` + `primitive-tokens.md` + `semantic-tokens.md` + `states-and-variants.md` + `component-specs.md` + `design-tokens-starter.json` are the highest-value content. Generator scripts need repair.

---

## 6. Brand skill
**Not a hook.** Manual bash call (`brand/SKILL.md:25-29`): `node scripts/inject-brand-context.cjs`. Reads `docs/brand-guidelines.md`, regex-scrapes `### Primary Colors` etc., emits plaintext `BRAND CONTEXT:` block for prompt-prepend. `sync-brand-to-tokens.cjs` synthesizes 50→900 scale by naive RGB brightness offset (no perceptual correction), shells out to `generate-tokens.cjs`. Hardcodes `"ClaudeKit Marketing - "`.

---

## 7. Persistence
**Two unreconciled schemes:**

**(a)** `design-system/<project-slug>/MASTER.md` + `pages/<page>.md` overrides (`design_system.py:995-1073`). Cross-session consistency is **instruction-only** (`SKILL.md:106-109`). Overwrite safety via `os.link` atomic publish unless `--force`.

**(b)** `docs/brand-guidelines.md` → `assets/design-tokens.json` → `assets/design-tokens.css`.

(a) emits `--space-*`/`--shadow-*` + literal hex; (b) emits `--primitive-*`/`--color-*`. Never talk to each other.

---

## 8. Hooks
**None.** No `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SessionStart` anywhere in the shipped skill.

The only `settings.json` is `<R>/stack/.claude/settings.json` inside a **vendored third-party sample** — permission allowlist only. That `stack/` folder is nonetheless the most interesting enforcement artifact and is **not installed**:
- `stack/scripts/design-audit.mjs` — standalone Playwright audit. 6 viewports 360→1920, 8 heuristics: horizontal overflow, unsized `<img>`, missing `alt`, tap targets <44×44 on `vw<=480`, focus-visible probe, missing accessible names, `h1` count, `meta[viewport]` + `html[lang]`, approximate WCAG contrast over 120 sampled nodes.
- `stack/.claude/agents/design-review.md` — 7-phase browser review subagent.
- `stack/.github/workflows/design-review.yml` — runs on PRs touching UI.

---

## 9. Gaps
1. **No global anti-slop rule** (§4e).
2. **No programmatic lint in the installed product.**
3. **No hooks / no enforcement.**
4. **Landing-page & marketing-centric.**
5. **Two incompatible token conventions** (hex vs HSL channels; generator inlines hex).
6. **Two unreconciled persistence schemes.**
7. **Provenance mixing / dead ClaudeKit code.**
8. **Python 3 hard dependency** for search.
9. **Path fragility** across install modes.
10. `ui-reasoning.csv` `Reasoning` and `Confidence` columns **empty** in sampled rows.
11. **English-only data.**
12. **Freshness rot** — version-pinned majors with `Verified At: 2026-08-13`.

**Harvest:** (a) design-system references as token spec; (b) `ux-guidelines.csv` + `quick-reference.md` as rule corpus; (c) `pro-rules.md` checklist; (d) BM25 abstention pattern; (e) `stack/scripts/design-audit.mjs` as seed for M3 runtime audit.
