// design-lint.test.mjs — 룰별 양성/음성/예외 케이스 + stdin 통합 1건. 프레임워크 없음: node templates/design-lint.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lint, isUiFile, parseFrontmatter, DEFAULTS, addedLines, formatGrouped } from './design-lint.mjs';

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error(`✗ ${name}\n   ${e.message}`); } };
const ids = (r) => r.map((f) => f.id);
const has = (r, id) => ids(r).includes(id);
const css = (s, cfg, o) => lint(s, 'src/a.css', cfg, o);
const tsx = (s, cfg, o) => lint(s, 'src/A.tsx', cfg, o);
const soft = (s, cfg) => lint(s, 'src/A.tsx', cfg, { soft: true });

// ── R1 gradient
t('R1 css linear-gradient', () => assert.ok(has(css('background: linear-gradient(90deg, red, blue);'), 'gradient')));
t('R1 css repeating', () => assert.ok(has(css('background: repeating-linear-gradient(45deg, red, blue);'), 'gradient')));
t('R1 tailwind v3 bg-gradient-to-r', () => assert.ok(has(tsx('<div className="bg-gradient-to-r from-pink-500 to-orange-400" />'), 'gradient')));
t('R1 tailwind v4 bg-linear-to-r', () => assert.ok(has(tsx('<div className="bg-linear-to-r from-pink-500 to-orange-400" />'), 'gradient')));
t('R1 tailwind v4 bg-radial', () => assert.ok(has(tsx('<div className="bg-radial from-pink-500" />'), 'gradient')));
t('R1 token gradient passes', () => assert.ok(!has(css('background: var(--ui-gradient-shimmer);'), 'gradient')));
t('R1 marker with reason passes', () => assert.ok(!has(css('/* ui-lint-allow gradient: 브랜드 히어로 DESIGN.md §8-1 */\nbackground: linear-gradient(red, blue);'), 'gradient')));
t('R1 marker without reason still blocks', () => assert.ok(has(css('/* ui-lint-allow gradient: */\nbackground: linear-gradient(red, blue);'), 'gradient')));
t('R1 marker in existing file passes', () => assert.ok(!has(css('background: linear-gradient(red, blue);', DEFAULTS, { existing: '// ui-lint-allow gradient: 승인됨' }), 'gradient')));
t('R1 policy allow passes', () => assert.ok(!has(css('background: linear-gradient(red, blue);', { gradient_policy: 'allow' }), 'gradient')));
t('R1 comment line ignored', () => assert.equal(css('// background: linear-gradient(red, blue);').length, 0));

// ── R2 ai-purple
t('R2 purple hex', () => assert.ok(has(css('color: #7c3aed;'), 'ai-purple')));
t('R2 667eea/764ba2', () => assert.ok(has(css('background: #667eea;'), 'ai-purple')));
t('R2 tailwind indigo', () => assert.ok(has(tsx('<h1 className="text-indigo-600" />'), 'ai-purple')));
t('R2 does not double-fire R3 on same tailwind class', () => assert.deepEqual(ids(tsx('<h1 className="text-indigo-600" />')), ['ai-purple']));
t('R2 brand_hue purple exempts (R3 still fires)', () => { const r = tsx('<h1 className="text-indigo-600" />', { brand_hue: 'purple' }); assert.ok(!has(r, 'ai-purple')); assert.ok(has(r, 'hardcoded-color')); });

