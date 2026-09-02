# impeccable (pbakaus) — 분석 보고서

- 저장소: https://github.com/pbakaus/impeccable · 커밋 `94b7f34` (2026-09-01) · Apache-2.0
- 분석일: 2026-09-02 · 경로는 저장소 루트 상대. 정본 트리는 `.agent/skills/impeccable/` (나머지 16개는 빌드 복제본)
- PRD 연결: §7.1 (하드 룰 정규식 출처), §5.3 (2단 훅 근거), 부록 A

**Version:** package `3.6.1` (CLI) / skill `4.1.2` / plugin `4.1.2`. Node ≥22.18.

---

## 1. Philosophy & scope

### Frontmatter — `.agent/skills/impeccable/SKILL.md:1-9`

```yaml
name: impeccable
description: Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. …
version: 4.1.2
license: Apache 2.0
allowed-tools:
  - Bash(npx impeccable *)
  - Bash(node .agent/skills/impeccable/scripts/*)
```

The trigger description enumerates surfaces and concerns, ending with an explicit negative: `Not for backend-only or non-UI tasks.` (`SKILL.md:3`).

### Core principles (`SKILL.md:14-16`)
- Go all out; deliverable must be complete.
- Dream big and bold.
- **Verify in bounded passes, not a loop** — build fully, one batched inspection round, fix everything in one batch, at most one confirmation round, stop. "Open-ended self-QA burns the user's money."

### Core workflow (`SKILL.md:18-23`)
1. `node <skill-base-dir>/scripts/context.mjs` **once per session** — loads PRODUCT.md, DESIGN.md, surface brief.
2. Load exactly **one** playbook (`reference/*.md`, or `reference/new-work.md`).
3. Load `reference/craft-floor.md` **immediately before editing UI** — "Do not load it for planning-only work."

### Two conceptual axes worth stealing

**Refinement vs. redesign** (`SKILL.md:27`): "Refinement preserves; redesign replaces… Never split the difference into polish on the discarded look."

**Four visitor modes** (`SKILL.md:32-39`) — chosen per *surface*, not per product:

| Mode | Visitor success | Surfaces |
|---|---|---|
| Persuade | decides and acts | landing, marketing, pricing |
| Operate | completes a task | app UI, dashboards, admin, settings |
| Read | understands something | docs, articles, changelogs |
| Experience | is inside the work | portfolios, galleries |

"A tool's landing page is still Persuade; a fashion house's documentation is still Read."

**The brief wins** (`SKILL.md:26`): pinned aesthetics/eras/fonts/palettes override saturated-pattern warnings. "Redirecting a clear brief toward your taste is failure." — the escape hatch that keeps anti-slop rules from becoming a taste monoculture.

---

## 2. Command catalog

23 commands via `/impeccable <cmd>`. Table at `SKILL.md:43-67`; machine-readable at `scripts/command-metadata.json`.

| Command | Category | Purpose |
|---|---|---|
| `craft` | Build | **Deprecated** alias for new-work |
| `shape` | Build | Plan UX/UI before code; discovery interview → brief |
| `init` | Build | Capture product truth in PRODUCT.md (never visual) |
| `document` | Build | Generate DESIGN.md from existing code |
| `extract` | Build | Pull repeated patterns/tokens into design system |
| `critique` | Evaluate | Nielsen 10 heuristics scored 0–4, P0–P3 |
| `audit` | Evaluate | 5 dimensions (a11y, perf, responsive, theming, anti-patterns), each 0–4 |
| `polish` | Refine | Final pre-ship pass; drift classification + triage ladder |
| `bolder` / `quieter` / `distill` / `harden` / `onboard` | Refine | Amplify / tone down / strip / production-ready / first-run |
| `animate` / `colorize` / `typeset` / `layout` / `delight` / `overdrive` | Enhance | Motion / color / type / spacing / personality / push limits |
| `clarify` / `adapt` / `optimize` | Fix | UX copy / devices / performance |
| `live` | Iterate | Browser element picker → AI variants via HMR |

Admin: `hooks <on|off|status|ignore-rule|ignore-file|ignore-value|reset>`, `doctor`, `pin/unpin`. No-argument invocation reads `reference/routing.md`; **"Never auto-run a command"**.

