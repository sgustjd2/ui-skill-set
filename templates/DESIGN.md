---
ui_skill_set: 0.1
project: my-app
mode_default: operate
platform: web
stack: react-tailwind4
token_prefix: ui
tokens_path: src/styles/tokens.css
dials: { variance: 4, motion: 3, density: 5 }
brand_hue: blue
font_families: ["Pretendard Variable", "Pretendard"]
gradient_policy: none
tailwind_palette: deny
hardcoded_color: block
radius_scale: soft
---

# DESIGN.md

이 파일은 이 프로젝트 UI의 계약이다. 사람이 읽고, `design-lint`가 frontmatter를 읽는다.
UI 작업 전 반드시 읽는다. 바꾸려면 §8에 이유를 남긴다.

## 1. 제품과 모드

- 제품: (한 문장. 무엇을, 누구에게)
- 기본 모드: **Operate** (과업 완료가 성공). 랜딩·마케팅 화면만 Persuade.
- 다이얼: variance 4 · motion 3 · density 5 (제품 UI 기준. 화려함보다 예측 가능함)

## 2. 색

- 액센트 **1색**: `--ui-accent-*` (TODO: 브랜드 램프로 교체. 채도 80% 미만)
- 뉴트럴: `--ui-gray-00…1000`. 순수 `#000`/`#fff`는 토큰 안에서만.
- 상태색: critical(red) · positive(green) · informative(blue). 의미 없는 곳에 쓰지 않는다.
- 다크모드: `[data-theme="dark"]`에서 scale만 반전. 컴포넌트에 `dark:` 분기 금지.
- **그라데이션: 없음** (`gradient_policy: none`). 유일한 예외는 스켈레톤 `--ui-gradient-shimmer`.
- 컴포넌트는 semantic 토큰만: `text-fg-neutral`, `bg-brand-solid`, `border-stroke-neutral` …

## 3. 타이포

- 폰트: Pretendard Variable 셀프호스트 → `var(--ui-font-sans)` / `font-sans`. Google Fonts `<link>` 금지.
- 스케일: t1~t14 (`--ui-text-*` + `--ui-leading-*`). 본문 t5(16px), 보조 t4, 캡션 t3. 제목 t7~t10. t11+는 sm 이상.
- 굵기 3종만: 400 / 500 / 700.
- 한글: `word-break: keep-all` 전역. 본문 행간 ≥ 1.5. `tracking-tighter` 금지(-0.02em까지). 측정폭 30~45자.
- 숫자·가격: `tabular-nums`, 통화 표기 한 가지로 통일.

## 4. 레이아웃·간격

- 4px 그리드. Tailwind `p-4` = 16px 그대로.
- 브레이크포인트: base 0 · sm 480 · md 768 · lg 1280 · xl 1440. 모바일 우선.
- 컨테이너 최대폭 1040px (넓은 탐색 화면 1280). 화면 거터 16px(base/sm) · 32px(md+).
- 그리드 우선. flex 퍼센트 계산 금지. `h-screen` 대신 `min-h-dvh`.

## 5. 형태·깊이

- 라디우스 스케일: **soft** 고정. 컨트롤 8px(`rounded-control`) · 카드 16px(`rounded-card`) · 시트 20px(`rounded-sheet`). 섞지 않는다.
- 깊이는 표면색 → 스트로크 → 그림자 순으로. 그림자는 `--ui-shadow-1…3`뿐이고 **화면당 그림자 요소 ≤ 3개**.
- 중첩 카드 금지. 카드 대신 간격·구분선으로 묶는다.

## 6. 모션

- 지속시간 `--ui-duration-1…6` (50~300ms). 마이크로 ≤ 200ms. 퇴장은 진입보다 짧다.
- 이징: 기능적 마이크로 `ease-standard`, 시트·다이얼로그 `ease-enter`/`ease-exit`. bounce/elastic 금지.
- `transform`/`opacity`만 애니메이션. `transition: all` 금지.
- `prefers-reduced-motion`이면 duration 0 (토큰이 처리).
- 화면당 움직이는 요소 1~2개. "왜 움직이는가"에 한 문장으로 답 못 하면 뺀다.

## 7. 컴포넌트 규약

- primary CTA 화면당 **1개**. 버튼 variant: brand-solid · neutral-weak · critical-solid · text. 나란히 최대 3개.
- 모든 인터랙티브 요소에 **상태 5종** 구현: hover · disabled · loading · error · empty(목록/데이터).
- 터치 타겟 ≥ 44px. `focus-visible` 링 보임(토큰이 처리). 아이콘 라이브러리 1종(`lucide-react`), 스트로크 굵기 고정(1.75).
- 이모지는 아이콘이 아니다. 로딩은 스켈레톤(`--ui-gradient-shimmer`), 스피너는 버튼 안에서만.
- 폼: 라벨은 인풋 위, 에러는 아래, placeholder를 라벨로 쓰지 않는다.

## 8. 금지와 허용 예외

프로젝트 추가 금지 (전역 금지는 `ui-design` 스킬 `references/craft-floor.md`):
- (없음)

허용 예외 — 마커 `/* ui-lint-allow <rule>: <이유> */`와 함께 여기에 기록. 스킬은 추가 전에 사용자에게 1줄로 묻는다.

| 규칙 | 위치 | 이유 | 승인자 | 날짜 |
|---|---|---|---|---|
| | | | | |