// ── R3 hardcoded-color
t('R3 css hex', () => assert.ok(has(css('color: #1a1c20;'), 'hardcoded-color')));
t('R3 css short hex', () => assert.ok(has(css('color: #fff;'), 'hardcoded-color')));
t('R3 jsx style object', () => assert.ok(has(tsx("<div style={{ color: '#1a1c20' }} />"), 'hardcoded-color')));
t('R3 tailwind arbitrary bg-[#…]', () => assert.ok(has(tsx('<div className="bg-[#1a1c20]" />'), 'hardcoded-color')));
t('R3 rgba()', () => assert.ok(has(css('background: rgba(0,0,0,.5);'), 'hardcoded-color')));
t('R3 oklch()', () => assert.ok(has(css('color: oklch(60% 0.1 250);'), 'hardcoded-color')));
t('R3 hsl(var()) passes', () => assert.ok(!has(css('color: hsl(var(--ui-x));'), 'hardcoded-color')));
t('R3 href="#add" not flagged', () => assert.equal(tsx('<a href="#add">x</a>').length, 0));
t('R3 <Link to="#add"> not flagged', () => assert.equal(tsx('<Link to="#add">x</Link>').length, 0));
t('R3 css id selector not flagged', () => assert.equal(css('#add { margin: 0 }').length, 0));
t('R3 css nested id selector not flagged', () => assert.equal(css('a:hover #add { margin: 0 }').length, 0));
t('R3 tailwind palette class', () => assert.ok(has(tsx('<div className="bg-blue-500 text-gray-600" />'), 'hardcoded-color')));
t('R3 tailwind palette with opacity', () => assert.ok(has(tsx('<div className="text-slate-900/80" />'), 'hardcoded-color')));
t('R3 tailwind_palette allow passes', () => assert.ok(!has(tsx('<div className="bg-blue-500" />', { tailwind_palette: 'allow' }), 'hardcoded-color')));
t('R3 semantic utilities pass', () => assert.equal(tsx('<div className="bg-brand-solid text-fg-neutral border-stroke-neutral rounded-control shadow-1" />').length, 0));
t('R3 var() passes', () => assert.equal(css('color: var(--ui-color-fg-neutral);').length, 0));
t('R3 warn policy → severity warn', () => assert.equal(css('color: #1a1c20;', { hardcoded_color: 'warn' })[0].severity, 'warn'));
t('R3 custom prefix in fix text', () => assert.match(css('color: #123456;', { token_prefix: 'acme' })[0].fix, /--acme-color/));

// ── R4 hardcoded-font
t('R4 Inter', () => assert.ok(has(css('font-family: Inter, sans-serif;'), 'hardcoded-font')));
t('R4 allowed family passes', () => assert.ok(!has(css('font-family: "Pretendard Variable", sans-serif;'), 'hardcoded-font')));
t('R4 @font-face with allowed family passes', () => assert.ok(!has(css('@font-face { font-family: "Pretendard Variable"; src: url(x.woff2); }'), 'hardcoded-font')));
t('R4 var() passes', () => assert.ok(!has(css('font-family: var(--ui-font-sans);'), 'hardcoded-font')));
t('R4 generic keyword passes', () => assert.ok(!has(css('font-family: inherit;'), 'hardcoded-font')));
t('R4 monospace generic passes', () => assert.ok(!has(css('font-family: ui-monospace, monospace;'), 'hardcoded-font')));
t('R4 google fonts link', () => assert.ok(has(tsx('<link href="https://fonts.googleapis.com/css2?family=Inter" />'), 'hardcoded-font')));
t("R4 tailwind font-['Inter']", () => assert.ok(has(tsx(`<p className="font-['Inter']" />`), 'hardcoded-font')));
t('R4 tailwind font-[500] (weight) passes', () => assert.equal(tsx('<p className="font-[500]" />').length, 0));
t('R4 custom font_families', () => assert.ok(!has(css('font-family: "Noto Sans KR";', { font_families: ['Noto Sans KR'] }), 'hardcoded-font')));

