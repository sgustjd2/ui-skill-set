// consistency.test.mjs — analyzeRuns 로직. node eval/consistency.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeRuns } from './consistency.mjs';

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error(`✗ ${name}\n   ${e.message}`); } };

function mkRuns(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-eval-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return root;
}

// 두 실행이 같은 토큰을 쓰고 위반 0 → PASS, Jaccard 1
t('identical runs → PASS jaccard 1', () => {
  const good = '<div className="bg-brand-solid text-fg-neutral rounded-control">저장</div>';
  const root = mkRuns({ 'run1/A.tsx': good, 'run2/A.tsx': good });
  const r = analyzeRuns(root);
  assert.equal(r.multi, true);
  assert.equal(r.totalViolations, 0);
  assert.equal(r.jaccard, 1);
  assert.equal(r.pass, true);
  fs.rmSync(root, { recursive: true, force: true });
});

// 하드 위반이 있으면 FAIL
t('hard violation → FAIL', () => {
  const root = mkRuns({ 'run1/A.tsx': '<div style={{color:"#ff0000"}} />', 'run2/A.tsx': '<div className="bg-brand-solid" />' });
  const r = analyzeRuns(root);
  assert.ok(r.totalViolations >= 1);
  assert.equal(r.pass, false);
  fs.rmSync(root, { recursive: true, force: true });
});

// 서로 다른 토큰(발산) → 위반 0이어도 Jaccard 낮으면 FAIL
t('divergent tokens → low jaccard FAIL', () => {
  const root = mkRuns({
    'run1/A.tsx': '<div className="bg-brand-solid text-fg-neutral" />',
    'run2/A.tsx': '<div className="bg-critical-solid text-fg-placeholder border-stroke-brand" />',
  });
  const r = analyzeRuns(root);
  assert.equal(r.totalViolations, 0);
  assert.ok(r.jaccard < 0.6, `jaccard=${r.jaccard}`);
  assert.equal(r.pass, false);
  fs.rmSync(root, { recursive: true, force: true });
});

// 단일 실행(하위 폴더 없음) → 위반만 판정
t('single run, no subdirs', () => {
  const root = mkRuns({ 'A.tsx': '<div className="bg-brand-solid text-fg-neutral" />' });
  const r = analyzeRuns(root);
  assert.equal(r.multi, false);
  assert.equal(r.runs.length, 1);
  assert.equal(r.pass, true);
  fs.rmSync(root, { recursive: true, force: true });
});

// var(--ui-*) 토큰도 집계
t('css var tokens counted', () => {
  const root = mkRuns({ 'run1/a.css': '.x{color:var(--ui-color-fg-neutral)}', 'run2/a.css': '.x{color:var(--ui-color-fg-neutral)}' });
  const r = analyzeRuns(root);
  assert.ok(r.shared.includes('--ui-color-fg-neutral'));
  assert.equal(r.pass, true);
  fs.rmSync(root, { recursive: true, force: true });
});

console.log(failed ? `${failed} failed, ${n} passed` : `ok — ${n} tests`);
process.exit(failed ? 1 : 0);
