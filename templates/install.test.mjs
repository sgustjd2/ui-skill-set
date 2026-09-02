// install.test.mjs — 병합/채우기 순수 함수 + 전체 설치 스모크. node templates/install.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mergeSettings, fillFrontmatter, appendSnippet } from './install.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error(`✗ ${name}\n   ${e.message}`); } };
const here = path.dirname(fileURLToPath(import.meta.url));

// ── mergeSettings
t('merge into empty', () => {
  const s = JSON.parse(mergeSettings(null));
  assert.equal(s.hooks.PreToolUse[0].hooks[0].command, 'node .claude/hooks/design-lint.mjs --pre');
  assert.equal(s.hooks.PreToolUse[0].matcher, 'Edit|Write|MultiEdit');
  assert.equal(s.hooks.Stop[0].hooks[0].command, 'node .claude/hooks/design-lint.mjs --stop');
  assert.equal(s.hooks.Stop[0].matcher, undefined);
});
t('merge preserves existing hooks', () => {
  const existing = JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] }] }, permissions: { allow: ['Bash(ls:*)'] } });
  const s = JSON.parse(mergeSettings(existing));
  assert.equal(s.permissions.allow[0], 'Bash(ls:*)');
  assert.equal(s.hooks.PreToolUse.length, 2); // 기존 Bash + 우리 것
  assert.ok(s.hooks.PreToolUse.some((e) => e.matcher === 'Bash'));
  assert.ok(s.hooks.PreToolUse.some((e) => e.hooks[0].command.includes('--pre')));
});
t('merge is idempotent', () => {
  const once = mergeSettings(null);
  const twice = mergeSettings(once);
  assert.equal(JSON.parse(twice).hooks.PreToolUse.length, 1);
  assert.equal(JSON.parse(twice).hooks.Stop.length, 1);
});
t('merge tolerates broken json', () => { assert.ok(JSON.parse(mergeSettings('{not json')).hooks.PreToolUse); });

// ── fillFrontmatter
const FM = '---\nmode_default: operate\nstack: react-tailwind4\ntokens_path: src/styles/tokens.css\nbrand_hue: blue\ngradient_policy: none\ntailwind_palette: deny\nhardcoded_color: block\n---\n# body\n';
t('fill replaces values', () => {
  const out = fillFrontmatter(FM, { mode_default: 'persuade', stack: 'vue', brand_hue: 'purple' });
  assert.match(out, /mode_default: persuade/);
  assert.match(out, /stack: vue/);
  assert.match(out, /brand_hue: purple/);
  assert.match(out, /# body/); // 본문 보존
});
t('fill legacy sets policies', () => {
  const out = fillFrontmatter(FM, { legacy: true });
  assert.match(out, /tailwind_palette: allow/);
  assert.match(out, /hardcoded_color: warn/);
});
t('fill ignores null/undefined', () => {
  const out = fillFrontmatter(FM, { mode_default: undefined, stack: null });
  assert.match(out, /mode_default: operate/);
  assert.match(out, /stack: react-tailwind4/);
});
t('fill custom tokens_path', () => assert.match(fillFrontmatter(FM, { tokens_path: 'app/theme.css' }), /tokens_path: app\/theme\.css/));
t('fill no-frontmatter returns unchanged', () => assert.equal(fillFrontmatter('# no fm', { stack: 'vue' }), '# no fm'));

// ── appendSnippet
t('append to empty', () => assert.match(appendSnippet('', '## UI 작업 규약 (ui-skill-set)\n- x'), /UI 작업 규약/));
t('append preserves existing content', () => {
  const out = appendSnippet('# My Project\n\n기존 내용', '## UI 작업 규약 (ui-skill-set)\n- x');
  assert.match(out, /My Project/);
  assert.match(out, /UI 작업 규약/);
});
t('append is idempotent', () => {
  const once = appendSnippet('# P', '## UI 작업 규약 (ui-skill-set)\n- x');
  const twice = appendSnippet(once, '## UI 작업 규약 (ui-skill-set)\n- x');
  assert.equal(once, twice);
  assert.equal((twice.match(/UI 작업 규약/g) || []).length, 1);
});

// ── 분리 구조: tokens.css는 프레임워크 무관(@theme 없음), theme.css가 v4 브릿지
t('template tokens.css has no @theme (framework-agnostic)', () => {
  assert.ok(!/@theme/.test(fs.readFileSync(path.join(here, 'tokens.css'), 'utf8')));
});
t('template theme.css has @theme bridge', () => {
  const css = fs.readFileSync(path.join(here, 'theme.css'), 'utf8');
  assert.match(css, /@theme inline/);
  assert.match(css, /--color-brand-solid: var\(--ui-color-bg-brand-solid\)/);
});

// ── v3 프리셋 require + 키 확인
t('v3 preset requires and has semantic keys', () => {
  const preset = require('./tailwind.ui-preset.cjs');
  const colors = preset.theme.extend.colors;
  assert.equal(colors['brand-solid'], 'var(--ui-color-bg-brand-solid)');
  assert.equal(colors['fg-neutral'], 'var(--ui-color-fg-neutral)');
  assert.equal(colors['stroke-neutral'], 'var(--ui-color-stroke-neutral)');
  assert.deepEqual(preset.theme.extend.fontSize['4'], ['var(--ui-text-4)', 'var(--ui-leading-4)']);
  assert.equal(preset.theme.extend.borderRadius.control, 'var(--ui-radius-control)');
  assert.equal(preset.theme.extend.boxShadow['1'], 'var(--ui-shadow-1)');
});
t('v3 preset color keys cover theme.css --color-* names (드리프트 방지)', () => {
  const theme = fs.readFileSync(path.join(here, 'theme.css'), 'utf8');
  const names = [...theme.matchAll(/^\s*--color-([\w-]+):/gm)].map((m) => m[1]);
  const keys = new Set(Object.keys(require('./tailwind.ui-preset.cjs').theme.extend.colors));
  const missing = names.filter((n) => !keys.has(n));
  assert.deepEqual(missing, [], `프리셋에 없는 색: ${missing.join(', ')}`);
});

// ── v3 통합 설치: tokens.css @theme 없음 + 프리셋 있음 + theme.css 없음
t('integration: v3 install drops preset, no theme.css', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-install-v3-'));
  const r = spawnSync(process.execPath, [path.join(here, 'install.mjs'), '--target', root, '--stack', 'react-tailwind3', '--hue', 'blue'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const tokens = fs.readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8');
  assert.ok(!/@theme/.test(tokens));
  assert.match(tokens, /--ui-color-bg-brand-solid/);
  assert.ok(fs.existsSync(path.join(root, 'tailwind.ui-preset.cjs')));
  assert.ok(!fs.existsSync(path.join(root, 'src/styles/theme.css')), 'v3엔 theme.css 없어야');
  assert.match(fs.readFileSync(path.join(root, 'DESIGN.md'), 'utf8'), /stack: react-tailwind3/);
  fs.rmSync(root, { recursive: true, force: true });
});

// ── v4 통합 설치: theme.css를 tokens.css 옆에 설치, 프리셋 없음
t('integration: v4 install drops theme.css next to tokens', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-install-v4-'));
  const r = spawnSync(process.execPath, [path.join(here, 'install.mjs'), '--target', root, '--stack', 'react-tailwind4', '--hue', 'blue'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(root, 'src/styles/theme.css')), 'v4엔 theme.css 있어야');
  assert.match(fs.readFileSync(path.join(root, 'src/styles/theme.css'), 'utf8'), /@theme inline/);
  assert.ok(!fs.existsSync(path.join(root, 'tailwind.ui-preset.cjs')), 'v4엔 preset 없어야');
  fs.rmSync(root, { recursive: true, force: true });
});

// ── 순수 CSS 스택: 브릿지 파일 없음
t('integration: react-css stack has no bridge file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-install-css-'));
  const r = spawnSync(process.execPath, [path.join(here, 'install.mjs'), '--target', root, '--stack', 'react-css'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(root, 'src/styles/theme.css')));
  assert.ok(!fs.existsSync(path.join(root, 'tailwind.ui-preset.cjs')));
  fs.rmSync(root, { recursive: true, force: true });
});