### Preventing vs. fixing — lopsided

**Preventive — 4 mechanisms:**
- `reference/craft-floor.md` — loaded before editing. The real prevention layer.
- `reference/new-work.md` / `shape` / `init` — decide before code.
- `scripts/hook-before-edit.mjs` — Cursor-only `preToolUse` **block**.
- `scripts/context.mjs` — injects DESIGN.md/PRODUCT.md at session boot.

**Corrective — everything else:** `hook.mjs` PostToolUse (warn only) + Stop deep pass; commands `audit`, `critique`, `polish`, etc.; CLI `npx impeccable detect`.

Design bet at `hook-lib.mjs:96-112`: per-edit nagging makes models *more conservative*, so most rules are deferred to one Stop-time pass.

---

## 3. Anti-pattern detection

### Registry: 59 rules
`scripts/detector/registry/antipatterns.mjs`. Each rule has `id`, `category` (`slop` | `quality`), `name`, `description`, optional `scopes`, `severity` (`error` | `advisory`), `advisory: true`.

IDs: `ai-color-palette, all-caps-body, aphoristic-cadence, blinking-cursor, body-text-viewport-edge, border-accent-on-rounded, bounce-easing, broken-image, clipped-overflow-container, codex-grid-background, content-hidden-at-rest, cramped-padding, cream-palette, dark-glow, design-system-color, design-system-font, design-system-font-size, design-system-radius, edge-flush-cards, em-dash-overuse, extreme-negative-tracking, first-viewport-column-overflow, flat-type-hierarchy, gpt-thin-border-wide-shadow, gradient-text, gray-on-color, heading-rhythm, hero-eyebrow-chip, icon-tile-stack, image-hover-transform, italic-serif-display, justified-text, kicker-above-heading, layout-transition, line-length, low-contrast, marketing-buzzword, marquee, monotonous-spacing, nested-cards, numbered-section-labels, oversized-h1, overused-font, pulsing-dot, radial-halo, radial-spotlight-glow, repeated-container-text, repeating-stripes-gradient, script-error, shape-assembled-illustration, side-tab, skipped-heading, text-occlusion, text-overflow, theater-slop-phrase, tight-leading, tiny-text, undersized-ui-text, wide-tracking`

### Four engines (`registry/antipatterns.mjs:559-564`)

```js
const RULE_ENGINE_SUPPORT = {
  regex: new Set(['source', 'page-analyzer']),
  'static-html': new Set(['element', 'page']),
  browser: new Set(['element', 'page', 'layout']),
  visual: new Set(['visual-contrast']),
};
```

| Engine | Entry | Reads |
|---|---|---|
| `regex` | `engines/regex/detect-text.mjs` | CSS/SCSS/LESS, JSX/TSX/JS/TS, `<style>` blocks, CSS-in-JS. Strips comments first (`:73-338`). |
| `static-html` | `engines/static-html/detect-html.mjs` + `css-cascade.mjs` | HTML with real cascade, no browser. |
| `browser` | `engines/browser/detect-url.mjs` | Puppeteer (optional). Overflow, occlusion, `:hover` contrast. |
| `visual` | `engines/visual/screenshot-contrast.mjs` | Pixel-diff to confirm contrast. |

Advisory rules never affect exit codes.

### Verbatim patterns — gradient rules

**Tailwind gradient text and purple gradients** (`rules/checks.mjs:224-235`):

```js
    if (/\bbg-clip-text\b/.test(classStr) && /\bbg-gradient-to-/.test(classStr)) {
      findings.push({ id: 'gradient-text', snippet: 'bg-clip-text + bg-gradient (Tailwind)' });
    }

    const purpleText = classStr.match(/\btext-(?:purple|violet|indigo)-\d+\b/);
    if (purpleText && (['h1', 'h2', 'h3'].includes(tag) || /\btext-(?:[2-9]xl)\b/.test(classStr))) {
      findings.push({ id: 'ai-color-palette', snippet: `${purpleText[0]} on heading` });
    }

    if (/\bfrom-(?:purple|violet|indigo)-\d+\b/.test(classStr) && /\bto-(?:purple|violet|indigo|blue|cyan|pink|fuchsia)-\d+\b/.test(classStr)) {
      findings.push({ id: 'ai-color-palette', snippet: 'Purple/violet gradient (Tailwind)' });
    }
```

