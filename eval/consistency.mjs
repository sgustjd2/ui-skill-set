#!/usr/bin/env node
/**
 * consistency.mjs · ui-skill-set 0.1 · MIT
 *
 * 골든 프롬프트를 여러 번 돌린 결과의 "일관성"을 측정한다.
 * 같은 프롬프트를 3세션 돌리면 팔레트·폰트·라디우스 사용 토큰 집합이 같아야 한다(PRD G4).
 *
 *   node eval/consistency.mjs <runsDir> [--prefix ui]
 *
 * <runsDir> 아래에 실행당 하위 폴더 하나(run1/, run2/, …)를 두고 각 폴더에 그 실행의
 * 생성 파일을 저장한다. 하위 폴더가 없으면 <runsDir> 자체를 단일 실행으로 본다.
 *
 * 출력: 실행별 토큰 수·위반 수, 실행 간 공유 토큰 비율(Jaccard), 판정.
 * 판정 PASS = 하드 위반 0 && Jaccard ≥ THRESHOLD.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isUiFile, lint, extractTokens } from '../templates/design-lint.mjs';

const THRESHOLD = 0.6;
const SKIP = /(^|\/)(node_modules|dist|build|\.git|\.claude|__generated__)(\/|$)/i;

function walk(dir, root = dir, acc = []) {
  let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (SKIP.test(rel + (e.isDirectory() ? '/' : ''))) continue;
    if (e.isDirectory()) walk(abs, root, acc); else acc.push(abs);
  }
  return acc;
}

function analyzeRun(dir, prefix) {
  const tokens = new Set();
  let violations = 0, files = 0;
  for (const abs of walk(dir)) {
    let c; try { c = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    const rel = path.relative(dir, abs).replace(/\\/g, '/');
    if (!isUiFile(rel, c)) continue;
    files++;
    for (const tok of extractTokens(c, prefix)) tokens.add(tok);
    violations += lint(c, rel, { token_prefix: prefix }, { soft: false }).filter((f) => f.tier === 'hard' && f.severity === 'block').length;
  }
  return { name: path.basename(dir), files, tokens, violations };
}

export function analyzeRuns(runsDir, { prefix = 'ui' } = {}) {
  const subdirs = fs.readdirSync(runsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !SKIP.test(e.name + '/'))
    .map((e) => path.join(runsDir, e.name));
  const runDirs = subdirs.length ? subdirs : [runsDir];
  const runs = runDirs.map((d) => analyzeRun(d, prefix));

  const union = new Set();
  for (const r of runs) for (const t of r.tokens) union.add(t);
  let shared = [...union];
  for (const r of runs) shared = shared.filter((t) => r.tokens.has(t));
  const jaccard = union.size ? shared.length / union.size : 1;
  const totalViolations = runs.reduce((s, r) => s + r.violations, 0);
  const pass = totalViolations === 0 && (runs.length < 2 || jaccard >= THRESHOLD);

  return { runs, shared, union: [...union], jaccard, totalViolations, pass, multi: runs.length >= 2 };
}

function report(res) {
  const L = [];
  L.push('실행       파일  토큰  하드위반');
  for (const r of res.runs) L.push(`${r.name.padEnd(10)} ${String(r.files).padStart(3)}  ${String(r.tokens.size).padStart(4)}  ${String(r.violations).padStart(6)}`);
  if (res.multi) {
    L.push('');
    L.push(`공유 토큰 ${res.shared.length} / 합집합 ${res.union.length} · 일관성(Jaccard) ${Math.round(res.jaccard * 1000) / 10}% (임계 ${THRESHOLD * 100}%)`);
    // 어느 실행에만 있는 토큰(발산의 원인)
    for (const r of res.runs) {
      const only = [...r.tokens].filter((t) => !res.shared.includes(t));
      if (only.length) L.push(`  ${r.name} 고유: ${only.slice(0, 12).join(', ')}${only.length > 12 ? ` …외 ${only.length - 12}` : ''}`);
    }
  }
  L.push('');
  L.push(`판정: ${res.pass ? 'PASS' : 'FAIL'} (하드 위반 ${res.totalViolations}${res.multi ? ` · 일관성 ${res.jaccard >= THRESHOLD ? 'OK' : '부족'}` : ''})`);
  return L.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const runsDir = args.find((a) => !a.startsWith('--'));
  const pi = args.indexOf('--prefix');
  const prefix = pi >= 0 ? args[pi + 1] : 'ui';
  if (!runsDir || !fs.existsSync(runsDir)) {
    process.stderr.write('사용법: node eval/consistency.mjs <runsDir> [--prefix ui]\n');
    process.exit(2);
  }
  const res = analyzeRuns(runsDir, { prefix });
  process.stdout.write(report(res) + '\n');
  process.exit(res.pass ? 0 : 1);
}

const self = (() => { try { return path.resolve(fileURLToPath(import.meta.url)).toLowerCase(); } catch { return ''; } })();
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === self) main();
