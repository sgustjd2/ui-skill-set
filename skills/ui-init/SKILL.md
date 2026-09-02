---
name: ui-init
description: >
  ui-skill-set을 현재 프로젝트에 설치한다. DESIGN.md·tokens.css·design-lint 훅·ui-design 스킬·CLAUDE 규약을
  넣는다. 신규 프로젝트 세팅, "UI 스킬셋 설치", "디자인 토큰 세팅", 레거시 프로젝트 온보딩(--legacy),
  기존 설치 업데이트(--update)에 사용한다.
version: 0.1.0
user-invocable: true
argument-hint: "[--legacy | --update]"
allowed-tools:
  - Bash(node */templates/install.mjs *)
  - Bash(node .claude/hooks/design-lint.mjs *)
---

# ui-init — ui-skill-set 설치

이 스킬은 `templates/install.mjs`를 실행해 설치를 끝낸다. 손으로 파일을 복사하지 않는다(설치기가 settings.json 병합·frontmatter 채우기·CLAUDE 멱등 추가를 정확히 한다).

## 1. 상황 판단

- 프로젝트 루트에 `DESIGN.md`가 **이미 있으면** → 재설치다. 사용자가 `--update`를 원하는지 확인한다(훅·스킬만 갱신, DESIGN.md·tokens.css 보존). 아니면 여기서 멈추고 무엇을 바꾸려는지 묻는다.
- 없으면 → 신규 설치. 아래 질문으로 진행.
- 인자에 `--legacy`가 있으면 → 레거시 모드(하드코딩 색은 경고로 시작, Tailwind 팔레트 허용). 점진 전환용.

## 2. 질문 (신규 설치, 최대 3개)

한 번에 묻는다. 확신이 서는 값은 기본값으로 두고 넘어간다.

1. **모드** — 이 프로젝트의 주 화면 성격. `operate`(제품 UI·대시보드·설정, 기본값) / `persuade`(랜딩·마케팅) / `read`(문서) / `experience`(갤러리).
2. **스택** — `react-tailwind4`(기본값) / `react-css` / `vue` / `plain`.
3. **브랜드 액센트** — 대략의 색조 이름(`blue` 기본값, 또는 실제 브랜드 hex). hex를 받으면 설치 후 tokens.css의 `--ui-accent-*`를 그 색 램프로 바꿔야 한다고 사용자에게 알린다. 색조가 `purple`/`violet`/`indigo`면 `--hue purple`로 넘겨 AI-purple 룰(R2)이 오탐하지 않게 한다.

## 3. 설치 실행

설치기 경로를 찾는다. 설치기는 ui-skill-set 루트의 `templates/install.mjs`에 있다.
- 플러그인으로 설치된 경우: `${CLAUDE_PLUGIN_ROOT}/templates/install.mjs`.
- 저장소를 직접 클론한 경우: 그 저장소의 `templates/install.mjs` (이 스킬 디렉토리 `skills/ui-init/`에서 두 단계 위).

```bash
node "${CLAUDE_PLUGIN_ROOT:-<ui-skill-set 루트>}/templates/install.mjs" --target . --mode <mode> --stack <stack> --hue <hue>
```

레거시: `--legacy` 추가. 업데이트: `--update`만(질문 생략).

설치기가 하는 일: `.claude/hooks/design-lint.mjs`, `.claude/skills/ui-design/`, `DESIGN.md`(frontmatter 채움), `src/styles/tokens.css`, `.claude/settings.json`(기존 훅 보존하며 병합), `CLAUDE.md`(규약 멱등 추가).

## 4. 마무리 (사용자에게 안내)

설치기 출력의 "다음 단계"를 그대로 전달하되, 다음을 직접 도와줄 수 있다고 알린다:
1. `DESIGN.md` §1~§2 채우기(제품 한 줄, 액센트 색). 브랜드 hex를 받았으면 `tokens.css`의 `--ui-accent-100…900`을 그 램프로 교체.
2. CSS 엔트리에서 `tokens.css` import. Tailwind v4면 `@import "tailwindcss";` 다음 줄.
3. Pretendard Variable 셀프호스트 + `<html>`에 다크모드 스크립트 한 줄(tokens.css 주석).
4. 검증: `node .claude/hooks/design-lint.mjs --all` → 토큰 커버리지와 위반 0 확인.

설치 후 UI 작업은 `ui-design` 스킬이 이어받는다. 여기서 다시 UI를 만들지 않는다.