**The purple hex list** (`rules/checks.mjs:1506-1508`) — the single most reusable artifact:

```js
  const purpleHexRe = /#(?:7c3aed|8b5cf6|a855f7|9333ea|7e22ce|6d28d9|6366f1|764ba2|667eea)\b/gi;
  if (purpleHexRe.test(styleText)) {
    const purpleTextRe = /(?:(?:^|;)\s*color\s*:\s*(?:.*?)(?:#(?:7c3aed|8b5cf6|a855f7|9333ea|7e22ce|6d28d9))|gradient.*?#(?:7c3aed|8b5cf6|a855f7|764ba2|667eea))/gi;
```

(`764ba2` / `667eea` = the notorious `linear-gradient(135deg, #667eea, #764ba2)`.)

**Gradient text, CSS** (`rules/checks.mjs:1517-1526`): `/(?:-webkit-)?background-clip\s*:\s*text/gi` + `/gradient/i` within ±200 chars.

**Regex-engine source matchers** (`engines/regex/detect-text.mjs:539-556`):

```js
  { id: 'gradient-text', regex: /background-clip\s*:\s*text|-webkit-background-clip\s*:\s*text/gi,
    test: (m, line) => /gradient/i.test(line),
    fmt: () => 'background-clip: text + gradient' },
  { id: 'gradient-text', regex: /\bbg-clip-text\b/g,
    test: (m, line) => /\bbg-gradient-to-/i.test(line),
    fmt: () => 'bg-clip-text + bg-gradient' },
  { id: 'ai-color-palette', regex: /\btext-(?:purple|violet|indigo)-(\d+)\b/g,
    test: (m, line) => /\btext-(?:[2-9]xl|[3-9]xl)\b|<h[1-3]/i.test(line),
    fmt: (m) => `${m[0]} on heading` },
  { id: 'ai-color-palette', regex: /\bfrom-(?:purple|violet|indigo)-(\d+)\b/g,
    test: (m, line) => /\bto-(?:purple|violet|indigo|blue|cyan|pink|fuchsia)-\d+\b/.test(line),
    fmt: (m) => `${m[0]} gradient` },
```

**Computed-style purple** (`rules/checks.mjs:201-206`): `hasChroma(textColor, 50)` and hue `260 ≤ h ≤ 310` on `h1/h2/h3` or `fontSize ≥ 20`.

**Repeating stripes** (`rules/checks.mjs:1642`): `/repeating-(?:linear|radial|conic)-gradient\s*\(/i`.

**Codex grid background** (`rules/checks.mjs:733-736`):

```js
  const hairlineRe = /\b\d{1,3}px\s*,\s*transparent\s+\d{1,3}px/gi;
  const invertedHairlineRe = /transparent\s+calc\(100%\s*-\s*\d{1,3}px\)/gi;
  const sizeDeclPxRe = /background-size\s*:[^;{}"']*\b\d{1,3}px\b/i;
  const shorthandPxAnyRe = /\/\s*\d{1,3}px\b/;
```

**Radial halo gates** (`rules/checks.mjs:763-836`): dark root bg + no `url()` + first stop chromatic (RGB spread ≥ 24, alpha ≥ 0.7) + last stop transparent + no ≤24px stops + not repeating.

### Verbatim patterns — color / glow

**Dark-page heuristic** (`rules/checks.mjs:655-656`):

```js
  const darkBgRe = /background(?:-color)?\s*:\s*(?:#(?:0[0-9a-f]|1[0-9a-f]|2[0-3])[0-9a-f]{4}\b|#(?:0|1)[0-9a-f]{2}\b|rgb\(\s*(\d{1,2})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*\))/i;
  const twDarkBg = /\bbg-(?:gray|slate|zinc|neutral|stone)-(?:9\d{2}|800)\b/;
```

**Glow** (`rules/checks.mjs:595-620`): chroma ≥ 30 and blur > 4px, then either zero offset (any bg) or `relativeLuminance(bg) < 0.1`.

**Gray-on-color** (`rules/checks.mjs:165-168`; Tailwind `detect-text.mjs:547-549`):

