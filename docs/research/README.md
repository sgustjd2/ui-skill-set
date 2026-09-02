# 레퍼런스 분석 (2026-09-02)

PRD(`../PRD.md`) §3의 근거. 각 파일은 해당 저장소를 정밀 분석한 보고서이며, 인용 경로는 아래 커밋 기준 저장소 루트 상대 경로다.

| 파일 | 저장소 | 커밋 | 라이선스 |
|---|---|---|---|
| [taste-skill.md](taste-skill.md) | github.com/leonxlnx/taste-skill | `ccbc156` (2026-08-24) | MIT |
| [impeccable.md](impeccable.md) | github.com/pbakaus/impeccable | `94b7f34` (2026-09-01) | Apache-2.0 |
| [ui-ux-pro-max-skill.md](ui-ux-pro-max-skill.md) | github.com/nextlevelbuilder/ui-ux-pro-max-skill | `f232671` (2026-09-01) | MIT |
| [seed-design.md](seed-design.md) | github.com/daangn/seed-design | `714ab67` (2026-09-01) | Apache-2.0 + 상표 고지 |

보고서는 영어(분석 에이전트 출력 원문)이며, 정규식·훅 JSON·토큰 값은 원문 그대로 인용되어 있어 구현 시 바로 참조할 수 있다.

## 한 줄 결론

| 저장소 | 준다 | 못 준다 |
|---|---|---|
| taste-skill | 룰을 **어떻게 써야 지켜지는지** (이진 표현, 예외 조건, 카운트 검사) | 강제 수단, 토큰, 스킬 간 일관성 |
| impeccable | **탐지기 정규식**과 **훅 배선의 실측 근거** | 토큰, 컴포넌트, CJK |
| ui-ux-pro-max | **토큰 계층 스펙 문서**, 119개 UX Do/Don't | 안티-그라데이션 의견(없음), 강제 |
| seed-design | **실제 토큰 값**, **훅 패턴**, 한국어 시스템 폰트, 엘리베이션 룰 | 브랜드(상표), 범용 판단 룰 |
