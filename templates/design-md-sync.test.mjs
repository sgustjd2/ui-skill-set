// design-md-sync.test.mjs — design.md 호환 토큰 생성·교체·드리프트. node templates/design-md-sync.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { designMdTokens, syncDesignMd, MARK } from './design-md-sync.mjs';
import { parseFrontmatter } from './design-lint.mjs';

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error(`✗ ${name}\n   ${e.message}`); } };
const here = path.dirname(fileURLToPath(import.meta.url));
const CSS = fs.readFileSync(path.join(here, 'tokens.css'), 'utf8');
const TEMPLATE = fs.readFileSync(path.join(here, 'DESIGN.md'), 'utf8');

t('template DESIGN.md is in sync with template tokens.css (drift guard)', () => {
  assert.equal(syncDesignMd(TEMPLATE, CSS), TEMPLATE, 'tokens.css를 바꿨으면: node templates/design-md-sync.mjs --design templates/DESIGN.md --tokens templates/tokens.css');
});
t('tokens: primary = brand solid, body-md = t5, rounded/spacing from scale', () => {
  const y = designMdTokens(CSS).join('\n');
  assert.match(y, /^ {2}primary: "#135fcd"$/m);
  assert.match(y, / {2}body-md:\n {4}fontFamily: "Pretendard Variable"\n {4}fontSize: 16px\n {4}fontWeight: 400\n {4}lineHeight: 24px/);
  assert.match(y, /^ {2}control: 8px$/m);
  assert.match(y, /^ {2}md: 16px$/m);
});
t('sync is idempotent and keeps our flat keys readable by design-lint', () => {
  const once = syncDesignMd(TEMPLATE, CSS);
  assert.equal(syncDesignMd(once, CSS), once);
  const cfg = parseFrontmatter(once);
  assert.equal(cfg.gradient_policy, 'none');
  assert.equal(cfg.copy_register, 'haeyo');
  assert.equal(cfg.version, 'alpha');
});
t('old DESIGN.md (no marker, no name) gets version + name + tokens appended once', () => {
  const old = '---\nui_skill_set: 0.1\nproject: shop\ntoken_prefix: ui\n---\n\n# DESIGN.md\n\n## 1. 제품과 모드\n';
  const out = syncDesignMd(old, CSS, { name: 'shop' });
  assert.equal((out.match(new RegExp(MARK.slice(0, 20), 'g')) || []).length, 1);
  assert.match(out, /^name: shop$/m);
  assert.match(out, /^version: alpha$/m);
  assert.ok(out.endsWith('## 1. 제품과 모드\n'), '본문 보존');
  const named = syncDesignMd('---\nname: keep\n---\n', CSS, { name: 'other' });
  assert.equal((named.match(/^name:/gm) || []).length, 1, 'name 중복 없음');
});
t('brand change flows into colors.primary', () => {
  const css = CSS.replace('--ui-color-bg-brand-solid: var(--ui-accent-700);', '--ui-color-bg-brand-solid: #0a7d5a;');
  assert.match(designMdTokens(css).join('\n'), /primary: "#0a7d5a"/);
});
t('custom token_prefix is honoured', () => {
  const css = CSS.replace(/--ui-/g, '--acme-');
  assert.match(designMdTokens(css, { token_prefix: 'acme', font_families: ['Pretendard'] }).join('\n'), /primary: "#135fcd"/);
});
t('missing token → clear error naming it', () => assert.throws(() => designMdTokens(':root { --ui-color-bg-brand-solid: #000; }'), /토큰 없음: --ui-color-fg-on-brand|tokens\.css에 --ui-/));
t('CLI: --check fails when stale, passes after sync', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'design-md-'));
  fs.mkdirSync(path.join(root, 'src/styles'), { recursive: true });
  fs.writeFileSync(path.join(root, 'DESIGN.md'), TEMPLATE);
  fs.writeFileSync(path.join(root, 'src/styles/tokens.css'), CSS.replace('--ui-accent-700: #135fcd;', '--ui-accent-700: #0b5bd3;'));
  const run = (...a) => spawnSync(process.execPath, [path.join(here, 'design-md-sync.mjs'), ...a], { env: { ...process.env, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8' });
  assert.equal(run('--check').status, 1, '브랜드 바꾸고 안 돌렸으면 실패');
  assert.equal(run().status, 0);
  assert.match(fs.readFileSync(path.join(root, 'DESIGN.md'), 'utf8'), /primary: "#0b5bd3"/);
  assert.equal(run('--check').status, 0);
  fs.rmSync(root, { recursive: true, force: true });
});

console.log(failed ? `${failed} failed, ${n} passed` : `ok — ${n} tests`);
process.exit(failed ? 1 : 0);
