# taste-skill (leonxlnx) — 분석 보고서

- 저장소: https://github.com/leonxlnx/taste-skill · 커밋 `ccbc156` (2026-08-24) · MIT
- 분석일: 2026-09-02 · 경로 `$ROOT` = 저장소 루트
- PRD 연결: §3 (룰 표현 형식, DESIGN.md 스키마), §7 (금지 목록 출처)

---

## 1. Philosophy

**Core thesis:** LLMs have a *statistical* default aesthetic, and that default is the enemy. Taste is not a style — it is the discipline of not reaching for the default. The repo tagline is "The Anti-Slop Frontend Framework for AI Agents" (`$ROOT/README.md:8`).

The v2 skill states the causal claim explicitly:

> "Before touching code or tweaking dials, **infer what the user actually wants**. Most LLM design output is bad because the model jumps to a default aesthetic instead of reading the room." — `$ROOT/skills/taste-skill/SKILL.md:15`

**How it defines "AI slop"** — an enumerated list of statistical tells, not a vibe. The canonical definition is §0.D:

> "**Anti-Default Discipline.** Do not default to: AI-purple gradients, centered hero over dark mesh, three equal feature cards, generic glassmorphism on everything, infinite-loop micro-animations everywhere, Inter + slate-900. These are the LLM defaults. Reach past them deliberately based on the design read." — `SKILL.md:39`

And the reason the bans exist at all (from the changelog rationale):

> "Pre-v2, the original taste-skill set the right direction but was easy for agents to skim past. Production testing showed the same Tells emerging across builds (em-dash everywhere, section-number eyebrows, 'Quietly in use at', decorative dots, fake screenshots out of styled divs, broken GSAP scroll triggers)." — `$ROOT/CHANGELOG.md:91`

**Four structural ideas worth stealing:**

1. **Contextual, not absolute.** "Every rule below is **contextual**. None of it fires automatically. First read the brief, then pull only what fits." (`SKILL.md:9`). Almost every ban has a documented *override path* — a named condition under which the banned thing becomes correct.
2. **Declare the read before coding.** "Before any code, state in one line: **'Reading this as: \<page kind> for \<audience>, with a \<vibe> language, leaning toward \<design system or aesthetic family>.'**" (`SKILL.md:26`). And: "Ask exactly **one** clarifying question - never a multi-question dump" (`SKILL.md:34`).
3. **Three numeric dials** gate every downstream rule: `DESIGN_VARIANCE: 8` / `MOTION_INTENSITY: 6` / `VISUAL_DENSITY: 4` (`SKILL.md:47-51`), with an inference table (signal → dial values, `:54-62`) and a use-case preset table (`:65-75`).
4. **Mechanical, countable checks.** The strongest rules are the ones an agent can literally count. Example: "**Pre-Flight Check is mechanical:** count instances of `uppercase tracking` (or similar small-caps mono labels above headlines) across all section components. If count > ceil(sectionCount / 3), the output fails." (`SKILL.md:256`).
5. **Honesty rule** — an anti-hallucination rule about design systems: "if the brief reads as one of the systems above, install and use the **official** package. Do not recreate its CSS by hand. Do not import a system's tokens but then override 90% of them." (`SKILL.md:102`).

The single most emphatic rule in the repo, quoted in full because the *phrasing strategy* is the lesson:

> "**Em-dash (`—`) is COMPLETELY banned.** It is the LLM's signature stylistic crutch and it is the #1 visual Tell in production tests. There is no 'limited use' allowance, no 'natural language frequency' allowance, no 'in body copy is fine' allowance. None. […] This rule is non-negotiable. The agent has historically ignored em-dash limits when phrased as 'use sparingly.' The phrasing here is binary: zero em-dashes." — `SKILL.md:687-701`

---

## 2. Skill catalog

13 SKILL.md files under `$ROOT/skills/`. Install name = `name:` in frontmatter, which differs from folder name.

### 2.1 `taste-skill` → `design-taste-frontend` (v2 experimental, 1206 lines)
`$ROOT/skills/taste-skill/SKILL.md:1-4`
> name: design-taste-frontend
> description: Anti-slop frontend skill for landing pages, portfolios, and redesigns. The agent reads the brief, infers the right design direction, and ships interfaces that do not look templated. Real design systems when applicable, audit-first on redesigns, strict pre-flight check.

Purpose: the flagship. Scoped explicitly to "Landing pages, portfolios, and redesigns. Not dashboards, not data tables, not multi-step product UI." (`:8`).

