// design-lint.test.mjs — 룰별 양성/음성/예외 케이스 + stdin 통합 1건. 프레임워크 없음: node templates/design-lint.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lint, isUiFile, parseFrontmatter, DEFAULTS } from './design-lint.mjs';

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
t('isUiFile globals.css skipped', () => assert.equal(isUiFile('app/globals.css'), false));
t('isUiFile tailwind.config skipped', () => assert.equal(isUiFile('tailwind.config.ts'), false));
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
