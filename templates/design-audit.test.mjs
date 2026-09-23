// design-audit.test.mjs — 대비 수학 + 판정 로직(브라우저 불필요). node templates/design-audit.test.mjs
import assert from 'node:assert/strict';
import { parseColor, relLuminance, contrastRatio, composite, contrastThreshold, evaluate, evaluateForced, apcaLc } from './design-audit.mjs';

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error(`✗ ${name}\n   ${e.message}`); } };
const near = (a, b, eps = 0.02) => Math.abs(a - b) < eps;

// ── 대비 수학 (WCAG 알려진 값)
t('parse rgb', () => assert.deepEqual(parseColor('rgb(26, 28, 32)'), { r: 26, g: 28, b: 32, a: 1 }));
t('parse rgba', () => assert.deepEqual(parseColor('rgba(0, 0, 0, 0.5)'), { r: 0, g: 0, b: 0, a: 0.5 }));
t('parse modern slash', () => assert.equal(parseColor('rgb(0 0 0 / 0.7)').a, 0.7));
t('parse garbage → null', () => assert.equal(parseColor('none'), null));
t('black on white = 21:1', () => assert.ok(near(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), 21, 0.1)));
t('white on white = 1:1', () => assert.equal(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 }), 1));
t('#767676 on white ≈ 4.54 (AA 경계)', () => assert.ok(contrastRatio({ r: 118, g: 118, b: 118 }, { r: 255, g: 255, b: 255 }) >= 4.5));
t('#999 on white < 4.5 (실패)', () => assert.ok(contrastRatio({ r: 153, g: 153, b: 153 }, { r: 255, g: 255, b: 255 }) < 4.5));
t('relLuminance white=1 black=0', () => { assert.ok(near(relLuminance({ r: 255, g: 255, b: 255 }), 1)); assert.ok(near(relLuminance({ r: 0, g: 0, b: 0 }), 0)); });

// ── APCA Lc (apca-w3 README 참조값. 참고용, 판정 아님)
const hex = (x) => ({ r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16) });
t('APCA reference values', () => {
  for (const [txt, bg, exp] of [['888888', 'ffffff', 63.0565], ['ffffff', '888888', -68.5415], ['000000', 'aaaaaa', 58.1463], ['aaaaaa', '000000', -56.2411], ['000000', 'ffffff', 106.0407], ['ffffff', '000000', -107.8847]])
    assert.ok(near(apcaLc(hex(txt), hex(bg)), exp, 0.01), `${txt} on ${bg}: ${apcaLc(hex(txt), hex(bg))} ≠ ${exp}`);
});
t('APCA same color → 0', () => assert.equal(apcaLc(hex('777777'), hex('777777')), 0));

// ── 알파 합성
t('composite opaque returns fg', () => assert.deepEqual(composite({ r: 10, g: 20, b: 30, a: 1 }, { r: 255, g: 255, b: 255 }), { r: 10, g: 20, b: 30, a: 1 }));
t('composite 50% black over white = gray', () => { const c = composite({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255 }); assert.ok(near(c.r, 127.5, 1)); });

// ── 임계값
t('threshold small text 4.5', () => assert.equal(contrastThreshold(16, false), 4.5));
t('threshold 24px large 3.0', () => assert.equal(contrastThreshold(24, false), 3.0));
t('threshold 19px bold large 3.0', () => assert.equal(contrastThreshold(19, true), 3.0));
t('threshold 19px regular 4.5', () => assert.equal(contrastThreshold(19, false), 4.5));