Most actionable rules:
1. Hero: "headline max 2 lines on desktop, subtext max **20 words** AND max 3-4 lines, CTAs visible without scroll" (`:236`); "Hero top padding max `pt-24` (≈6rem) at desktop" (`:238`); max 4 text elements total in the hero (`:239`).
2. Eyebrows: "**Maximum 1 eyebrow per 3 sections.** Hero counts as 1." (`:254`).
3. Nav: "**Navigation MUST render on a single line on desktop**" (`:247`); "**Navigation height cap: 80px max desktop, default 64-72px.**" (`:248`).
4. Layout variety: "A landing page with 8 sections must use at least 4 different layout families." (`:251`); "Max 2 sections in a row with this image+text-split pattern. The 3rd consecutive image+text split is a Pre-Flight Fail." (`:252`).
5. Bento: "A bento grid has EXACTLY as many cells as you have content for." (`:250`); "at least 2-3 cells in any multi-cell grid need real visual variation" (`:259`).
6. Color: "Max 1 accent color. Saturation < 80% by default." (`:186`); named hex bans for the premium-consumer palette (`:194-196`).
7. Copy: "short headline (≤ 8 words) + short sub-paragraph (≤ 25 words)" (`:302`); quotes "**Max 3 lines** of quote body. Never 6." (`:335`).
8. Motion: reduced-motion mandatory above `MOTION_INTENSITY > 3` (`:526`); `window.addEventListener("scroll", ...)` banned (`:511`); canonical GSAP skeletons with `start: "top top"`, `pin: true` (`:365-473`).
9. Perf: LCP < 2.5s, INP < 200ms, CLS < 0.1 (`:538-540`); animate only `transform`/`opacity` (`:522`).
10. A 60-checkbox Pre-Flight Check (`:910-979`) ending "If a single checkbox cannot be honestly ticked, the page is not done."

### 2.2 `taste-skill-v1` → `design-taste-frontend-v1` (226 lines)
`$ROOT/skills/taste-skill-v1/SKILL.md:1-4` — "The original v1 taste-skill, preserved for projects depending on its exact behavior."

**How v1 differs from v2** (from `$ROOT/CHANGELOG.md:22-93` plus direct diff):

| Dimension | v1 | v2 |
|---|---|---|
| Brief inference | absent | §0, mandatory one-line "Design Read" |
| Design-system map | absent | §2, official-package table (Fluent/Material/Carbon/Polaris/Atlaskit/Primer/GOV.UK/USWDS/Bootstrap/Radix/shadcn) |
| Em-dash | not mentioned | §9.G total ban, non-negotiable |
| Emoji | "**NEVER** use emojis… Emojis are BANNED" (`v1:26`) | "Discouraged by default… **Override:** allow emojis only when the user explicitly asks for a playful / chat-style / social-native vibe" (`v2:148`) |
| Inter | "**NO Inter Font:** Banned." (`v1:108`) | "**Discouraged as default**… Override: Inter is acceptable when the user explicitly asks for a neutral / standard / Linear-style feel" (`v2:169-170`) |
| Purple | "**THE LILA BAN:** …strictly BANNED" (`v1:46`) | "**THE LILA RULE:** …discouraged as a default" + brand override (`v2:187-188`) |
| Serif | banned only on dashboards (`v1:41,110`) | "very discouraged as the default font for **any** project"; `Fraunces` and `Instrument_Serif` specifically banned (`v2:173-181`) |
| Infinite motion | "**Infinite Loops:** Every card must have an 'Active State' that loops infinitely" (`v1:207`) | reversed: "**Not every card needs an infinite loop.** If a section is informational, leave it still." (`v2:358`) |
| Motion lib | Framer Motion | Motion, `motion/react` (`v2:132`) |
| Icons | Phosphor or Radix only (`v1:32`) | Phosphor > HugeIcons > Radix > Tabler; Lucide discouraged; hand-rolled SVG banned (`v2:141-143`) |
| Tailwind | v3/v4 with version lock | v4 default (`v2:130`) |
| Images/copy/content | absent | §4.8 asset strategy, §4.9 content density, copy self-audit |
| Redesign / dark mode / out-of-scope | absent | §8, §11, §13 |
| Pre-flight | 7 checkboxes (`v1:220-226`) | ~60 checkboxes (`v2:916-977`) |
| Prescriptive Bento palette | §9 hardcodes `#f9fafb`, `rounded-[2.5rem]`, 5 card archetypes (`v1:192-216`) | dropped entirely |

v1 is essentially "a list of tells." v2 is "a process with a list of tells inside it."

### 2.3 `gpt-tasteskill` → `gpt-taste` (74 lines)
"Elite UX/UI & Advanced GSAP Motion Engineer. Enforces Python-driven true randomization for layout variance, strict AIDA page structure, wide editorial typography (bans 6-line wraps), gapless bento grids, strict GSAP ScrollTriggers…"

Purpose: stricter GPT/Codex variant. Notable mechanism: it fights determinism with **simulated RNG** — "you MUST simulate a Python script execution in your `<design_plan>` before writing any UI code. Use a deterministic seed (e.g., character count of the user prompt modulo math) to simulate `random.choice()`" (`:14-15`).

