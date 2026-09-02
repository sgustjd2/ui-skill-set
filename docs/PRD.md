# UI Skill Set PRD

| | |
|---|---|
| 버전 | 0.1 (초안) |
| 작성일 | 2026-09-02 |
| 상태 | **M0~M2 구현 완료** (2026-09-02). 결정 D1~D6은 추천값으로 확정. 남은 것은 실제 프로젝트 도그푸딩 |
| 저장소 | `sgustjd2/ui-skill-set` |
| 근거 자료 | `docs/research/` (레퍼런스 4개 정밀 분석) |

---

## 0. 한 줄 요약

프로젝트에 한 번 설치하면 **누가 Claude를 돌려도 같은 토큰·같은 규칙·같은 검사**를 거쳐 UI가 나오게 하는 스킬 세트. 핵심은 프롬프트가 아니라 **DESIGN.md + tokens.css + 편집 직전 훅 차단** 세 겹이다. "AI 그라데이션"은 설득이 아니라 파일에 닿기 전에 막는다.

---

## 1. 배경과 문제

### 1.1 증상
- 같은 프로젝트에서 작업자 A와 B가 Claude로 만든 화면이 다르다. 색이 다르고, 라디우스가 다르고, 버튼이 다르다.
- Claude가 "예쁘게" 만들려 하면 보라·파랑 그라데이션, 유리(글래스) 카드, 이모지 아이콘, 3열 동일 카드, 헤드라인 위 대문자 라벨이 나온다. 팀은 이걸 촌스럽다고 느낀다.
- 리뷰에서 잡아도 다음 세션에 다시 나온다.

### 1.2 원인
- LLM은 **통계적 기본 미학**을 가진다. taste-skill의 연구(`research/laziness/`)와 impeccable의 탐지기 통계가 같은 결론: 모델은 브리프를 읽기 전에 기본값으로 점프한다. 기본값 = purple/blue 그라데이션, Inter, 3열 카드, 글래스, 무한 마이크로 애니메이션, 중앙 정렬 히어로, 이모지 아이콘, 아이브로우 라벨, 그라데이션 텍스트.
- 프롬프트/스킬 문서만으로는 못 막는다. 레퍼런스 4개 중 **taste-skill과 ui-ux-pro-max는 기계적 강제가 0**이고, ui-ux-pro-max는 오히려 일반 SaaS에 글래스모피즘을 1순위로 추천한다. "sparingly(가급적)"라고 쓰면 모델은 무시한다는 것이 taste-skill의 실측 결론이다 (em-dash 룰 주석 참조).
- 일관성의 실체는 **토큰**이다. 토큰이 없으면 "같은 파랑"이 매번 다른 hex가 된다. 토큰이 있어도 강제가 없으면 모델은 `bg-blue-500`을 쓴다.

### 1.3 결론
세 가지가 동시에 있어야 한다.
1. **에셋** - 프로젝트가 소유한 DESIGN.md와 토큰 파일 (무엇이 "우리 것"인지)
2. **룰** - 읽고 판단하는 절차와 금지/필수 목록 (어떻게 만드는지)
3. **하네스** - 편집 직전 차단 + 종료 직전 점검 (어겼을 때 무엇이 일어나는지)

하나라도 빠지면 목표가 안 된다. 이 PRD는 셋을 한 저장소로 묶는다.

---

## 2. 목표 / 비목표

### 목표
- G1. `/ui-init` 한 번으로 프로젝트에 DESIGN.md · tokens.css · 훅 · CLAUDE.md 규약이 설치된다.
- G2. 설치된 프로젝트에서 UI 작업 시 스킬이 자동 트리거되어 DESIGN.md를 읽고 토큰만으로 만든다.
- G3. 그라데이션·AI-purple·하드코딩 색상·하드코딩 폰트는 **파일에 닿기 전에 차단**된다. 예외는 주석으로 근거를 남겨야만 통과한다.
- G4. 같은 프롬프트를 3번 돌려도 팔레트·폰트·라디우스가 같다 (토큰 커버리지 ≥ 95%).
- G5. 한국어 UI에 맞는 타이포 규칙(Pretendard, keep-all, 행간, 자간)이 기본값이다. 레퍼런스 4개 어디에도 없는 부분.
- G6. 팀 규모와 무관하게 동작한다. 플러그인 없는 작업자도 저장소에 커밋된 훅 때문에 같은 검사를 받는다.

### 비목표 (M0~M2)
- 컴포넌트 라이브러리 배포 (토큰과 규칙만; 컴포넌트는 M3 이후 검토)
- 이미지·로고·CIP·슬라이드·배너 생성 (ui-ux-pro-max의 범위 확장은 따르지 않는다)
- 네이티브(RN/Lynx/iOS) 지원
- Figma 동기화 (M3 후보)
- 멀티 브랜드 축 (브랜드 1개 = 프로젝트 1개)
- MCP 서버, 별도 인덱스, 검색 엔진 (seed-design 원칙: "문서에 있는 사실은 스킬에 옮겨 적지 않는다")
- 자동 수정(auto-fix). 훅은 차단과 안내만 한다.

---

## 3. 레퍼런스 분석 요약

상세는 `docs/research/`. 여기서는 "무엇을 가져오고 무엇을 버리는지"만.