```js
      const isGray = !hasChroma(textColor, 20) && textLum > 0.05 && textLum < 0.85;
      if (isGray && bgs.every(b => hasChroma(b, 40))) {
```
```js
    const grayMatch = classStr.match(/\btext-(?:gray|slate|zinc|neutral|stone)-\d+\b/);
    const colorBgMatch = classStr.match(/\bbg-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+\b/);
```

**Cream/beige palette** (`rules/checks.mjs:4315-4335`):

```js
function isCreamColor(rgb) {
  if (!rgb) return false;
  const { r, g, b } = rgb;
  if (Math.min(r, g, b) < 209) return false;   // must be light
  if (!(r >= g && g >= b)) return false;        // warm ordering
  const warmth = r - b;
  return warmth >= 6 && warmth <= 48;           // tinted, not white, not strong
}

const TAILWIND_BG_HEX = {
  'bg-amber-50': '#fffbeb', 'bg-amber-100': '#fef3c7',
  'bg-orange-50': '#fff7ed', 'bg-orange-100': '#ffedd5',
  'bg-yellow-50': '#fefce8',
  'bg-stone-50': '#fafaf9', 'bg-stone-100': '#f5f5f4', 'bg-stone-200': '#e7e5e4',
};
```

**Low contrast** (`rules/checks.mjs:176-177`): `WCAG_LARGE_TEXT_PX = 24`, `WCAG_LARGE_BOLD_TEXT_PX ≈ 18.67` at weight ≥700; thresholds 3.0 / 4.5.

### Verbatim patterns — fonts

`shared/constants.mjs:23-31`:

```js
const OVERUSED_FONTS = new Set([
  // Older monoculture (still ubiquitous):
  'inter', 'roboto', 'open sans', 'lato', 'montserrat', 'arial', 'helvetica',
  // Newer monoculture (the Anthropic-skill / Vercel / GitHub default wave):
  'fraunces', 'instrument sans', 'instrument serif',
  'geist', 'geist sans', 'geist mono',
  'mona sans',
  'plus jakarta sans', 'space grotesk', 'recoleta',
]);
```

Source matcher (`detect-text.mjs:529`):

```js
  { id: 'overused-font', regex: /font-family\s*:\s*['"]?(Inter|Roboto|Open Sans|Lato|Montserrat|Arial|Helvetica|Fraunces|Geist Sans|Geist Mono|Geist|Mona Sans|Plus Jakarta Sans|Space Grotesk|Recoleta|Instrument Sans|Instrument Serif)\b/gi,
```

Plus Google Fonts URL matcher: `/fonts\.googleapis\.com\/css2?\?[^"'\s)<>]*/gi`.

**Brand exemption** (`shared/constants.mjs:35-49`): Roboto/Google Sans allowed on `google.com`, `youtube.com`; Geist on `vercel.com`/`nextjs.org`; Mona Sans on `github.com`.

### Verbatim patterns — borders / side-tab (`detect-text.mjs:503-527`)

```js
  { id: 'side-tab', regex: /\bborder-[lrse]-(\d+)\b/g,
    test: (m, line) => { const n = +m[1]; return hasRounded(line) ? n >= 2 : n >= 4; }, … },
  { id: 'side-tab', regex: /border-(?:left|right)\s*:\s*(\d+)px\s+solid[^;]*/gi,
    test: (m, line) => { if (isSafeElement(line)) return false; if (isNeutralBorderColor(m[0])) return false; const n = +m[1]; return hasBorderRadius(line) ? n >= 2 : n >= 3; }, … },
  { id: 'side-tab', regex: /border-(?:left|right)-width\s*:\s*(\d+)px/gi, test: … +m[1] >= 3 },
  { id: 'border-accent-on-rounded', regex: /\bborder-[tb]-(\d+)\b/g,
    test: (m, line) => hasRounded(line) && +m[1] >= 1, … },
```

### Verbatim patterns — motion (`detect-text.mjs:558-574`)

