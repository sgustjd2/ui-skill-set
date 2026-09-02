// tokens-contrast.test.mjs — tokens.css의 시맨틱 색 쌍이 라이트·다크에서 WCAG를 넘는지 정적 검사.
// 런타임 감사(design-audit)가 못 보는 것(빈 placeholder, 화면에 안 뜬 조합)을 커밋 시점에 잡는다.
// node templates/tokens-contrast.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { relLuminance, contrastRatio, composite } from './design-audit.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(here, 'tokens.css'), 'utf8');

// ── 블록 추출 ────────────────────────────────────────────────────────────────
function block(sel) {
  const m = css.match(sel);
  if (!m) throw new Error(`블록 없음: ${sel}`);
  const open = css.indexOf('{', m.index);
  let d = 0, j = open;
  for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}') { d--; if (d === 0) { j++; break; } } }
  return css.slice(open + 1, j - 1);
}
function vars(blockText) {
  const o = {};
  for (const m of blockText.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) o[m[1]] = m[2].trim();
  return o;
}
const LIGHT = vars(block(/:root\s*\{/));
const DARK = vars(block(/:root\[data-theme="dark"\]\s*\{/));

// ── 값 해석: var 체인 → hex/rgb → {r,g,b} ────────────────────────────────────
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
}
function rgbFunc(v) {
  const m = v.match(/rgb\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i);
  return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
}
function resolve(mode, token, seen = new Set()) {
  if (seen.has(token)) throw new Error(`순환 참조: ${token}`);
  seen.add(token);
  const map = mode === 'dark' ? { ...LIGHT, ...DARK } : LIGHT; // 다크는 라이트 위에 오버라이드
  let v = map[token];
  if (v == null) throw new Error(`${mode} 토큰 없음: ${token}`);
  const varRef = v.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (varRef) return resolve(mode, varRef[1], seen);
  if (v.startsWith('#')) return hexToRgb(v);
  const rf = rgbFunc(v);
  if (rf) return rf;
  throw new Error(`${mode} ${token} 해석 불가: ${v}`);
}

// ── 검사할 쌍 (fg, bg, 최소 대비) ────────────────────────────────────────────
// fg-neutral-subtle 은 의도적 ~3:1(큰 글자·힌트 전용)이라 제외.
const PAIRS = [
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
  ['--ui-color-fg-placeholder', '--ui-color-bg-layer-default', 3.0, 'placeholder(비필수 힌트, 3:1)'],
];

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error(`✗ ${name}\n   ${e.message}`); } };

for (const mode of ['light', 'dark']) {
  for (const [fg, bg, min, desc] of PAIRS) {
    t(`${mode} ${desc}`, () => {
      const bgc = resolve(mode, bg);
      const ratio = contrastRatio(composite(resolve(mode, fg), bgc), bgc);
      assert.ok(ratio + 0.01 >= min, `${desc}: 대비 ${ratio.toFixed(2)}:1 < ${min} (${fg} on ${bg})`);
    });
  }
}

// 스케일 참조 무결성: 시맨틱이 가리키는 스케일 토큰이 실제로 존재
t('semantic tokens resolve to a color in both modes', () => {
  for (const token of Object.keys(LIGHT).filter((k) => k.startsWith('--ui-color-'))) {
    for (const mode of ['light', 'dark']) {
      const c = resolve(mode, token);
      assert.ok(c && typeof c.r === 'number', `${mode} ${token}`);
    }
  }
});

console.log(failed ? `${failed} failed, ${n} passed` : `ok — ${n} tests`);
process.exit(failed ? 1 : 0);
