#!/usr/bin/env node
/**
 * design-lint.mjs · ui-skill-set 0.1 · MIT
 *
 * 편집이 파일에 닿기 전에 하드 룰 4개(R1~R4)를 검사한다. 순수 Node ≥18, 의존성 0, bash/jq 없음.
 *   --pre   PreToolUse(Edit|Write|MultiEdit): stdin JSON의 제안 내용 검사 → 위반 시 stderr + exit 2 (차단)
 *   --stop  Stop: 작업 트리 변경 파일 검사 → 위반 시 {"decision":"block"} 한 번 (stop_hook_active면 통과)
 *   --all   CI: 저장소 전체 UI 파일 검사 → 위반 시 exit 1
 * 룰·예외·메시지: docs/PRD.md §7. 어떤 내부 오류도 세션을 깨지 않는다 (최상위 catch → exit 0).
 * 정규식 일부는 impeccable(pbakaus, Apache-2.0)에서 가져옴. NOTICE 참조.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ─── 설정 (DESIGN.md frontmatter) ────────────────────────────────────────────
export const DEFAULTS = Object.freeze({
  token_prefix: 'ui',
  tokens_path: 'src/styles/tokens.css',
  brand_hue: 'blue',
  font_families: ['Pretendard Variable', 'Pretendard'],
  gradient_policy: 'none',   // none | ai-feature | allow
  tailwind_palette: 'deny',  // deny | allow
  hardcoded_color: 'block',  // block | warn
});

export function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const cfg = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.*?)\s*$/);
    if (!kv) continue;
    let v = kv[2];
    // ponytail: YAML 부분집합 — 스칼라, [a, b], {k: v}. 중첩 없음. 필요해지면 yaml 파서로.
    if (v.startsWith('[')) v = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    else if (v.startsWith('{')) {
      const o = {};
      for (const p of v.slice(1, -1).split(',')) {
        const i = p.indexOf(':'); if (i < 0) continue;
        const k = p.slice(0, i).trim(), val = p.slice(i + 1).trim();
        o[k] = /^-?\d+(\.\d+)?$/.test(val) ? +val : val;
      }
      v = o;
    } else v = v.replace(/^["']|["']$/g, '');
    cfg[kv[1]] = v;
  }
  return cfg;
}

export function loadConfig(root) {
  const p = path.join(root, 'DESIGN.md');
  if (!fs.existsSync(p)) return null; // 설치 안 된 프로젝트 → no-op
  return { ...DEFAULTS, ...parseFrontmatter(fs.readFileSync(p, 'utf8')) };
}

// ─── 파일 분류 ───────────────────────────────────────────────────────────────
const UI_EXT = /\.(tsx|jsx|vue|svelte|astro|html|css|scss|less)$/i;
const MAYBE_UI_EXT = /\.(ts|js|mjs|cjs)$/i;
const JSX_OR_CSSINJS = /<[A-Za-z][^>]*>|\bstyled[.(]|\bcss`|className=/;
const SKIP_ALWAYS = /(^|\/)(node_modules|dist|build|out|\.next|\.nuxt|\.cache|coverage|\.git|\.claude|\.vscode|\.idea|__generated__)(\/|$)|\.d\.ts$|\.min\.|(^|\/)\.env|secret[^/]*\.json$|\.pem$|id_rsa|(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/i;
const SKIP_POLICY = /(^|\/)(tokens\.css|globals?\.css|tailwind\.config\.[cm]?[jt]s|DESIGN\.md)$|\.tokens\.|\.(test|spec|stories)\./i;
const MAX_BYTES = 131072;

export function isUiFile(filePath, content = '') {
  const rel = String(filePath).replace(/\\/g, '/');
  if (SKIP_ALWAYS.test(rel) || SKIP_POLICY.test(rel)) return false;
  if (UI_EXT.test(rel)) return true;
  if (MAYBE_UI_EXT.test(rel)) return JSX_OR_CSSINJS.test(content);
  return false;
}

// ─── 룰 ─────────────────────────────────────────────────────────────────────
const RX = {
  gradientCss: /\b(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i,
  gradientTw: /\bbg-(?:gradient-to-[trbl]{1,2}|linear-to-[trbl]{1,2}|linear-\d+|linear-\[|radial\b|radial-\[|conic\b|conic-\d+|conic-\[)/,
  purpleHex: /#(?:7c3aed|8b5cf6|a855f7|9333ea|7e22ce|6d28d9|6366f1|764ba2|667eea)\b/i, // impeccable checks.mjs:1506
  purpleTw: /\b(?:text|bg|from|via|to|border|ring|fill|stroke)-(?:purple|violet|indigo|fuchsia)-\d{2,3}\b/,
  // 값 위치(':' '[' '=' 뒤)의 hex만. href/to/src/id 속성 값과 `#id {` 셀렉터는 제외 (오탐 방지)
  hex: /(?::|\[|=\s*["'{`])[^;{}\]\n]*?(?<!(?:href|to|src|id|name|for|key)=["'])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b(?![-.:#[]|\s*\{)/i,
  hexOnly: /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/i,
  colorFn: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(\s*(?!var\()/i,
  twPalette: /\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|shadow|accent|caret|decoration|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d+)?\b/,
  fontFamily: /font-family\s*:\s*([^;}\n]+)/i,
  fontTw: /\bfont-\[(?:['"]|family-name:)/,
  gfonts: /fonts\.googleapis\.com/i,
  allow: /ui-lint-allow\s+([a-z-]+)\s*:\s*[^\s*\/]/g, // 이유 필수. 주석 닫힘(*/)은 이유가 아님
  comment: /^\s*(?:\/\/|\/\*|\*|<!--)/,
};
const GENERIC_FONT = /^(?:inherit|initial|unset|revert|monospace|sans-serif|serif|system-ui|ui-monospace|ui-sans-serif|ui-serif|cursive|fantasy|math|emoji)(?:\s*,\s*(?:inherit|initial|unset|revert|monospace|sans-serif|serif|system-ui|ui-monospace|ui-sans-serif|ui-serif|cursive|fantasy|math|emoji))*\s*!?\w*$/i;

