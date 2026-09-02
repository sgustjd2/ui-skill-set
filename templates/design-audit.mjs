#!/usr/bin/env node
/**
 * design-audit.mjs · ui-skill-set 0.1 · MIT
 *
 * 실행 중인 앱을 열어 정규식이 못 잡는 런타임 결함을 검사한다(대비·오버플로·터치타겟·focus-visible·
 * 접근 이름·alt·구조). design-lint(정적)의 짝. 편집 훅이 아니라 수동/CI 도구다.
 *
 *   node design-audit.mjs <url> [--viewports 375,768,1280] [--json]
 *
 * playwright(chromium)가 필요하다. 없으면 설치 안내 후 exit 0(세션/CI를 깨지 않음).
 *   npm i -D playwright && npx playwright install chromium
 *
 * 대비 계산(relLuminance/contrastRatio/parseColor)은 순수 함수로 export 되어 테스트된다.
 * 브라우저는 DOM 데이터만 뽑고, 판정은 여기 Node에서 한다.
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

// ─── WCAG 대비 (테스트되는 순수 함수) ────────────────────────────────────────
export function parseColor(str) {
  if (!str) return null;
  const m = String(str).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
}

function chan(c) { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }
export function relLuminance({ r, g, b }) { return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b); }
export function contrastRatio(a, b) {
  const l1 = relLuminance(a), l2 = relLuminance(b);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}
/** fg를 bg 위에 알파 합성(fg가 반투명일 때). */
export function composite(fg, bg) {
  const a = fg.a ?? 1;
  if (a >= 1) return fg;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}
/** 큰 글자(≥24px, 또는 ≥18.66px+bold)면 3.0, 아니면 4.5. */
export function contrastThreshold(fontSizePx, bold) {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && bold) ? 3.0 : 4.5;
}

// ─── 브라우저에서 실행되어 DOM 데이터만 수집 ─────────────────────────────────
function collectInPage() {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0;
  };
  const effBg = (el) => {
    let n = el;
    while (n && n.nodeType === 1) {
      const bg = getComputedStyle(n).backgroundColor;
      const m = bg && bg.match(/rgba?\(([^)]+)\)/i);
      if (m) { const p = m[1].split(/[,\s/]+/).map(Number); if ((p[3] === undefined ? 1 : p[3]) > 0.1) return bg; }
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  };

  // 텍스트 노드 표본
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node; let count = 0;
  while ((node = walker.nextNode()) && count < 200) {
    const t = node.textContent.trim();
    if (t.length < 2) continue;
    const el = node.parentElement;
    if (!el || !vis(el)) continue;
    const s = getComputedStyle(el);
    texts.push({ color: s.color, bg: effBg(el), fontSize: parseFloat(s.fontSize), weight: +s.fontWeight || 400, sample: t.slice(0, 24) });
    count++;
  }

  // 인터랙티브 요소: 터치타겟·접근이름·focus
  const interactive = [];
  const els = [...document.querySelectorAll('a[href],button,input,select,textarea,[role=button],[role=switch]')].filter(vis).slice(0, 40);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.getAttribute('alt') || (el.labels && el.labels.length ? el.labels[0].textContent : '') || (el.tagName === 'INPUT' ? el.getAttribute('placeholder') : '') || '').trim();
    el.focus();
    const fs = getComputedStyle(el);
    const focusVisible = (fs.outlineStyle !== 'none' && parseFloat(fs.outlineWidth) > 0) || (fs.boxShadow && fs.boxShadow !== 'none');
    el.blur();
    interactive.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), hasName: name.length > 0, focusVisible });
  }

  const imgs = [...document.querySelectorAll('img')].filter(vis).map((i) => ({ hasAlt: i.hasAttribute('alt') }));

  return {
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    texts, interactive, imgs,
    h1: document.querySelectorAll('h1').length,
    lang: document.documentElement.getAttribute('lang') || '',
    viewport: !!document.querySelector('meta[name=viewport]'),
  };
}