// ── 파일 분류
t('isUiFile tokens.css skipped', () => assert.equal(isUiFile('src/styles/tokens.css'), false));
t('isUiFile globals.css linted (@theme 우회 통로)', () => assert.equal(isUiFile('app/globals.css'), true));
t('isUiFile globals.css skipped when it is tokens_path', () => assert.equal(isUiFile('app/globals.css', '', 'app/globals.css'), false));
t('isUiFile tokens_path with ./ prefix', () => assert.equal(isUiFile('src/app.css', '', './src/app.css'), false));
t('isUiFile tailwind.config linted (theme.extend 우회 통로)', () => { assert.equal(isUiFile('tailwind.config.ts', 'export default {}'), true); assert.equal(isUiFile('tailwind.config.cjs', 'module.exports = {}'), true); });
t('globals.css @theme raw color blocked', () => { const r = lint('@theme inline {\n  --color-hero: #7c3aed;\n  --color-ink: oklch(0.2 0 0);\n}', 'app/globals.css'); assert.ok(has(r, 'ai-purple')); assert.ok(has(r, 'hardcoded-color')); });
t('globals.css token-only @theme passes', () => assert.equal(lint('@import "tailwindcss";\n@theme inline {\n  --color-hero: var(--ui-color-bg-brand-solid);\n}', 'app/globals.css').length, 0));
t('tailwind.config v3 theme.extend raw color blocked', () => assert.ok(has(lint("module.exports = {\n  theme: { extend: { colors: { hero: '#ff5a1f' } } },\n};", 'tailwind.config.js'), 'hardcoded-color')));
t('tailwind.config with preset only passes', () => assert.equal(lint("module.exports = {\n  presets: [require('./tailwind.ui-preset.cjs')],\n  content: ['./src/**/*.{html,js,ts,jsx,tsx}'],\n};", 'tailwind.config.js').length, 0));
t('isUiFile DESIGN.md skipped', () => assert.equal(isUiFile('DESIGN.md'), false));
t('isUiFile tsx', () => assert.equal(isUiFile('src/Button.tsx'), true));
t('isUiFile vue', () => assert.equal(isUiFile('src/Button.vue'), true));
t('isUiFile node_modules skipped', () => assert.equal(isUiFile('node_modules/x/a.css'), false));
t('isUiFile .d.ts skipped', () => assert.equal(isUiFile('src/types.d.ts'), false));
t('isUiFile test skipped', () => assert.equal(isUiFile('src/Button.test.tsx'), false));
t('isUiFile stories skipped', () => assert.equal(isUiFile('src/Button.stories.tsx'), false));
t('isUiFile plain ts without jsx', () => assert.equal(isUiFile('src/util.ts', 'export const a = 1;'), false));
t('isUiFile ts with className', () => assert.equal(isUiFile('src/util.ts', 'x.className="a"'), true));
t('isUiFile ts with styled', () => assert.equal(isUiFile('src/x.ts', 'const B = styled.div``'), true));
t('isUiFile windows path', () => assert.equal(isUiFile('src\\styles\\tokens.css'), false));
t('isUiFile .claude hook skipped (no self-lint)', () => assert.equal(isUiFile('.claude/hooks/design-lint.mjs', 'className='), false));
t('isUiFile .claude skill tsx skipped', () => assert.equal(isUiFile('.claude/skills/ui-design/x.tsx'), false));

// ── frontmatter
t('frontmatter dials + lists', () => {
  const c = parseFrontmatter('---\ndials: { variance: 4, motion: 3, density: 5 }\nfont_families: ["Pretendard Variable", "Pretendard"]\ngradient_policy: none\n---\n# x');
  assert.deepEqual(c.dials, { variance: 4, motion: 3, density: 5 });
  assert.deepEqual(c.font_families, ['Pretendard Variable', 'Pretendard']);
  assert.equal(c.gradient_policy, 'none');
});
t('frontmatter missing → {}', () => assert.deepEqual(parseFrontmatter('# no fm'), {}));