Concrete rules: H1 "MUST NEVER exceed 2 to 3 lines. 4, 5, or 6 lines is a catastrophic failure" with `clamp(3rem, 5vw, 5.5rem)` and `max-w-5xl/6xl` (`:33-34`); `py-32 md:py-48` between sections (`:29`); `grid-flow-dense` mandatory on every bento, "3 to 5 highly intentional… cards are better than 8 messy ones" (`:43-44`); meta-label ban ("SECTION 01", "QUESTION 05") (`:62`); `overflow-x-hidden` wrapper on `<main>` (`:65`); mandatory `<design_plan>` pre-flight block (`:67-74`). Note this skill **prefers a centered hero** ("*Cinematic Center (Highly Preferred)*", `:36`) — direct conflict with taste-skill v2.

### 2.4 `minimalist-skill` → `minimalist-ui` (85 lines)
"Clean editorial-style interfaces. Warm monochrome palette, typographic contrast, flat bento grids, muted pastels. No gradients, no heavy shadows."

Rules: no Inter/Roboto/Open Sans (`:14`); no Lucide/Feather/Heroicons (`:15`); no `shadow-md/lg/xl`, shadows "< 0.05" opacity (`:16`); no gradients/neon/3D glassmorphism (`:18`); no `rounded-full` on large containers or primary buttons (`:19`); borders exactly `1px solid #EAEAEA` (`:46`); radius `8px` or `12px` max (`:47`); card padding `24px`–`40px` (`:48`); primary CTA `#111111`/`#FFFFFF`, radius `4px`–`6px`, no box-shadow (`:49-51`); body never `#000000`, use `#111111`/`#2F3437`, line-height `1.6`, secondary `#787774` (`:29`); named pastel accent pairs with text colors (`:37-40`); scroll entry `translateY(12px)` + opacity over `600ms cubic-bezier(0.16, 1, 0.3, 1)` via IntersectionObserver (`:71`); stagger `calc(var(--index) * 80ms)` (`:73`); sections `py-24`/`py-32`, content `max-w-4xl`/`max-w-5xl` (`:79-80`).

### 2.5 `soft-skill` → `high-end-visual-design` (98 lines)
"Teaches the AI to design like a high-end agency. Defines the exact fonts, spacing, shadows, card structures, and animations that make a website feel expensive."

Rules: §2 "ABSOLUTE ZERO" — banned fonts Inter/Roboto/Arial/Open Sans/Helvetica; banned icons Lucide/FontAwesome/Material; banned "Generic 1px solid gray borders. Harsh, dark drop shadows"; banned "Edge-to-edge sticky navbars glued to the top"; banned "Standard `linear` or `ease-in-out` transitions" (`:15-19`). Signature technique is the **Double-Bezel**: outer shell `p-1.5`/`p-2` + `rounded-[2rem]` + `ring-1 ring-black/5`, inner core at `rounded-[calc(2rem-0.375rem)]` for concentric curves (`:43-44`). Also: button-in-button trailing icon in its own `w-8 h-8 rounded-full` wrapper (`:48`); `py-24` to `py-40` sections (`:51`); custom `cubic-bezier(0.32,0.72,0,1)` at `duration-700` (`:55`); scroll entry `translate-y-16 blur-md opacity-0` over 800ms+ (`:69`); `backdrop-blur` only on fixed/sticky (`:74`); 11-item checklist ending "reads as '$150k agency build', not 'template with nice fonts'" (`:98`).

Conflicts to note: mandates eyebrow tags on all major H1/H2 (`:52`) and `rounded-full` pill CTAs (`:47`) — both contradicted by other skills in the same repo.

### 2.6 `brutalist-skill` → `industrial-brutalist-ui` (92 lines)
"Raw mechanical interfaces fusing Swiss typographic print with military terminal aesthetics…" Marked "(Beta)" in `skills/llms.txt:12`.

Rules: pick ONE of two archetypes, never mix (`:13`); macro type `clamp(4rem, 10vw, 15rem)`, tracking `-0.03em` to `-0.06em`, leading `0.85`–`0.95`, uppercase only (`:30-33`); micro type mono `10px`–`14px`, tracking `0.05em`–`0.1em`, uppercase only (`:39-42`); "Gradients, soft drop shadows, and modern translucency are strictly prohibited" (`:50`); one substrate palette per project, exact hexes given (`:54-63`); "**Absolute rejection of `border-radius`.** All corners must be exactly 90 degrees" (`:71`); `display: grid; gap: 1px` with contrasting parent/child backgrounds for hairlines (`:90`); semantic `<data> <samp> <kbd> <output> <dl>` (`:91`).

### 2.7 `brandkit` → `brandkit` (798 lines, image-gen only)
"Premium brand-kit image generation skill for creating high-end brand-guidelines boards, logo systems, identity decks…"