// ── 통합: 실제 설치 → 훅이 동작하는지
t('integration: full install then lint blocks', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-install-'));
  const r = spawnSync(process.execPath, [path.join(here, 'install.mjs'), '--target', root, '--hue', 'blue', '--stack', 'react-tailwind4'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(root, 'DESIGN.md')));
  assert.ok(fs.existsSync(path.join(root, 'src/styles/tokens.css')));
  assert.ok(fs.existsSync(path.join(root, 'src/styles/theme.css')));
  assert.ok(fs.existsSync(path.join(root, '.claude/hooks/design-lint.mjs')));
  assert.ok(fs.existsSync(path.join(root, '.claude/hooks/design-audit.mjs')));
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/ui-design/SKILL.md')));
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/ui-design/references/banned.md')));
  const settings = JSON.parse(fs.readFileSync(path.join(root, '.claude/settings.json'), 'utf8'));
  assert.match(settings.hooks.PreToolUse[0].hooks[0].command, /--pre/);
  assert.match(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), /UI 작업 규약/);
  // 설치된 훅이 실제로 차단하는지
  const lint = spawnSync(process.execPath, [path.join(root, '.claude/hooks/design-lint.mjs'), '--pre'], {
    cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: 'src/X.tsx', content: '<div style={{background:"linear-gradient(red,blue)"}} />' } }), encoding: 'utf8',
  });
  assert.equal(lint.status, 2, lint.stdout);
  // --update: DESIGN.md 보존
  fs.writeFileSync(path.join(root, 'DESIGN.md'), '---\ncustom: 1\n---\nMY EDITS');
  const up = spawnSync(process.execPath, [path.join(here, 'install.mjs'), '--target', root, '--update'], { encoding: 'utf8' });
  assert.equal(up.status, 0, up.stderr);
  assert.match(fs.readFileSync(path.join(root, 'DESIGN.md'), 'utf8'), /MY EDITS/);
  fs.rmSync(root, { recursive: true, force: true });
});

console.log(failed ? `${failed} failed, ${n} passed` : `ok — ${n} tests`);
process.exit(failed ? 1 : 0);