// ── 통합: --pre 를 실제 stdin JSON으로 (exit 2 / 0)
t('integration --pre blocks and passes', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const script = path.join(here, 'design-lint.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-lint-it-'));
  fs.writeFileSync(path.join(root, 'DESIGN.md'), '---\nui_skill_set: 0.1\ntoken_prefix: ui\n---\n');
  const run = (tool_input) => spawnSync(process.execPath, [script, '--pre'], {
    cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    input: JSON.stringify({ tool_name: 'Write', tool_input }), encoding: 'utf8',
  });
  const bad = run({ file_path: 'src/Hero.tsx', content: '<div className="bg-linear-to-r from-purple-500 to-blue-500">x</div>' });
  assert.equal(bad.status, 2, bad.stderr);
  assert.match(bad.stderr, /R1 gradient/);
  assert.match(bad.stderr, /R2 ai-purple/);
  const good = run({ file_path: 'src/Hero.tsx', content: '<div className="bg-brand-solid text-fg-on-brand rounded-control">x</div>' });
  assert.equal(good.status, 0, good.stderr);
  const skipped = run({ file_path: 'src/styles/tokens.css', content: ':root{--ui-x:#123456}' });
  assert.equal(skipped.status, 0);
  const outside = run({ file_path: path.join(os.tmpdir(), 'elsewhere.tsx'), content: 'bg-gradient-to-r' });
  assert.equal(outside.status, 0);
  // 안티 데드락: 같은 위반 3회 차단 후 4번째 통과
  const edit = { file_path: 'src/Hero.tsx', old_string: 'x', new_string: 'color: #7c3aed' };
  const statuses = [1, 2, 3, 4].map(() => run(edit).status);
  assert.deepEqual(statuses, [2, 2, 2, 0]);
  // 설치 안 된 프로젝트(DESIGN.md 없음) → no-op
  fs.rmSync(path.join(root, 'DESIGN.md'));
  assert.equal(run({ file_path: 'src/Hero.tsx', content: 'bg-linear-to-r' }).status, 0);
  fs.rmSync(root, { recursive: true, force: true });
});

// ── 소프트 룰 S1~S15 (soft:true 일 때만 발화, tier==='soft')
t('soft off by default: no soft findings in --pre mode', () => assert.equal(tsx('<nav className="backdrop-blur h-screen transition-all" />').filter((f) => f.tier === 'soft').length, 0));
t('S1 glass-decorative', () => assert.ok(has(soft('<div className="backdrop-blur-md rounded-card" />'), 'glass-decorative')));
t('S1 glass on sticky nav passes', () => assert.ok(!has(soft('<nav className="sticky backdrop-blur-md" />'), 'glass-decorative')));
t('S2 emoji-as-icon', () => assert.ok(has(soft('<button>🚀 시작</button>'), 'emoji-as-icon')));
t('S2 plain korean text passes', () => assert.ok(!has(soft('<button>시작하기</button>'), 'emoji-as-icon')));
t('S3 heavy-shadow tailwind', () => assert.ok(has(soft('<div className="shadow-xl" />'), 'heavy-shadow')));
t('S3 token shadow-1 passes', () => assert.ok(!has(soft('<div className="shadow-1" />'), 'heavy-shadow')));
t('S4 animate-bounce', () => assert.ok(has(soft('<div className="animate-bounce" />'), 'bounce-easing')));
t('S4 cubic-bezier overshoot', () => assert.ok(has(soft('a{transition-timing-function:cubic-bezier(0.5,1.6,0.5,1)}'), 'bounce-easing')));
t('S4 normal ease passes', () => assert.ok(!has(soft('a{transition-timing-function:cubic-bezier(0.35,0,0.35,1)}'), 'bounce-easing')));
t('S5 h-screen', () => assert.ok(has(soft('<section className="h-screen" />'), 'h-screen')));
t('S5 min-h-dvh passes', () => assert.ok(!has(soft('<section className="min-h-dvh" />'), 'h-screen')));
t('S6 z-arbitrary', () => assert.ok(has(soft('<div className="z-[9999]" />'), 'z-arbitrary')));
t('S7 transition-all', () => assert.ok(has(soft('<div className="transition-all" />'), 'transition-all')));
t('S8 eyebrow', () => assert.ok(has(soft('<span className="uppercase tracking-widest text-fg-brand">기능</span>'), 'eyebrow')));
t('S8 uppercase alone passes', () => assert.ok(!has(soft('<span className="uppercase">API</span>'), 'eyebrow')));
t('S9 side-tab', () => assert.ok(has(soft('<div className="border-l-4 border-stroke-brand" />'), 'side-tab')));
t('S10 img-hover-scale', () => assert.ok(has(soft('<img className="hover:scale-105" src="x" />'), 'img-hover-scale')));
t('S10 button hover:scale passes', () => assert.ok(!has(soft('<button className="hover:scale-105">x</button>'), 'img-hover-scale')));
t('S11 pure bw tailwind keyword', () => assert.ok(has(soft('<div className="bg-black text-white" />'), 'pure-bw')));
t('S12 em-dash', () => assert.ok(has(soft('<p>가격 - 무료</p>'.replace(' - ', ' — ')), 'em-dash')));
t('S13 break-all', () => assert.ok(has(soft('<p className="break-all">긴텍스트</p>'), 'break-all')));
t('S14 korean-tracking tighter', () => assert.ok(has(soft('<h1 className="tracking-tighter">제목</h1>'), 'korean-tracking')));
t('S15 buzzword korean', () => assert.ok(has(soft('<h2>혁신적인 차세대 플랫폼</h2>'), 'buzzword')));
t('S15 buzzword english', () => assert.ok(has(soft('<h2>Seamless experience</h2>'), 'buzzword')));
t('soft respects marker', () => assert.ok(!has(soft('/* ui-lint-allow h-screen: 랜딩 히어로 전면 */\n<section className="h-screen" />'), 'h-screen')));
t('soft findings are tier soft not block-tier-hard', () => { const r = soft('<div className="shadow-xl" />'); const f = r.find((x) => x.id === 'heavy-shadow'); assert.equal(f.tier, 'soft'); });

