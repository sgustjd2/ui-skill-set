/* tailwind.preset.cjs · ui-skill-set 0.1 — Tailwind v3 브릿지
 *
 * Tailwind v3 는 @theme 를 모른다. 대신 tailwind.config 에서 이 프리셋을 쓴다:
 *   // tailwind.config.cjs
 *   module.exports = {
 *     presets: [require('./tailwind.preset.cjs')],
 *     content: ['./index.html', './src/**\/*.{js,ts,jsx,tsx,vue,svelte}'],
 *   };
 * 그리고 CSS 엔트리에서 tokens.css 를 @import 한다(@tailwind base 다음).
 *
 * 유틸리티 이름은 v4(theme.css)와 동일하다: bg-brand-solid · text-fg-neutral ·
 * border-stroke-neutral · rounded-control · shadow-1 · font-sans · text-4 · ease-enter.
 * 값은 var(--ui-*) 를 참조하므로 다크모드 반전(data-theme=dark)이 그대로 동작한다.
 *
 * 주의: v3 는 extend 라서 기본 팔레트(bg-blue-500 등)가 남는다. 그 사용은 design-lint R3 가
 * 차단하므로 일관성은 유지된다. 색을 완전히 대체하려면 extend 밖 colors 로 옮기되
 * transparent/currentColor 를 직접 넣어야 한다(권장하지 않음).
 */
const v = (name) => `var(--ui-${name})`;

module.exports = {
  theme: {
    extend: {
      colors: {
        'fg-neutral': v('color-fg-neutral'),
        'fg-neutral-muted': v('color-fg-neutral-muted'),
        'fg-neutral-subtle': v('color-fg-neutral-subtle'),
        'fg-placeholder': v('color-fg-placeholder'),
        'fg-disabled': v('color-fg-disabled'),
        'fg-brand': v('color-fg-brand'),
        'fg-on-brand': v('color-fg-on-brand'),
        'fg-on-solid': v('color-fg-on-solid'),
        'fg-critical': v('color-fg-critical'),
        'fg-positive': v('color-fg-positive'),
        'fg-informative': v('color-fg-informative'),
        basement: v('color-bg-basement'),
        'layer-default': v('color-bg-layer-default'),
        'layer-elevated': v('color-bg-layer-elevated'),
        'neutral-weak': v('color-bg-neutral-weak'),
        'neutral-weak-pressed': v('color-bg-neutral-weak-pressed'),
        'neutral-solid': v('color-bg-neutral-solid'),
        'brand-solid': v('color-bg-brand-solid'),
        'brand-solid-pressed': v('color-bg-brand-solid-pressed'),
        'brand-weak': v('color-bg-brand-weak'),
        'brand-weak-pressed': v('color-bg-brand-weak-pressed'),
        'critical-solid': v('color-bg-critical-solid'),
        'critical-solid-pressed': v('color-bg-critical-solid-pressed'),
        'critical-weak': v('color-bg-critical-weak'),
        'positive-weak': v('color-bg-positive-weak'),
        'informative-weak': v('color-bg-informative-weak'),
        disabled: v('color-bg-disabled'),
        overlay: v('color-bg-overlay'),
        'stroke-neutral': v('color-stroke-neutral'),
        'stroke-neutral-muted': v('color-stroke-neutral-muted'),
        'stroke-brand': v('color-stroke-brand'),
        'stroke-critical': v('color-stroke-critical'),
        'stroke-focus': v('color-stroke-focus'),
      },
      fontFamily: {
        sans: [v('font-sans')],
        mono: [v('font-mono')],
      },
      // v3 fontSize: [size, lineHeight] 튜플. text-1~14
      fontSize: {
        1: [v('text-1'), v('leading-1')],
        2: [v('text-2'), v('leading-2')],
        3: [v('text-3'), v('leading-3')],
        4: [v('text-4'), v('leading-4')],
        5: [v('text-5'), v('leading-5')],
        6: [v('text-6'), v('leading-6')],
        7: [v('text-7'), v('leading-7')],
        8: [v('text-8'), v('leading-8')],
        9: [v('text-9'), v('leading-9')],
        10: [v('text-10'), v('leading-10')],
        11: [v('text-11'), v('leading-11')],
        12: [v('text-12'), v('leading-12')],
        13: [v('text-13'), v('leading-13')],
        14: [v('text-14'), v('leading-14')],
      },
      borderRadius: {
        control: v('radius-control'),
        card: v('radius-card'),
        sheet: v('radius-sheet'),
        full: v('radius-full'),
      },
      boxShadow: {
        1: v('shadow-1'),
        2: v('shadow-2'),
        3: v('shadow-3'),
      },
      transitionTimingFunction: {
        standard: v('ease-standard'),
        enter: v('ease-enter'),
        exit: v('ease-exit'),
      },
      transitionDuration: {
        1: v('duration-1'),
        2: v('duration-2'),
        3: v('duration-3'),
        4: v('duration-4'),
        5: v('duration-5'),
        6: v('duration-6'),
      },
    },
  },
};
