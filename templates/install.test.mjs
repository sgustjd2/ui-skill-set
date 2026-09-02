// install.test.mjs — 병합/채우기 순수 함수 + 전체 설치 스모크. node templates/install.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mergeSettings, fillFrontmatter, appendSnippet } from './install.mjs';

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

// ── 통합: 실제 설치 → 훅이 동작하는지
t('integration: full install then lint blocks', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-install-'));
  const r = spawnSync(process.execPath, [path.join(here, 'install.mjs'), '--target', root, '--hue', 'blue', '--stack', 'react-tailwind4'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(root, 'DESIGN.md')));
  assert.ok(fs.existsSync(path.join(root, 'src/styles/tokens.css')));
  assert.ok(fs.existsSync(path.join(root, '.claude/hooks/design-lint.mjs')));
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