Rules: default `3 × 3` grid at `4:3` or `16:10` (`:78-79`); five named logo concept methods (`:161-247`); 9-panel system spec (`:272-308`); text rules — "Use very little text" (`:557-575`); color — base + primary accent + secondary accent + neutrals, "accents must repeat across panels", "no generic purple-blue AI glow" (`:661-685`); anti-generic list — "Never make: random floating icons, generic startup gradients, overdesigned logos, meaningless blobs, messy layout collages, fake tiny UI, inconsistent logo marks, too many colors, cheap neon, stock-template brand boards, corporate PowerPoint slides, soulless SaaS dashboards" (`:691-703`).

### 2.8 `redesign-skill` → `redesign-existing-projects` (178 lines)
"Upgrades existing websites and apps to premium quality. Audits current design, identifies generic AI patterns, and applies high-end design standards without breaking functionality. Works with any CSS framework or vanilla CSS."

This is the most *checklist-shaped* file in the repo — an audit list of ~80 named smells. Highest-value entries:
1. "**Random dark sections in a light mode page (or vice versa).** A single dark-background section breaking an otherwise light page looks like a copy-paste accident." (`:42`)
2. "**Buttons not bottom-aligned in card groups.**… Pin buttons to the bottom of each card so they form a clean horizontal line" (`:58`); "**Feature lists starting at different vertical positions**" (`:59`).
3. "**Mathematical alignment that looks optically wrong.**… often need 1-2px optical adjustments" (`:61`).
4. "**Only Regular (400) and Bold (700) weights used.** Introduce Medium (500) and SemiBold (600)" (`:25`); "**Orphaned words**… Fix with `text-wrap: balance` or `text-wrap: pretty`" (`:29`).
5. "**Symmetrical vertical padding.**… bottom padding often needs to be slightly larger." (`:55`)
6. "**Exclamation marks in success messages.** Remove them. Be confident, not loud." (`:83`); "**'Oops!' error messages.** Be direct" (`:84`); "**Title Case On Every Header.** Use sentence case instead." (`:89`)
7. Strategic omissions AI forgets: legal links, back-nav, custom 404, form validation, skip-to-content link, cookie consent (`:123-130`).
8. Fix priority order: font swap → palette → hover/active → layout/spacing → component replacement → states → type polish (`:159-168`).
9. "Work with the existing tech stack. Do not migrate frameworks… Keep changes reviewable and focused." (`:171-178`)

### 2.9 `output-skill` → `full-output-enforcement` (49 lines)
"Overrides default LLM truncation behavior. Enforces complete code generation, bans placeholder patterns, and handles token-limit splits cleanly."

Rules: banned in code — "`// ...`, `// rest of code`, `// implement here`, `// TODO`, `/* ... */`, `// similar to above`, `// continue pattern`, `// add more as needed`, bare `...`" (`:16`); banned in prose — "'Let me know if you want me to continue', 'for brevity', 'the rest follows the same pattern'…" (`:17`); 3-step process Scope→Build→Cross-check with "Count how many distinct deliverables are expected… Lock that number." (`:24-26`); continuation protocol `[PAUSED — X of Y complete. Send "continue" to resume from: next section name]` (`:38`).

### 2.10 `stitch-skill` → `stitch-design-taste` (184 lines + DESIGN.md)
"Semantic Design System Skill for Google Stitch. Generates agent-friendly DESIGN.md files that enforce premium, anti-generic UI standards…"

Purpose: a **generator of a per-project design spec**. See §5 below for the DESIGN.md schema. Distinct rules: `44px` minimum touch targets (`:85`); body text minimum `1rem`/`14px`, headlines via `clamp()` (`:84`); section gaps `clamp(3rem, 8vw, 6rem)` (`:88`); "**No Overlapping:** …No absolute-positioned content stacking" (`:73`); "**CTA Restraint:** Maximum one primary CTA. No secondary 'Learn more' links" (`:62`).

⚠️ Direct contradiction with the flagship: this skill *recommends* `Fraunces` and `Instrument Serif` as the approved serifs (`:51`, `:100`), which taste-skill v2 bans by name (`taste-skill/SKILL.md:180`).

### 2.11 `image-to-code-skill` → `image-to-code` (1228 lines)
Rules: mandatory order — "image generation first / deep image analysis second / implementation third" (`:65-69`); hero headline 1–3 lines max (`:546-555`); **anti-nested-box rule** — "cards inside larger cards inside outer cards… A section should not feel like a prison of containers." (`:584-606`); **micro-UI clutter rule** — no filler pills, pseudo-system markers, fake control labels (`:610-630`); anti-slop lists split into Layout / Visual / Typography / Content / Density slop (`:897-953`); 9 numeric dials incl. `UI_SIMPLICITY_DISCIPLINE: 9` (`:73-92`).

### 2.12 `imagegen-frontend-web` (987 lines, images only)
Rules: **hero composition bias** — "The default **left-text / right-image hero is the most overused AI pattern**" with 9 named alternatives (`:25-40`); **gradient discipline** — the most nuanced gradient rule in the repo, allowed vs banned lists (`:723-739`); palette discipline 1 primary + 1 secondary + 1 accent + neutral scale, "no full theme swap per section" (`:708-715`); KPI slop — "three identical stat columns (99% satisfaction, $10 saved, ∞ scale) unless user asked for KPIs" (`:580`).

