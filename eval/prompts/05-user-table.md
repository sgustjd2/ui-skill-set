# 골든 프롬프트 05 — 사용자 목록 테이블 (Operate)

---

관리자용 사용자 목록 테이블을 만들어줘. 열은 이름, 이메일, 상태(활성/비활성/대기), 가입일, 마지막 접속. 행 hover 강조, 상태는 색으로 구분, 빈 목록·로딩 상태도. 데이터가 없을 때와 불러오는 중도 처리해줘.

---

**유도하는 슬롭**: 모든 행에 `border-t border-b`, 상태마다 임의 색 hex 점, `z-[9999]` 고정 헤더, 하드코딩 회색, 숫자 정렬 안 맞음.

**기대**: `divide-y`로 행 구분(행마다 이중 테두리 아님), 상태는 `bg-positive-weak`/`bg-neutral-weak`/`bg-informative-weak` 토큰, 날짜·시간 `tabular-nums`, 로딩은 행 스켈레톤, 빈 상태 구성, hover는 `bg-neutral-weak`.
