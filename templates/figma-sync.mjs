#!/usr/bin/env node
/**
 * figma-sync.mjs · ui-skill-set 0.1 · MIT
 *
 * Figma 변수(색 팔레트, Light/Dark 모드)를 읽어 tokens.css의 scale 색 토큰을 갱신한다.
 * 색만 대상: gray/accent/red/green/blue 램프. 간격·라디우스·타이포는 코드에 둔다.
 * 시맨틱 토큰(--ui-color-*)은 건드리지 않는다(역할 매핑은 고정).
 *
 *   FIGMA_TOKEN=... node figma-sync.mjs --file <fileKey> [--tokens src/styles/tokens.css] [--write]
 *
 * 기본은 dry-run(변경만 출력). --write 로 tokens.css에 반영.
 * Figma 변수 이름 규칙: `gray/500`, `accent/600`, `red/700` … (슬래시 또는 하이픈). 이 이름이 --ui-<ramp>-<step>에 매핑된다.
 * 모드: 이름에 light/dark 가 있으면 그걸로, 없으면 defaultMode=light·나머지=dark.
 *
 * ⚠️ Figma Variables REST API(/v1/files/:key/variables/local)는 Enterprise 플랜 전용이다.
 *    그 외 플랜은 403 → 플러그인으로 변수를 JSON export 해 `--from <file.json>` 으로 넘겨도 된다.
 * 순수 함수(hexFromFigma/parseFigmaVariables/applyToTokensCss)는 네트워크 없이 테스트된다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAMP = /^(gray|accent|red|green|blue)-(00|\d{1,4})$/;

export function hexFromFigma({ r, g, b, a = 1 }) {
  const h = (n) => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}${a < 0.999 ? h(a) : ''}`;
}

/** Figma variables/local 응답 → { light:{token:hex}, dark:{token:hex}, unmapped:[], modes:{} } */
export function parseFigmaVariables(json) {
  const meta = json.meta || json;
  const cols = meta.variableCollections || {};
  const vars = meta.variables || {};
  const modeRole = {}; // modeId → 'light' | 'dark'
  for (const c of Object.values(cols)) {
    const modes = c.modes || [];
    if (modes.length === 1) { modeRole[modes[0].modeId] = 'light'; continue; }
    let light = modes.find((m) => /light|라이트|밝/i.test(m.name));
    let dark = modes.find((m) => /dark|다크|어둡/i.test(m.name));
    if (!light) light = modes.find((m) => m.modeId === c.defaultModeId) || modes[0];
    if (!dark) dark = modes.find((m) => m.modeId !== light.modeId) || modes[1];
    if (light) modeRole[light.modeId] = 'light';
    if (dark && dark.modeId !== light.modeId) modeRole[dark.modeId] = 'dark';
  }
  const out = { light: {}, dark: {}, unmapped: [] };
  for (const v of Object.values(vars)) {
    if (v.resolvedType !== 'COLOR') continue;
    const name = String(v.name).replace(/\//g, '-').replace(/\s+/g, '').toLowerCase();
    const m = name.match(RAMP);
    if (!m) { out.unmapped.push(v.name); continue; }
    const token = `--ui-${m[1]}-${m[2]}`;
    for (const [modeId, val] of Object.entries(v.valuesByMode || {})) {
      const role = modeRole[modeId];
      if (!role || !val || typeof val !== 'object' || !('r' in val)) continue; // 별칭(VariableAlias)은 건너뜀
      out[role][token] = hexFromFigma(val);
    }
  }
  return out;
}

function blockRange(css, selectorRe) {
  const m = css.match(selectorRe);
  if (!m) return null;
  const open = css.indexOf('{', m.index);
  let depth = 0, j = open;
  for (; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') { depth--; if (depth === 0) { j++; break; } }
  }
  return [open, j];
}

/** tokens.css의 light( :root ) / dark( :root[data-theme=dark] ) 블록 안에서 색 토큰 값을 교체. */
export function applyToTokensCss(css, updates) {
  const changed = [], notFound = [];
  const applyBlock = (selectorRe, role, map) => {
    const r = blockRange(css, selectorRe);
    if (!r) return;
    let [s, e] = r;
    let block = css.slice(s, e);
    for (const [tok, hex] of Object.entries(map)) {
      const re = new RegExp(`(\\n\\s*${tok.replace(/[-]/g, '\\-')}\\s*:\\s*)([^;]+)(;)`);
      const mm = block.match(re);
      if (!mm) { notFound.push(`${role} ${tok}`); continue; }
      const old = mm[2].trim();
      if (old.toLowerCase() !== hex.toLowerCase()) changed.push(`${role} ${tok}: ${old} → ${hex}`);
      block = block.replace(re, `$1${hex}$3`);
    }
    css = css.slice(0, s) + block + css.slice(e);
  };
  // 각 호출이 현재 css에서 블록을 다시 찾으므로 순서는 안전하다.
  applyBlock(/:root\[data-theme="dark"\]\s*\{/, 'dark', updates.dark || {});
  applyBlock(/:root\s*\{/, 'light', updates.light || {});
  return { css, changed, notFound };
}

// ─── 네트워크 (얇음) ─────────────────────────────────────────────────────────
async function fetchVariables(fileKey, token) {
  const res = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables/local`, { headers: { 'X-Figma-Token': token } });
  if (res.status === 403) throw new Error('403: Variables API는 Figma Enterprise 전용입니다. 플러그인으로 export 후 --from <file.json> 을 쓰세요.');
  if (res.status === 401) throw new Error('401: FIGMA_TOKEN 이 유효하지 않습니다(scope: file_variables:read 필요).');
  if (res.status === 404) throw new Error('404: fileKey 를 찾을 수 없습니다.');
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); if (k === 'write') o.write = true; else o[k] = argv[++i]; } }
  return o;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const tokensPath = a.tokens || 'src/styles/tokens.css';
  if (!fs.existsSync(tokensPath)) { process.stderr.write(`tokens.css 없음: ${tokensPath} (--tokens 로 경로 지정)\n`); process.exit(2); }

  let json;
  try {
    if (a.from) json = JSON.parse(fs.readFileSync(a.from, 'utf8'));
    else {
      if (!a.file) { process.stderr.write('사용법: FIGMA_TOKEN=... node figma-sync.mjs --file <key> [--tokens path] [--write]\n         또는 --from <plugin-export.json>\n'); process.exit(2); }
      const token = process.env.FIGMA_TOKEN || process.env.FIGMA_PERSONAL_ACCESS_TOKEN;
      if (!token) { process.stdout.write('[ui-figma] FIGMA_TOKEN 이 없어 동기화를 건너뜁니다. export: FIGMA_TOKEN=xxxx\n'); process.exit(0); }
      json = await fetchVariables(a.file, token);
    }
  } catch (e) { process.stderr.write(`[ui-figma] ${e.message}\n`); process.exit(1); }

  const updates = parseFigmaVariables(json);
  const css = fs.readFileSync(tokensPath, 'utf8');
  const { css: next, changed, notFound } = applyToTokensCss(css, updates);

  const nLight = Object.keys(updates.light).length, nDark = Object.keys(updates.dark).length;
  process.stdout.write(`[ui-figma] Figma 색 변수 light ${nLight} · dark ${nDark}개 파싱${updates.unmapped.length ? ` (매핑 안 됨 ${updates.unmapped.length}: ${updates.unmapped.slice(0, 6).join(', ')}…)` : ''}\n`);
  if (!changed.length) { process.stdout.write('변경 없음(값 동일).\n'); process.exit(0); }
  process.stdout.write(`변경 ${changed.length}건:\n${changed.map((c) => '  ' + c).join('\n')}\n`);
  if (notFound.length) process.stdout.write(`tokens.css에 없는 대상 ${notFound.length}: ${notFound.slice(0, 8).join(', ')}\n`);

  if (a.write) { fs.writeFileSync(tokensPath, next); process.stdout.write(`✓ ${tokensPath} 갱신. design-audit 로 대비 재확인 권장.\n`); }
  else process.stdout.write('(dry-run. 반영하려면 --write)\n');
  process.exit(0);
}

const self = (() => { try { return path.resolve(fileURLToPath(import.meta.url)).toLowerCase(); } catch { return ''; } })();
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === self) main();