// ── 2026-09: Tailwind v4.1~4.3 신문법 우회 (전부 실측 우회였던 케이스)
t('R1 bg-linear-(--x) v4 shorthand', () => assert.ok(has(tsx('<div className="bg-linear-(--my-grad)" />'), 'gradient')));
t('R1 bg-linear-45 angle', () => assert.ok(has(tsx('<div className="bg-linear-45 from-x" />'), 'gradient')));
t('R3 v4.2 palettes mauve/olive/mist/taupe', () => ['bg-mauve-500', 'text-olive-700', 'border-mist-200', 'bg-taupe-100'].forEach((c) => assert.ok(has(tsx(`<div className="${c}" />`), 'hardcoded-color'), c)));
t('R3 v4.3 scrollbar-thumb color', () => assert.ok(has(tsx('<div className="scrollbar-thumb-gray-400" />'), 'hardcoded-color')));
t('R3 v4.1 text-shadow/inset-shadow color', () => { assert.ok(has(tsx('<h1 className="text-shadow-blue-500" />'), 'hardcoded-color')); assert.ok(has(tsx('<div className="inset-shadow-red-200" />'), 'hardcoded-color')); });
t('R3 hwb()/color(display-p3)/light-dark raw', () => ['color: hwb(12 20% 30%);', 'color: color(display-p3 1 0 0);', 'color: light-dark(white, black);'].forEach((s) => assert.ok(has(css(s), 'hardcoded-color'), s)));
t('R3 color-mix from token passes', () => assert.ok(!has(css('background: color-mix(in oklab, var(--ui-color-bg-brand-solid) 20%, transparent);'), 'hardcoded-color')));
t('R3 relative color from token passes', () => assert.ok(!has(css('color: oklch(from var(--ui-accent-700) l c h / 0.6);'), 'hardcoded-color')));
t('R3 light-dark with tokens passes', () => assert.ok(!has(css('color: light-dark(var(--ui-gray-900), var(--ui-gray-100));'), 'hardcoded-color')));
t('R3 background-color: property name not a color()', () => assert.ok(!has(css('background-color: var(--ui-color-bg-layer-default);'), 'hardcoded-color')));
t('R4 font-[Open_Sans] v4 syntax', () => assert.ok(has(tsx('<p className="font-[Open_Sans]" />'), 'hardcoded-font')));
t('R4 font-(family-name:--x)', () => assert.ok(has(tsx('<p className="font-(family-name:--my-font)" />'), 'hardcoded-font')));
t('R4 font-[500] weight passes', () => assert.ok(!has(tsx('<p className="font-[500]" />'), 'hardcoded-font')));
t('R4 token family-name passes', () => assert.ok(!has(tsx('<p className="font-[family-name:var(--ui-font-sans)]" />'), 'hardcoded-font')));
t('R4 next/font/google undeclared', () => assert.ok(has(tsx("import { Noto_Sans_KR } from 'next/font/google';\n<div className=\"x\" />"), 'hardcoded-font')));
t('R4 @fontsource undeclared', () => assert.ok(has(tsx("import '@fontsource-variable/inter';\n<div className=\"x\" />"), 'hardcoded-font')));
t('R4 @fontsource declared font passes', () => assert.ok(!has(tsx("import '@fontsource/noto-sans-kr';", { font_families: ['Noto Sans KR'] }), 'hardcoded-font')));
t('S3 arbitrary shadow-[…]', () => assert.ok(has(soft('<div className="shadow-[0_0_40px_rgba(0,0,0,.2)]" />'), 'heavy-shadow')));
t('S4 linear() overshoot', () => assert.ok(has(soft('a{transition-timing-function:linear(0, 1.2 60%, 1)}'), 'bounce-easing')));
t('S4 linear() normal passes', () => assert.ok(!has(soft('a{transition-timing-function:linear(0, 0.5 40%, 1)}'), 'bounce-easing')));
t('S4 linear-gradient is not linear()', () => assert.ok(!has(soft('/* ui-lint-allow gradient: t */\na{background:linear-gradient(0deg, var(--ui-a) 120%)}'), 'bounce-easing')));
t('S6 bare z-9999', () => assert.ok(has(soft('<div className="z-9999" />'), 'z-arbitrary')));
t('S6 z-50 passes', () => assert.ok(!has(soft('<div className="z-50" />'), 'z-arbitrary')));
t('S7 transition-[all] / transition-property: all', () => { assert.ok(has(soft('<div className="transition-[all]" />'), 'transition-all')); assert.ok(has(soft('a{transition-property: all}'), 'transition-all')); });
t('S9 logical border-s-4 / border-l-[4px]', () => { assert.ok(has(soft('<div className="border-s-4" />'), 'side-tab')); assert.ok(has(soft('<div className="border-l-[4px]" />'), 'side-tab')); });
t('S9 border-l-[1px] passes', () => assert.ok(!has(soft('<div className="border-l-[1px]" />'), 'side-tab')));
t('S14 tracking-[-0.04em] / -0.025em', () => { assert.ok(has(soft('<h1 className="tracking-[-0.04em]">제목</h1>'), 'korean-tracking')); assert.ok(has(soft('h1{letter-spacing:-0.025em}'), 'korean-tracking')); });
t('S14 -0.02em allowed', () => { assert.ok(!has(soft('<h1 className="tracking-[-0.02em]">제목</h1>'), 'korean-tracking')); assert.ok(!has(soft('h1{letter-spacing:-0.02em}'), 'korean-tracking')); });