| 저장소 (커밋) | 가져올 것 | 버릴 것 | 라이선스 |
|---|---|---|---|
| **taste-skill** (`ccbc156`, MIT) | 룰 표현 형식: **금지 + 명시적 예외 조건** 쌍. **이진(binary) 표현** ("zero", "banned")이 "sparingly"보다 지켜진다는 실측. 카운트 가능한 검사(아이브로우 ≤ 섹션/3, 지그재그 ≤ 2연속). 코드 전 1줄 "디자인 리드". 다이얼 3개(variance/motion/density). stitch-skill의 9섹션 DESIGN.md 스키마. laziness 연구: 스킬 description이 구체적일수록 발견률 68%→90%. | 랜딩페이지 전용 룰 60개(히어로 20단어 등). 서로 모순되는 12개 하위 스킬(Fraunces 금지 vs 추천, 아이브로우 금지 vs 필수). GSAP 스켈레톤. 이미지 생성 룰. 강제 수단 0. | MIT |
| **impeccable** (`94b7f34`, Apache-2.0) | 탐지기의 **정규식 자체**: AI-purple hex 9개, Tailwind `from-purple-* to-blue-*`, `bg-clip-text + bg-gradient`, OVERUSED_FONTS 목록. **2단 훅**: PostToolUse는 즉시 룰 13개만, 나머지는 Stop에서 한 번 (근거: 편집마다 잔소리하면 모델이 보수적으로 변함). `craft-floor.md` 44줄(Verify/Refuse). 모드 4종(Persuade/Operate/Read/Experience). "**브리프가 이긴다**" 탈출구. 클린 ack 문구("탐지 0 = 좋은 디자인이 아님"). 안전 레일(민감 파일·생성 파일 스킵, 재진입 가드, 6회 편집 후 자체 억제). | 5,500줄 `checks.mjs` 통째 이식. 17개 복제 트리. 23개 커맨드. Puppeteer. 호스트 시스템 프롬프트에 개입하는 지시문(`AUTONOMY_DIRECTIVE_CHECK`). CJK 룰 없음(측정 단위 전부 라틴 기준). | Apache-2.0 |
| **ui-ux-pro-max** (`f232671`, MIT) | 토큰 **3계층 스펙 문서**(primitive→semantic→component, DTCG JSON, shadcn 호환 네이밍). `ux-guidelines.csv` 119행 Do/Don't/Good/Bad/Severity (린트 룰 형태). `states-and-variants.md` 상태 우선순위(disabled > loading > active > focus > hover). `pro-rules.md` 체크리스트. BM25 "확신 없으면 0건" 패턴. `stack/design-audit.mjs` Playwright 감사 8종 (M3). | 검색 엔진과 CSV 전체(Python 의존, 영어, 랜딩 편향). 로고/CIP/배너/슬라이드. **글로벌 안티-그라데이션 룰 없음** (192 업종 중 14개만). 토큰 생성기(semantic에 hex 인라인 버그). ClaudeKit 잔재. 훅 0. | MIT |
| **seed-design** (`714ab67`, Apache-2.0 + 상표 고지) | **훅 배선 패턴**: PreToolUse 정규식 표 → exit 2 + "대신 이 파일을 고치고 이 명령을 실행하라". Stop 리마인더. AGENTS.md ✅항상/⚠️먼저 물어봄/🚫절대 삼단. **2계층 토큰**(scale→semantic) + 다크모드는 팔레트 반전(토큰별 분기 없음). 스케일 실값(4px 그리드 x0_5~x16, r0_5~r6, t1~t14 = 11~48px, d1~d6 = 50~300ms, easing 7종, shadow 3종). 색 문법 `fg|bg|stroke × role × variant × state`. 엘리베이션 룰("그림자는 화면에서 주목도 높은 몇 안 되는 요소에만"). 한국어 시스템 폰트 스택. Doctor 판정 어휘(`pass/fail/unknown:*`). sticking policy. | 캐럿 팔레트·로고·이름(**상표**, 재사용 불가). manner-temp 20토큰. 컴포넌트 105개. Lynx 스택. bun 강제. Stackflow. Figma 파일 키. | Apache-2.0 (토큰 값 OK) + NOTICE 상표 조항 |

**공통 결론**: 룰은 4곳에 넘친다. 없는 것은 (a) 토큰과 룰을 잇는 **강제**, (b) **한국어**, (c) 하나의 우선순위. 이 셋이 이 프로젝트의 존재 이유다.

---

## 4. 사용자와 시나리오

**사용자**: Claude Code로 프론트엔드를 만드는 한국어 팀. 디자이너가 매번 옆에 있지 않다. React + Tailwind가 다수, 일부 Vue/순수 CSS.

| # | 시나리오 | 흐름 | 성공 조건 |
|---|---|---|---|
| S1 | 신규 프로젝트 세팅 | `/ui-init` → 질문 3개(제품 모드, 액센트 색, 스택) → `DESIGN.md`, `src/styles/tokens.css`, `.claude/settings.json`, `.claude/hooks/design-lint.mjs`, CLAUDE.md 스니펫 생성 | 5분 내. 커밋 가능한 상태. |
| S2 | 일상 UI 작업 | "설정 화면 만들어줘" → 스킬 자동 로드 → DESIGN.md 읽음 → 1줄 디자인 리드 → 토큰으로 구현 → 훅 통과 → Stop 점검 | 작업자가 스킬 이름을 몰라도 된다. hex 0개. |
| S3 | 기존 프로젝트 온보딩 | `/ui-init --legacy` → DESIGN.md `tailwind_palette: allow`, `hardcoded_color: warn`으로 시작 → 점진 이관 후 `deny`로 전환 | 첫날 차단 폭탄 없음. |
| S4 | 리뷰/CI | `node .claude/hooks/design-lint.mjs --all` → 하드 룰 위반 시 exit 1 | PR에서 자동으로 걸린다. |
| S5 | 예외 요청 | "히어로에 브랜드 그라데이션 넣어줘" → 스킬이 DESIGN.md §8 예외 목록 확인 → 없으면 사용자에게 1줄 질문 → 승인 시 `/* ui-lint-allow gradient: 브랜드 히어로, DESIGN.md §8-1 */` 주석 + DESIGN.md 기록 | "브리프가 이긴다". 단 근거가 파일에 남는다. |

---

## 5. 아키텍처: 3계층

```
┌─ 프로젝트 (설치 결과) ──────────────────────────────────────┐
│  DESIGN.md            ← 계약. frontmatter는 린터가 읽음      │  ① 에셋
│  src/styles/tokens.css← 원색은 여기만. 2계층 (scale→semantic)│
│  CLAUDE.md (+스니펫)  ← "@DESIGN.md 읽고 ui-design 스킬 따름"│
│  .claude/settings.json← PreToolUse(차단) + Stop(점검)        │  ③ 하네스
│  .claude/hooks/design-lint.mjs ← 순수 Node, 의존성 0         │
└──────────────────────────────────────────────────────────┘
┌─ ui-skill-set 저장소 (플러그인 / npx skills add 원천) ───────┐
│  skills/ui-design/SKILL.md      ← 절차. ≤150줄               │  ② 룰
│  skills/ui-design/references/   ← craft-floor, banned,       │
│                                    korean-typography, states, │
│                                    preflight (필요할 때만 로드)│
│  skills/ui-init/SKILL.md        ← 설치기                      │
│  templates/                     ← DESIGN.md, tokens.css,      │
│                                    settings.json, hook 원본   │
└──────────────────────────────────────────────────────────┘
```