```js
  { id: 'bounce-easing', regex: /\banimate-bounce\b/g, … },
  { id: 'bounce-easing', regex: /animation(?:-name)?\s*:\s*([^;{}]*(?:bounce|elastic|wobble|jiggle|spring)[^;{}]*)/gi, … },
  { id: 'bounce-easing', regex: /cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/g,
    test: (m) => { const y1 = parseFloat(m[2]), y2 = parseFloat(m[4]);
      return y1 < -0.1 || y1 > 1.1 || y2 < -0.1 || y2 > 1.1; }, … },
```

`layout-transition` (`detect-text.mjs:577-598`): `transition` naming `width|height|max-*|min-*|padding|margin` — skips when value contains `all`.

`image-hover-transform` (`checks.mjs:1682`): `/\bimg\b[^,{}]*:hover\b[^{}]*\{[^}]*\btransform\s*:\s*(?:scale|rotate|translate|matrix|skew)/i` plus Tailwind `/\bhover:(?:scale|rotate|translate|skew)-/` on `<img>`.

### Verbatim patterns — copy

**Buzzwords** (`detect-text.mjs:693-704`):

```js
    const BUZZWORDS = [
      'streamline your', 'empower your', 'supercharge your',
      'unleash your', 'unleash the power', 'leverage the power',
      'built for the modern', 'trusted by leading', 'trusted by the world',
      'best-in-class', 'industry-leading', 'world-class', 'enterprise-grade',
      'next-generation', 'cutting-edge', 'transform your business',
      'revolutionize', 'game-changer', 'game changing',
      'mission-critical', 'best of breed', 'future-proof', 'future proof',
      'seamless experience', 'seamlessly integrate',
      'drive engagement', 'drive growth', 'drive results',
      'harness the power',
    ];
```

**Aphoristic cadence** (`detect-text.mjs:725-740`), threshold `count < 3`:

```js
    const NOT_A_RE = /\bNot an? [a-z][^.!?]{1,40}[.!]\s+[A-Z][^.!?]{1,60}[.!]/g;
    const SHORT_REBUTTAL_RE = /\b[A-Z][^.!?]{4,80}[.!]\s+(No|Just)\s+[a-z][^.!?]{2,60}[.!]/g;
```

**Em-dash overuse** (advisory): `EM_DASH_FLOOR = 8` **and** `EM_DASH_CHARS_PER_DASH = 500`.

### Verbatim patterns — layout / spacing / type

**Monotonous spacing** (`checks.mjs:1564-1577`): round padding/margin/gap to 4px, need ≥10 samples, fire when `dominantPct > 0.6 && unique.length <= 3`.

**Flat type hierarchy** (`detect-text.mjs:611-634`): ≥3 distinct sizes, fire when `max/min < 2.0`.

**Oversized h1** (`checks.mjs:4384-4402`): `OVERSIZED_H1_FONT_PX = 72; OVERSIZED_H1_MIN_CHARS = 40; …VIEWPORT_HEIGHT_RATIO = 0.28; …AREA_RATIO = 0.25`.

**Icon-tile stack** (`checks.mjs:272-320`): sibling 32–128px, aspect 0.7–1.4, bg/border, radius < width/2, contains icon < 95% of tile, above heading.

**Hairline border + wide shadow** (`checks.mjs:4460-4468`): `visibleThinBorders.length >= 2 && blur >= 16` with alpha ≥ 0.12.

**Kicker/eyebrow** — hard ban with DOM collector (`checks.mjs:2343-2504`), meta-text regex `/[·•|]|\s[\/›»>]\s|\b(19|20)\d{2}\b/`, legal-numbering exemption.

**Emoji** (`checks.mjs:112-118`) — only a *suppression* helper. **No rule flags emoji as icons.**

### Ignore mechanisms
- Config: `detector.ignoreRules` / `ignoreFiles` / `ignoreValues`.
- Inline: `impeccable-disable <rule>`, `impeccable-disable-line` / `-next-line`, optional reason after `:` (`shared/inline-ignores.mjs`).
- DOM: `data-impeccable-ignore` (`checks.mjs:94-105`).

---

## 4. Hooks & enforcement

### Event map

