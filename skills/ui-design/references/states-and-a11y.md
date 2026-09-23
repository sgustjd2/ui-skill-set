# states-and-a11y — 상태 5종과 접근성

"성공한 화면 하나"는 미완성이다. 모든 인터랙티브 요소와 데이터 표면은 아래 상태를 **같이** 만든다. 정규식으로 못 잡으므로 스스로 확인한다.

## 상태 5종

모든 버튼·인풋·목록·데이터 뷰는 다섯 상태를 가진다.

1. **hover** — 배경/투명도/그림자 전이(레이아웃 이동 없음). `:active`에서 `scale-[0.98]` 또는 `-translate-y-px`로 눌리는 느낌. `--ui-duration-2~3`.
2. **disabled** — `bg-disabled`/`fg-disabled`, `cursor-not-allowed`, `aria-disabled`. 다른 상호작용 상태와 겹치지 않는다.
3. **loading** — 최종 레이아웃 모양의 **스켈레톤**(`--ui-gradient-shimmer`). 일반 원형 스피너는 버튼 안에서만. 목록은 행 스켈레톤 3~5개.
4. **error** — 인라인(폼: 인풋 아래), 또는 맥락(토스트는 일시적 알림만). 문제 + 다음 행동을 함께, 탓하지 않고: "카드 번호 16자리를 모두 입력해 주세요." 테두리 색 같은 시각 피드백과 `aria-live`(또는 `aria-describedby`로 연결된 에러 텍스트)를 같이 쓴다.
5. **empty** — 아름답게 구성. 왜 비었는지 + 채우는 법을 보여준다. 빈 `<div/>` 금지.

상태 우선순위(동시 발생 시): `disabled > loading > active > focus > hover > default`.

전이 시간(참고): 색 150ms · transform 200ms · 그림자 200ms. 전부 `--ui-duration-*` / `--ui-ease-*`로.

## 대비 (WCAG AA)

- 본문 텍스트 **≥ 4.5:1**. **placeholder도 텍스트라 4.5:1**(WCAG 1.4.3. tokens.css `fg-placeholder`가 처리). 값과 헷갈리지 않게 하는 건 색이 아니라 내용이다: 예시 형식만 넣는다. 헬퍼·에러 텍스트도 4.5:1.
- 기준은 WCAG 2.2 AA 대비비(2025-10 ISO/IEC 40500:2025, EU 접근성법의 EN 301 549 V4.1.1도 2.2 기준). APCA는 WCAG 3 초안에서 빠졌고 대비 알고리즘은 미정이다. 참고로만 쓴다.
- 큰 글자(18px bold 또는 24px+)·아이콘·컨트롤 테두리·포커스 링 **≥ 3:1**.
- 버튼 텍스트가 버튼 배경 위에서 읽힌다(흰 배경+흰 글자 금지). 사진 위 고스트 버튼은 스크림/스트로크로.
- 색 있는 표면 위 보조 텍스트는 그 색조에서 파생. 회색을 얹지 않는다.
- **가장 흐린 회색(`fg-neutral-subtle`)은 대비 ~3:1이다. 작은 본문에 쓰면 AA 미달.** 각주·캡션 같은 작은 글자는 `fg-neutral-muted`를 쓴다. subtle은 큰 글자(≥24px)·아이콘·비활성 힌트 전용. (design-audit가 잡는 실제 함정)
- 폼: 인풋·플레이스홀더·포커스 링·헬퍼·에러 텍스트 전부 섹션 배경 대비 통과. (tokens.css의 `fg-placeholder`가 기본 처리)

## 키보드·포커스

- 모든 상호작용을 키보드로 도달·조작 가능. 탭 순서가 시각 순서와 일치.
- `:focus-visible` 링이 보인다. tokens.css가 `2px solid var(--ui-color-stroke-focus)` + `2px` 오프셋을 전역으로 넣는다. 덮어썼는지 확인.
- 포커스 표시는 **`outline`으로**. `ring-*`은 box-shadow라 Windows 고대비(forced-colors)에서 사라진다. 숨겨야 하면 `outline-none` 대신 `outline-hidden`(고대비에서는 남는다). 버튼은 tokens.css가 고대비에서 안쪽 outline을 그려 주므로 그 규칙을 덮어쓰지 않는다. 그림자만으로 경계를 만든 카드는 `border border-transparent`를 깔아 고대비에서도 윤곽이 남게. (design-audit가 고대비 에뮬레이션으로 확인)
- 클릭 가능한 `<div onClick>` 금지(S21). `<button>`을 쓰고 `aria-pressed`/`aria-expanded`로 상태를 노출. 버튼 안에 버튼 금지.
- 표 행 전체 클릭(`<tr onClick>`) 금지. 첫 셀에 링크를 두고 `relative` 행 + 링크에 `after:absolute after:inset-0`으로 영역을 넓힌다.
- 컨트롤을 hover로만 드러내지 않는다(터치엔 hover가 없다).