### 5.1 ① 에셋: DESIGN.md + tokens.css
- **DESIGN.md**는 사람이 읽는 계약이자 린터의 설정 파일이다. YAML frontmatter(기계용) + 본문 8섹션(사람용). 스키마는 §8.5.
- **tokens.css**는 프로젝트에서 원색(raw hex, px, ms)을 가질 수 있는 **유일한 파일**이다. 2계층:
  - scale: `--ui-gray-00…1000`, `--ui-accent-100…1000`, `--ui-space-*`, `--ui-radius-*`, `--ui-text-*`, `--ui-duration-*`, `--ui-ease-*`, `--ui-shadow-1…3`, `--ui-font-sans|mono`
  - semantic: `--ui-color-{fg|bg|stroke}-{role}-{variant}-{state}` (seed 문법 차용)
  - 다크모드: `[data-theme="dark"]`에서 **scale만 재정의**(팔레트 반전). semantic은 자동으로 따라온다.
  - Tailwind v4 `@theme` 블록으로 `bg-brand-solid`, `text-fg-neutral` 유틸리티를 노출. Tailwind가 아니면 `var(--ui-*)`를 직접 쓴다.
  - 그라데이션 토큰은 **`--ui-gradient-shimmer` 하나**(스켈레톤 전용). 장식용 그라데이션 어휘 자체가 없다. (seed와 동일한 판단)
- 기본 스케일 값은 seed-design의 브랜드 중립 부분을 가져온다 (Apache-2.0, NOTICE 표기). 캐럿·manner-temp·banner·magic 그라데이션은 제외.

### 5.2 ② 룰: 스킬
- 스킬은 **절차와 판단**만 담는다. 토큰 이름·컴포넌트 목록 같은 사실은 DESIGN.md/tokens.css가 원본이다 (seed 원칙).
- 절차 (SKILL.md 본문):
  1. `DESIGN.md` 읽기. 없으면 `/ui-init` 안내 후 중단.
  2. **디자인 리드 1줄** 선언: `읽기: <화면> · 모드 <Operate|Persuade|Read|Experience> · 대상 <누구> · 다이얼 V/M/D <n/n/n>`. 애매하면 질문 **딱 하나**.
  3. 모드는 화면 단위로 고른다. 제품 화면은 Operate가 기본. 랜딩만 Persuade.
  4. UI 편집 직전에 `references/craft-floor.md` 로드. 계획만 할 때는 로드 안 함.
  5. 토큰만 사용. 상태 5종(hover/disabled/loading/error/empty) 동시 구현.
  6. **한정된 패스**: 다 만들고 → 한 번 점검(`preflight.md`) → 한 번에 고치고 → 끝. 무한 셀프 QA 금지 (impeccable 원칙).
  7. **브리프가 이긴다**: 사용자가 명시한 것은 룰보다 우선. 단 예외는 DESIGN.md §8에 기록.
- 다이얼 기본값: **variance 4 / motion 3 / density 5**. taste-skill의 8/6/4는 랜딩 기준이라 "화려함"의 원인. 제품 UI 팀에는 보수적 기본값이 맞다. Persuade 모드에서만 올린다.

### 5.3 ③ 하네스: 훅
- **PreToolUse `Edit|Write|MultiEdit`** → `design-lint.mjs --pre`: 제안된 내용(`tool_input.content` / `new_string`)에 **하드 룰 4개**만 적용. 위반 시 `exit 2` + 고치는 법. 파일에 닿기 전에 막힌다.
- **Stop** → `design-lint.mjs --stop`: 작업 트리 변경 파일에 소프트 룰 전체 + 체크리스트. 발견 있으면 `{"decision":"block","reason":…}` **한 번만** (`stop_hook_active` 가드로 두 번째는 통과). 즉 딱 한 번의 수정 라운드.
- PostToolUse 경고 단계는 두지 않는다. impeccable의 실측: Stop 한 번이 편집마다 경고하는 것과 같은 효과이고 모델이 덜 보수적이다.
- 순수 Node(≥18), 의존성 0, `bash`/`jq` 불사용 → Windows 작업자도 동일 동작.
- 훅 스크립트는 **프로젝트에 커밋**된다(seed 방식). 플러그인 없는 작업자·CI도 같은 검사를 받는다. 플러그인은 설치기(`/ui-init`)와 스킬을 제공할 뿐 강제의 주체가 아니다.

---

## 6. 기능 요구사항

| ID | 요구사항 | 우선순위 | 마일스톤 |
|---|---|---|---|
| FR-1 | `templates/DESIGN.md`: frontmatter 스키마(§8.5) + 8섹션 본문. 브랜드 중립 기본값 채워짐 | P0 | M0 |
| FR-2 | `templates/tokens.css`: 2계층 토큰, light/dark, `@theme` 브릿지, Pretendard 스택 | P0 | M0 |
| FR-3 | `design-lint.mjs --pre`: 하드 룰 R1~R4, exit 2, 수정 안내 메시지, 예외 마커, 민감/생성/제외 파일 스킵 | P0 | M0 |
| FR-4 | `design-lint.test.mjs`: 룰별 양성/음성 케이스 assert (프레임워크 없음) | P0 | M0 |
| FR-5 | `templates/settings.json`: PreToolUse + Stop 배선 | P0 | M0 |
| FR-6 | `skills/ui-design/SKILL.md`: 절차 §5.2, 구체적 description(트리거 표면 열거 + "not for backend") | P0 | M0 |
| FR-7 | CLAUDE.md 스니펫 | P0 | M0 |
| FR-8 | `design-lint.mjs --stop`: 소프트 룰 S1~S15, 체크리스트, 1회 block | P1 | M1 |
| FR-9 | `references/`: craft-floor, banned, korean-typography, states-and-a11y, preflight | P1 | M1 |
| FR-10 | `skills/ui-init/SKILL.md`: 질문 3개 → 파일 생성, `--legacy` 완화 모드, `--update` 재설치 | P1 | M1 |
| FR-11 | `design-lint.mjs --all`: CI용, 하드 위반 시 exit 1, 요약 리포트(토큰 커버리지 %) | P1 | M1 |
| FR-12 | 플러그인 매니페스트(`.claude-plugin/`), `npx skills add` 호환 레이아웃, README(ko) | P1 | M2 |
| FR-13 | 골든 프롬프트 5개 + 일관성 측정 스크립트 | P1 | M2 |
| FR-14 | Tailwind v3 브릿지(`tailwind.config` extend 매핑) | P2 | M3 |
| FR-15 | Playwright 런타임 감사(대비·오버플로·터치 타겟·focus-visible) | P2 | M3 |
| FR-16 | Figma 변수 → tokens.css 동기화 | P2 | M3 |