| Harness | Manifest | Event(s) | Script | Behavior |
|---|---|---|---|---|
| Claude Code | `.claude/settings.local.json` | `PostToolUse` (`Edit\|Write`) + `Stop` | `hook.mjs` | **Warn only** |
| Codex | `.codex/hooks.json` | `PostToolUse` + `Stop` | `hook.mjs` | Warn only |
| Cursor | `.cursor/hooks.json` | `preToolUse` | `hook-before-edit.mjs` | **BLOCKS** the write |
| Grok Build | `.grok/hooks/impeccable.json` | `PostToolUse` + `Stop` | `hook.mjs` | Warn on Stop only |
| GitHub Copilot | `.github/hooks/impeccable.json` | `postToolUse` | `hook.mjs` | Warn only |

**No `UserPromptSubmit` hook.** Context injection via the skill calling `context.mjs`.

### Exact settings.json (Claude Code) — `.claude/settings.json`

```json
{
  "description": "Impeccable design detector: immediate-tier checks after Edit/Write on UI files, full-rule deep pass on Stop.",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "[ ! -f \"${CLAUDE_PROJECT_DIR}/.claude/skills/impeccable/scripts/hook.mjs\" ] || ! { node -e \"process.exit(Math.min(parseInt(process.versions.node,10),22)===22?0:1)\" 2>/dev/null || { D=\"$HOME/.impeccable\"; [ -f \"$D/node-unsupported\" ] || { mkdir -p \"$D\" 2>/dev/null && : > \"$D/node-unsupported\" 2>/dev/null && printf '%s' '{\"systemMessage\":\"The impeccable design hook is not running: no Node 22 or newer on PATH. Install one, or remove the impeccable hook from your harness settings.\"}'; }; exit 0; }; } || node \"${CLAUDE_PROJECT_DIR}/.claude/skills/impeccable/scripts/hook.mjs\"",
            "timeout": 5,
            "statusMessage": "Checking UI changes"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "…same guard…|| node \"${CLAUDE_PROJECT_DIR}/.claude/skills/impeccable/scripts/hook.mjs\"",
            "timeout": 30,
            "statusMessage": "Design deep pass"
          }
        ]
      }
    ]
  }
}
```

Shell guard idiom: skip silently if script absent, warn **once ever** (sentinel file) if Node < 22, otherwise run. Timeouts 5s / 30s.

### Two-tier rule surfacing — the key design decision

`hook-lib.mjs:113-131`:

```js
export const IMMEDIATE_TIER_RULES = new Set([
  // Broken output.
  'broken-image',
  'text-overflow',
  'clipped-overflow-container',
  'body-text-viewport-edge',
  // Objective contrast / legibility failures.
  'low-contrast',
  'gray-on-color',
  'tiny-text',
  // Single-property mechanical slop, trivial to fix at the edit site.
  'gradient-text',
  'dark-glow',
  // Design-system drift compounds if not corrected at edit time.
  'design-system-font',
  'design-system-color',
  'design-system-radius',
  'design-system-font-size',
]);
```

Rationale (`hook-lib.mjs:108-112`):

> Rationale (measured in the eval harness): the per-edit stream fires overwhelmingly on copy-level rules, and that steady nag stream makes models more conservative, while a single full pass at completion fixes contrast/padding/glow just as reliably.

Everything else defers to `Stop`. Override: `hook: { "perEditRules": "all" }`.

### What each hook emits

`hook.mjs:24-62`: read stdin JSON → route → write audit log → **always `process.exit(0)`**. Contract: *"never break a turn."*

Output channel (`hook-lib.mjs:2431-2445`): `hookSpecificOutput: { hookEventName, additionalContext }`.

Three message shapes, prefixed `[impeccable@1]`:
- **Findings**: `Design hook findings requiring review in <file> (N issue(s)):` + up to 5 lines + triage footer.
- **Clean ack** (`hook-lib.mjs:1704`) — the anti-complacency guard worth stealing verbatim:
  > `Design hook scanned <file>. No deterministic design-quality issues found. That does not mean the design is good: keep following the project design system and the impeccable skill guidance.`
- **Pending re-nudge** (`hook-lib.mjs:1714`).

Triage footer: fix real problems → self-serve `ignore-value` with `--reason "<who decided: evidence>"` → ask if unsure. **"Self-serve ends at ignore-value"** — `ignore-file`/`ignore-rule` need user approval; *"never add an ignore to push a blocked write through."*