// ── S16~S23 신규 소프트 룰
t('S16 arbitrary spacing with scale suggestion', () => { const f = soft('<div className="p-[13px]" />').find((x) => x.id === 'arbitrary-value'); assert.ok(f); assert.match(f.snippet, /p-3 \(12px\)/); });
t('S16 arbitrary text/rounded', () => { assert.ok(has(soft('<p className="text-[13px]" />'), 'arbitrary-value')); assert.ok(has(soft('<div className="rounded-[10px]" />'), 'arbitrary-value')); });
t('S16 rem converted', () => assert.match(soft('<div className="gap-[1.5rem]" />').find((x) => x.id === 'arbitrary-value').snippet, /gap-6 \(24px\)/));
t('S16 scale class / tracking / env passes', () => assert.ok(!has(soft('<div className="p-4 text-5 tracking-[-0.02em] pb-[env(safe-area-inset-bottom)] w-[320px]" />'), 'arbitrary-value')));
t('S17 zoom disabled meta', () => assert.ok(has(soft('<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">'), 'zoom-disabled')));
t('S17 Next viewport export', () => assert.ok(has(soft('export const viewport = { width: "device-width", maximumScale: 1, userScalable: false };\n<div className="x" />'), 'zoom-disabled')));
t('S17 normal viewport passes', () => assert.ok(!has(soft('<meta name="viewport" content="width=device-width, initial-scale=1">'), 'zoom-disabled')));
t('S18 layout transition', () => { assert.ok(has(soft('a{transition: height 200ms ease}'), 'layout-transition')); assert.ok(has(soft('<div className="transition-[width]" />'), 'layout-transition')); });
t('S18 transform transition passes', () => assert.ok(!has(soft('a{transition: transform 200ms, opacity 150ms}'), 'layout-transition')));
t('S19 dark: branch', () => assert.ok(has(soft('<div className="bg-layer-default dark:bg-neutral-solid" />'), 'dark-branch')));
t('S20 trailing arrow on CTA', () => { assert.ok(has(soft('<button>시작하기 →</button>'), 'trailing-arrow')); assert.ok(has(soft("const cta = '더 보기 →';"), 'trailing-arrow')); });
t('S20 route arrow in text passes', () => assert.ok(!has(soft('<p>서울 → 부산 KTX</p>'), 'trailing-arrow')));
t('S21 div onClick', () => { assert.ok(has(soft('<div className="p-4" onClick={open}>열기</div>'), 'div-click')); assert.ok(has(soft('<tr onClick={go}>'), 'div-click')); });
t('S21 button / role passes', () => { assert.ok(!has(soft('<button onClick={open}>열기</button>'), 'div-click')); assert.ok(!has(soft('<div role="button" tabIndex={0} onClick={open}>열기</div>'), 'div-click')); });
t('S22 label-in-name mismatch', () => assert.ok(has(soft('<button aria-label="요금제 고르기">선택</button>'), 'label-in-name')));
t('S22 label contains visible text passes', () => assert.ok(!has(soft('<button aria-label="요금제 A 선택">선택</button>'), 'label-in-name')));
t('S23 register mixed (auto) flags minority', () => { const r = soft('<p>저장했어요.</p>\n<p>삭제했어요.</p>\n<p>완료되었습니다.</p>').filter((x) => x.id === 'copy-register'); assert.equal(r.length, 1); assert.equal(r[0].line, 3); });
t('S23 single register passes', () => assert.ok(!has(soft('<p>저장했어요.</p>\n<p>다시 시도해 주세요.</p>'), 'copy-register')));
t('S23 copy_register: haeyo flags 합니다체', () => assert.ok(has(soft('<p>저장되었습니다.</p>', { copy_register: 'haeyo' }), 'copy-register')));
t('S23 over-polite 시겠어요', () => assert.ok(has(soft('<p>삭제하시겠어요?</p>'), 'copy-register')));
t('S23 korean inline comment ignored', () => assert.ok(!has(soft('<p>저장했어요.</p>\nconst x = 1; // 초기화합니다\n{/* 설명입니다 */}'), 'copy-register')));
t('S23 좋아요 button is a noun', () => assert.ok(!has(soft('<p>등록되었습니다.</p>\n<button>좋아요</button>'), 'copy-register')));