### 2.13 `imagegen-frontend-mobile` (1465 lines, images only)
Rules: platform mode must be picked (`:152-193`); mobile AI tells (`:713-757`) — "oversized corner radii on everything", "phone-shaped websites instead of app screens", "too many pills / badges / tiny labels"; **text size rule** — "if the text feels small, the design is not finished yet… Readable beats clever." (`:1087-1120`); **"NOT ALWAYS SIMPLE" rule** (`:951-981`), the only place in the repo that pushes *back* against minimalism-as-default.

---

## 3. Consolidated FORBIDDEN list

### Color & gradients
- "**THE LILA RULE:** The 'AI Purple / Blue glow' aesthetic is discouraged as a default. No automatic purple button glows, no random neon gradients." — `skills/taste-skill/SKILL.md:187`
- Banned AI gradient slop, itemized: "rainbow / mesh blob gradients / purple-to-blue 'AI' defaults / pink-to-orange 'creator' defaults / neon edges and glow halos with no purpose / gradient text as a shortcut for 'premium' / gradients that compete with imagery" — `skills/imagegen-frontend-web/SKILL.md:733-739`
- "DO NOT use gradients, neon colors, or 3D glassmorphism (beyond subtle navbar blurs)." — `skills/minimalist-skill/SKILL.md:18`
- "Gradients, soft drop shadows, and modern translucency are strictly prohibited." — `skills/brutalist-skill/SKILL.md:50`
- "**NO excessive gradient text** for large headers." — `skills/taste-skill/SKILL.md:603`
- "**NO neon / outer glows** by default." — `:600`
- "**NO pure black (`#000000`).** Off-black, zinc-950, or charcoal." — `:601`; also "**No pure `#000000` and no pure `#ffffff`**" — `:585`
- "**NO oversaturated accents.**" / "Max 1 accent color. Saturation < 80%" — `:602`, `:186`
- "**One palette per project.** Do not fluctuate between warm and cool grays within the same project." — `:189`
- "DO NOT use primary colored backgrounds for large elements or sections" — `skills/minimalist-skill/SKILL.md:17`
- **Premium-consumer palette ban (named hexes):** backgrounds `#f5f1ea, #f7f5f1, #fbf8f1, #efeae0, #ece6db, #faf7f1, #e8dfcb`; accents `#b08947, #b6553a, #9a2436, #9c6e2a, #bc7c3a, #7d5621`; text `#1a1714, #1a1814, #1b1814` — `skills/taste-skill/SKILL.md:192-197`

### Fonts & typography
- "**Specifically BANNED as defaults:** `Fraunces` and `Instrument_Serif`" — `skills/taste-skill/SKILL.md:180`
- "Serif is **very discouraged as the default font for any project.**" — `:174`
- "**NO Inter Font:** Banned." — `skills/taste-skill-v1/SKILL.md:108`; v2: "**Discouraged as default:** `Inter`" — `:169`
- "**Banned Fonts:** Inter, Roboto, Arial, Open Sans, Helvetica." — `skills/soft-skill/SKILL.md:15`
- "**NO oversized H1s** that just scream. Control hierarchy with weight + color, not raw scale." — `:608`
- "Do NOT inject a random serif word into a sans headline… Mixed-family emphasis is amateur." — `:179`

### Dashes, emoji, punctuation
- Em-dash total ban — `skills/taste-skill/SKILL.md:687-693`
- "**ANTI-EMOJI POLICY [CRITICAL]:** NEVER use emojis in code, markup, text content, or alt text" — `skills/taste-skill-v1/SKILL.md:26`; v2 softened to "Discouraged by default… Override: playful / chat-style / social-native vibe" — `:148`
- "**The middle-dot (`·`) is rationed.** Maximum 1 per line" — `:645`

### Layout
- "**NO 3-column equal feature cards.**" — `:613`; repeated in v1, stitch, redesign ("This is the most generic AI layout")
- "**ANTI-CENTER BIAS:** Centered Hero / H1 sections are avoided when `DESIGN_VARIANCE > 4`." — `:210`
- "**SPLIT-HEADER BAN (mandatory).**" — `:258`
- "**ZIGZAG ALTERNATION CAP (mandatory).**… The 3rd consecutive image+text split is a Pre-Flight Fail." — `:252`
- "**Section-Layout-Repetition Ban.**" — `:251`
- "**EYEBROW RESTRAINT (mandatory, the #1 violated rule in production tests).**… **Maximum 1 eyebrow per 3 sections.**" — `:253-254`
- "**MARQUEE MAX-ONE-PER-PAGE (mandatory).**" — `:361`
- "Do not default to box-in-box-in-box layouts… A section should not feel like a prison of containers." — `skills/image-to-code-skill/SKILL.md:586,605`
- "NEVER use `h-screen` for full-height Hero sections. ALWAYS use `min-h-[100dvh]`" — `:153`
- "NEVER use complex flexbox percentage math (`w-[calc(33%-1rem)]`)." — `:154`

