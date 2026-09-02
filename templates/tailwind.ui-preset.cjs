/**
 * tailwind.ui-preset.cjs · ui-skill-set 0.1 · MIT
 *
 * Tailwind v3 용 프리셋. tokens.css의 @theme(v4 전용)과 같은 시맨틱 유틸리티를 v3에서 노출한다.
 * 값은 전부 var(--ui-*) 를 가리키므로 런타임 테마 전환(data-theme=dark)이 그대로 동작한다.
 *
 * v3 프로젝트 tailwind.config.js:
 *   module.exports = { presets: [require('./tailwind.ui-preset.cjs')], content: ['./src/**\/*.{html,js,ts,jsx,tsx,vue,svelte}'] }
 * CSS 엔트리:
 *   @tailwind base; @tailwind components; @tailwind utilities;
 *   @import "./styles/tokens.css";   (설치 시 @theme 블록이 제거된 v3 변형)
 *
 * 기본 팔레트(bg-blue-500 등)는 v3에서 그대로 남지만 design-lint(R3)가 편집 시 차단한다.
 */
const c = (n) => `var(--ui-color-${n})`;

module.exports = {
  theme: {
    extend: {
      colors: {
        'fg-neutral': c('fg-neutral'),
        'fg-neutral-muted': c('fg-neutral-muted'),
        'fg-neutral-subtle': c('fg-neutral-subtle'),
        'fg-placeholder': c('fg-placeholder'),
        'fg-disabled': c('fg-disabled'),
        'fg-brand': c('fg-brand'),
        'fg-on-brand': c('fg-on-brand'),
        'fg-on-solid': c('fg-on-solid'),
        'fg-critical': c('fg-critical'),
        'fg-positive': c('fg-positive'),
        'fg-informative': c('fg-informative'),
        basement: c('bg-basement'),
        'layer-default': c('bg-layer-default'),
        'layer-elevated': c('bg-layer-elevated'),
        'neutral-weak': c('bg-neutral-weak'),
        'neutral-weak-pressed': c('bg-neutral-weak-pressed'),
        'neutral-solid': c('bg-neutral-solid'),
        'brand-solid': c('bg-brand-solid'),
        'brand-solid-pressed': c('bg-brand-solid-pressed'),
        'brand-weak': c('bg-brand-weak'),
        'brand-weak-pressed': c('bg-brand-weak-pressed'),
        'critical-solid': c('bg-critical-solid'),
        'critical-solid-pressed': c('bg-critical-solid-pressed'),
        'critical-weak': c('bg-critical-weak'),
        'positive-weak': c('bg-positive-weak'),
        'informative-weak': c('bg-informative-weak'),
        disabled: c('bg-disabled'),
        overlay: c('bg-overlay'),
        'stroke-neutral': c('stroke-neutral'),
        'stroke-neutral-muted': c('stroke-neutral-muted'),
        'stroke-brand': c('stroke-brand'),
        'stroke-critical': c('stroke-critical'),
        'stroke-focus': c('stroke-focus'),
      },
      fontFamily: {
        sans: 'var(--ui-font-sans)',
        mono: 'var(--ui-font-mono)',
      },
      fontSize: {
        1: ['var(--ui-text-1)', 'var(--ui-leading-1)'],
        2: ['var(--ui-text-2)', 'var(--ui-leading-2)'],
        3: ['var(--ui-text-3)', 'var(--ui-leading-3)'],
        4: ['var(--ui-text-4)', 'var(--ui-leading-4)'],
        5: ['var(--ui-text-5)', 'var(--ui-leading-5)'],
        6: ['var(--ui-text-6)', 'var(--ui-leading-6)'],
        7: ['var(--ui-text-7)', 'var(--ui-leading-7)'],
        8: ['var(--ui-text-8)', 'var(--ui-leading-8)'],
        9: ['var(--ui-text-9)', 'var(--ui-leading-9)'],
        10: ['var(--ui-text-10)', 'var(--ui-leading-10)'],
        11: ['var(--ui-text-11)', 'var(--ui-leading-11)'],
        12: ['var(--ui-text-12)', 'var(--ui-leading-12)'],
        13: ['var(--ui-text-13)', 'var(--ui-leading-13)'],
        14: ['var(--ui-text-14)', 'var(--ui-leading-14)'],
      },
      borderRadius: {
        control: 'var(--ui-radius-control)',
        card: 'var(--ui-radius-card)',
        sheet: 'var(--ui-radius-sheet)',
        full: 'var(--ui-radius-full)',
      },
      boxShadow: {
        1: 'var(--ui-shadow-1)',
        2: 'var(--ui-shadow-2)',
        3: 'var(--ui-shadow-3)',
      },
      transitionTimingFunction: {
        standard: 'var(--ui-ease-standard)',
        enter: 'var(--ui-ease-enter)',
        exit: 'var(--ui-ease-exit)',
      },
    },
  },
};