---

## 7. 룰셋

### 7.1 하드 룰 (PreToolUse, exit 2 차단)
객관적이고, 단일 속성이고, 고치는 법이 "토큰을 써라" 하나인 것만. 4개.

| ID | 이름 | 패턴 (초안) | 예외 | 메시지 요지 |
|---|---|---|---|---|
| **R1** | `gradient` | `/\b(?:linear\|radial\|conic)-gradient\s*\(/i` · `/\bbg-gradient-to-[trbl]{1,2}\b/` · `/\b(?:from\|via\|to)-[a-z]+-\d{2,3}\b/` | 값이 `var(--ui-gradient-`로 시작 · 파일에 `ui-lint-allow gradient:` 마커 · DESIGN.md `gradient_policy: allow` | "그라데이션 감지. gradient_policy=none. 단색 토큰으로. 브랜드 근거가 있으면 `/* ui-lint-allow gradient: <이유> */`" |
| **R2** | `ai-purple` | hex `/#(?:7c3aed\|8b5cf6\|a855f7\|9333ea\|7e22ce\|6d28d9\|6366f1\|764ba2\|667eea)\b/i` · Tailwind `/\b(?:text\|bg\|from\|via\|to\|border\|ring)-(?:purple\|violet\|indigo\|fuchsia)-\d{2,3}\b/` | DESIGN.md `brand_hue` ∈ {purple, violet, indigo} | "AI 기본 보라. `--ui-color-*-brand-*` 토큰으로" |
| **R3** | `hardcoded-color` | CSS: `/#[0-9a-f]{3,8}\b/i`, `/\b(?:rgba?\|hsla?\|oklch\|oklab\|color-mix)\s*\(/i`. JSX/TS: 같은 패턴이되 같은 줄에 `color\|background\|border\|fill\|stroke\|shadow\|style\|css\|styled\|\[#` 문맥이 있을 때만. Tailwind 기본 팔레트: `/\b(?:bg\|text\|border\|ring\|fill\|stroke\|from\|via\|to\|divide\|outline\|shadow\|accent\|caret\|decoration\|placeholder)-(?:slate\|gray\|zinc\|neutral\|stone\|red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose)-\d{2,3}(?:\/\d+)?\b/` | 제외 파일(tokens.css, globals.css, tailwind.config.*, *.tokens.*, DESIGN.md, 테스트) · `transparent\|currentColor\|inherit` · DESIGN.md `hardcoded_color: warn`(레거시) · `tailwind_palette: allow` | "하드코딩 색. 시맨틱 토큰 `var(--ui-color-bg-…)` / `bg-brand-solid`" |
| **R4** | `hardcoded-font` | `/font-family\s*:\s*(?!var\()/i` · `/\bfont-\[/` · `fonts\.googleapis\.com` | 제외 파일 · DESIGN.md `font_families`에 선언된 이름 | "폰트는 `var(--ui-font-sans\|mono)`. Google Fonts `<link>` 금지, 셀프호스트" |

R1이 사용자의 핵심 요구다. R2는 R1과 함께 "AI 슬롭"의 90%를 잡는다(impeccable 통계). R3·R4는 "작업자마다 다른 UI"의 뿌리다.

### 7.2 소프트 룰 (Stop, 1회 block)
정규식으로 잡히지만 오탐 여지가 있거나 맥락에 따라 정당한 것. 메시지에 "정당하면 무시하고 이유를 남겨라"를 포함.

| ID | 이름 | 패턴 요지 | 출처 |
|---|---|---|---|
| S1 | `glass-decorative` | `backdrop-blur\|backdrop-filter` (모달 스크림·sticky 내비는 허용) | impeccable craft-floor, ui-ux-pro-max `blur-purpose` |
| S2 | `emoji-as-icon` | 마크업 줄의 이모지 코드포인트 | 4곳 공통 |
| S3 | `heavy-shadow` | `shadow-(lg\|xl\|2xl)`, 토큰 아닌 `box-shadow` | seed 엘리베이션, minimalist-skill |
| S4 | `bounce-easing` | `animate-bounce`, `cubic-bezier` y값 [-0.1, 1.1] 밖, `bounce\|elastic\|wobble` | impeccable |
| S5 | `h-screen` | `h-screen`, `100vh` → `dvh` | taste-skill |
| S6 | `z-arbitrary` | `z-\[\d{3,}\]`, `z-index:\s*\d{3,}` | ui-ux-pro-max |
| S7 | `transition-all` | `transition:\s*all`, `transition-all` | 성능 룰 |
| S8 | `eyebrow` | 같은 줄 `uppercase` + `tracking-` | taste-skill #1 위반 룰, impeccable "브리프도 못 살리는 유일한 금지" |
| S9 | `side-tab` | `border-l-[2-9]`, `border-left:\s*[3-9]px` | impeccable |
| S10 | `img-hover-scale` | `img` + `hover:scale-` | impeccable |
| S11 | `pure-bw` | `#000\b\|#000000\|#fff\b\|#ffffff` (tokens.css 밖) | taste-skill |
| S12 | `em-dash` | `—` (JSX 텍스트·문자열) | taste-skill (한국어에선 우선순위 낮음) |
| S13 | `korean-break-all` | `word-break:\s*break-all`, `break-all` | **신규** |
| S14 | `korean-tracking` | `tracking-tighter`, `letter-spacing:\s*-0\.0[3-9]` 이상 | **신규** |
| S15 | `buzzword` | "혁신적인", "차세대", "seamless", "unleash" 등 마케팅 상투어 (ko+en) | impeccable BUZZWORDS + 한국어 추가 |

### 7.3 체크리스트 (Stop 메시지에 첨부, 정규식 불가 항목)
- 상태 5종 구현됐나 (hover / disabled / loading / error / empty)
- 명도 대비 본문 4.5:1, 큰 글자·아이콘·포커스 3:1
- 액센트 1색. 페이지 전체 동일
- 라디우스 스케일 1종 (sharp / soft / pill) 고정
- primary CTA 화면당 1개
- 터치 타겟 ≥ 44px, `focus-visible` 보임, `prefers-reduced-motion` 존중
- 실제 카피 (로렘 입숨·"홍길동"·완벽한 숫자 금지)
- 한글 `word-break: keep-all`, 본문 행간 ≥ 1.5
- 다크모드 확인
- 그림자 쓴 요소 ≤ 3개 (seed: "주목도 높은 몇 안 되는 요소에만")