### Hero-specific
- "**BANNED in the hero:** tiny tagline below CTAs…, trust micro-strip…, pricing teaser…, feature bullet list, social-proof avatar row." — `:244`
- "**NO version labels in the hero.** `V0.6`, `BETA`, `INVITE-ONLY PREVIEW`…" — `:635`
- "**NO decoration text strip at hero bottom.**" — `:673`
- "**Hero needs a real visual.** Text + gradient blob is not a hero - it's a placeholder." — `:296`

### Micro-labels, decoration, chrome
- "**NO section-number eyebrows.** `00 / INDEX`, `001 · Capabilities`…" — `:639`
- "**Scroll cues are banned.**" — `:682`
- "**ZERO decorative status dots by default.**" — `:683`
- "**NO pills/labels/tags overlaid on images.**" — `:667`
- "**NO photo-credit captions as decoration.**" — `:668`
- "**NO version footers on marketing pages.**" — `:669`
- "**Locale / city-name / time / weather strips are banned for 99% of briefs.**" — `:681`
- "**NO custom mouse cursors.**" — `:604`
- "**NO generic step labels.** 'Stage 1 / Stage 2 / Stage 3'…" — `:664`

### Lists, tables, data viz
- "**NO `border-t` + `border-b` on every row** of a long list / spec table" — `:677`
- "**NO scoring/progress bars with filled background tracks**" — `:678`
- "**No data-dump sections.**" — `:303`

### Images, icons, fake UI
- "**Div-based fake screenshots are banned.**… It is the #1 LLM-design Tell." — `:290`, `:655`
- "**NEVER hand-roll SVG icons.**" — `:143`
- "**Discouraged:** `lucide-react`." — `:142`
- "**LOGO-ONLY rule (mandatory):** logo wall = logos and nothing else." — `:281`

### Copy & content
- "**NO filler verbs.** 'Elevate', 'Seamless', 'Unleash', 'Next-Gen', 'Revolutionize'" — `:620`
- "**NO startup-slop brand names.** 'Acme', 'Nexus', 'SmartFlow', 'Cloudly'" — `:619`
- "**NO generic names.** 'John Doe', 'Sarah Chan'" — `:616`
- "**NO fake-perfect numbers.** Avoid `99.99%`, `50%`, `1234567`." — `:618`
- "**NO 'Quietly in use at'** social-proof headers." — `:659`
- "**Lorem Ipsum.** Never use placeholder latin text." — `skills/redesign-skill/SKILL.md:88`
- "**Exclamation marks in success messages.**" / "**'Oops!' error messages.**" / "**Title Case On Every Header.**" — `:83-89`
- "**No placeholder-as-label. Ever.**" — `:232`

### Motion & code
- "**`window.addEventListener(\"scroll\", ...)`** is banned." — `:511`
- "**NEVER** use `useState` to track continuous values driven by user input" — `:138`
- "Animate ONLY `transform` and `opacity`." — `:522`
- "**Banned Motion:** Standard `linear` or `ease-in-out` transitions." — `skills/soft-skill/SKILL.md:19`
- "NEVER spam arbitrary `z-50` or `z-10`." — `:548`
- "**MOTION MUST BE MOTIVATED (mandatory).**… Invalid answer: 'it looked cool'." — `:360`
- "**shadcn/ui customization:** Allowed, but NEVER in default state." — `:627`
- "DO NOT use Tailwind's default heavy drop shadows (e.g., `shadow-md`, `shadow-lg`, `shadow-xl`)." — `skills/minimalist-skill/SKILL.md:16`

### Glassmorphism — status
Not banned; **gated**. "Appropriate for premium consumer, Apple-adjacent, luxury brand, or media-overlay vibes. Inappropriate for dashboards, public-sector, or 'boring B2B.'" (`:356`). Slop is *unmotivated* glass: "generic glassmorphism on everything" (`:39`).

---

## 4. Consolidated REQUIRED list

### Typography
- Display default `text-4xl md:text-6xl tracking-tighter leading-none`; body `text-base text-gray-600 leading-relaxed max-w-[65ch]` — `:166-167`
- Named pairings: "`Geist` + `Geist Mono`, `Satoshi` + `JetBrains Mono`, `Cabinet Grotesk` + `Inter Tight`, `GT America` + `IBM Plex Mono`" — `:171`
- "**ITALIC DESCENDER CLEARANCE (mandatory):**… `leading-[1.1]` minimum" — `:183`
- Weight ladder: add 500 and 600, not just 400/700 — `skills/redesign-skill/SKILL.md:25`; tabular figures for data (`:26`); `text-wrap: balance`/`pretty` (`:29`)
- Fonts via `next/font` or self-hosted `@font-face` + `font-display: swap`; "Never link Google Fonts via `<link>` in production." — `:133`