// ── Stop: 이번에 바뀐 줄만 + 규칙별 묶음
t('addedLines parses -U0 hunks', () => {
  const m = addedLines('diff --git a/src/A.tsx b/src/A.tsx\n--- a/src/A.tsx\n+++ b/src/A.tsx\n@@ -3 +3,2 @@\n-x\n+y\n+z\n@@ -10,0 +12 @@\n+w\n--- a/src/B.tsx\n+++ /dev/null\n@@ -1 +0,0 @@\n-gone');
  assert.deepEqual([...m.get('src/A.tsx')], [3, 4, 12]);
  assert.equal(m.has('src/B.tsx'), false);
});
t('formatGrouped caps rule kinds at 4', () => {
  const f = (id, line) => ({ rule: 'S' + id.length, id, line, file: 'a.tsx', snippet: id, fix: 'fix-' + id });
  const out = formatGrouped([f('a', 1), f('a', 2), f('bb', 3), f('ccc', 4), f('dddd', 5), f('eeeee', 6)]);
  assert.match(out, /a\.tsx:1, a\.tsx:2/);
  assert.match(out, /외 규칙 1종\(eeeee\)/);
  assert.ok(!out.includes('fix-eeeee'));
});
t('formatGrouped puts a11y/copy rules first', () => {
  const f = (rule, id) => ({ rule, id, line: 1, file: 'a.tsx', snippet: id, fix: 'fix-' + id });
  const out = formatGrouped([f('S6', 'z-arbitrary'), f('S7', 'transition-all'), f('S5', 'h-screen'), f('S16', 'arbitrary-value'), f('S21', 'div-click')]);
  assert.ok(out.indexOf('div-click') < out.indexOf('z-arbitrary'));
  assert.match(out, /외 규칙 1종\(arbitrary-value\)/);
});
t('integration --stop: soft only on changed lines', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-lint-stop-'));
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'design-lint.mjs');
  const g = (a) => spawnSync('git', a, { cwd: root, encoding: 'utf8' });
  if (g(['init', '-q']).status !== 0) { fs.rmSync(root, { recursive: true, force: true }); return; } // git 없음 → 건너뜀
  g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't']);
  fs.writeFileSync(path.join(root, 'DESIGN.md'), '---\nui_skill_set: 0.1\ntoken_prefix: ui\n---\n');
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'Legacy.tsx'), '<section className="h-screen" />\n<p className="text-fg-neutral">a</p>\n');
  g(['add', '-A']); g(['commit', '-qm', 'init']);
  const stop = () => spawnSync(process.execPath, [script, '--stop'], { cwd: root, input: '{}', env: { ...process.env, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8' });
  // 다른 줄만 수정 → 레거시 h-screen 은 지적하지 않음
  fs.writeFileSync(path.join(root, 'src', 'Legacy.tsx'), '<section className="h-screen" />\n<p className="text-fg-brand">b</p>\n');
  let out = JSON.parse(stop().stdout);
  assert.ok(!out.decision, JSON.stringify(out));
  // 새 줄에 소프트 위반 추가 → block
  fs.writeFileSync(path.join(root, 'src', 'Legacy.tsx'), '<section className="h-screen" />\n<p className="text-fg-brand">b</p>\n<div className="z-[9999]" />\n');
  out = JSON.parse(stop().stdout);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /z-arbitrary/);
  assert.ok(!/h-screen/.test(out.reason), out.reason);
  fs.rmSync(root, { recursive: true, force: true });
});

