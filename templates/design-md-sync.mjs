#!/usr/bin/env node
/**
 * design-md-sync.mjs · ui-skill-set · MIT
 *
 * DESIGN.md frontmatter에 design.md 포맷(google-labs-code/design.md, Stitch) 호환 토큰
 * (colors · typography · rounded · spacing)을 tokens.css에서 생성해 넣는다. 다른 도구·에이전트가
 * 같은 계약을 읽게 하려는 것이고, 원본은 여전히 tokens.css다. 브랜드 색을 바꾼 뒤 다시 돌린다.
 *
 *   node design-md-sync.mjs [--design DESIGN.md] [--tokens <path>] [--check]
 *   --check : 생성값이 DESIGN.md와 다르면 exit 1 (CI에서 tokens.css와 어긋남 방지)
 *
 * 라이트 모드 값만 싣는다(design.md 포맷에 모드 개념이 없다). tokens-contrast.mjs 의 해석기를 재사용한다(같은 폴더).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenResolver } from './tokens-contrast.mjs';
import { parseFrontmatter, DEFAULTS } from './design-lint.mjs';

export const MARK = '# ── design.md 호환 토큰: design-md-sync가 tokens.css에서 생성(라이트 모드). 손으로 고치지 않는다. 컴포넌트는 hex가 아니라 토큰을 쓴다 ──';

// design.md 권장 이름 → 우리 시맨틱 토큰 (--ui- 는 token_prefix로 바뀜)
const COLORS = [
  ['primary', 'color-bg-brand-solid'], ['on-primary', 'color-fg-on-brand'],
  ['surface', 'color-bg-layer-default'], ['on-surface', 'color-fg-neutral'], ['on-surface-variant', 'color-fg-neutral-muted'],
  ['neutral', 'color-bg-basement'], ['outline', 'color-stroke-neutral'],
  ['error', 'color-fg-critical'], ['success', 'color-fg-positive'], ['info', 'color-fg-informative'],
];
// 이름, t-스텝, 굵기 (DESIGN.md Typography: 본문 t5 · 보조 t4 · 캡션 t3 · 제목 t7~t10 · 굵기 400/500/700)
const TYPE = [
  ['display', 12, 700], ['headline-lg', 10, 700], ['headline-md', 8, 700], ['title', 7, 700],
  ['body-lg', 6, 400], ['body-md', 5, 400], ['body-sm', 4, 400], ['label-md', 4, 500], ['caption', 3, 400],
];
const ROUNDED = [['control', 'radius-control'], ['card', 'radius-card'], ['sheet', 'radius-sheet'], ['full', 'radius-full']];
const SPACING = [['xs', 'space-1'], ['sm', 'space-2'], ['md', 'space-4'], ['lg', 'space-6'], ['xl', 'space-8']];

const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0');
const toHex = ({ r, g, b, a = 1 }) => `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 1 ? hex2(a * 255) : ''}`;
const toPx = (v) => { const m = String(v).match(/^([\d.]+)rem$/); return m ? `${+m[1] * 16}px` : String(v); };

/** tokens.css → design.md 토큰 YAML 줄들 */
export function designMdTokens(css, cfg = DEFAULTS) {
  const p = `--${cfg.token_prefix ?? 'ui'}-`;
  const { resolve, raw } = tokenResolver(css);
  const need = (name) => { const v = raw(p + name); if (v == null) throw new Error(`tokens.css에 ${p}${name} 없음`); return v; };
  const family = (Array.isArray(cfg.font_families) ? cfg.font_families[0] : String(cfg.font_families).split(',')[0]) || 'sans-serif';
  const L = ['colors:'];
  for (const [k, t] of COLORS) L.push(`  ${k}: "${toHex(resolve('light', p + t))}"`);
  L.push('typography:');
  for (const [k, step, w] of TYPE) {
    L.push(`  ${k}:`, `    fontFamily: "${String(family).trim()}"`, `    fontSize: ${toPx(need(`text-${step}`))}`, `    fontWeight: ${w}`, `    lineHeight: ${toPx(need(`leading-${step}`))}`);
  }
  L.push('rounded:');
  for (const [k, t] of ROUNDED) L.push(`  ${k}: ${toPx(need(t))}`);
  L.push('spacing:');
  for (const [k, t] of SPACING) L.push(`  ${k}: ${toPx(need(t))}`);
  return L;
}

/** DESIGN.md 문자열에 생성 블록을 넣거나 교체한다(MARK 아래 frontmatter 끝까지가 생성 영역) */
export function syncDesignMd(md, css, { name = 'my-app' } = {}) {
  const m = md.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!m) throw new Error('DESIGN.md에 frontmatter(--- … ---)가 없음');
  const cfg = { ...DEFAULTS, ...parseFrontmatter(md) };
  let head = m[2];
  const i = head.indexOf(MARK);
  if (i >= 0) head = head.slice(0, i);
  head = head.replace(/\s+$/, '');
  const has = (k) => new RegExp(`^${k}:`, 'm').test(head);
  const block = [MARK, ...(has('version') ? [] : ['version: alpha']), ...(has('name') ? [] : [`name: ${name}`]), ...designMdTokens(css, cfg)];
  return md.slice(0, m.index) + m[1] + head + '\n' + block.join('\n') + m[3] + md.slice(m.index + m[0].length);
}

function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const designPath = path.resolve(root, opt('--design') || 'DESIGN.md');
  if (!fs.existsSync(designPath)) { process.stderr.write(`DESIGN.md 없음: ${designPath} (--design 으로 지정)\n`); process.exit(2); }
  const md = fs.readFileSync(designPath, 'utf8');
  const cfg = { ...DEFAULTS, ...parseFrontmatter(md) };
  const tokensPath = opt('--tokens') ? path.resolve(root, opt('--tokens')) : path.resolve(path.dirname(designPath), cfg.tokens_path);
  if (!fs.existsSync(tokensPath)) { process.stderr.write(`tokens.css 없음: ${tokensPath} (--tokens 로 지정)\n`); process.exit(2); }
  let out;
  try { out = syncDesignMd(md, fs.readFileSync(tokensPath, 'utf8'), { name: path.basename(path.dirname(designPath)) }); }
  catch (e) { process.stderr.write(`[design-md] ${e.message}\n`); process.exit(2); }
  const rel = path.relative(root, designPath) || 'DESIGN.md';
  if (args.includes('--check')) {
    if (out === md) { process.stdout.write(`[design-md] ${rel}의 design.md 토큰이 tokens.css와 일치합니다.\n`); process.exit(0); }
    process.stdout.write(`[design-md] ${rel}의 design.md 토큰이 tokens.css와 다릅니다. 갱신: node .claude/hooks/design-md-sync.mjs\n`);
    process.exit(1);
  }
  if (out === md) { process.stdout.write(`[design-md] 변경 없음 (${rel})\n`); process.exit(0); }
  fs.writeFileSync(designPath, out);
  process.stdout.write(`[design-md] ✓ ${rel} frontmatter에 design.md 호환 토큰 갱신 (tokens.css → colors·typography·rounded·spacing)\n`);
}

const self = (() => { try { return path.resolve(fileURLToPath(import.meta.url)).toLowerCase(); } catch { return ''; } })();
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === self) main();