### Color
- Exactly 1 accent, saturation < 80%, neutral base (Zinc/Slate/Stone) — `:186-187`
- "**COLOR CONSISTENCY LOCK (mandatory):** Once an accent color is chosen for a page, it is used on the WHOLE page." — `:190`
- Off-black / off-white only — `:585`
- Tinted shadows matching background hue — `:215`

### Spacing & layout
- Breakpoints `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536` — `:151`
- Container `max-w-[1400px] mx-auto` or `max-w-7xl` — `:152`
- Section rhythm by density dial: `py-32`–`py-48` (density 1-3), `py-16`–`py-24` (4-7) — `:566-567`
- CSS Grid over flex math — `:154`; `min-h-[100dvh]` never `h-screen` — `:153`
- "**Mobile collapse must be explicit per section.**" — `:260`
- Touch targets ≥ `44px`; body text ≥ `1rem`/`14px` — `skills/stitch-skill/SKILL.md:84-88`

### Shape & materiality
- "**SHAPE CONSISTENCY LOCK (mandatory):** Pick ONE corner-radius scale… all-sharp (radius 0), all-soft (radius 12-16px), all-pill" — `:217`
- Cards only when elevation communicates hierarchy; otherwise `border-t`, `divide-y`, negative space — `:214`

### Motion
- Spring physics default `type: "spring", stiffness: 100, damping: 20` — `:358`
- CSS easing `cubic-bezier(0.16, 1, 0.3, 1)` at `0.3s` — `:562`; reveal `duration: 0.6, delay: i * 0.06` — `:493-496`
- Tactile `:active` → `-translate-y-[1px]` or `scale-[0.98]` — `:224`
- "**Any motion above `MOTION_INTENSITY > 3` MUST honor `prefers-reduced-motion`.**" — `:526`
- "**'Motion claimed, motion shown.'**" — `:359`

### Accessibility & performance
- WCAG AA minimum body; buttons 4.5:1 / 3:1 for 18px+ — `:225`, `:582`
- Form contrast audit mandatory — `:228`; Label above input, error below, `gap-2` — `:231`
- Dark mode mandatory for consumer-facing; one token strategy per project — `:531-535`, `:576-578`
- Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1 — `:538-541`
- Redesign additions: visible focus ring, skip-to-content, alt text, custom 404, legal links — `skills/redesign-skill/SKILL.md:68,117,121,125-130`

### States & content completeness
- Loading = skeletons matching final layout shape, never circular spinners; empty states composed; error states inline — `:220-223`
- Dependency verification against `package.json` before any import — `:157`
- "**COPY SELF-AUDIT (mandatory before ship):** re-read every visible string" — `:321`

---

## 5. `stitch-skill/DESIGN.md` — the reusable per-project spec format

`$ROOT/skills/stitch-skill/DESIGN.md` (121 lines) is a **filled-in example instance**; the schema/template lives at `$ROOT/skills/stitch-skill/SKILL.md:115-162`.

| # | Section | Content contract |
|---|---|---|
| 0 | **Configuration — Set Your Style** | Table of 4 dials: `Creativity` (8), `Density` (4), `Variance` (8), `Motion Intent` (6). User-editable. — `DESIGN.md:6-16` |
| 1 | **Visual Theme & Atmosphere** | One evocative prose paragraph naming mood + dial levels — `:20-21` |
| 2 | **Color Palette & Roles** | `**Descriptive Name** (#HEX) — Functional role`. Plus "Accent Selection (Pick ONE)" and "Banned Colors" — `:23-42` |
| 3 | **Typography Rules** | Display / Body / Mono stacks with tracking, leading, weight range, max-measure, `clamp()` scale, "Banned Fonts" — `:44-52` |
| 4 | **Component Stylings** | One bullet per component (Buttons, Cards, Inputs, Navigation, Loaders, Empty, Error) — `:54-61` |
| 5 | **Hero Section** | Signature technique, overlap rule, filler-text ban, CTA count — `:63-69` |
| 6 | **Layout Principles** | Grid-first, no-overlap, feature-section ban, containment max-width, bento — `:71-77` |
| 7 | **Responsive Rules** | 9 bullets incl. test viewport list `375 / 390 / 768 / 1024 / 1440` — `:79-89` |
| 8 | **Motion & Interaction (Code-Phase Intent)** | Physics engine, loops, stagger, transitions, perf — `:91-99` |
| 9 | **Anti-Patterns (Banned)** | Flat list of ~20 "No X" items, greppable — `:101-121` |

**Authoring rules** (`SKILL.md:164-184`): "Be Descriptive" (`Deep Charcoal Ink (#18181B)`, not "dark text"), "Be Functional", "Be Consistent", "Be Precise", "Be Opinionated".

Note the policy conflict: this file's dial table is user-editable, while taste-skill v2 says "Do not ask the user to edit this file - overrides happen conversationally" (`skills/taste-skill/SKILL.md:51`).