// ── 통합: --all 종료 코드 + 토큰 커버리지 (하드 위반만 exit 1, 소프트는 exit 0)
t('integration --all exit codes and coverage', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const script = path.join(here, 'design-lint.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-lint-all-'));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'DESIGN.md'), '---\nui_skill_set: 0.1\ntoken_prefix: ui\n---\n');
  const all = () => spawnSync(process.execPath, [script, '--all'], { cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8' });
  // 하드 위반 → exit 1
  fs.writeFileSync(path.join(root, 'src', 'Bad.tsx'), '<div style={{color:"#123456"}} />');
  let r = all();
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /토큰 커버리지/);
  // 소프트만 → exit 0
  fs.rmSync(path.join(root, 'src', 'Bad.tsx'));
  fs.writeFileSync(path.join(root, 'src', 'Soft.tsx'), '<section className="h-screen bg-brand-solid text-fg-on-brand" />');
  r = all();
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /소프트 1건|소프트 [1-9]/);
  // 전부 토큰 → 위반 0, 커버리지 100%
  fs.writeFileSync(path.join(root, 'src', 'Soft.tsx'), '<div className="bg-brand-solid text-fg-neutral rounded-control" />');
  r = all();
  assert.equal(r.status, 0);
  assert.match(r.stdout, /커버리지 100%|위반 0건/);
  fs.rmSync(root, { recursive: true, force: true });
});

console.log(failed ? `${failed} failed, ${n} passed` : `ok — ${n} tests`);
process.exit(failed ? 1 : 0);
