#!/usr/bin/env node
/**
 * install.mjs · ui-skill-set 0.1 · MIT
 *
 * ui-skill-set을 대상 프로젝트에 설치한다. 순수 Node ≥18, 의존성 0.
 *   node install.mjs --target <dir> [--mode operate] [--hue blue] [--stack react-tailwind4]
 *                    [--tokens-path src/styles/tokens.css] [--legacy] [--update] [--force]
 * --legacy : 레거시 프로젝트. tailwind_palette=allow, hardcoded_color=warn 로 시작(점진 전환).
 * --update : design-lint.mjs 와 skills/ui-design 만 갱신. DESIGN.md·tokens.css·settings.json·CLAUDE.md 는 보존.
 * --force  : 이미 있는 DESIGN.md/tokens.css 도 덮어쓴다.
 *
 * 병합/채우기 로직은 export 되어 테스트된다(install.test.mjs). 파일 I/O는 main()에서만.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOKS = [
  { event: 'PreToolUse', matcher: 'Edit|Write|MultiEdit', command: 'node .claude/hooks/design-lint.mjs --pre', timeout: 5 },
  { event: 'Stop', matcher: null, command: 'node .claude/hooks/design-lint.mjs --stop', timeout: 20 },
];
const CLAUDE_MARKER = '## UI 작업 규약 (ui-skill-set)';

// ─── 테스트되는 순수 함수 ─────────────────────────────────────────────────────

/** 기존 settings.json(문자열|null)에 우리 훅 2개를 병합. 같은 command면 건너뜀. */
export function mergeSettings(existingJson) {
  let s = {};
  if (existingJson) { try { s = JSON.parse(existingJson); } catch { s = {}; } }
  s.hooks ??= {};
  for (const h of HOOKS) {
    s.hooks[h.event] ??= [];
    const arr = s.hooks[h.event];
    const already = arr.some((e) => (e.hooks || []).some((x) => x.command === h.command));
    if (already) continue;
    const entry = { hooks: [{ type: 'command', command: h.command, timeout: h.timeout }] };
    if (h.matcher) entry.matcher = h.matcher;
    arr.push(entry);
  }
  return JSON.stringify(s, null, 2) + '\n';
}

/** DESIGN.md frontmatter의 키 값들을 opts로 교체. 없는 키는 그대로. */
export function fillFrontmatter(md, opts = {}) {
  const set = { ...opts };
  if (opts.legacy) { set.tailwind_palette = 'allow'; set.hardcoded_color = 'warn'; }
  delete set.legacy;
  const m = md.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!m) return md;
  let body = m[2];
  for (const [k, v] of Object.entries(set)) {
    if (v == null) continue;
    const re = new RegExp(`^(${k}:\\s*).*$`, 'm');
    if (re.test(body)) body = body.replace(re, `$1${v}`);
  }
  return md.slice(0, m.index) + m[1] + body + m[3] + md.slice(m.index + m[0].length);
}

