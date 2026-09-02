# banned — 금지와 예외 조건 (전체 목록)

`craft-floor.md`는 편집 중 지키는 반사 규칙이다. 이 문서는 **금지 항목 전체와 각각의 예외 조건**을 모은다. 형식은 항상 **"금지 + 언제 되살아나는가"** 쌍이다. 예외 조건이 없는 항목은 절대 금지다.

규칙을 "가급적", "되도록"으로 읽지 않는다. 기본값은 **0**이다. 되살리려면 명시된 조건 하나가 참이어야 하고, 참이면 그것을 한 줄로 선언한 뒤 쓴다.

## 색

| 금지 | 되살아나는 조건 | 훅 |
|---|---|---|
| 그라데이션 (linear/radial/conic, `bg-gradient-to-*`, `bg-linear-to-*`) | DESIGN.md `gradient_policy: allow`, 또는 브랜드 히어로 등 명시 근거로 `/* ui-lint-allow gradient: <이유> */` | R1 차단 |
| AI-purple (`#7c3aed` 계열, `from-purple to-blue`, 보라 글로우) | 브랜드 색상이 실제로 보라 → DESIGN.md `brand_hue: purple` | R2 차단 |
| 하드코딩 색 (hex/rgb/oklch, `bg-blue-500` 류) | tokens.css 안에서만. 컴포넌트에서는 절대 | R3 차단 |
| 순수 흑백 Tailwind (`bg-black`, `text-white`) | 시맨틱 토큰(`bg-neutral-solid`, `text-fg-on-solid`)으로 대체. 예외 없음 | S11 |
| 액센트 2색 이상 | 없음. 페이지당 액센트 1색 고정 | preflight |
| 채도 80% 이상 액센트 | 브랜드가 그 채도를 명시 | — |
| 오프셋 0의 색 있는 후광(글로우) | 없음. 그림자는 오프셋+블러 | preflight |

## 타이포

| 금지 | 되살아나는 조건 | 훅 |
|---|---|---|
| `font-family` 직접 지정, Google Fonts `<link>` | DESIGN.md `font_families`에 선언된 폰트, 또는 `var(--ui-font-*)` | R4 차단 |
| Inter / Roboto / Arial 등 기본 폰트 | DESIGN.md 폰트 스택에 그것이 있을 때만 | R4/craft-floor |
| serif를 기본 디스플레이 폰트로 | 브리프가 editorial/luxury/heritage를 명시하고 그 serif가 브랜드에 맞는 이유를 댈 수 있을 때 | craft-floor |
| `tracking-tighter`/`tracking-tight` (한글) | 라틴 대문자 약어만. 한글 최대 -0.02em | S14 |
| 굵기 400/700만 사용 | 없음. 500(medium)을 계층에 추가 | preflight |

## 레이아웃

| 금지 | 되살아나는 조건 |
|---|---|
| 같은 크기 카드 3개를 페이지 구조로 | 없음. 지그재그·비대칭·스크롤로 |
| 중첩 카드 (카드 안 카드) | 없음. 항상 틀렸다 |
| 제목 위 대문자+자간 라벨(아이브로우/키커) | 없음. 어떤 브리프도 못 되살린다 (S8) |
| 섹션 번호(01/02/03) | 순서 자체가 독자에게 필요한 정보일 때 |
| 중앙 정렬 히어로 | editorial/선언문/런칭 공지에서 메시지 자체가 디자인일 때 |
| 히어로 지표 템플릿(큰 숫자+작은 라벨+통계) | 없음 |
| `h-screen`/`100vh` | 없음. `min-h-dvh` (S5) |
| flex 퍼센트 계산(`w-[calc(33%-1rem)]`) | 없음. CSS Grid |
| 임의 z-index(`z-[9999]`) | 없음. z 스케일 정의 (S6) |

## 표면·재질

| 금지 | 되살아나는 조건 | 훅 |
|---|---|---|
| 장식용 유리/블러(backdrop-blur) | 모달 스크림·고정 내비의 "뒤 사라짐"을 뜻할 때만 | S1 |
| `shadow-lg/xl/2xl`, 토큰 아닌 box-shadow | 없음. `shadow-1/2/3`, 화면당 ≤3개 | S3 |
| 하드 오프셋 그림자(`4px 4px 0`) | 진짜 네오브루탈리즘 세계일 때 | craft-floor |
| 1px 넘는 색 있는 좌/우 테두리 | 없음 | S9 |
| 라디우스 스케일 혼용 | 문서화된 규칙이 있을 때(예: 버튼 pill, 카드 16px) 그 규칙을 전부 따를 때 | craft-floor |

## 모션

| 금지 | 되살아나는 조건 | 훅 |
|---|---|---|
| bounce/elastic 이징, cubic-bezier 오버슈트 | 없음. `--ui-ease-*` | S4 |
| `transition: all`, `transition-all` | 없음. transform/opacity만 | S7 |
| 이미지 hover 확대 | overflow·transform-origin을 다뤄 레이아웃이 안 밀릴 때 | S10 |
| 섹션마다 같은 등장 효과 반복 | 없음. 화면당 연출된 순간 하나 | craft-floor |
| 동기 없는 애니메이션 | "무엇을 알려주는가"에 한 문장으로 답할 때만 | preflight |

## 아이콘·이미지

| 금지 | 되살아나는 조건 | 훅 |
|---|---|---|
| 이모지·유니코드 글리프를 아이콘으로 | 없음. 라이브러리 아이콘 1종 | S2 |
| 직접 그린 SVG 아이콘 | 라이브러리에 없는 글리프를, 단순 기하 도형으로, 품질 확신이 있을 때 | craft-floor |
| div로 만든 가짜 스크린샷 | 없음. 실제 스크린샷·컴포넌트·이미지 | craft-floor |
| 아이콘 라이브러리 혼용 | 없음. 한 프로젝트 1종 | preflight |

## 카피

| 금지 | 되살아나는 조건 | 훅 |
|---|---|---|
| 마케팅 상투어(혁신적인·차세대·seamless·unleash) | 없음. 구체적 동사·명사 | S15 |
| em-dash(—), en-dash(–) 구분자 | 없음. 범위 `~`, 구분 `·`/줄바꿈 | S12 |
| 로렘 입숨, "홍길동", 완벽한 숫자(99.9%) | 없음. 실제 카피 | preflight |
| 성공 메시지의 느낌표, 에러의 "앗!" | 없음 | korean-typography |
| placeholder를 라벨 대신 | 없음. 라벨은 인풋 위 | preflight |

## 다크모드

| 금지 | 되살아나는 조건 |
|---|---|
| 한 화면에서 라이트/다크 섹션 혼용 | 브리프가 "테마 전환" 연출을 명시하고 한 번의 강한 전환일 때 |
| 컴포넌트에 `dark:` 분기 | 없음. 다크는 tokens.css의 scale 반전으로 |
| 카테고리로 라이트/다크 결정 | 없음. 누가·어디서·어떤 조명에서 쓰는지로 |