### Cursor blocking path
`hook-before-edit.mjs` returns `{ permission: 'allow' | 'deny' }`. Deny messages capped ~4000 chars. Anti-deadlock: after N repeated denials for the same file+finding signature it **allows** with a warning (`:507`).

### Safety rails worth copying
- `SENSITIVE_PATH` (`hook-lib.mjs:81-87`) — hard skip `.env`, `.git/`, `id_rsa*`, `*.pem`, `*secret*.json`; cannot be disabled.
- `GENERATED_PATH` (`:92`) — skips `.d.ts`, `.min.*`, `node_modules/`, `generated/`, `dist|build|out|.next|.cache|coverage/`, lockfiles.
- `maxFileBytes: 131072`.
- `EDIT_COUNT_THRESHOLD = 6` — self-suppresses after 6 edits to one file.
- `IMPECCABLE_HOOK_DEPTH` re-entrancy guard (`hook.mjs:46-47`).
- Co-scanning (`hook-lib.mjs:1451-1462`): editing `App.jsx` also scans sibling `styles.css`, max 6 targets.

---

## 5. Project config

| File | Tracked? | Owner | Purpose |
|---|---|---|---|
| `PRODUCT.md` | yes | `init` | Durable product truth. **Never** visual. |
| `DESIGN.md` | yes | `document` / `new-work` | Visual system, Google Stitch DESIGN.md spec |
| `.impeccable/config.json` | yes | `hook-admin.mjs` | `detector`, `hook`, `buildPath`, `projectRoots` |
| `.impeccable/config.local.json` | gitignored | installer | `hook.consent` |
| `.impeccable/design.json` | yes | `document` | Machine sidecar parsed from DESIGN.md |
| `.impeccable/surfaces/*.md` | yes | `shape`/`new-work` | Per-route briefs |
| `.impeccable/critique/*.md` | yes | `critique` | Scored snapshots |

Runtime defaults (`hook-lib.mjs:153-172`):

```js
export const DEFAULT_CONFIG = Object.freeze({
  enabled: true, quiet: false, auditLog: null,
  designSystem: { enabled: true },
  ignoreRules: [], ignoreFiles: [], ignoreValues: [], extensions: [],
  perEditRules: 'immediate',
  advisoryRules: 'exclude',
  limits: { maxFindings: 5, maxChars: 8000, maxFileBytes: 131072 },
});
```

### DESIGN.md schema (`scripts/lib/design-parser.mjs:1-21`)
YAML frontmatter (normative tokens) + markdown body with 8 canonical H2s:

```js
const CANONICAL_SECTIONS = [
  'Overview', 'Colors', 'Typography', 'Layout',
  'Elevation', 'Shapes', 'Components', "Do's and Don'ts",
];
```

Follows google-labs-code/design.md spec. Hand-rolled YAML subset, no deps.

### How context reaches the model
`scripts/context.mjs` run once per session by the skill, prints markdown + ALL-CAPS directives: `NO_PRODUCT_MD`, `BUILD_INIT_REQUIRED`, `WORLD_DISCOVERY_REQUIRED`, `RESOLVED_CONTEXT: {json}`, `MANUAL_DETECTOR_REQUIRED`, `IMAGE_GEN_AVAILABLE`, `CONTEXT_STALE`, `UPDATE_AVAILABLE`…

⚠️ Two directives fight the host harness's system prompt: `AUTONOMY_DIRECTIVE_CHECK` (`context.mjs:1372-1380`) and `SUBAGENT_AUTHORIZATION` (`:1387-1393`). **Do not reproduce.**

---

## 6. Craft floor / quality bar

`reference/craft-floor.md` — 44 lines, the highest-value file.

### Verify

| Axis | Rule | Line |
|---|---|---|
| Contrast | body + placeholder ≥ 4.5:1, large ≥ 3:1; on colored surfaces tint secondary text from that hue, "never gray" | `:9` |
| Depth | shadows carry offset **and** soft blur; zero-offset colored halo is decoration | `:10` |
| Spacing | tight groups, generous separation, **more space above a heading than below** | `:11` |
| Type | measure **65–75ch**, display **max 6rem**, tracking floor **−0.04em**, real copy at every breakpoint | `:12` |
| Motion | one authored moment; exponential ease-out; blur/backdrop-filter/clip-path/mask allowed | `:13` |
| States | hover, disabled, loading, error, empty + real content, keyboard focus | `:14` |
| Browser surfaces | selection, caret, scrollbars, focus rings, underline offset, tabular numerals — "the one models skip most reliably" | `:15` |
| Copy | controls name their action; errors name problem **and** recovery | `:16` |