---

## 6. Install & wiring

**Primary — Vercel `agent-skills` CLI:**
```bash
npx skills add https://github.com/Leonxlnx/taste-skill
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```
`$ROOT/README.md:106-116`. `--skill` takes the **frontmatter `name:`**, not the folder name.

**Secondary:**
- Manual copy of any `SKILL.md` — `README.md:118`
- Claude Code plugin: `$ROOT/.claude-plugin/plugin.json` (name `taste-skill`, `1.0.0`, MIT) + `marketplace.json` with `"source": "./"`. **Minimal manifests only** — no `commands`, `agents`, `hooks`. Discovery relies on `skills/*/SKILL.md` layout.
- `$ROOT/skill.sh` — associative array folder-key → path (`skill.sh:4-25`). Keys are folder names, inconsistent with CLI install names.
- `$ROOT/.github/copilot-instructions.md` — 11-line condensed manifesto.
- `$ROOT/skills/llms.txt` — 13-line flat index.

**Agent tools claimed:** Claude Code, Codex, Cursor, ChatGPT, Gemini CLI + Antigravity (via Stitch MCP), GitHub Copilot, Google Stitch.

**Settings surface:** three dials, adjusted **conversationally** only. No config file.

---

## 7. `research/laziness/` — why LLMs go generic, and the remediation

Structure: `root-causes/` (4) → `remediation/` (4) → `findings/` (2).

**Root causes:**
1. **RLHF + compute economics** — "an inherent economic incentive to minimize output length" (`:5`); stopping pressure (`:15-17`).
2. **Training-data bias** — placeholder propagation from tutorials: "It is not deliberately withholding content — it has been trained to believe that truncating code with comments is the correct way to answer" (`:13`).
3. **Cognitive shortcuts** — LazyBench: "When a model perceives a task as straightforward or the provided context as excessively long, it reduces its internal computational effort" (`:5-7`).
4. **Output limits** — input/output asymmetry causes preemptive compression (`:5`).

**Findings** (`findings/empirical-results.md`): "Truncation is a deliberate behavioral choice, not a decoding failure" (`:22`); "Context loss is not the primary cause of truncation" (`:28-30`).

**Recommended remediation — the part that should inform how the skill is written:**
1. **Lazy-loaded skills with a *specific* description.** Discovery-rate table: vague ≈ 68%, specific ≈ 90% (`remediation/architectural-patterns.md:12-17`).
2. **Explicit syntax binding over conversational request.** "Structural binding removes this discretion by explicitly prohibiting truncation patterns." (`remediation/prompt-engineering.md:15-22`)
3. **XML-structured prompts** — system / `<context>` / `<data>` / `<tasks>` (`:24-33`).
4. **Verification loops** — Self-Grading Loop (`:35-53`). Direct ancestor of §14 Pre-Flight.
5. **Chunked task execution** — outline → components → assembly (`architectural-patterns.md:47-55`).
6. **Parameter tuning** — temperature 0.0–0.5 (`remediation/parameter-tuning.md`).
7. **Psychological stimuli** ("$200 tip", "take a deep breath") — **treat with skepticism**; weakest-sourced claims.
8. **Templates** at `remediation/reference-prompts.md`.

**Implication:** binary/countable/mechanical phrasing beats hedged phrasing. Write rules an agent can *count*, and pair each with a named override condition.

---

## 8. Gaps

**No programmatic enforcement, at all.** No hooks, no linter configs, no CI, no validator, no tests, no `package.json`. Only executables are README image processors (two hardcode `C:/Users/User/Downloads`). Every rule depends on the model self-checking. The em-dash ban, eyebrow count, contrast check — all trivially machine-checkable, none machine-checked.

**No design tokens.** No CSS variables, no `tokens.json`, no Tailwind preset.

**No components.** §12 "Block Library" defines a schema and ships **zero blocks**.

**No conflict resolution between skills.** Fraunces banned vs recommended; eyebrows capped vs mandated; `rounded-full` required vs banned; centered hero banned vs "Highly Preferred"; uniform radius smell vs lock; Inter banned vs recommended (brutalist).

**No project-level config.** Dials are conversational only.

**Scope holes.** §13 excludes dashboards, data tables, wizards, editors, native mobile, realtime collab.

**Shallow accessibility.** Contrast covered; keyboard, focus order, ARIA in passing only.

**Framework-agnostic in claim only.** Hardcodes React/Next/RSC/Tailwind v4/Motion/`next/font`.

**No evaluation.** No before/after corpus, no rubric.

### Bottom line
Take: the **contextual ban + named override** rule shape; **mechanically countable** checks; **binary phrasing**; **stitch DESIGN.md 9-section schema**; **lazy-loading + specific-description** finding. Fix what it doesn't do: commit DESIGN.md as a real artifact, turn greppable bans into a lint/hook pass, ship tokens, define one precedence order.