### 7.4 한국어 타이포 룰 (신규, `references/korean-typography.md`)
레퍼런스 4개 모두 라틴 기준이다. 아래는 이 프로젝트가 추가하는 것.
- 폰트: **Pretendard Variable** 셀프호스팅 + 폴백 `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", "Malgun Gothic", sans-serif`. 한/영 혼용 시 한 폰트로 통일(Pretendard는 라틴 커버).
- `html { word-break: keep-all; overflow-wrap: anywhere; }` 전역 기본.
- 본문 행간 ≥ 1.5 (한글은 라틴보다 행간이 더 필요). 제목 1.2~1.35.
- 자간: 한글에 `tracking-tighter`(-0.05em) 금지. 최대 -0.02em. 라틴 디스플레이 룰(-0.04em)은 한글에 적용 안 함.
- 측정 폭: 라틴 65~75ch ≈ 한글 **30~45자**. `max-width`는 ch가 아니라 px/rem으로.
- 숫자·가격: `font-variant-numeric: tabular-nums`, `₩` 또는 `원` 한 가지로 통일.
- `<html lang="ko">`.
- 카피: 존댓말 일관, 느낌표 금지(성공 메시지), "앗!" 금지(에러), 마케팅 상투어 금지.

### 7.5 예외 메커니즘
- 파일 내 마커: `/* ui-lint-allow <rule>: <이유> */` 또는 `// ui-lint-allow <rule>: <이유>`. **이유 필수**(impeccable의 `--reason` 규약). 마커 없는 우회 금지.
- DESIGN.md frontmatter 정책: `gradient_policy`, `tailwind_palette`, `hardcoded_color`, `brand_hue`, `font_families`.
- DESIGN.md §8 "허용 예외" 표에 기록. 스킬은 예외를 추가하기 전에 사용자에게 1줄로 묻는다.
- 안티 데드락: 같은 파일·같은 룰로 3회 연속 차단되면 4번째는 경고로 통과 (impeccable Cursor 훅 패턴).

---

## 8. 하네스 세팅 (설치되는 실제 파일)

### 8.1 저장소 구조

```
ui-skill-set/
├── .claude-plugin/
│   ├── plugin.json              # {"name":"ui-skill-set","version":"0.1.0",…}
│   └── marketplace.json         # plugins:[{"name":"ui-skill-set","source":"./"}]
├── skills/
│   ├── ui-design/
│   │   ├── SKILL.md             # 절차. ≤150줄
│   │   └── references/
│   │       ├── craft-floor.md   # Verify / Refuse (impeccable 차용 + 한국어 항목)
│   │       ├── banned.md        # 금지 + 예외 조건 통합 목록
│   │       ├── korean-typography.md
│   │       ├── states-and-a11y.md
│   │       └── preflight.md     # §7.3 체크리스트
│   └── ui-init/
│       └── SKILL.md             # 설치기
├── templates/                   # /ui-init이 프로젝트에 복사
│   ├── DESIGN.md
│   ├── tokens.css
│   ├── settings.json
│   ├── design-lint.mjs
│   ├── design-lint.test.mjs
│   └── CLAUDE.snippet.md
├── docs/
│   ├── PRD.md                   # 이 문서
│   └── research/                # 레퍼런스 분석 4건
├── eval/                        # M2: 골든 프롬프트
├── LICENSE                      # MIT (권장) + NOTICE (seed-design Apache 표기)
└── README.md
```

`skills/`가 단일 원천이다. Claude Code 플러그인도 `npx skills add`도 이 폴더를 읽는다. 심링크 불필요 (Windows 고려).

### 8.2 프로젝트에 설치되는 `.claude/settings.json`

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/design-lint.mjs --pre",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/design-lint.mjs --stop",
            "timeout": 20
          }
        ]
      }
    ]
  }
}
```

기존 settings.json이 있으면 `/ui-init`이 `hooks` 배열에 **병합**한다(덮어쓰지 않음).

### 8.3 훅 스크립트 I/O 계약 (`design-lint.mjs`)

| 모드 | 입력 (stdin JSON) | 동작 | 출력 |
|---|---|---|---|
| `--pre` | `tool_name`, `tool_input.{file_path, content \| new_string \| edits[]}` | 대상이 UI 파일이고 제외 목록이 아니면 하드 룰 R1~R4 | 위반: stderr에 `[ui-lint] R1 gradient @ src/Hero.tsx:12\n  → …고치는 법…` + `exit 2`. 통과: `exit 0`, 출력 없음 |
| `--stop` | `stop_hook_active`, `cwd` | `git diff --name-only HEAD` + untracked 중 UI 파일에 소프트 룰 + 체크리스트. `stop_hook_active === true`면 즉시 `exit 0` | 발견 있음: stdout `{"decision":"block","reason":"[ui-lint] …"}`. 없음: stdout `{"systemMessage":"[ui-lint] 소프트 룰 0건. 좋은 디자인이라는 뜻은 아닙니다. DESIGN.md를 계속 따르세요."}` |
| `--all` | 없음 (CLI) | 저장소 전체 UI 파일에 하드+소프트 | 리포트(파일별 발견, 토큰 커버리지 %). 하드 위반 있으면 `exit 1` |

- UI 파일: `.tsx .jsx .vue .svelte .astro .html .css .scss .less` + JSX/`styled`/`css\`` 를 포함하는 `.ts .js`
- 항상 스킵: `node_modules/`, `dist/`, `build/`, `.next/`, `*.d.ts`, `*.min.*`, `.env*`, `*.pem`, `*secret*`, lock 파일 (impeccable SENSITIVE/GENERATED 레일)
- 정책 스킵: tokens.css, globals.css, tailwind.config.*, `*.tokens.*`, DESIGN.md, `*.test.*`, `*.spec.*`
- 128KB 초과 파일 스킵 (번들)
- 오류는 절대 세션을 깨지 않는다: 최상위 try/catch → `exit 0` (impeccable "never break a turn")
- DESIGN.md frontmatter를 파싱해 정책을 읽는다. 없으면 "설치 안 된 프로젝트"로 보고 `exit 0` (no-op)
- 의존성 0. Node ≥ 18. `git`은 `--stop`에서만, 없으면 건너뜀