### Refuse
"These are the category's defaults, not bans: the brief's own words can earn any of them." (`:21`) — one exception.

**Page scaffolds** (`:25-29`): same-size icon+heading+text cards; "**nested cards are always wrong**"; hero-metric template; kicker/eyebrow — **"This one is a ban, not a default: no brief earns it back."**; section numbers; modal misuse.

**Surface habits** (`:33-42`): gradient text; glass/blur as decoration; colored `border-left` **above 1px**; hard offset shadows outside neobrutalism; sparklines/progress rings as content; monospace as costume; system display faces; **emoji as icons**; geometric masks; light/dark picked by category.

### Motion — `reference/animate.md:56-61`

| Duration | Use |
|---|---|
| 100–150 ms | immediate feedback |
| 150–300 ms | routine state change |
| 300–500 ms | layout, overlay, view transition |
| 500–800 ms | authored focal entrance |

"Exit faster than entrance." `cubic-bezier(0.16, 1, 0.3, 1)`. Reduced motion = fewer/gentler, not `animation: none` (`:77`).

### Typography — `reference/typeset.md:46-56`
1rem/16px body floor; prose 45–75ch; line height inversely with measure; light-on-dark compensated on three axes; paragraph spacing **or** indent.

### Color — `reference/colorize.md`
Roles not swatches; **prefer OKLCH**; WCAG table incl. **controls/icons/focus 3:1**; reduce chroma near white/black; dark mode designed, "do not invert mechanically".

### Layout — `reference/layout.md:47-49`
Proximity before containers; **4-unit base** preferred over 8-only.

### Polish — `reference/polish.md`
Drift classification → fix at narrowest level. Triage: broken → missing states → flow/hierarchy/drift → visual/motion → cleanup. *"A detector result is defect evidence, not proof of quality"* (`:5`).

---

## 7. Multi-agent support

16 providers (`scripts/lib/transformers/providers.js:12-186`). One source tree → per-provider builds. Install: `npx impeccable install` (auto-detect, installs hook manifest), submodule + `link`, plugin marketplace, ZIP, manual copy. Hook consent recorded per-developer in gitignored `.impeccable/config.local.json`.

---

## 8. Gaps

- **No tokens** — no generation, no CSS-var emission, no DTCG. Design-system rules are drift detection only, 3 of 4 advisory.
- **No components.**
- **Zero Figma references.**
- **No CJK/Korean** — only prose in `harden.md`. No detector rule for `word-break`, RTL, locale expansion. Every heuristic (line length in chars, tracking, 45–75ch) is Latin-centric.
- **Docs ban but detector can't see**: emoji as icons, backdrop-filter decoration, hard offset shadows, hero-metric, modal misuse, monospace costume.
- No visual regression baseline; no CI exit gate beyond `detect --json`.
- Native support prose-only; detector/hooks web-only.
- Node ≥ 22; Puppeteer optional.
- No `UserPromptSubmit`.
- Massive surface: 17 duplicated trees, 5,532-line `checks.mjs`, 2,447-line `hook-lib.mjs`.

---

## What to take

1. **`craft-floor.md` verbatim as the model** — Verify (measurable) + Refuse (defaults, one true ban).
2. **The purple hex list and Tailwind gradient regexes** (`checks.mjs:1506-1508`, `:224-235`).
3. **`OVERUSED_FONTS` + brand-domain exemption** (`shared/constants.mjs:23-57`).
4. **Two-tier hook surfacing** with the measured rationale (`hook-lib.mjs:96-131`).
5. **The clean-ack steer line**: "That does not mean the design is good."
6. **"The brief wins"** (`SKILL.md:26`).

Skip: `AUTONOMY_DIRECTIVE_CHECK` / `SUBAGENT_AUTHORIZATION`.
