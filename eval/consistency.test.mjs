// consistency.test.mjs — analyzeRuns 로직. node eval/consistency.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeRuns, analyzeRoles } from './consistency.mjs';

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

// UI 파일 0개인 하위 폴더(예: styles/)는 실행에서 제외 → 소스 트리를 가리켜도 오작동 안 함
t('empty subdir ignored (source tree, not runs)', () => {
  const root = mkRuns({
    'components/A.tsx': '<div className="bg-brand-solid text-fg-neutral" />',
    'styles/tokens.css': ':root{--ui-x:1}', // isUiFile이 tokens.css를 건너뜀 → 0 UI 파일
  });
  const r = analyzeRuns(root);
  assert.equal(r.runs.length, 1);       // components 만 실행으로
  assert.equal(r.multi, false);
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

// ── analyzeRoles (--roles 모드): 카테고리별 일치, 기능 카테고리는 코어 점수에서 제외
const core = (res, name) => res.coreCats.find((c) => c.name === name);
const cat = (res, name) => res.cats.find((c) => c.name === name);

t('roles: 같은 토큰 → 코어 100% PASS', () => {
  const s = '<div className="bg-basement bg-layer-default bg-brand-solid text-fg-on-brand text-fg-neutral rounded-control" />';
  const root = mkRuns({ 'run1/A.tsx': s, 'run2/A.tsx': s });
  const r = analyzeRoles(root);
  assert.equal(r.coreAgreement, 1);
  assert.equal(r.pass, true);
  fs.rmSync(root, { recursive: true, force: true });
});

t('roles: 기능 카테고리(상태) 차이는 코어를 안 깎는다', () => {
  // run1 은 위험 구역(critical) 추가, run2 는 없음. 코어(배경/버튼/텍스트/라디우스)는 동일.
  const commonCore = 'bg-basement bg-layer-default bg-brand-solid text-fg-on-brand text-fg-neutral rounded-control';
  const root = mkRuns({
    'run1/A.tsx': `<div className="${commonCore} bg-critical-weak text-fg-critical" />`,
    'run2/A.tsx': `<div className="${commonCore}" />`,
  });
  const r = analyzeRoles(root);
  assert.equal(r.coreAgreement, 1, '코어는 100%여야');
  assert.equal(r.pass, true);
  // 상태 텍스트/배경은 run1 에만 → present 1 → 코어에 안 들어감
  assert.equal(cat(r, '상태 텍스트').present, 1);
  fs.rmSync(root, { recursive: true, force: true });
});

t('roles: 코어 역할에 다른 토큰 → 일치 하락', () => {
  // 표면을 run1 은 layer-default, run2 는 layer-elevated 로 → 콘텐츠 표면 카테고리 갈림
  const root = mkRuns({
    'run1/A.tsx': '<div className="bg-basement bg-layer-default text-fg-neutral rounded-control" />',
    'run2/A.tsx': '<div className="bg-basement bg-layer-elevated text-fg-neutral rounded-control" />',
  });
  const r = analyzeRoles(root);
  assert.equal(core(r, '콘텐츠 표면').jaccard, 0, '표면 토큰이 완전히 달라 0');
  assert.ok(r.coreAgreement < 1);
  fs.rmSync(root, { recursive: true, force: true });
});

t('roles: 전역 Jaccard 는 낮아도 코어는 통과할 수 있다 (기능만 다를 때)', () => {
  const root = mkRuns({
    'run1/A.tsx': '<div className="bg-basement bg-layer-default bg-brand-solid text-fg-on-brand text-fg-neutral rounded-control shadow-1 text-fg-critical border-stroke-critical" />',
    'run2/A.tsx': '<div className="bg-basement bg-layer-default bg-brand-solid text-fg-on-brand text-fg-neutral rounded-control" />',
  });
  const global = analyzeRuns(root);
  const roles = analyzeRoles(root);
  assert.ok(global.jaccard < 0.8, `전역 Jaccard 낮음: ${global.jaccard}`);
  assert.equal(roles.coreAgreement, 1, '코어는 100%');
  assert.equal(roles.pass, true);
  fs.rmSync(root, { recursive: true, force: true });
});

t('roles: 단일 실행 → PASS (multi 아님)', () => {
  const root = mkRuns({ 'A.tsx': '<div className="bg-basement bg-brand-solid" />' });
  const r = analyzeRoles(root);
  assert.equal(r.multi, false);
  assert.equal(r.pass, true);
  fs.rmSync(root, { recursive: true, force: true });
});

console.log(failed ? `${failed} failed, ${n} passed` : `ok — ${n} tests`);
process.exit(failed ? 1 : 0);
