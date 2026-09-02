// figma-sync.test.mjs — 순수 매핑/재작성 로직(네트워크 없음). node templates/figma-sync.test.mjs
import assert from 'node:assert/strict';
import { hexFromFigma, parseFigmaVariables, applyToTokensCss } from './figma-sync.mjs';

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error(`✗ ${name}\n   ${e.message}`); } };

// ── hexFromFigma
t('white', () => assert.equal(hexFromFigma({ r: 1, g: 1, b: 1 }), '#ffffff'));
t('black', () => assert.equal(hexFromFigma({ r: 0, g: 0, b: 0 }), '#000000'));
t('mid gray rounds', () => assert.equal(hexFromFigma({ r: 0.82, g: 0.83, b: 0.85 }), '#d1d4d9'));
t('alpha → 8 digit', () => assert.equal(hexFromFigma({ r: 0, g: 0, b: 0, a: 0.7 }), '#000000b3'));
t('opaque drops alpha', () => assert.equal(hexFromFigma({ r: 1, g: 0, b: 0, a: 1 }), '#ff0000'));

// ── parseFigmaVariables (실제 API 응답 형태)
const fixture = {
  meta: {
    variableCollections: {
      'VariableCollectionId:1:2': {
        id: 'VariableCollectionId:1:2', name: 'color',
        modes: [{ modeId: '1:0', name: 'Light' }, { modeId: '1:1', name: 'Dark' }],
        defaultModeId: '1:0',
      },
    },
    variables: {
      'VariableID:1:3': { name: 'gray/500', resolvedType: 'COLOR', variableCollectionId: 'VariableCollectionId:1:2',
        valuesByMode: { '1:0': { r: 0.82, g: 0.827, b: 0.847, a: 1 }, '1:1': { r: 0.357, g: 0.376, b: 0.416, a: 1 } } },
      'VariableID:1:4': { name: 'accent/600', resolvedType: 'COLOR', variableCollectionId: 'VariableCollectionId:1:2',
        valuesByMode: { '1:0': { r: 0.129, g: 0.486, b: 0.976, a: 1 }, '1:1': { r: 0.255, g: 0.635, b: 0.976, a: 1 } } },
      'VariableID:1:9': { name: 'brand/logo', resolvedType: 'COLOR', variableCollectionId: 'VariableCollectionId:1:2',
        valuesByMode: { '1:0': { r: 1, g: 0.4, b: 0, a: 1 } } }, // 램프 아님 → unmapped
      'VariableID:1:10': { name: 'spacing/4', resolvedType: 'FLOAT', variableCollectionId: 'VariableCollectionId:1:2',
        valuesByMode: { '1:0': 16 } }, // COLOR 아님 → 무시
    },
  },
};

t('maps gray/accent to light+dark', () => {
  const u = parseFigmaVariables(fixture);
  assert.equal(u.light['--ui-gray-500'], '#d1d3d8');
  assert.equal(u.dark['--ui-gray-500'], '#5b606a');
  assert.equal(u.light['--ui-accent-600'], '#217cf9');
  assert.equal(u.dark['--ui-accent-600'], '#41a2f9');
});
t('non-ramp color → unmapped', () => assert.ok(parseFigmaVariables(fixture).unmapped.includes('brand/logo')));
t('non-color variable ignored', () => {
  const u = parseFigmaVariables(fixture);
  assert.ok(!Object.keys(u.light).some((k) => k.includes('spacing')));
});
t('single mode → light only', () => {
  const one = { meta: { variableCollections: { c1: { modes: [{ modeId: 'm', name: 'Mode 1' }], defaultModeId: 'm' } },
    variables: { v: { name: 'red-700', resolvedType: 'COLOR', valuesByMode: { m: { r: 0.98, g: 0.2, b: 0.17 } } } } } };
  const u = parseFigmaVariables(one);
  assert.ok(u.light['--ui-red-700']);
  assert.equal(Object.keys(u.dark).length, 0);
});
t('mode role by default when names unmatched', () => {
  const j = { meta: { variableCollections: { c: { modes: [{ modeId: 'a', name: '주간' }, { modeId: 'b', name: '야간' }], defaultModeId: 'a' } },
    variables: { v: { name: 'gray/00', resolvedType: 'COLOR', valuesByMode: { a: { r: 1, g: 1, b: 1 }, b: { r: 0, g: 0, b: 0 } } } } } };
  const u = parseFigmaVariables(j);
  assert.equal(u.light['--ui-gray-00'], '#ffffff');
  assert.equal(u.dark['--ui-gray-00'], '#000000');
});
t('korean mode names light/dark', () => {
  const j = { meta: { variableCollections: { c: { modes: [{ modeId: 'a', name: '라이트' }, { modeId: 'b', name: '다크' }], defaultModeId: 'a' } },
    variables: { v: { name: 'gray/00', resolvedType: 'COLOR', valuesByMode: { a: { r: 1, g: 1, b: 1 }, b: { r: 0, g: 0, b: 0 } } } } } };
  const u = parseFigmaVariables(j);
  assert.equal(u.light['--ui-gray-00'], '#ffffff');
  assert.equal(u.dark['--ui-gray-00'], '#000000');
});