// ─── 소프트 룰(S1~S15): --stop / --all 에서만. Stop에서 1회 block, CI(--all)는 exit에 영향 없음 ───
const SOFT = {
  glass: /\bbackdrop-blur(?:-\w+)?\b|backdrop-filter\s*:/i,
  glassOk: /\b(?:fixed|sticky)\b|modal|overlay|scrim|drawer|sheet|dialog|\bnav\b/i,
  emoji: /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]️?/u,
  heavyShadowTw: /\bshadow-(?:lg|xl|2xl)\b/,
  boxShadow: /box-shadow\s*:\s*(?!var\()(?!none)(?!inset\s+0\s+0\s+0)[^;]*\d/i,
  bounceWord: /\banimate-bounce\b|\b(?:bounce|elastic|wobble|jiggle)\b/i,
  bezier: /cubic-bezier\(\s*[\d.-]+\s*,\s*(-?[\d.]+)\s*,\s*[\d.-]+\s*,\s*(-?[\d.]+)\s*\)/,
  hScreen: /\b(?:min-|max-)?h-screen\b|\bh-\[100vh\]|height\s*:\s*100vh\b/i,
  zArb: /\bz-\[\d{3,}\]|z-index\s*:\s*\d{3,}/i,
  transAll: /\btransition-all\b|transition\s*:\s*all\b/i,
  uppercase: /\buppercase\b|text-transform\s*:\s*uppercase/i,
  tracking: /\btracking-/,
  sideTab: /\bborder-[lr]-[2-9]\b|border-(?:left|right)(?:-width)?\s*:\s*[3-9]px/i,
  imgHover: /\bhover:scale-/,
  imgTag: /<img\b|<Image\b/i,
  pureBw: /\b(?:bg|text|border|ring|fill|stroke|divide|outline|from|via|to)-(?:black|white)\b/,
  emDash: /—/,
  breakAll: /\bbreak-all\b|word-break\s*:\s*break-all/i,
  trackingTight: /\btracking-tighter\b|\btracking-tight\b|letter-spacing\s*:\s*-0?\.(?:0[3-9]|[1-9])/i,
  buzzword: /혁신적인|차세대|스마트한|손쉽게|완벽한|최고의|재정의|\b(?:seamless|unleash|supercharge|revolutioniz|cutting.?edge|next.?gen|game.?chang|best.?in.?class)\b/i,
};
const SOFT_FIX = {
  'glass-decorative': '장식용 유리/블러 금지. backdrop-blur는 모달 스크림·고정 내비의 "뒤 사라짐"에만',
  'emoji-as-icon': '이모지는 아이콘이 아니다. lucide-react 등 라이브러리 아이콘으로',
  'heavy-shadow': 'shadow-1/2/3 토큰만. 그림자 쓴 요소는 화면당 ≤3개',
  'bounce-easing': 'bounce/elastic 금지. --ui-ease-standard/enter/exit',
  'h-screen': 'h-screen/100vh 대신 min-h-dvh (모바일 주소창 대응)',
  'z-arbitrary': '임의 큰 z-index 금지. z 스케일을 정해 쓴다',
  'transition-all': 'transition-all 금지. transform/opacity만 전이',
  eyebrow: '제목 위 대문자+자간 라벨(아이브로우) 금지. 제목이 스스로 말하게',
  'side-tab': '1px 넘는 색 있는 좌/우 테두리 금지',
  'img-hover-scale': '이미지 hover 확대는 레이아웃을 밀 수 있다. overflow·transform-origin 확인',
  'pure-bw': 'bg-black/text-white 대신 시맨틱 토큰(bg-neutral-solid, text-fg-on-solid 등)',
  'em-dash': 'em-dash 금지. 범위는 ~, 구분은 · 또는 줄바꿈',
  'break-all': 'word-break: break-all 금지(한글). keep-all은 tokens.css 전역',
  'korean-tracking': 'tracking-tighter/tight 금지(한글). 최대 -0.02em',
  buzzword: '마케팅 상투어 금지. 구체적인 동사·명사로',
};