### 8.4 `skills/ui-design/SKILL.md` frontmatter와 골격

```yaml
---
name: ui-design
description: >
  UI 화면·컴포넌트·페이지·폼·설정·온보딩·빈 상태·대시보드·랜딩을 만들거나 고칠 때 사용.
  프로젝트의 DESIGN.md와 tokens.css만으로 구현하고, 그라데이션·하드코딩 색·이모지 아이콘 같은
  AI 기본 미학을 피한다. 색·타이포·간격·라디우스·그림자·모션·상태·접근성·한국어 타이포 포함.
  백엔드 전용·비UI 작업에는 사용하지 않는다.
version: 0.1.0
user-invocable: true
argument-hint: "[화면 또는 컴포넌트 설명]"
allowed-tools:
  - Bash(node .claude/hooks/design-lint.mjs *)
---
```

본문 순서: ① DESIGN.md 로드 (없으면 `/ui-init` 안내) → ② 디자인 리드 1줄 → ③ 모드 표 → ④ 편집 전 `references/craft-floor.md` 로드 → ⑤ 구현 규칙 요약(토큰만, 상태 5종, 한 개 액센트, 라디우스 락) → ⑥ 한정된 패스 + `preflight.md` → ⑦ 브리프 우선 + 예외 기록. 각 references는 "언제 로드"가 명시된다. 룰 본문은 SKILL.md에 복사하지 않는다.

description은 일부러 길다. taste-skill 연구: 구체적 description이 발견률을 68%→90%로 올린다.

### 8.5 `DESIGN.md` frontmatter 스키마 (린터가 읽는 부분)

```yaml
---
ui_skill_set: 0.1          # 스키마 버전. 린터가 호환성 판단
project: my-app
mode_default: operate      # operate | persuade | read | experience
platform: web              # web | mobile-web
stack: react-tailwind4     # react-tailwind4 | react-css | vue | plain
token_prefix: ui           # --ui-*
dials: { variance: 4, motion: 3, density: 5 }
brand_hue: blue            # R2 예외 판단용. purple|violet|indigo면 R2 해제
font_families: ["Pretendard Variable", "Pretendard"]   # R4 허용 목록
gradient_policy: none      # none | ai-feature | allow
tailwind_palette: deny     # deny | allow   (레거시는 allow로 시작)
hardcoded_color: block     # block | warn   (레거시는 warn으로 시작)
radius_scale: soft         # sharp | soft | pill
---
```

본문 8섹션 (stitch DESIGN.md 9섹션 + impeccable 8 H2를 합쳐 줄인 것):
1. **제품과 모드** - 무엇을, 누구에게, 기본 모드. 2~3문장.
2. **색** - 액센트 1색(이름 + hex + 역할), 뉴트럴 스케일, 상태색, 다크모드 전략, 그라데이션 정책.
3. **타이포** - 폰트 스택, 스케일 참조(t1~t14), 한국어 룰 요약.
4. **레이아웃·간격** - 4px 그리드, 브레이크포인트(base/sm 480/md 768/lg 1280/xl 1440), 컨테이너 최대폭, 거터.
5. **형태·깊이** - 라디우스 스케일(고정), 그림자 3단계와 "≤3개 요소" 정책, 스트로크 우선.
6. **모션** - d1~d6, easing 7종, 마이크로 ≤ 200ms, reduced-motion.
7. **컴포넌트 규약** - 버튼 variant 수, CTA 1개/화면, 상태 5종 필수, 아이콘 라이브러리 1종(스트로크 굵기 고정).
8. **금지와 허용 예외** - 프로젝트 추가 금지 + 예외 표(`| 규칙 | 위치 | 이유 | 승인자 | 날짜 |`).

### 8.6 `tokens.css` 구조

```css
/* tokens.css · ui-skill-set 0.1
   이 파일만 원색을 가진다. 컴포넌트는 semantic 토큰만 쓴다. (린터 R3/R4가 강제) */

:root {
  /* ── scale ─────────────────────────────────── */
  --ui-gray-00: …; /* … --ui-gray-1000 (11단계) */
  --ui-accent-100: …; /* … 1000. 프로젝트 액센트 1색 */
  --ui-red-*, --ui-green-*, --ui-blue-*;            /* critical / positive / informative */
  --ui-space-0_5: 2px; --ui-space-1: 4px; /* … x16: 64px (seed 4px 그리드) */
  --ui-radius-0_5: 2px; /* … --ui-radius-6: 24px; --ui-radius-full: 9999px */
  --ui-text-1: .6875rem; /* 11px … --ui-text-14: 3rem (48px) */
  --ui-leading-1: 15px;  /* … 14: 60px. 한글 본문은 ≥1.5 되도록 t5=16/24 */
  --ui-weight-regular: 400; --ui-weight-medium: 500; --ui-weight-bold: 700;
  --ui-duration-1: 50ms; /* … 6: 300ms */
  --ui-ease-standard: cubic-bezier(.35,0,.35,1);
  --ui-ease-enter: cubic-bezier(0,0,.15,1); --ui-ease-exit: cubic-bezier(.35,0,1,1);
  --ui-shadow-1: 0 1px 4px 0 rgb(0 0 0 / .08); /* … 3 */
  --ui-font-sans: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont,
                  "Apple SD Gothic Neo", "Segoe UI", "Malgun Gothic", sans-serif;
  --ui-font-mono: ui-monospace, "JetBrains Mono", Menlo, monospace;

  /* ── semantic: {fg|bg|stroke}-{role}-{variant}-{state} ── */
  --ui-color-fg-neutral: var(--ui-gray-1000);
  --ui-color-fg-neutral-muted: var(--ui-gray-800);
  --ui-color-fg-placeholder: var(--ui-gray-600);
  --ui-color-fg-disabled: var(--ui-gray-500);
  --ui-color-fg-brand: var(--ui-accent-600);
  --ui-color-fg-on-brand: var(--ui-gray-00);
  --ui-color-bg-basement: var(--ui-gray-200);
  --ui-color-bg-layer-default: var(--ui-gray-00);
  --ui-color-bg-brand-solid: var(--ui-accent-600);
  --ui-color-bg-brand-solid-pressed: var(--ui-accent-700);
  --ui-color-bg-brand-weak: var(--ui-accent-100);
  --ui-color-bg-neutral-weak: var(--ui-gray-100);
  --ui-color-bg-critical-solid: var(--ui-red-700);
  --ui-color-bg-overlay: rgb(0 0 0 / .7);
  --ui-color-stroke-neutral: var(--ui-gray-400);
  --ui-color-stroke-focus: var(--ui-accent-600);
  --ui-gradient-shimmer: linear-gradient(90deg, var(--ui-gray-100), var(--ui-gray-200), var(--ui-gray-100));
}

:root[data-theme="dark"] {
  /* scale만 반전. semantic은 자동. (seed 방식) */
  --ui-gray-00: #000000; /* … --ui-gray-1000: #ffffff */
  --ui-shadow-1: 0 1px 4px 0 rgb(0 0 0 / .5); /* 다크는 그림자 진하게 */
}

@media (prefers-reduced-motion: reduce) {
  :root { --ui-duration-1: 0ms; /* … 6 */ }
}

/* Tailwind v4 브릿지: bg-brand-solid, text-fg-neutral, rounded-2, p-4 … */
@theme {
  --color-fg-neutral: var(--ui-color-fg-neutral);
  --color-bg-brand-solid: var(--ui-color-bg-brand-solid);
  /* … semantic 전체 매핑 */
  --font-sans: var(--ui-font-sans);
  --radius-2: var(--ui-radius-2);
}
```