// ── applyToTokensCss (블록별 교체)
const miniCss = `:root {
  --ui-gray-500: #d1d3d8;
  --ui-accent-600: #217cf9;
  --ui-color-fg-neutral: var(--ui-gray-1000);
}
:root[data-theme="dark"] {
  --ui-gray-500: #5b606a;
  --ui-accent-600: #41a2f9;
}`;

t('applies light + dark to correct blocks', () => {
  const { css, changed } = applyToTokensCss(miniCss, {
    light: { '--ui-gray-500': '#cccccc', '--ui-accent-600': '#0000ff' },
    dark: { '--ui-gray-500': '#333333' },
  });
  // light 블록의 gray-500 만 바뀌고, dark 블록의 gray-500 은 dark 값으로
  const lightBlock = css.slice(css.indexOf(':root {'), css.indexOf(':root[data-theme'));
  const darkBlock = css.slice(css.indexOf(':root[data-theme'));
  assert.match(lightBlock, /--ui-gray-500: #cccccc/);
  assert.match(lightBlock, /--ui-accent-600: #0000ff/);
  assert.match(darkBlock, /--ui-gray-500: #333333/);
  assert.match(darkBlock, /--ui-accent-600: #41a2f9/); // 안 바뀜(제공 안 함)
  assert.equal(changed.length, 3);
});
t('no change when values identical', () => {
  const { changed } = applyToTokensCss(miniCss, { light: { '--ui-gray-500': '#d1d3d8' }, dark: {} });
  assert.equal(changed.length, 0);
});
t('does not touch semantic tokens', () => {
  const { css } = applyToTokensCss(miniCss, { light: { '--ui-gray-500': '#cccccc' }, dark: {} });
  assert.match(css, /--ui-color-fg-neutral: var\(--ui-gray-1000\)/);
});
t('reports token not in tokens.css', () => {
  const { notFound } = applyToTokensCss(miniCss, { light: { '--ui-gray-450': '#abcabc' }, dark: {} });
  assert.ok(notFound.includes('light --ui-gray-450'));
});
t('similar token names not confused (gray-500 vs gray-50)', () => {
  const css2 = ':root {\n  --ui-gray-50: #eeeeee;\n  --ui-gray-500: #d1d3d8;\n}';
  const { css } = applyToTokensCss(css2, { light: { '--ui-gray-500': '#aaaaaa' }, dark: {} });
  assert.match(css, /--ui-gray-50: #eeeeee/);   // 안 바뀜
  assert.match(css, /--ui-gray-500: #aaaaaa/);  // 바뀜
});

// ── end-to-end: fixture → 실제 템플릿 tokens.css에 적용 (write 안 함)
t('e2e: parse fixture then apply to real template tokens.css', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  const css = fs.readFileSync(path.join(here, 'tokens.css'), 'utf8');
  const { changed, notFound } = applyToTokensCss(css, parseFigmaVariables(fixture));
  assert.equal(notFound.length, 0, `템플릿에 없는 토큰: ${notFound.join(', ')}`); // gray-500, accent-600 은 존재
  assert.ok(changed.length >= 1); // dark accent-600 등은 값이 달라 변경
});

console.log(failed ? `${failed} failed, ${n} passed` : `ok — ${n} tests`);
process.exit(failed ? 1 : 0);