function markers(text) {
  const s = new Set();
  for (const m of String(text).matchAll(RX.allow)) s.add(m[1]);
  return s;
}

function fixes(cfg) {
  const p = cfg.token_prefix;
  return {
    gradient: `단색 토큰으로 (bg-brand-solid / var(--${p}-color-bg-brand-solid)). 브랜드 근거가 있으면 파일에 /* ui-lint-allow gradient: <이유> */ 를 넣고 DESIGN.md §8에 기록`,
    'ai-purple': `AI 기본 보라. 브랜드 토큰으로 (text-fg-brand / bg-brand-solid). 브랜드가 실제로 보라면 DESIGN.md brand_hue: purple`,
    'hardcoded-color': `시맨틱 토큰으로: var(--${p}-color-{fg|bg|stroke}-…) 또는 text-fg-* / bg-* / border-stroke-*. 목록: ${cfg.tokens_path}. 원색은 그 파일에서만`,
    'hardcoded-font': `var(--${p}-font-sans) / font-sans 로. Google Fonts <link> 금지(셀프호스트). 새 폰트는 DESIGN.md font_families에 먼저 선언`,
  };
}

/** @returns {{rule:string,id:string,line:number,snippet:string,fix:string,severity:'block'|'warn'}[]} */
export function lint(content, filePath, cfg = DEFAULTS, { existing = '', soft = false } = {}) {
  cfg = { ...DEFAULTS, ...cfg };
  const out = [];
  const allowed = new Set([...markers(content), ...markers(existing)]);
  const FIX = fixes(cfg);
  const purpleBrand = /^(?:purple|violet|indigo)$/i.test(String(cfg.brand_hue));
  const fonts = (Array.isArray(cfg.font_families) ? cfg.font_families : String(cfg.font_families).split(','))
    .map((s) => s.trim().toLowerCase()).filter(Boolean);
  const gradientToken = new RegExp(`var\\(--${cfg.token_prefix}-gradient-`);
  const colorSeverity = cfg.hardcoded_color === 'warn' ? 'warn' : 'block';
  const push = (rule, id, line, snippet, { tier = 'hard', severity = 'block' } = {}) =>
    out.push({ rule, id, tier, line, snippet: String(snippet).trim().slice(0, 70), fix: FIX[id] ?? SOFT_FIX[id], severity });

  content.split(/\r?\n/).forEach((line, i) => {
    if (RX.comment.test(line) || /ui-lint-allow/.test(line)) return;
    const n = i + 1;

    // R1 gradient
    if (cfg.gradient_policy !== 'allow' && !allowed.has('gradient')) {
      const m = line.match(RX.gradientCss) ?? line.match(RX.gradientTw);
      if (m && !gradientToken.test(line)) push('R1', 'gradient', n, m[0]);
    }

    // R2 ai-purple
    let r2 = false;
    if (!purpleBrand && !allowed.has('ai-purple')) {
      const m = line.match(RX.purpleHex) ?? line.match(RX.purpleTw);
      if (m) { r2 = true; push('R2', 'ai-purple', n, m[0]); }
    }

    // R3 hardcoded-color
    if (cfg.hardcoded_color !== 'off' && !allowed.has('hardcoded-color')) {
      const h = line.match(RX.hex);
      const c = h ? null : line.match(RX.colorFn);
      if (h) push('R3', 'hardcoded-color', n, h[0].match(RX.hexOnly)[0], { severity: colorSeverity });
      else if (c) push('R3', 'hardcoded-color', n, c[0] + '…)', { severity: colorSeverity });
      else if (!r2 && cfg.tailwind_palette !== 'allow') {
        const t = line.match(RX.twPalette);
        if (t) push('R3', 'hardcoded-color', n, t[0], { severity: colorSeverity });
      }
    }

    // R4 hardcoded-font
    if (!allowed.has('hardcoded-font')) {
      const fm = line.match(RX.fontFamily);
      if (fm) {
        const v = fm[1].trim();
        const ok = /^var\(/.test(v) || GENERIC_FONT.test(v) || fonts.some((f) => v.toLowerCase().includes(f));
        if (!ok) push('R4', 'hardcoded-font', n, v);
      }
      const t = line.match(RX.fontTw) ?? line.match(RX.gfonts);
      if (t) push('R4', 'hardcoded-font', n, t[0]);
    }

    // ─── 소프트 룰 S1~S15 (--stop / --all 에서만) ───
    if (!soft) return;
    const s = (code, id, ok, snip) => { if (ok && !allowed.has(id)) push(code, id, n, snip || '', { tier: 'soft' }); };
    if (SOFT.glass.test(line) && !SOFT.glassOk.test(line)) s('S1', 'glass-decorative', true, (line.match(SOFT.glass) || [''])[0]);
    { const m = line.match(SOFT.emoji); s('S2', 'emoji-as-icon', m, m && m[0]); }
    { const m = line.match(SOFT.heavyShadowTw) || (SOFT.boxShadow.test(line) ? ['box-shadow'] : null); s('S3', 'heavy-shadow', m, m && m[0]); }
    { let m = line.match(SOFT.bounceWord); if (!m) { const b = line.match(SOFT.bezier); if (b) { const y1 = +b[1], y2 = +b[2]; if (y1 < -0.1 || y1 > 1.1 || y2 < -0.1 || y2 > 1.1) m = ['cubic-bezier 오버슈트']; } } s('S4', 'bounce-easing', m, m && m[0]); }
    { const m = line.match(SOFT.hScreen); s('S5', 'h-screen', m, m && m[0]); }
    { const m = line.match(SOFT.zArb); s('S6', 'z-arbitrary', m, m && m[0]); }
    { const m = line.match(SOFT.transAll); s('S7', 'transition-all', m, m && m[0]); }
    if (SOFT.uppercase.test(line) && SOFT.tracking.test(line)) s('S8', 'eyebrow', true, 'uppercase + tracking');
    { const m = line.match(SOFT.sideTab); s('S9', 'side-tab', m, m && m[0]); }
    if (SOFT.imgHover.test(line) && SOFT.imgTag.test(line)) s('S10', 'img-hover-scale', true, 'img + hover:scale');
    { const m = line.match(SOFT.pureBw); s('S11', 'pure-bw', m, m && m[0]); }
    { const m = line.match(SOFT.emDash); s('S12', 'em-dash', m, m && '—'); }
    { const m = line.match(SOFT.breakAll); s('S13', 'break-all', m, m && m[0]); }
    { const m = line.match(SOFT.trackingTight); s('S14', 'korean-tracking', m, m && m[0]); }
    { const m = line.match(SOFT.buzzword); s('S15', 'buzzword', m, m && m[0]); }
  });
  return out;
}

// ─── 출력 ────────────────────────────────────────────────────────────────────
const FOOTER = '규칙: 우회 금지, 토큰으로 수정. 예외가 꼭 필요하면 `/* ui-lint-allow <rule>: <이유> */` + DESIGN.md §8 기록 (먼저 사용자에게 1줄로 확인).';

export function format(findings, { max = 8, relative = false } = {}) {
  const lines = [];
  for (const f of findings.slice(0, max)) {
    const where = f.file ? `${f.file}:${f.line}` : `L${f.line}${relative ? '(편집 내)' : ''}`;
    lines.push(`  ${f.rule} ${f.id.padEnd(16)} ${where}  ${f.snippet}${f.severity === 'warn' ? '  (warn)' : ''}`);
    lines.push(`     → ${f.fix}`);
  }
  if (findings.length > max) lines.push(`  … 외 ${findings.length - max}건`);
  return lines.join('\n');
}

// ─── 안티 데드락: 같은 파일·같은 룰 3회 연속 차단 → 4번째는 통과 ──────────────
function stateFile(root) {
  let h = 0; for (const ch of root) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return path.join(os.tmpdir(), `ui-lint-${h.toString(16)}.json`);
}
function readState(root) { try { return JSON.parse(fs.readFileSync(stateFile(root), 'utf8')); } catch { return {}; } }
function writeState(root, s) { try { fs.writeFileSync(stateFile(root), JSON.stringify(s)); } catch { /* 무시 */ } }

// ─── 모드 ────────────────────────────────────────────────────────────────────
function safeRead(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

export function runPre(input, cfg, root) {
  const ti = input?.tool_input ?? {};
  const file = ti.file_path ?? ti.path;
  if (!file) return null;
  let content;
  if (typeof ti.content === 'string') content = ti.content;
  else if (typeof ti.new_string === 'string') content = ti.new_string;
  else if (Array.isArray(ti.edits)) content = ti.edits.map((e) => e.new_string ?? '').join('\n');
  else return null;
  const abs = path.resolve(root, file);
  const rel = path.relative(root, abs).replace(/\\/g, '/');
  if (rel.startsWith('..') || !isUiFile(rel, content) || Buffer.byteLength(content) > MAX_BYTES) return null;

  const findings = lint(content, rel, cfg, { existing: safeRead(abs) }).filter((f) => f.tier === 'hard' && f.severity === 'block');
  const state = readState(root);
  if (!findings.length) { if (state[rel]) { delete state[rel]; writeState(root, state); } return null; }

  const sig = findings.map((f) => f.id).sort().join(',');
  const prev = state[rel]?.sig === sig ? state[rel].n : 0;
  state[rel] = { sig, n: prev + 1 };
  writeState(root, state);
  if (prev >= 3) {
    delete state[rel]; writeState(root, state);
    return { pass: true, warn: `[ui-lint] ${rel}: 같은 위반(${sig}) ${prev}회 연속 차단 → 이번은 통과시킵니다. 예외면 마커 + DESIGN.md §8, 아니면 토큰으로 고치세요.` };
  }
  const isEdit = typeof ti.content !== 'string';
  return {
    pass: false,
    message: `[ui-lint] 차단: ${rel} (${findings.length}건)\n${format(findings, { relative: isEdit })}\n${FOOTER}\n`,
  };
}

function changedFiles(root) {
  const run = (cmd) => { try { return execSync(cmd, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return ''; } };
  const set = new Set([...run('git diff --name-only HEAD').split(/\r?\n/), ...run('git ls-files --others --exclude-standard').split(/\r?\n/)]);
  set.delete('');
  return [...set].slice(0, 200);
}

export function lintFiles(files, cfg, root, { soft = false } = {}) {
  const all = [];
  for (const f of files) {
    const abs = path.join(root, f);
    let st; try { st = fs.statSync(abs); } catch { continue; }
    if (!st.isFile() || st.size > MAX_BYTES) continue;
    const c = fs.readFileSync(abs, 'utf8');
    if (!isUiFile(f, c)) continue;
    for (const x of lint(c, f, cfg, { soft })) all.push({ file: f.replace(/\\/g, '/'), ...x });
  }
  return all;
}

export function runStop(input, cfg, root) {
  if (input?.stop_hook_active) return null; // 이미 한 번 지적함 → 통과
  const files = changedFiles(root);
  const all = lintFiles(files, cfg, root, { soft: true });
  const hard = all.filter((f) => f.tier === 'hard' && f.severity === 'block');
  const softF = all.filter((f) => f.tier === 'soft');
  const warns = all.filter((f) => f.severity === 'warn'); // 레거시 hardcoded_color: warn
  if (!hard.length && !softF.length) {
    const w = warns.length ? `\n경고 ${warns.length}건 (차단 아님):\n${format(warns)}` : '';
    return { json: { systemMessage: `[ui-lint] 변경 파일 ${files.length}개 검사, 위반 0건. 좋은 디자인이라는 뜻은 아닙니다. DESIGN.md와 ui-design 스킬을 계속 따르세요.${w}` } };
  }
  const parts = [`[ui-lint] 종료 전 점검 (변경 파일 ${files.length}개)`];
  if (hard.length) parts.push(`하드 룰 ${hard.length}건, 토큰으로 고쳐야 합니다:\n${format(hard, { max: 10 })}`);
  if (softF.length) parts.push(`소프트 룰 ${softF.length}건, 검토하세요. 정당하면 파일에 /* ui-lint-allow <id>: <이유> */ 를 남기세요:\n${format(softF, { max: 10 })}`);
  parts.push(FOOTER, '(한 번만 지적합니다. 고친 뒤 다시 종료하세요.)');
  return { json: { decision: 'block', reason: parts.join('\n') } };
}

function walk(dir, root, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (SKIP_ALWAYS.test(rel + (e.isDirectory() ? '/' : ''))) continue;
    if (e.isDirectory()) walk(abs, root, acc); else acc.push(rel);
  }
  return acc;
}

// 색·폰트 선언 중 토큰을 쓴 비율. 분모 = 토큰 사용 + 하드 색/폰트 위반(R1~R4)
const SEMANTIC_UTIL = /\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline)-(?:fg-[\w-]+|on-[\w-]+|brand(?:-[\w-]+)?|neutral-(?:weak|solid|muted)[\w-]*|critical(?:-[\w-]+)?|positive(?:-[\w-]+)?|informative(?:-[\w-]+)?|layer-[\w-]+|basement|disabled|overlay|stroke-[\w-]+)\b|\bfont-(?:sans|mono)\b|\brounded-(?:control|card|sheet)\b|\bshadow-[123]\b/g;

/** 파일에서 실제 사용된 토큰 식별자를 뽑는다(var(--prefix-…) 이름 + 시맨틱 유틸 클래스). eval/consistency.mjs 가 씀. */
export function extractTokens(content, prefix = 'ui') {
  const out = [];
  const varRe = new RegExp(`--${prefix}-[a-z0-9-]+`, 'gi');
  for (const m of content.matchAll(varRe)) out.push(m[0].toLowerCase());
  for (const m of content.matchAll(SEMANTIC_UTIL)) out.push(m[0]);
  return out;
}

export function runAll(cfg, root) {
  const files = walk(root, root);
  const all = [];
  const byFile = new Map();
  let tokenUses = 0;
  const varRx = new RegExp(`var\\(\\s*--${cfg.token_prefix}-`, 'g');
  for (const f of files) {
    const abs = path.join(root, f);
    let st; try { st = fs.statSync(abs); } catch { continue; }
    if (!st.isFile() || st.size > MAX_BYTES) continue;
    const c = fs.readFileSync(abs, 'utf8');
    if (!isUiFile(f, c)) continue;
    const rel = f.replace(/\\/g, '/');
    tokenUses += (c.match(varRx) || []).length + (c.match(SEMANTIC_UTIL) || []).length;
    for (const x of lint(c, rel, cfg, { soft: true })) { all.push({ file: rel, ...x }); byFile.set(rel, (byFile.get(rel) ?? 0) + 1); }
  }
  const hardBlocks = all.filter((f) => f.tier === 'hard' && f.severity === 'block');
  const colorFontViol = all.filter((f) => f.tier === 'hard').length; // R1~R4
  const denom = tokenUses + colorFontViol;
  const cov = denom ? `${Math.round((tokenUses / denom) * 1000) / 10}% (토큰 ${tokenUses} / 위반 ${colorFontViol})` : 'n/a';
  const soft = all.length - all.filter((f) => f.tier === 'hard').length;
  const report = all.length
    ? `[ui-lint] 하드 ${all.filter((f) => f.tier === 'hard').length}건 · 소프트 ${soft}건 / 파일 ${byFile.size}개 · 토큰 커버리지 ${cov}\n${format(all, { max: 50 })}\n`
    : `[ui-lint] 위반 0건 · 토큰 커버리지 ${cov}\n`;
  return { report, exit: hardBlocks.length ? 1 : 0 };
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  let s = ''; for await (const c of process.stdin) s += c; return s;
}

async function main() {
  const mode = process.argv[2] ?? '--pre';
  try {
    const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const cfg = loadConfig(root);
    if (mode === '--all') {
      if (!cfg) { process.stdout.write('[ui-lint] DESIGN.md 없음 — 설치되지 않은 프로젝트\n'); process.exit(0); }
      const r = runAll(cfg, root); process.stdout.write(r.report); process.exit(r.exit);
    }
    if (!cfg) process.exit(0);
    let input = {}; try { input = JSON.parse((await readStdin()) || '{}'); } catch { /* 빈 입력 */ }
    if (mode === '--pre') {
      const r = runPre(input, cfg, root);
      if (!r) process.exit(0);
      if (r.pass) { if (r.warn) process.stdout.write(JSON.stringify({ systemMessage: r.warn })); process.exit(0); }
      process.stderr.write(r.message); process.exit(2);
    }
    if (mode === '--stop') {
      const r = runStop(input, cfg, root);
      if (r?.json) process.stdout.write(JSON.stringify(r.json));
      process.exit(0);
    }
    process.exit(0);
  } catch (e) {
    process.stderr.write(`[ui-lint] internal error (ignored): ${e?.message ?? e}\n`);
    process.exit(0); // never break a turn
  }
}

const self = (() => { try { return path.resolve(fileURLToPath(import.meta.url)).toLowerCase(); } catch { return ''; } })();
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === self) main();
