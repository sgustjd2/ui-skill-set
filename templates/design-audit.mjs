#!/usr/bin/env node
/**
 * design-audit.mjs · ui-skill-set 0.1 · MIT
 *
 * 실행 중인 앱을 열어 정규식이 못 잡는 런타임 결함을 검사한다(대비·오버플로·터치타겟·focus-visible·
 * 접근 이름·alt·구조)와, 윈도우 고대비(forced-colors) 에뮬레이션 1회로 윤곽·포커스를 검사한다.
 * design-lint(정적)의 짝. 편집 훅이 아니라 수동/CI 도구다.
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
/**
 * APCA Lc (SAPC-APCA 0.0.98G-4g, APCA-W3 0.1.9 상수). **판정용이 아니다**: WCAG 3 초안에서 빠졌고 법적 기준은
 * WCAG 2.2 대비비다. 참고값으로만 보여 준다. 양수 = 밝은 배경 위 어두운 글자, 음수 = 반대. 권장(seed-design):
 * 본문 |Lc| ≥ 75, 그 외 텍스트 ≥ 60, placeholder·비활성 ≥ 30.
 */
export function apcaLc(txt, bg) {
  const y = ({ r, g, b }) => {
    const v = 0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.0721750 * (b / 255) ** 2.4;
    return v < 0.022 ? v + (0.022 - v) ** 1.414 : v; // 검정 근처 소프트 클램프
  };
  const yt = y(txt), yb = y(bg);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) { const s = (yb ** 0.56 - yt ** 0.57) * 1.14; return s < 0.1 ? 0 : (s - 0.027) * 100; }
  const s = (yb ** 0.65 - yt ** 0.62) * 1.14;
  return s > -0.1 ? 0 : (s + 0.027) * 100;
}

/** 큰 글자(≥24px, 또는 ≥18.66px+bold)면 3.0, 아니면 4.5. */
export function contrastThreshold(fontSizePx, bold) {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && bold) ? 3.0 : 4.5;
}