## 터치·모바일

- 터치 타겟 **≥ 44px**(iOS)/48dp(Android). WCAG 2.2 2.5.8(AA) 최소 **24×24px**는 모든 뷰포트에서 필수(design-audit blocker, 문장 속 링크는 예외). 타겟 사이 간격 ≥ 8px.
- `hover:`에만 의존하는 중요한 동작 금지. 탭으로도 되게.
- 고정 내비 뒤에 콘텐츠가 가려지지 않게(스크롤 패딩). 375/768/1280에서 가로 스크롤 0.
- 확대를 막지 않는다: viewport에 `user-scalable=no`·`maximum-scale=1` 금지(WCAG 1.4.4, S17).
- **Safe area**(노치·홈 인디케이터, seed-design 2026-09 가이드): 누를 것과 읽을 것은 안전 영역 안, 배경·배너·구분선은 화면 끝까지. 여백은 화면 끝이 아니라 안전 영역 경계부터 잰다. 네 변의 inset은 독립이다(어느 쪽이 항상 0이라고 가정하지 않는다).
  - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
  - 하단 고정 바: `pb-[calc(env(safe-area-inset-bottom)+16px)]`, 가로는 `px-[max(16px,env(safe-area-inset-left))]`.

## 모션 접근성

- `prefers-reduced-motion: reduce`에서 깨지지 않는다. tokens.css가 `--ui-duration-*`를 0으로 만든다. 스크롤 하이재킹·자동 재생·패럴랙스는 이때 끈다.
- 줄임은 "모든 모션 제거"가 아니라 "더 적고 더 부드럽게". 의미 있는 상태 전이는 즉시 전환으로 남긴다.
- 자동 회전 캐러셀은 이전/다음 + 정지 버튼, 포커스·hover·줄임 요청 시 멈춤.
- 2초 넘는 연출은 건너뛰기를 제공한다. 초당 3회 넘게 번쩍이지 않는다(KWCAG 2.2 6.3.1).

## 시맨틱·스크린리더

- `<html lang="ko">`. 영어 블록은 그 요소에 `lang="en"`.
- 아이콘 전용 버튼은 `aria-label="닫기"`처럼 **동작**을 쓴다. 장식 아이콘은 `aria-hidden`.
- 보이는 텍스트가 있는 버튼에 `aria-label`을 주면 **보이는 텍스트를 포함**한다(WCAG 2.5.3, KWCAG 6.5.3, S22). 목록에 "선택"이 여러 개면 `aria-label="요금제 A 선택"`처럼 항목 이름을 붙인다. 음성 명령 사용자는 보이는 글자를 말한다.
- 스크린리더 사용자는 빠르게 듣고 건너뛴다. 역할과 핵심 값이 먼저 읽히게, 긴 리스트 항목은 요소를 나눈다(토스 VoiceOver 사용성 연구, 2025-06).
- 의미 있는 순서로 heading(h1→h2→h3, 건너뛰지 않기). 페이지당 h1 하나.
- 이미지 `alt`(장식은 `alt=""`). 폼 `<label htmlFor>`. 라이브 영역은 `aria-live`.
- 색만으로 정보 전달 금지(에러는 색+아이콘+텍스트).

## 폼

- 라벨은 인풋 **위**. 헬퍼는 선택(마크업엔 present). 에러는 인풋 **아래**. 블록 간 `gap-2`.
- placeholder를 라벨로 쓰지 않는다.
- 제출 중 버튼 loading + disabled. 검증은 blur 또는 제출 시, 인라인으로.
- 에러 스타일은 `invalid:`가 아니라 **`user-invalid:`**(사용자가 건드린 뒤에만 빨개진다. Baseline widely available 2026-05). 폼 요소는 `<form>`으로 감싼다(Enter 제출·자동완성).
- 늘어나는 textarea는 `field-sizing-content` + `min-h-*` 폴백(Firefox 152+부터 지원).
