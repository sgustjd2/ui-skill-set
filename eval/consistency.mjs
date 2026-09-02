#!/usr/bin/env node
/**
 * consistency.mjs · ui-skill-set 0.1 · MIT
 *
 * 골든 프롬프트를 여러 번 돌린 결과의 "일관성"을 측정한다.
 * 같은 프롬프트를 3세션 돌리면 팔레트·폰트·라디우스 사용 토큰 집합이 같아야 한다(PRD G4).
 *
 *   node eval/consistency.mjs <runsDir> [--prefix ui] [--roles]
 *
 * <runsDir> 아래에 실행당 하위 폴더 하나(run1/, run2/, …)를 두고 각 폴더에 그 실행의
 * 생성 파일을 저장한다. 하위 폴더가 없으면 <runsDir> 자체를 단일 실행으로 본다.
 *
 * 기본: 실행별 토큰 수·위반 수, 실행 간 공유 토큰 비율(전역 Jaccard), 판정.
 *   판정 PASS = 하드 위반 0 && Jaccard ≥ THRESHOLD.
 * --roles: 토큰을 카테고리(표면/텍스트/브랜드/라디우스/…)로 나눠 **카테고리별** 일치를 잰다.
 *   한 실행에 없는 카테고리(예: 테이블엔 1차 버튼 없음)는 점수에서 빠지므로, 전역 Jaccard가
 *   기능 차이로 낮아지는 문제를 피하고 "코어 카테고리를 같은 토큰으로 그렸는가"만 본다.
 *   판정 PASS = 하드 위반 0 && 코어 카테고리 평균 일치 ≥ ROLE_THRESHOLD.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isUiFile, lint, extractTokens } from '../templates/design-lint.mjs';

const THRESHOLD = 0.6;
const ROLE_THRESHOLD = 0.8;
const SKIP = /(^|\/)(node_modules|dist|build|\.git|\.claude|__generated__)(\/|$)/i;

// 클래스 토큰을 역할 카테고리로 분류. core=true 는 좁은 단일 역할(그 요소가 있으면 항상
// 같은 토큰이어야 하는 것). 넓은 역할·기능 역할은 non-core 로 두어 기능 변주가 코어를
// 깎지 않게 한다. 코어 일치가 100%면 "스타일 결정은 같다"(기능이 달라도).
const CATEGORIES = [
  { name: '화면 배경', core: true, re: /^bg-basement/ },
  { name: '콘텐츠 표면', core: true, re: /^bg-layer-/ },
  { name: '1차 버튼 배경', core: true, re: /^bg-brand-solid/ },
  { name: '온-솔리드 텍스트', core: true, re: /^text-fg-on-/ },
  { name: '뉴트럴 텍스트', core: true, re: /^text-fg-neutral/ },
  { name: '컨트롤 라디우스', core: true, re: /^rounded-control/ },
  { name: '브랜드-약(배지/보조)', core: false, re: /^bg-brand-weak/ },
  { name: '뉴트럴 배경', core: false, re: /^bg-neutral-/ },
  { name: '상태 배경', core: false, re: /^bg-(critical|positive|informative)/ },
  { name: '상태 텍스트', core: false, re: /^text-fg-(critical|positive|informative)/ },
  { name: '브랜드 텍스트', core: false, re: /^text-fg-brand/ },
  { name: '스트로크', core: false, re: /^(border|ring|divide)-stroke-/ },
  { name: '카드/시트 라디우스', core: false, re: /^rounded-(card|sheet|full)/ },
  { name: '그림자', core: false, re: /^shadow-/ },
  { name: '타이포 스케일', core: false, re: /^text-\d/ },
];

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
  const all = runDirs.map((d) => analyzeRun(d, prefix));
  // UI 파일이 0개인 폴더는 실행이 아니다(빈 폴더가 합집합·Jaccard를 오염시키지 않게).
  const nonEmpty = all.filter((r) => r.files > 0);
  const runs = nonEmpty.length ? nonEmpty : all;

  const union = new Set();
  for (const r of runs) for (const t of r.tokens) union.add(t);
  let shared = [...union];
  for (const r of runs) shared = shared.filter((t) => r.tokens.has(t));
  const jaccard = union.size ? shared.length / union.size : 1;
  const totalViolations = runs.reduce((s, r) => s + r.violations, 0);
  const pass = totalViolations === 0 && (runs.length < 2 || jaccard >= THRESHOLD);

  return { runs, shared, union: [...union], jaccard, totalViolations, pass, multi: runs.length >= 2 };
}

// 카테고리별 일치: 클래스 토큰만(var는 제외) 분류해 카테고리마다 실행 간 Jaccard.
// 한 실행에 없는 카테고리는 그 실행을 세지 않는다 → 기능 차이가 코어 점수를 깎지 않음.
export function analyzeRoles(runsDir, { prefix = 'ui' } = {}) {
  const base = analyzeRuns(runsDir, { prefix });
  const runs = base.runs;
  const cats = CATEGORIES.map((c) => {
    const perRun = runs.map((r) => new Set([...r.tokens].filter((t) => !t.startsWith('--') && c.re.test(t))));
    const present = perRun.filter((s) => s.size > 0);
    if (!present.length) return { name: c.name, core: c.core, present: 0, tokens: [], jaccard: null };
    const uni = new Set(); for (const s of present) for (const t of s) uni.add(t);
    let inter = [...uni]; for (const s of present) inter = inter.filter((t) => s.has(t));
    return { name: c.name, core: c.core, present: present.length, tokens: [...uni].sort(), jaccard: uni.size ? inter.length / uni.size : 1 };
  });
  const coreCats = cats.filter((c) => c.core && c.present >= 2);
  const coreAgreement = coreCats.length ? coreCats.reduce((s, c) => s + c.jaccard, 0) / coreCats.length : 1;
  const pass = base.totalViolations === 0 && (!base.multi || coreAgreement >= ROLE_THRESHOLD);
  return { runs, cats, coreCats, coreAgreement, totalViolations: base.totalViolations, multi: base.multi, pass };
}

function roleReport(res) {
  const pct = (j) => (j == null ? '—' : `${Math.round(j * 1000) / 10}%`);
  const L = ['카테고리          코어 실행  일치    토큰'];
  for (const c of res.cats) {
    if (!c.present) continue;
    L.push(`${c.name.padEnd(15)} ${(c.core ? 'Y' : '·')}   ${String(c.present).padStart(2)}   ${pct(c.jaccard).padStart(6)}  ${c.tokens.slice(0, 5).join(', ')}${c.tokens.length > 5 ? ' …' : ''}`);
  }
  L.push('');
  if (res.multi) L.push(`코어 카테고리 평균 일치 ${pct(res.coreAgreement)} (${res.coreCats.length}개, 임계 ${ROLE_THRESHOLD * 100}%)`);
  L.push(`판정: ${res.pass ? 'PASS' : 'FAIL'} (하드 위반 ${res.totalViolations}${res.multi ? ` · 코어 일치 ${res.coreAgreement >= ROLE_THRESHOLD ? 'OK' : '부족'}` : ''})`);
  return L.join('\n');
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
    process.stderr.write('사용법: node eval/consistency.mjs <runsDir> [--prefix ui] [--roles]\n');
    process.exit(2);
  }
  if (args.includes('--roles')) {
    const res = analyzeRoles(runsDir, { prefix });
    process.stdout.write(roleReport(res) + '\n');
    process.exit(res.pass ? 0 : 1);
  }
  const res = analyzeRuns(runsDir, { prefix });
  process.stdout.write(report(res) + '\n');
  process.exit(res.pass ? 0 : 1);
}

const self = (() => { try { return path.resolve(fileURLToPath(import.meta.url)).toLowerCase(); } catch { return ''; } })();
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === self) main();