// ─── 브라우저에서 실행되어 DOM 데이터만 수집 ─────────────────────────────────
function collectInPage() {
  // 계산값이 oklab()/oklch()/color(srgb …)로 오면(Tailwind v4의 /opacity 등) rgb 파서가 못 읽는다 → 캔버스로 rgba 정규화
  const cx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const norm = (c) => {
    if (!c || /^rgba?\(/i.test(c)) return c;
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 1000) / 1000})`;
  };
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0;
  };
  const effBg = (el) => {
    let n = el;
    while (n && n.nodeType === 1) {
      const bg = norm(getComputedStyle(n).backgroundColor);
      const m = bg && bg.match(/rgba?\(([^)]+)\)/i);
      if (m) { const p = m[1].split(/[,\s/]+/).map(Number); if ((p[3] === undefined ? 1 : p[3]) > 0.1) return bg; }
      n = n.parentElement;
    }
    return norm(getComputedStyle(document.body).backgroundColor) || 'rgb(255,255,255)';
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
    texts.push({ color: norm(s.color), bg: effBg(el), fontSize: parseFloat(s.fontSize), weight: +s.fontWeight || 400, sample: t.slice(0, 24) });
    count++;
  }

  // 인터랙티브 요소: 터치타겟·접근이름·focus
  const interactive = [];
  const els = [...document.querySelectorAll('a[href],button,input,select,textarea,[role=button],[role=switch]')].filter(vis).slice(0, 40);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.getAttribute('alt') || (el.labels && el.labels.length ? el.labels[0].textContent : '') || (el.tagName === 'INPUT' ? el.getAttribute('placeholder') : '') || '').trim();
    // 포커스 전후 비교: 원래 있던 그림자(shadow-1 카드 등)를 포커스 표시로 오인하지 않는다
    const shadowBefore = getComputedStyle(el).boxShadow;
    el.focus();
    const fs = getComputedStyle(el);
    const focusVisible = (fs.outlineStyle !== 'none' && parseFloat(fs.outlineWidth) > 0) || (fs.boxShadow !== shadowBefore && fs.boxShadow !== 'none');
    el.blur();
    const inline = getComputedStyle(el).display === 'inline'; // 문장 속 링크는 2.5.8 예외
    const labelled = /^(checkbox|radio)$/.test(el.type) && !!(el.labels && el.labels.length);
    interactive.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), hasName: name.length > 0, focusVisible, inline, labelled });
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
    viewportContent: document.querySelector('meta[name=viewport]')?.getAttribute('content') || '',
  };
}

/** forced-colors(윈도우 고대비) 에뮬레이션 페이지에서 실행. 배경·그림자가 사라진 뒤 남는 윤곽과 포커스만 본다 */
function collectForced() {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width >= 1 && r.height >= 1 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const hasOutline = (s) => s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  const noBoundary = [], noFocus = [];
  const els = [...document.querySelectorAll('button,[role=button],input:not([type=hidden]),select,textarea')].filter(vis).slice(0, 40);
  for (const el of els) {
    const label = `<${el.tagName.toLowerCase()}>${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 16)}`;
    const rest = getComputedStyle(el);
    const border = ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(rest[`border${k}Width`]) > 0 && rest[`border${k}Style`] !== 'none');
    const restOutline = { w: rest.outlineWidth, o: rest.outlineOffset, s: rest.outlineStyle, on: hasOutline(rest) };
    if (!border && !restOutline.on) noBoundary.push(label);
    el.focus();
    const f = getComputedStyle(el);
    // box-shadow 링은 고대비에서 사라진다 → outline이 있고, 평소 상태와 달라야 포커스가 보인다
    const changed = !restOutline.on || f.outlineWidth !== restOutline.w || f.outlineOffset !== restOutline.o || f.outlineStyle !== restOutline.s;
    if (!(hasOutline(f) && changed)) noFocus.push(label);
    el.blur();
  }
  return { noBoundary, noFocus };
}

/** forced-colors 수집 데이터 → findings (warn: 기존 focus-visible과 같은 등급) */
export function evaluateForced(data) {
  const out = [];
  const add = (id, msg) => out.push({ severity: 'warn', id, vw: 'forced', msg });
  if (data.noBoundary.length) add('forced-colors-boundary', `고대비에서 윤곽 없는 컨트롤 ${data.noBoundary.length}개 (배경색으로만 구분): ${data.noBoundary.slice(0, 3).join(', ')}. border-transparent 또는 tokens.css의 forced-colors 규칙 유지`);
  if (data.noFocus.length) add('forced-colors-focus', `고대비에서 포커스 안 보이는 요소 ${data.noFocus.length}개: ${data.noFocus.slice(0, 3).join(', ')}. ring(box-shadow) 대신 outline`);
  return out;
}

/** 확대 차단(WCAG 1.4.4). design-lint S17과 같은 판정 */
export const ZOOM_OFF = /user-scalable\s*=\s*(?:no|0)\b|maximum-scale\s*=\s*1(?:\.0+)?(?![\d.])/i;

// ─── 수집 데이터 → 판정 ──────────────────────────────────────────────────────
export function evaluate(data, vw) {
  const out = [];
  const add = (severity, id, msg) => out.push({ severity, id, vw, msg });
  const mobile = vw <= 480;

  if (data.overflow) add('blocker', 'horizontal-overflow', `가로 스크롤 발생 (scrollWidth ${data.scrollWidth} > ${data.innerWidth})`);
  if (!data.lang) add('blocker', 'missing-lang', '<html>에 lang 속성 없음');
  if (!data.viewport) add('blocker', 'missing-viewport', 'meta[name=viewport] 없음');
  if (ZOOM_OFF.test(data.viewportContent || '')) add('blocker', 'zoom-disabled', `확대 차단 (WCAG 1.4.4): ${data.viewportContent}`);
  if (data.h1 !== 1) add('warn', 'h1-count', `h1이 ${data.h1}개 (1개 권장)`);

  let contrastFails = 0;
  for (const t of data.texts) {
    const fg = parseColor(t.color), bgc = parseColor(t.bg);
    if (!fg || !bgc) continue;
    const ratio = contrastRatio(composite(fg, bgc), bgc);
    const need = contrastThreshold(t.fontSize, t.weight >= 700);
    if (ratio + 0.05 < need) {
      contrastFails++;
      if (contrastFails <= 6) add('blocker', 'low-contrast', `대비 ${ratio.toFixed(2)}:1 < ${need} (APCA Lc ${apcaLc(composite(fg, bgc), bgc).toFixed(0)}, 참고) — "${t.sample}" (${Math.round(t.fontSize)}px)`);
    }
  }
  if (contrastFails > 6) add('blocker', 'low-contrast', `… 외 대비 미달 ${contrastFails - 6}건`);

  // WCAG 2.2 2.5.8(AA) 24×24px는 모든 뷰포트에서 blocker. 문장 속 링크·라벨 달린 체크박스/라디오는 예외로 본다
  const tiny = data.interactive.filter((e) => (e.w < 24 || e.h < 24) && !e.inline && !e.labelled);
  for (const e of tiny.slice(0, 5)) add('blocker', 'target-size', `<${e.tag}> ${e.w}×${e.h}px < 24px (WCAG 2.5.8)`);
  if (tiny.length > 5) add('blocker', 'target-size', `… 외 24px 미만 타겟 ${tiny.length - 5}건`);
  if (mobile) {
    const small = data.interactive.filter((e) => (e.w < 44 || e.h < 44) && !tiny.includes(e) && !e.inline);
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
    // 윈도우 고대비 한 번 (크로미움 에뮬레이션). 배경·box-shadow가 시스템 색/none으로 덮인 상태
    const fp = await browser.newPage({ viewport: { width: 1280, height: 900 }, forcedColors: 'active' });
    try {
      await fp.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      all.push(...evaluateForced(await fp.evaluate(collectForced)));
    } catch { /* 에뮬레이션 미지원·로드 실패는 위 뷰포트 검사에서 이미 보고됨 */ } finally { await fp.close(); }
  } finally { await browser.close(); }

  const blockers = all.filter((f) => f.severity === 'blocker');
  if (json) { process.stdout.write(JSON.stringify({ findings: all, pass: blockers.length === 0 }, null, 2) + '\n'); process.exit(blockers.length ? 1 : 0); }

  if (!all.length) { process.stdout.write(`[ui-audit] ${url} · 뷰포트 ${viewports.join('/')} · 런타임 결함 0건. 좋은 디자인이라는 뜻은 아닙니다.\n`); process.exit(0); }
  const L = [`[ui-audit] ${url} · 뷰포트 ${viewports.join('/')} · blocker ${blockers.length} · warn ${all.length - blockers.length}`];
  for (const f of all) L.push(`  ${f.severity === 'blocker' ? '✗' : '·'} [${typeof f.vw === 'number' ? `${f.vw}px` : f.vw}] ${f.id.padEnd(18)} ${f.msg}`);
  process.stdout.write(L.join('\n') + '\n');
  process.exit(blockers.length ? 1 : 0);
}

const self = (() => { try { return path.resolve(fileURLToPath(import.meta.url)).toLowerCase(); } catch { return ''; } })();
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === self) main();

// collectInPage 는 page.evaluate 로 브라우저에서 실행됨. 여기서 참조만 유지.
void pathToFileURL;
export { collectInPage, collectForced };
