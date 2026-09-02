// tokens-contrast.test.mjs — 정적 토큰 대비 검사(CLI 모듈). node templates/tokens-contrast.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkTokensContrast, PAIRS } from './tokens-contrast.mjs';

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error(`✗ ${name}\n   ${e.message}`); } };
const here = path.dirname(fileURLToPath(import.meta.url));

// ── 템플릿 기본 팔레트는 라이트·다크 전부 통과해야 한다
t('template tokens.css passes all pairs (light+dark)', () => {
  const { results, failures } = checkTokensContrast(fs.readFileSync(path.join(here, 'tokens.css'), 'utf8'));
  assert.equal(results.length, PAIRS.length * 2, '라이트+다크 각 쌍');
  assert.deepEqual(failures.map((f) => `${f.mode} ${f.desc}`), [], failures.map((f) => `${f.mode} ${f.desc}: ${f.ratio?.toFixed(2)}<${f.min}`).join('; '));
});

// ── 깨진 팔레트(흰 글자 on 밝은 배경)는 잡아야 한다
t('detects low contrast (white on light)', () => {
  const bad = `:root {
    --ui-color-fg-on-brand: #ffffff;
    --ui-color-bg-brand-solid: #cfe4ff;
    --ui-color-fg-on-solid: #000000; --ui-color-bg-neutral-solid: #111111;
    --ui-color-fg-neutral: #111111; --ui-color-bg-layer-default: #ffffff; --ui-color-bg-basement: #f0f0f0;
    --ui-color-fg-neutral-muted: #444444; --ui-color-fg-brand: #0b4596; --ui-color-fg-critical: #a01008;
    --ui-color-fg-positive: #006644; --ui-color-bg-positive-weak: #e8f7f0;
    --ui-color-fg-informative: #0a4595; --ui-color-bg-informative-weak: #e8f0fc;
    --ui-color-bg-critical-weak: #fdeceb; --ui-color-bg-brand-weak: #e8f0ff;
    --ui-color-stroke-focus: #135fcd; --ui-color-fg-placeholder: #868b94;
  }`;
  const { failures } = checkTokensContrast(bad);
  assert.ok(failures.some((f) => f.fg === '--ui-color-fg-on-brand' && f.bg === '--ui-color-bg-brand-solid'), 'primary 버튼 대비 미달 감지');
});

// ── 다크 블록 없으면 light만 검사
t('light-only when no dark block', () => {
  const lightOnly = `:root {
    --ui-color-fg-on-brand: #ffffff; --ui-color-bg-brand-solid: #135fcd;
    --ui-color-fg-on-solid: #ffffff; --ui-color-bg-neutral-solid: #1a1c20;
    --ui-color-fg-neutral: #1a1c20; --ui-color-bg-layer-default: #ffffff; --ui-color-bg-basement: #f3f4f5;
    --ui-color-fg-neutral-muted: #555d6d; --ui-color-fg-brand: #135fcd; --ui-color-fg-critical: #ca1d13;
    --ui-color-fg-positive: #00745f; --ui-color-bg-positive-weak: #edfaf6;
    --ui-color-fg-informative: #135fcd; --ui-color-bg-informative-weak: #eff6ff;
    --ui-color-bg-critical-weak: #fdf0f0; --ui-color-bg-brand-weak: #eff6ff;
    --ui-color-stroke-focus: #217cf9; --ui-color-fg-placeholder: #868b94;
  }`;
  const { results } = checkTokensContrast(lightOnly);
  assert.equal(results.length, PAIRS.length); // light only
  assert.ok(results.every((r) => r.mode === 'light'));
});

// ── CLI: --tokens 로 대상 지정, 위반 시 exit 1
t('CLI runs against --tokens path (template passes, exit 0)', () => {
  const r = spawnSync(process.execPath, [path.join(here, 'tokens-contrast.mjs'), '--tokens', path.join(here, 'tokens.css')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /전부 WCAG 통과/);
});

console.log(failed ? `${failed} failed, ${n} passed` : `ok — ${n} tests`);
process.exit(failed ? 1 : 0);