실제 hex 값은 M0에서 seed-design `packages/rootage/*.yaml`의 gray/red/green/blue 램프를 가져와 채운다. 액센트 램프는 `/ui-init` 질문으로 결정(기본: 채도 < 80%의 중립 파랑, 플레이스홀더로 표기).

### 8.7 `CLAUDE.md` 스니펫 (프로젝트 CLAUDE.md에 append)

```md
## UI 작업 규약 (ui-skill-set)
- UI(컴포넌트·스타일·페이지) 작업 전 반드시 @DESIGN.md 를 읽고 `ui-design` 스킬 절차를 따른다.
- 색·폰트·간격·라디우스·그림자는 `src/styles/tokens.css`의 `--ui-*` 토큰만 쓴다.
  원색(hex/rgb)·`font-family` 직접 지정·Tailwind 기본 팔레트 클래스(`bg-blue-500` 등)는 훅이 차단한다.
- 그라데이션은 DESIGN.md `gradient_policy`가 허용할 때만. 기본값 none.
- 훅 차단 메시지를 받으면 우회하지 말고 토큰으로 고친다. 예외가 꼭 필요하면
  `/* ui-lint-allow <rule>: <이유> */` 주석 + DESIGN.md §8 표에 기록하고, 먼저 사용자에게 1줄로 묻는다.
- 🚫 절대: tokens.css 밖에 원색 · DESIGN.md 무시 · 훅 비활성화
- ⚠️ 먼저 묻기: 새 액센트 색 · 라디우스 스케일 변경 · 폰트 추가 · 예외 추가
- ✅ 항상: 상태 5종 구현 · 다크모드 확인 · 한글 keep-all
```

### 8.8 배포

| 경로 | 명령 | 대상 |
|---|---|---|
| Claude Code 플러그인 | `claude plugin marketplace add sgustjd2/ui-skill-set` → `/plugin install ui-skill-set@ui-skill-set` | 팀 표준 |
| 벤더 CLI | `npx skills add https://github.com/sgustjd2/ui-skill-set --skill ui-design` | Cursor/Codex 등 |
| 수동 | `skills/` 복사 | 오프라인 |

어느 경로든 실제 강제는 `/ui-init`이 프로젝트에 커밋한 훅이 한다. 플러그인 유무는 강제와 무관.

---

## 9. 성공 지표와 검증

| 지표 | 목표 | 측정 |
|---|---|---|
| 하드 룰 위반 도달률 | 커밋된 코드에서 0 | CI `--all` |
| 토큰 커버리지 | 색·폰트 선언의 ≥ 95%가 토큰 | `--all` 리포트 |
| 일관성 | 골든 프롬프트 5개 × 3세션 → 팔레트·폰트·라디우스 사용 집합 동일 | `eval/consistency.mjs` (사용 토큰 추출·비교) |
| 예외 비율 | `ui-lint-allow` 마커 ≤ 하드 차단의 10% | `--all` 리포트 |
| 스킬 발견률 | UI 프롬프트 10개 중 ≥ 9개에서 자동 로드 | 수동 |
| 주관 평가 | 디자이너 리뷰 "일관성" "촌스럽지 않음" 각 ≥ 4/5 | 골든 화면 5개 |
| 차단 정확도 | 하드 룰 오탐 ≤ 5% | 도그푸딩 1주 로그 |

검증 순서: 룰별 단위 테스트(`design-lint.test.mjs`) → 도그푸딩 1 프로젝트 → 골든 프롬프트 → 디자이너 리뷰.

---

## 10. 마일스톤

| | 상태 | 산출물 | 완료 조건 |
|---|---|---|---|
| **M0 골격** | ✅ 완료 | FR-1~7. DESIGN.md·tokens.css 템플릿, `design-lint.mjs --pre` (R1~R4) + 테스트, settings.json, SKILL.md v0, CLAUDE 스니펫 | 실제 프로젝트 1개에 수동 설치, UI 편집 20회 중 그라데이션·hex 0건 도달 |
| **M1 룰 완성** | ✅ 완료 | FR-8~11. `--stop`(소프트 S1~S15), `--all`(토큰 커버리지 %), references 5개, `ui-init`(+`--legacy`, `--update`) | 레거시 프로젝트 1개 온보딩, 오탐 ≤ 5% |
| **M2 배포** | ✅ 완료 | FR-12~13. `.claude-plugin/` 매니페스트, `skills/llms.txt`, README(ko), 골든 프롬프트 5개 + `eval/consistency.mjs` | 다른 작업자가 README만 보고 설치·사용 성공 |
| **M3 확장** | 진행 중 | FR-15 ✅ 런타임 감사. FR-14 ✅ Tailwind v3 브릿지. FR-16 Figma는 수요 확인 후 | 수요 확인 후 |

**테스트**: design-lint 91 + install 19 + audit 24 + consistency 6 = 140개, 전부 통과.