// ─── 수집 데이터 → 판정 ──────────────────────────────────────────────────────
export function evaluate(data, vw) {
  const out = [];
  const add = (severity, id, msg) => out.push({ severity, id, vw, msg });
  const mobile = vw <= 480;

  if (data.overflow) add('blocker', 'horizontal-overflow', `가로 스크롤 발생 (scrollWidth ${data.scrollWidth} > ${data.innerWidth})`);
  if (!data.lang) add('blocker', 'missing-lang', '<html>에 lang 속성 없음');
  if (!data.viewport) add('blocker', 'missing-viewport', 'meta[name=viewport] 없음');
  if (data.h1 !== 1) add('warn', 'h1-count', `h1이 ${data.h1}개 (1개 권장)`);

  let contrastFails = 0;
  for (const t of data.texts) {
    const fg = parseColor(t.color), bgc = parseColor(t.bg);
    if (!fg || !bgc) continue;
    const ratio = contrastRatio(composite(fg, bgc), bgc);
    const need = contrastThreshold(t.fontSize, t.weight >= 700);
    if (ratio + 0.05 < need) {
      contrastFails++;
      if (contrastFails <= 6) add('blocker', 'low-contrast', `대비 ${ratio.toFixed(2)}:1 < ${need} — "${t.sample}" (${Math.round(t.fontSize)}px)`);
    }
  }
  if (contrastFails > 6) add('blocker', 'low-contrast', `… 외 대비 미달 ${contrastFails - 6}건`);

  if (mobile) {
    const small = data.interactive.filter((e) => e.w < 44 || e.h < 44);
    for (const e of small.slice(0, 5)) add('warn', 'touch-target', `<${e.tag}> ${e.w}×${e.h}px < 44px (모바일)`);
    if (small.length > 5) add('warn', 'touch-target', `… 외 작은 터치타겟 ${small.length - 5}건`);
  }
  const noFocus = data.interactive.filter((e) => !e.focusVisible);
  if (noFocus.length) add('warn', 'focus-visible', `focus-visible 표시 없는 요소 ${noFocus.length}개`);
  const noName = data.interactive.filter((e) => !e.hasName);
  for (const e of noName.slice(0, 5)) add('warn', 'accessible-name', `<${e.tag}>에 접근 가능한 이름 없음`);
  const noAlt = data.imgs.filter((i) => !i.hasAlt);
  if (noAlt.length) add('warn', 'img-alt', `alt 없는 img ${noAlt.length}개`);

  return out;
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const url = args.find((a) => !a.startsWith('--'));
  if (!url) { process.stderr.write('사용법: node design-audit.mjs <url> [--viewports 375,768,1280] [--json]\n'); process.exit(2); }
  const vi = args.indexOf('--viewports');
  const viewports = (vi >= 0 ? args[vi + 1] : '375,768,1280').split(',').map(Number).filter(Boolean);
  const json = args.includes('--json');

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch {
    process.stdout.write('[ui-audit] playwright가 없어 런타임 감사를 건너뜁니다. 설치: npm i -D playwright && npx playwright install chromium\n');
    process.exit(0);
  }

  const browser = await chromium.launch();
  const all = [];
  try {
    for (const vw of viewports) {
      const page = await browser.newPage({ viewport: { width: vw, height: 900 } });
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const data = await page.evaluate(collectInPage);
        all.push(...evaluate(data, vw));
      } catch (e) {
        all.push({ severity: 'blocker', id: 'load-failed', vw, msg: `로드 실패: ${e.message}` });
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }

  const blockers = all.filter((f) => f.severity === 'blocker');
  if (json) { process.stdout.write(JSON.stringify({ findings: all, pass: blockers.length === 0 }, null, 2) + '\n'); process.exit(blockers.length ? 1 : 0); }

  if (!all.length) { process.stdout.write(`[ui-audit] ${url} · 뷰포트 ${viewports.join('/')} · 런타임 결함 0건. 좋은 디자인이라는 뜻은 아닙니다.\n`); process.exit(0); }
  const L = [`[ui-audit] ${url} · 뷰포트 ${viewports.join('/')} · blocker ${blockers.length} · warn ${all.length - blockers.length}`];
  for (const f of all) L.push(`  ${f.severity === 'blocker' ? '✗' : '·'} [${f.vw}px] ${f.id.padEnd(18)} ${f.msg}`);
  process.stdout.write(L.join('\n') + '\n');
  process.exit(blockers.length ? 1 : 0);
}

const self = (() => { try { return path.resolve(fileURLToPath(import.meta.url)).toLowerCase(); } catch { return ''; } })();
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === self) main();

// collectInPage 는 page.evaluate 로 브라우저에서 실행됨. 여기서 참조만 유지.
void pathToFileURL;
export { collectInPage };