/** tokens.css에서 @theme 블록(v4 전용)을 제거. v3 프로젝트용. 중괄호 매칭으로 안전하게. */
export function stripThemeBlock(css) {
  const i = css.search(/@theme\b[^{]*\{/);
  if (i < 0) return css;
  const open = css.indexOf('{', i);
  let depth = 0, j = open;
  for (; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') { depth--; if (depth === 0) { j++; break; } }
  }
  // @theme 바로 앞의 단일 주석 블록만 걷어낸다(있으면). 앞쪽 주석까지 삼키지 않도록 /*…*/ 하나만.
  const before = css.slice(0, i).replace(/\/\*(?:(?!\*\/)[^])*\*\/\s*$/, '');
  const start = before.length < i ? before.length : i;
  return (css.slice(0, start) + css.slice(j)).replace(/\n{3,}/g, '\n\n');
}

/** CLAUDE.md에 스니펫을 멱등 추가. 이미 있으면 그대로. */
export function appendSnippet(claudeMd, snippet) {
  if (claudeMd && claudeMd.includes(CLAUDE_MARKER)) return claudeMd;
  const base = claudeMd ? claudeMd.replace(/\s*$/, '') + '\n\n' : '';
  return base + snippet.replace(/\s*$/, '') + '\n';
}

// ─── 파일 I/O ─────────────────────────────────────────────────────────────────

function cpDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) cpDir(s, d); else fs.copyFileSync(s, d);
  }
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    if (['legacy', 'update', 'force'].includes(k)) o[k] = true;
    else { o[k] = argv[++i]; }
  }
  return o;
}

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url)); // templates/
  const srcRoot = path.dirname(here);                        // repo/plugin root
  const a = parseArgs(process.argv.slice(2));
  const target = a.target ? path.resolve(a.target) : process.cwd();
  const tokensPath = a['tokens-path'] || 'src/styles/tokens.css';
  const isV3 = a.stack === 'react-tailwind3' || a.tw3;
  const log = (m) => process.stdout.write(m + '\n');

  const tpl = (p) => path.join(here, p);
  const dst = (p) => path.join(target, p);
  const ensure = (p) => fs.mkdirSync(path.dirname(p), { recursive: true });

  if (!fs.existsSync(tpl('DESIGN.md'))) { process.stderr.write(`템플릿을 찾을 수 없습니다: ${here}\n`); process.exit(1); }

  // 항상 갱신: 훅 스크립트 + 런타임 감사 + 스킬
  ensure(dst('.claude/hooks/design-lint.mjs'));
  fs.copyFileSync(tpl('design-lint.mjs'), dst('.claude/hooks/design-lint.mjs'));
  log('✓ .claude/hooks/design-lint.mjs');
  fs.copyFileSync(tpl('design-audit.mjs'), dst('.claude/hooks/design-audit.mjs'));
  log('✓ .claude/hooks/design-audit.mjs (런타임 감사, playwright 필요)');
  if (fs.existsSync(dst('.claude/skills/ui-design'))) fs.rmSync(dst('.claude/skills/ui-design'), { recursive: true, force: true });
  cpDir(path.join(srcRoot, 'skills', 'ui-design'), dst('.claude/skills/ui-design'));
  log('✓ .claude/skills/ui-design/');

  if (a.update) {
    log('업데이트 완료(--update): 훅과 스킬만 갱신. DESIGN.md·tokens.css·settings.json·CLAUDE.md 는 보존.');
    return;
  }

  // DESIGN.md
  if (fs.existsSync(dst('DESIGN.md')) && !a.force) {
    log('· DESIGN.md 이미 있음 — 건너뜀 (--force 로 덮어쓰기)');
  } else {
    let md = fs.readFileSync(tpl('DESIGN.md'), 'utf8');
    md = fillFrontmatter(md, {
      mode_default: a.mode, stack: a.stack, tokens_path: tokensPath,
      brand_hue: a.hue, legacy: a.legacy,
    });
    fs.writeFileSync(dst('DESIGN.md'), md);
    log('✓ DESIGN.md' + (a.legacy ? ' (legacy: tailwind_palette=allow, hardcoded_color=warn)' : ''));
  }

  // tokens.css (v3면 @theme 블록 제거)
  if (fs.existsSync(dst(tokensPath)) && !a.force) {
    log(`· ${tokensPath} 이미 있음 — 건너뜀`);
  } else {
    ensure(dst(tokensPath));
    let css = fs.readFileSync(tpl('tokens.css'), 'utf8');
    if (isV3) css = stripThemeBlock(css);
    fs.writeFileSync(dst(tokensPath), css);
    log(`✓ ${tokensPath}${isV3 ? ' (v3: @theme 제거)' : ''}`);
  }

  // Tailwind v3 프리셋
  if (isV3) {
    if (fs.existsSync(dst('tailwind.ui-preset.cjs')) && !a.force) log('· tailwind.ui-preset.cjs 이미 있음 — 건너뜀');
    else { fs.copyFileSync(tpl('tailwind.ui-preset.cjs'), dst('tailwind.ui-preset.cjs')); log('✓ tailwind.ui-preset.cjs'); }
  }

  // settings.json 병합
  const sp = dst('.claude/settings.json');
  ensure(sp);
  fs.writeFileSync(sp, mergeSettings(fs.existsSync(sp) ? fs.readFileSync(sp, 'utf8') : null));
  log('✓ .claude/settings.json (병합)');

  // CLAUDE.md
  const cp = dst('CLAUDE.md');
  const snippet = fs.readFileSync(tpl('CLAUDE.snippet.md'), 'utf8');
  const before = fs.existsSync(cp) ? fs.readFileSync(cp, 'utf8') : '';
  const after = appendSnippet(before, snippet);
  if (after !== before) { fs.writeFileSync(cp, after); log('✓ CLAUDE.md (규약 추가)'); }
  else log('· CLAUDE.md 규약 이미 있음');

  log('');
  log('다음 단계:');
  log(`  1. DESIGN.md §1~§2 를 채우고, ${tokensPath} 의 --ui-accent-* 를 브랜드 색으로 교체`);
  if (isV3) {
    log('  2. tailwind.config.js 에 preset 추가: presets: [require("./tailwind.ui-preset.cjs")]');
    log(`  3. CSS 엔트리: @tailwind base/components/utilities; 다음에 @import "${tokensPath.replace(/^src\//, './')}";`);
  } else {
    log('  2. CSS 엔트리에서 tokens.css 를 @import ("tailwindcss" 다음 줄)');
  }
  log(`  ${isV3 ? 4 : 3}. Pretendard 셀프호스트 + <html>에 다크모드 스크립트 (tokens.css 주석 참조)`);
  log(`  ${isV3 ? 5 : 4}. 확인: node .claude/hooks/design-lint.mjs --all`);
}

const self = (() => { try { return path.resolve(fileURLToPath(import.meta.url)).toLowerCase(); } catch { return ''; } })();
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === self) main();
