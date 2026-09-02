#!/usr/bin/env node
/**
 * tokens-contrast.mjs · ui-skill-set 0.1 · MIT
 *
 * tokens.css의 시맨틱 색 쌍(버튼·본문·배지·포커스·placeholder)이 라이트·다크 양쪽에서
 * WCAG를 넘는지 브라우저 없이 정적으로 검사한다. 런타임 감사(design-audit)가 못 보는
 * 조합(빈 placeholder 등)까지 커버한다. 브랜드 색을 바꾼 뒤 이걸 돌려 대비 회귀를 잡는다.
 *
 *   node tokens-contrast.mjs [--tokens src/styles/tokens.css]
 *
 * design-audit.mjs 의 대비 수학을 재사용한다(같은 폴더에 둔다). 위반 시 exit 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio, composite } from './design-audit.mjs';

// fg, bg, 최소 대비, 설명. fg-neutral-subtle 은 의도적 ~3:1(큰 글자·힌트)이라 제외.
export const PAIRS = [
  ['--ui-color-fg-on-brand', '--ui-color-bg-brand-solid', 4.5, 'primary 버튼 텍스트'],
  ['--ui-color-fg-on-solid', '--ui-color-bg-neutral-solid', 4.5, 'neutral solid 텍스트'],
  ['--ui-color-fg-neutral', '--ui-color-bg-layer-default', 4.5, '본문'],
  ['--ui-color-fg-neutral-muted', '--ui-color-bg-layer-default', 4.5, '보조 텍스트'],
  ['--ui-color-fg-neutral', '--ui-color-bg-basement', 4.5, '본문 on basement'],
  ['--ui-color-fg-neutral-muted', '--ui-color-bg-basement', 4.5, '보조 on basement'],
  ['--ui-color-fg-brand', '--ui-color-bg-layer-default', 4.5, '브랜드 텍스트'],
  ['--ui-color-fg-critical', '--ui-color-bg-layer-default', 4.5, 'critical 텍스트'],
  ['--ui-color-fg-positive', '--ui-color-bg-positive-weak', 4.5, 'positive 배지'],
  ['--ui-color-fg-informative', '--ui-color-bg-informative-weak', 4.5, 'informative 배지'],
  ['--ui-color-fg-critical', '--ui-color-bg-critical-weak', 4.5, 'critical 배지'],
  ['--ui-color-fg-brand', '--ui-color-bg-brand-weak', 4.5, '브랜드 배지(추천)'],
  ['--ui-color-stroke-focus', '--ui-color-bg-layer-default', 3.0, '포커스 링'],
  ['--ui-color-fg-placeholder', '--ui-color-bg-layer-default', 3.0, 'placeholder(라벨 필수 힌트, 3:1)'],
];

function blockBody(css, sel) {
  const m = css.match(sel);
  if (!m) return null;
  const open = css.indexOf('{', m.index);
  let d = 0, j = open;
  for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}') { d--; if (d === 0) { j++; break; } } }
  return css.slice(open + 1, j - 1);
}
function vars(body) {
  const o = {};
  if (body) for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) o[m[1]] = m[2].trim();
  return o;
}
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
}
function rgbFunc(v) {
  const m = v.match(/rgb\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i);
  return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
}

/** @returns {{results: Array, failures: Array}} */
export function checkTokensContrast(css) {
  const LIGHT = vars(blockBody(css, /:root\s*\{/));
  const DARK = vars(blockBody(css, /:root\[data-theme="dark"\]\s*\{/) || '');
  const resolve = (mode, token, seen = new Set()) => {
    if (seen.has(token)) throw new Error(`순환 참조: ${token}`);
    seen.add(token);
    const map = mode === 'dark' ? { ...LIGHT, ...DARK } : LIGHT;
    const v = map[token];
    if (v == null) throw new Error(`${mode} 토큰 없음: ${token}`);
    const ref = v.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (ref) return resolve(mode, ref[1], seen);
    if (v.startsWith('#')) return hexToRgb(v);
    const rf = rgbFunc(v);
    if (rf) return rf;
    throw new Error(`${mode} ${token} 해석 불가: ${v}`);
  };
  const results = [];
  for (const mode of ['light', 'dark']) {
    if (mode === 'dark' && Object.keys(DARK).length === 0) continue;
    for (const [fg, bg, min, desc] of PAIRS) {
      let ratio, err;
      try { const bgc = resolve(mode, bg); ratio = contrastRatio(composite(resolve(mode, fg), bgc), bgc); }
      catch (e) { err = e.message; }
      const pass = err ? false : ratio + 0.01 >= min;
      results.push({ mode, desc, fg, bg, min, ratio, err, pass });
    }
  }
  return { results, failures: results.filter((r) => !r.pass) };
}

function main() {
  const args = process.argv.slice(2);
  const ti = args.indexOf('--tokens');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const tokensPath = ti >= 0 ? args[ti + 1] : path.join(here, 'tokens.css');
  if (!fs.existsSync(tokensPath)) { process.stderr.write(`tokens.css 없음: ${tokensPath} (--tokens 로 지정)\n`); process.exit(2); }
  const { results, failures } = checkTokensContrast(fs.readFileSync(tokensPath, 'utf8'));
  if (!failures.length) { process.stdout.write(`[ui-contrast] ${results.length}쌍(light+dark) 전부 WCAG 통과. ${tokensPath}\n`); process.exit(0); }
  process.stdout.write(`[ui-contrast] 대비 미달 ${failures.length}건 — ${tokensPath}\n`);
  for (const f of failures) process.stdout.write(`  ✗ ${f.mode} ${f.desc}: ${f.err ? f.err : `${f.ratio.toFixed(2)}:1 < ${f.min}`} (${f.fg} on ${f.bg})\n`);
  process.stdout.write('브랜드 색을 바꿨다면 해당 램프를 대비가 나오는 단계로 조정하세요(예: solid는 한 단계 어둡게).\n');
  process.exit(1);
}

const self = (() => { try { return path.resolve(fileURLToPath(import.meta.url)).toLowerCase(); } catch { return ''; } })();
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === self) main();