// ── evaluate 판정 (수집 데이터 → findings)
const okData = {
  overflow: false, scrollWidth: 375, innerWidth: 375,
  texts: [{ color: 'rgb(26,28,32)', bg: 'rgb(255,255,255)', fontSize: 16, weight: 400, sample: '본문' }],
  interactive: [{ tag: 'button', w: 120, h: 44, hasName: true, focusVisible: true }],
  imgs: [], h1: 1, lang: 'ko', viewport: true,
};
t('clean data → no findings', () => assert.equal(evaluate(okData, 375).length, 0));
t('low contrast → blocker', () => {
  const d = { ...okData, texts: [{ color: 'rgb(180,180,180)', bg: 'rgb(255,255,255)', fontSize: 14, weight: 400, sample: '흐린텍스트' }] };
  const f = evaluate(d, 1280);
  assert.ok(f.some((x) => x.id === 'low-contrast' && x.severity === 'blocker'));
});
t('low-contrast message carries APCA Lc (참고)', () => {
  const f = evaluate({ ...okData, texts: [{ color: 'rgb(180,180,180)', bg: 'rgb(255,255,255)', fontSize: 14, weight: 400, sample: '흐림' }] }, 1280).find((x) => x.id === 'low-contrast');
  assert.match(f.msg, /APCA Lc \d+, 참고/);
});
t('overflow → blocker', () => assert.ok(evaluate({ ...okData, overflow: true, scrollWidth: 500 }, 375).some((x) => x.id === 'horizontal-overflow')));
t('missing lang → blocker', () => assert.ok(evaluate({ ...okData, lang: '' }, 375).some((x) => x.id === 'missing-lang')));
t('small touch target on mobile → warn', () => {
  const d = { ...okData, interactive: [{ tag: 'button', w: 30, h: 30, hasName: true, focusVisible: true }] };
  assert.ok(evaluate(d, 375).some((x) => x.id === 'touch-target' && x.severity === 'warn'));
});
t('small touch target NOT flagged on desktop', () => {
  const d = { ...okData, interactive: [{ tag: 'button', w: 30, h: 30, hasName: true, focusVisible: true }] };
  assert.ok(!evaluate(d, 1280).some((x) => x.id === 'touch-target'));
});
t('no focus-visible → warn', () => {
  const d = { ...okData, interactive: [{ tag: 'a', w: 100, h: 44, hasName: true, focusVisible: false }] };
  assert.ok(evaluate(d, 1280).some((x) => x.id === 'focus-visible'));
});
t('missing accessible name → warn', () => {
  const d = { ...okData, interactive: [{ tag: 'button', w: 44, h: 44, hasName: false, focusVisible: true }] };
  assert.ok(evaluate(d, 1280).some((x) => x.id === 'accessible-name'));
});
t('img without alt → warn', () => assert.ok(evaluate({ ...okData, imgs: [{ hasAlt: false }] }, 1280).some((x) => x.id === 'img-alt')));

// ── 2026-09: 확대 차단 · WCAG 2.5.8 24px
t('zoom disabled → blocker', () => assert.ok(evaluate({ ...okData, viewportContent: 'width=device-width, maximum-scale=1.0, user-scalable=no' }, 375).some((x) => x.id === 'zoom-disabled' && x.severity === 'blocker')));
t('normal viewport content passes', () => assert.ok(!evaluate({ ...okData, viewportContent: 'width=device-width, initial-scale=1, maximum-scale=5' }, 375).some((x) => x.id === 'zoom-disabled')));
t('target < 24px → blocker at desktop too', () => {
  const d = { ...okData, interactive: [{ tag: 'button', w: 20, h: 20, hasName: true, focusVisible: true }] };
  const f = evaluate(d, 1280);
  assert.ok(f.some((x) => x.id === 'target-size' && x.severity === 'blocker'));
  assert.ok(!evaluate(d, 375).some((x) => x.id === 'touch-target'), '24px blocker와 44px warn 중복 없음');
});
t('forced-colors: clean → no findings', () => assert.equal(evaluateForced({ noBoundary: [], noFocus: [] }).length, 0));
t('forced-colors: boundary + focus → warn each', () => {
  const f = evaluateForced({ noBoundary: ['<button>저장'], noFocus: ['<button>저장', '<input>'] });
  assert.deepEqual(f.map((x) => [x.id, x.severity, x.vw]), [['forced-colors-boundary', 'warn', 'forced'], ['forced-colors-focus', 'warn', 'forced']]);
  assert.match(f[1].msg, /2개/);
});
t('inline link / labelled checkbox exempt from 24px', () => {
  const d = { ...okData, interactive: [{ tag: 'a', w: 40, h: 18, hasName: true, focusVisible: true, inline: true }, { tag: 'input', w: 16, h: 16, hasName: true, focusVisible: true, labelled: true }] };
  assert.ok(!evaluate(d, 1280).some((x) => x.id === 'target-size'));
});

console.log(failed ? `${failed} failed, ${n} passed` : `ok — ${n} tests`);
process.exit(failed ? 1 : 0);