**FR-14 Tailwind v3 브릿지**(2026-09-02): `@theme`는 v4 전용이라 v3는 `tailwind.ui-preset.cjs`(theme.extend 매핑) + `@theme` 제거한 tokens.css를 쓴다. install.mjs가 `--stack react-tailwind3`에서 `stripThemeBlock()`으로 `@theme`를 떼고 프리셋을 설치. 실제 Tailwind v3 CLI 빌드로 검증: `bg-brand-solid`·`text-4`(line-height 짝)·`rounded-control`·`shadow-1`·`hover:` 변형이 v4와 동일하게 `--ui-*` 참조 생성. 프리셋 색 키가 @theme의 `--color-*` 전부를 덮는지 테스트로 강제(드리프트 방지).

**FR-15 런타임 감사**(2026-09-02): 정적 룰이 못 잡는 대비·오버플로·터치타겟·focus-visible·접근이름·alt·구조를 Playwright로 검사. 도그푸딩에서 실제 결함 발견: 기본 accent-600 솔리드+흰 글자 3.95:1, red-700 텍스트 3.76:1 (둘 다 AA 미달). 대응: `fg-brand`·`bg-brand-solid`를 accent-700, `fg-critical`을 red-800로 조정(대비 통과). `bg-critical-solid`는 다크 반전 문제로 red-700 유지.

---

## 11. 결정 필요 사항

각 항목에 추천값이 있다. 답이 없으면 추천값으로 M0 진행.

| # | 결정 | 선택지 | 추천 | 영향 |
|---|---|---|---|---|
| D1 | 기본 스택 | React+Tailwind v4 / React+CSS / Vue / 순수 CSS | **React + Tailwind v4** | `@theme` 브릿지 포함 여부, Tailwind 팔레트 룰 활성 |
| D2 | R3 하드코딩 색상 | 차단 / 경고 | **차단** (레거시는 DESIGN.md로 완화) | 일관성 지표의 핵심 |
| D3 | 기본 폰트 | Pretendard Variable 셀프호스트 / 시스템 스택만 | **Pretendard** | R4 허용 목록, tokens.css |
| D4 | 토큰 접두사 | `--ui-` / 프로젝트명 | **`--ui-`** (DESIGN.md에서 변경 가능) | 린터 정규식 |
| D5 | 기본 다이얼 | 4/3/5 (제품) / 8/6/4 (taste-skill 랜딩) | **4/3/5** | 스킬 기본 톤 |
| D6 | 저장소 라이선스 | MIT / Apache-2.0 | **MIT** + NOTICE(seed·impeccable 출처) | 배포 |

---

## 12. 리스크와 완화

| 리스크 | 완화 |
|---|---|
| R3 오탐 (URL `#abc`, id 셀렉터) | JSX/TS는 스타일 문맥이 있는 줄만. CSS는 전부. 마커 탈출구. 3회 연속 차단 시 통과. |
| 훅 잔소리 → 모델 보수화 (impeccable 실측) | 하드 4개만 즉시. 나머지는 Stop 1회. PostToolUse 경고 단계 없음. |
| 레거시 프로젝트 차단 폭탄 | `--legacy`: `tailwind_palette: allow`, `hardcoded_color: warn`. 점진 전환. |
| 브랜드가 실제로 보라 | `brand_hue: purple` → R2 해제. "브리프가 이긴다". |
| Node 없는 환경 | 훅이 `exit 0` no-op + 1회 systemMessage. 세션은 절대 안 깨짐. |
| 룰 자체가 새로운 단일 미학이 됨 | 룰은 "기본값 거부"이지 "스타일 강제"가 아님. DESIGN.md가 프로젝트별 방향을 갖고, 모드 4종이 표면별로 다르게 판단. |
| 스킬이 안 뜸 | 구체적 description + CLAUDE.md 스니펫이 이중으로 잡음. |
| Windows | bash/jq 미사용. 심링크 미사용. 경로 `path.posix` 정규화. |

---

## 부록 A. 레퍼런스에서 그대로 가져오는 항목 (출처 표기)

| 항목 | 출처 파일 | 라이선스 |
|---|---|---|
| AI-purple hex 9개, Tailwind 그라데이션·purple 정규식 | impeccable `scripts/detector/rules/checks.mjs:224-235, 1506-1508` | Apache-2.0 |
| OVERUSED_FONTS, 브랜드 도메인 예외 | impeccable `scripts/detector/shared/constants.mjs:23-57` | Apache-2.0 |
| bounce/side-tab/img-hover 정규식 | impeccable `scripts/detector/engines/regex/detect-text.mjs:503-598` | Apache-2.0 |
| craft-floor Verify/Refuse | impeccable `reference/craft-floor.md` | Apache-2.0 |
| 2단 훅 근거, 즉시 룰 목록, 안전 레일 | impeccable `scripts/hook-lib.mjs:81-131` | Apache-2.0 |
| 스케일 값(dimension/radius/font-size/line-height/duration/timing/shadow) | seed-design `packages/rootage/*.yaml` | Apache-2.0 (NOTICE 표기) |
| 색 문법, 다크 팔레트 반전, 엘리베이션 룰 | seed-design `docs/content/foundations/{color,elevation}.mdx` | Apache-2.0 |
| PreToolUse 가드 exit 2 패턴, Stop 리마인더 | seed-design `.claude/hooks/*` | Apache-2.0 |
| 금지 + 예외 조건 표현, 카운트 검사, 디자인 리드, 다이얼 | taste-skill `skills/taste-skill/SKILL.md` | MIT |
| DESIGN.md 9섹션 스키마 | taste-skill `skills/stitch-skill/DESIGN.md` | MIT |
| 토큰 3계층 스펙, 상태 우선순위, 체크리스트 | ui-ux-pro-max `.claude/skills/design-system/references/*`, `references/pro-rules.md` | MIT |

seed-design의 이름·로고·캐릭터·캐럿 색은 상표라 쓰지 않는다 (NOTICE §9-18).

## 부록 B. 용어

- **AI 슬롭(slop)**: LLM의 통계적 기본 미학이 그대로 나온 결과. 이 문서에서는 §1.2 목록을 가리킨다.
- **하드 룰 / 소프트 룰**: 편집 전 차단 / 종료 전 1회 지적.
- **scale / semantic 토큰**: 원색 / 의미(역할) 토큰. 컴포넌트는 semantic만.
- **디자인 리드**: 코드 전 1줄 선언. 모델이 기본값으로 점프하는 것을 막는 장치.
- **모드**: 화면의 성공 조건. Operate(과업 완료) / Persuade(행동 유도) / Read(이해) / Experience(작품 안).
