## UI 작업 규약 (ui-skill-set)
- UI(컴포넌트·스타일·페이지) 작업 전 반드시 @DESIGN.md 를 읽고 `ui-design` 스킬 절차를 따른다.
- 색·폰트·간격·라디우스·그림자는 `src/styles/tokens.css`의 `--ui-*` 토큰만 쓴다.
  원색(hex/rgb)·`font-family` 직접 지정·Tailwind 기본 팔레트 클래스(`bg-blue-500` 등)는 훅이 차단한다.
- 그라데이션은 DESIGN.md `gradient_policy`가 허용할 때만. 기본값 none.
- 훅 차단 메시지를 받으면 우회하지 말고 토큰으로 고친다. 예외가 꼭 필요하면
  `/* ui-lint-allow <rule>: <이유> */` 주석 + DESIGN.md §8 표에 기록하고, 먼저 사용자에게 1줄로 묻는다.
- 🚫 절대: tokens.css 밖에 원색 · DESIGN.md 무시 · 훅 비활성화 · Bash 리다이렉트로 UI 파일 우회 작성
- ⚠️ 먼저 묻기: 새 액센트 색 · 라디우스 스케일 변경 · 폰트 추가 · 예외 추가
- ✅ 항상: 상태 5종 구현 · 다크모드 확인 · 한글 keep-all · 종료 전 `preflight.md`
