// ============================================================
// class-rules.js — 클래스한글명(1차/2차/3차) 드롭다운 옵션 및 클래스 코드 매핑 규칙
// utils.js보다 뒤에, product-name.js보다 앞에 로드되어야 합니다.
//
// ▶ 새 운용사 규칙을 추가하려면?
//   아래 CLASS_CODE_MAP_BY_COMPANY 객체에 회사 이름을 키(key)로 하는
//   새 배열을 추가하고, 그 회사 PDF에 나오는 클래스 코드 표를 그대로 옮겨 적으면 됩니다.
//   (운용사마다 코드 체계가 다를 수 있어서 이렇게 분리해뒀어요)
// ============================================================

// 클래스한글명 드롭다운 옵션 — 실제 등록 화면의 값과 동일하게 맞춤.
// "없음"을 실제 선택 가능한 값으로 포함시켜서, PDF에서 못 찾은 경우 명시적으로 "없음"이 선택되도록 함.
const CLASS1_OPTIONS = ["없음", "수수료선취", "수수료후취", "수수료미징구", "수수료선후취"];
const CLASS2_OPTIONS = ["없음", "온라인", "오프라인", "온라인슈퍼", "직판", "온오프라인"];
const CLASS3_OPTIONS = ["없음", "개인연금", "퇴직연금", "일반", "기관투자", "기관", "랩", "무권유저비용", "고액투자", "고액", "고액1", "고액2", "보수체감", "전문투자자", "기부", "펀드 등", "주택마련", "전환가능"];

// 운용사별 클래스 코드 매핑표.
// PDF 본문에 등장하는 "클래스 코드"(A, C, C-E, C-P2 등)를 1차/2차/3차로 변환할 때 사용함.
// 회사마다 같은 코드(A, C 등)라도 의미가 다를 수 있어서, 겹치는 게 있어도 회사별로 전부 따로 적어둠
// (일부러 공통 부분을 빼서 합치지 않음 — 나중에 회사가 늘어나면 그 회사 규칙만 보고 확인하기 편하도록).
const CLASS_CODE_MAP_BY_COMPANY = {

  // 하나자산운용 — "하나초단기채증권투자신탁[채권]" 투자설명서 기준
  "하나자산운용": [
    { code: "A",     tier1: "수수료선취",   tier2: "오프라인", tier3: "없음" },
    { code: "A-E",   tier1: "수수료선취",   tier2: "온라인",   tier3: "없음" },
    { code: "C",     tier1: "수수료미징구", tier2: "오프라인", tier3: "없음" },
    { code: "C-E",   tier1: "수수료미징구", tier2: "온라인",   tier3: "없음" },
    { code: "C-F",   tier1: "수수료미징구", tier2: "오프라인", tier3: "기관투자" },
    { code: "C-P",   tier1: "수수료미징구", tier2: "오프라인", tier3: "개인연금" },
    { code: "C-P2",  tier1: "수수료미징구", tier2: "오프라인", tier3: "퇴직연금" },
    { code: "C-PE",  tier1: "수수료미징구", tier2: "온라인",   tier3: "개인연금" },
    { code: "C-P2E", tier1: "수수료미징구", tier2: "온라인",   tier3: "퇴직연금" },
    { code: "W",     tier1: "수수료미징구", tier2: "오프라인", tier3: "랩" },
    { code: "AG",    tier1: "수수료선취",   tier2: "오프라인", tier3: "무권유저비용" },
    { code: "CG",    tier1: "수수료미징구", tier2: "오프라인", tier3: "무권유저비용" },
    { code: "I",     tier1: "수수료미징구", tier2: "오프라인", tier3: "고액투자" },
  ],

  // 한국투자신탁운용 — "한국투자 인컴주는 ETF모으기 증권 자투자신탁H(채권혼합-재간접형)" 투자설명서 기준
  "한국투자신탁운용": [
    { code: "A",     tier1: "수수료선취",   tier2: "오프라인", tier3: "없음" },
    { code: "A-e",   tier1: "수수료선취",   tier2: "온라인",   tier3: "없음" },
    { code: "A-G",   tier1: "수수료선취",   tier2: "오프라인", tier3: "무권유저비용" },
    { code: "A-P",   tier1: "수수료선취",   tier2: "오프라인", tier3: "개인연금" },
    { code: "A-Pe",  tier1: "수수료선취",   tier2: "온라인",   tier3: "개인연금" },
    { code: "A-R",   tier1: "수수료선취",   tier2: "오프라인", tier3: "퇴직연금" },
    { code: "A-Re",  tier1: "수수료선취",   tier2: "온라인",   tier3: "퇴직연금" },
    { code: "C",     tier1: "수수료미징구", tier2: "오프라인", tier3: "없음" },
    { code: "C-e",   tier1: "수수료미징구", tier2: "온라인",   tier3: "없음" },
    { code: "C-F",   tier1: "수수료미징구", tier2: "오프라인", tier3: "기관" },
    { code: "C-G",   tier1: "수수료미징구", tier2: "오프라인", tier3: "무권유저비용" },
    { code: "C-P",   tier1: "수수료미징구", tier2: "오프라인", tier3: "개인연금" },
    { code: "C-Pe",  tier1: "수수료미징구", tier2: "온라인",   tier3: "개인연금" },
    { code: "C-R",   tier1: "수수료미징구", tier2: "오프라인", tier3: "퇴직연금" },
    { code: "C-Re",  tier1: "수수료미징구", tier2: "온라인",   tier3: "퇴직연금" },
    { code: "C-W",   tier1: "수수료미징구", tier2: "오프라인", tier3: "랩" },
  ],

  // 교보악사자산운용 — "Tomorrow 장기우량증권투자신탁 K-1호(채권)"(59920) 간이투자설명서
  // 클래스 표 기준으로 전체 갱신함(2026-07-15). "A-i"는 "A"와 1~3차 조합이 완전히 동일해
  // (둘 다 수수료선취-오프라인-고액) 조합만으로는 구분이 불가능했음 — 코드 자체를 제거함
  // (2026-07-15). 실제로는 최초납입액 3억원(A) vs 20억/50억원 또는 전문투자자(A-i)로 가입조건이
  // 다르므로, 필요해지면 tier3를 세분화(예: "고액"/"고액-전문")해서 재등록해야 함.
  "교보악사자산운용": [
    { code: "A",     tier1: "수수료선취",   tier2: "오프라인", tier3: "고액" },
    { code: "C1",    tier1: "수수료미징구", tier2: "오프라인", tier3: "없음" },
    { code: "C2",    tier1: "수수료미징구", tier2: "오프라인", tier3: "고액" },
    { code: "CW",    tier1: "수수료미징구", tier2: "오프라인", tier3: "랩" },
    { code: "C4",    tier1: "수수료미징구", tier2: "오프라인", tier3: "주택마련" }, // (장마=장기주택마련저축)
    { code: "CF",    tier1: "수수료미징구", tier2: "오프라인", tier3: "기관" },
    { code: "CP",    tier1: "수수료미징구", tier2: "오프라인", tier3: "퇴직연금" },
    { code: "C-P2",  tier1: "수수료미징구", tier2: "오프라인", tier3: "개인연금" },
    { code: "A2",    tier1: "수수료선취",   tier2: "오프라인", tier3: "없음" },
    { code: "CE",    tier1: "수수료미징구", tier2: "온라인",   tier3: "없음" },
    { code: "S",     tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "S-P",   tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "개인연금" },
    { code: "Ae",    tier1: "수수료선취",   tier2: "온라인",   tier3: "없음" },
    { code: "CG",    tier1: "수수료미징구", tier2: "오프라인", tier3: "무권유저비용" },
    { code: "C-Pe",  tier1: "수수료미징구", tier2: "온라인",   tier3: "퇴직연금" },
    { code: "C-P2e", tier1: "수수료미징구", tier2: "온라인",   tier3: "개인연금" },
    { code: "AG",    tier1: "수수료선취",   tier2: "오프라인", tier3: "무권유저비용" },
  ],

  // 다올자산운용
  "다올자산운용": [
    { code: "A",    tier1: "수수료선취",   tier2: "오프라인", tier3: "없음" },
    { code: "Ae",   tier1: "수수료선취",   tier2: "온라인",   tier3: "없음" },
    { code: "Ag",   tier1: "수수료선취",   tier2: "오프라인", tier3: "무권유저비용" },
    { code: "C",    tier1: "수수료미징구", tier2: "오프라인", tier3: "없음" },
    { code: "Ce",   tier1: "수수료미징구", tier2: "온라인",   tier3: "없음" },
    { code: "Cg",   tier1: "수수료미징구", tier2: "오프라인", tier3: "무권유저비용" },
    { code: "CF",   tier1: "수수료미징구", tier2: "오프라인", tier3: "기관" },
    { code: "CW",   tier1: "수수료미징구", tier2: "오프라인", tier3: "랩" },
    { code: "CI",   tier1: "수수료미징구", tier2: "오프라인", tier3: "고액" },
    { code: "C-P",  tier1: "수수료미징구", tier2: "오프라인", tier3: "개인연금" },
    { code: "C-Pe", tier1: "수수료미징구", tier2: "온라인",   tier3: "개인연금" },
    { code: "CP",   tier1: "수수료미징구", tier2: "오프라인", tier3: "퇴직연금" },
    { code: "CPe",  tier1: "수수료미징구", tier2: "온라인",   tier3: "퇴직연금" },
    { code: "S",    tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "S-P",  tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "개인연금" },
    { code: "S-P(퇴직)", tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "퇴직연금" },
  ],

  // 마이다스에셋자산운용
  "마이다스에셋자산운용": [
    { code: "A",     tier1: "수수료선취",   tier2: "오프라인", tier3: "없음" },
    { code: "Ae",    tier1: "수수료선취",   tier2: "온라인",   tier3: "없음" },
    { code: "C1",    tier1: "수수료미징구", tier2: "오프라인", tier3: "보수체감" },
    { code: "C2",    tier1: "수수료미징구", tier2: "오프라인", tier3: "보수체감" },
    { code: "C3",    tier1: "수수료미징구", tier2: "오프라인", tier3: "보수체감" },
    { code: "C4",    tier1: "수수료미징구", tier2: "오프라인", tier3: "보수체감" },
    { code: "Ce",    tier1: "수수료미징구", tier2: "온라인",   tier3: "없음" },
    { code: "C-F",   tier1: "수수료미징구", tier2: "오프라인", tier3: "기관" },
    { code: "C-W",   tier1: "수수료미징구", tier2: "오프라인", tier3: "랩" },
    { code: "C-P1",  tier1: "수수료미징구", tier2: "오프라인", tier3: "개인연금" },
    { code: "C-Pe1", tier1: "수수료미징구", tier2: "온라인",   tier3: "개인연금" },
    { code: "C-P2",  tier1: "수수료미징구", tier2: "오프라인", tier3: "퇴직연금" },
    { code: "C-Pe2", tier1: "수수료미징구", tier2: "온라인",   tier3: "퇴직연금" },
    { code: "S",     tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "S-P",   tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "개인연금" },
    { code: "S-R",   tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "퇴직연금" },
    { code: "AG",    tier1: "수수료선취",   tier2: "오프라인", tier3: "무권유저비용" },
    { code: "CG",    tier1: "수수료미징구", tier2: "오프라인", tier3: "무권유저비용" },
  ],

  // 미래에셋자산운용
  "미래에셋자산운용": [
    { code: "A",     tier1: "수수료선취",   tier2: "오프라인", tier3: "없음" },
    { code: "A-e",   tier1: "수수료선취",   tier2: "온라인",   tier3: "없음" },
    { code: "AG",    tier1: "수수료선취",   tier2: "오프라인", tier3: "무권유저비용" },
    { code: "C",     tier1: "수수료미징구", tier2: "오프라인", tier3: "없음" },
    { code: "C-e",   tier1: "수수료미징구", tier2: "온라인",   tier3: "없음" },
    { code: "CG",    tier1: "수수료미징구", tier2: "오프라인", tier3: "무권유저비용" },
    { code: "C-i",   tier1: "수수료미징구", tier2: "오프라인", tier3: "기관" },
    { code: "C-w",   tier1: "수수료미징구", tier2: "오프라인", tier3: "랩" },
    { code: "C-P",   tier1: "수수료미징구", tier2: "오프라인", tier3: "개인연금" },
    { code: "C-Pe",  tier1: "수수료미징구", tier2: "온라인",   tier3: "개인연금" },
    { code: "C-P2",  tier1: "수수료미징구", tier2: "오프라인", tier3: "퇴직연금" },
    { code: "C-P2e", tier1: "수수료미징구", tier2: "온라인",   tier3: "퇴직연금" },
  ],

  // 삼성자산운용 — "삼성글로벌선진국증권자투자신탁H[주식]" 투자설명서 기준
  "삼성자산운용": [
    { code: "A",     tier1: "수수료선취",   tier2: "오프라인",   tier3: "없음" },
    { code: "Ae",    tier1: "수수료선취",   tier2: "온라인",     tier3: "없음" },
    { code: "Ag",    tier1: "수수료선취",   tier2: "오프라인",   tier3: "무권유저비용" },
    { code: "C1",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "보수체감" },
    { code: "C2",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "보수체감" },
    { code: "C3",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "보수체감" },
    { code: "C4",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "보수체감" },
    { code: "Ce",    tier1: "수수료미징구", tier2: "온라인",     tier3: "없음" },
    { code: "Cg",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "무권유저비용" },
    { code: "Cf",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "기관" },
    { code: "Ci",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "고액" },
    { code: "Cw",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "랩" },
    { code: "C-P",   tier1: "수수료미징구", tier2: "오프라인",   tier3: "개인연금" },
    { code: "C-Pe",  tier1: "수수료미징구", tier2: "온라인",     tier3: "개인연금" },
    { code: "Cp(퇴직연금)",   tier1: "수수료미징구", tier2: "오프라인", tier3: "퇴직연금" },
    { code: "Cpe(퇴직연금)",  tier1: "수수료미징구", tier2: "온라인",   tier3: "퇴직연금" },
    { code: "Cp-f(퇴직연금)", tier1: "수수료미징구", tier2: "오프라인", tier3: "기관,퇴직연금" },
    { code: "S",     tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "S-P",   tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "개인연금" },
    { code: "S-P(퇴직연금)", tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "퇴직연금" },
  ],

  // 신한자산운용 — "신한밸류업인덱스알파증권자투자신탁제1호[주식]" 투자설명서 기준
  "신한자산운용": [
    { code: "종류A",    tier1: "수수료선취",   tier2: "오프라인",   tier3: "없음" },
    { code: "종류A-e",  tier1: "수수료선취",   tier2: "온라인",     tier3: "없음" },
    { code: "종류C1",   tier1: "수수료미징구", tier2: "오프라인",   tier3: "없음" },
    { code: "종류C-e",  tier1: "수수료미징구", tier2: "온라인",     tier3: "없음" },
    { code: "종류C-i",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "고액,기관" },
    { code: "종류C-p",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "개인연금" },
    { code: "종류C-pe", tier1: "수수료미징구", tier2: "온라인",     tier3: "개인연금" },
    { code: "종류C-r",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "퇴직연금" },
    { code: "종류C-re", tier1: "수수료미징구", tier2: "온라인",     tier3: "퇴직연금" },
    { code: "종류C-w",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "랩" },
    { code: "종류S",    tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "종류S-P",  tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "개인연금" },
    { code: "종류S-R",  tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "퇴직연금" },
  ],

  // 아이비케이자산운용
  "IBK자산운용": [
    { code: "A",     tier1: "수수료선취",   tier2: "오프라인",   tier3: "없음" },
    { code: "C",     tier1: "수수료미징구", tier2: "오프라인",   tier3: "없음" },
    { code: "Ae",    tier1: "수수료선취",   tier2: "온라인",     tier3: "없음" },
    { code: "Ce",    tier1: "수수료미징구", tier2: "온라인",     tier3: "없음" },
    { code: "Cf",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "전문투자자" },
    { code: "Cw",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "랩" },
    { code: "S",     tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "S-P",   tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "개인연금" },
    { code: "S-R",   tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "퇴직연금" },
    { code: "C-P",   tier1: "수수료미징구", tier2: "오프라인",   tier3: "개인연금" },
    { code: "C-Pe",  tier1: "수수료미징구", tier2: "온라인",     tier3: "개인연금" },
    { code: "C-R",   tier1: "수수료미징구", tier2: "오프라인",   tier3: "퇴직연금" },
    { code: "C-Re",  tier1: "수수료미징구", tier2: "온라인",     tier3: "퇴직연금" },
    { code: "AG",    tier1: "수수료선취",   tier2: "오프라인",   tier3: "무권유저비용" },
    { code: "CG",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "무권유저비용" },
    { code: "C-i1",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "고액1" },
    { code: "C-i2",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "고액2" },
  ],

  // 엔에이치아문디자산운용
  "NH아문디자산운용": [
    { code: "A",   tier1: "수수료선취",   tier2: "오프라인", tier3: "없음" },
    { code: "Ae",  tier1: "수수료선취",   tier2: "온라인",   tier3: "없음" },
    { code: "C",   tier1: "수수료미징구", tier2: "오프라인", tier3: "없음" },
    { code: "Ce",  tier1: "수수료미징구", tier2: "온라인",   tier3: "없음" },
    { code: "Cf",  tier1: "수수료미징구", tier2: "오프라인", tier3: "기관" },
    { code: "C-P1(연금저축)",  tier1: "수수료미징구", tier2: "오프라인", tier3: "개인연금" },
    { code: "C-P1e(연금저축)", tier1: "수수료미징구", tier2: "온라인",   tier3: "개인연금" },
    { code: "C-P2(퇴직연금)",  tier1: "수수료미징구", tier2: "오프라인", tier3: "퇴직연금" },
    { code: "C-P2e(퇴직연금)", tier1: "수수료미징구", tier2: "온라인",   tier3: "퇴직연금" },
  ],

  // 우리자산운용
  "우리자산운용": [
    { code: "A",    tier1: "수수료미징구", tier2: "오프라인", tier3: "없음" },
    { code: "A-e",  tier1: "수수료미징구", tier2: "온라인",   tier3: "없음" },
    { code: "A-G",  tier1: "수수료미징구", tier2: "오프라인", tier3: "무권유저비용" },
    { code: "B",    tier1: "수수료선취",   tier2: "오프라인", tier3: "없음" },
    { code: "B2",   tier1: "수수료선취",   tier2: "오프라인", tier3: "없음" },
    { code: "B-e",  tier1: "수수료선취",   tier2: "온라인",   tier3: "없음" },
    { code: "B-G",  tier1: "수수료선취",   tier2: "오프라인", tier3: "무권유저비용" },
    { code: "I",    tier1: "수수료미징구", tier2: "오프라인", tier3: "펀드 등" },
    { code: "C-I",  tier1: "수수료미징구", tier2: "오프라인", tier3: "고액" },
    { code: "C-W",  tier1: "수수료미징구", tier2: "오프라인", tier3: "랩" },
    { code: "C-P",  tier1: "수수료미징구", tier2: "오프라인", tier3: "퇴직연금" },
    { code: "C-Pe", tier1: "수수료미징구", tier2: "온라인",   tier3: "퇴직연금" },
    { code: "S",    tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "C-P1", tier1: "수수료미징구", tier2: "오프라인", tier3: "개인연금" },
    { code: "C-P1e",tier1: "수수료미징구", tier2: "온라인",   tier3: "개인연금" },
    { code: "S-P",  tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "개인연금" },
    { code: "S-P(퇴직)", tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "퇴직연금" },
  ],

  // 유리자산운용
  "유리자산운용": [
    { code: "A",     tier1: "수수료선취",   tier2: "오프라인", tier3: "없음" },
    { code: "A-e",   tier1: "수수료선취",   tier2: "온라인",   tier3: "없음" },
    { code: "C",     tier1: "수수료미징구", tier2: "오프라인", tier3: "없음" },
    { code: "C-e",   tier1: "수수료미징구", tier2: "온라인",   tier3: "없음" },
    { code: "C1",    tier1: "수수료미징구", tier2: "오프라인", tier3: "기관" },
    { code: "I",     tier1: "수수료미징구", tier2: "오프라인", tier3: "고액" },
    { code: "W",     tier1: "수수료미징구", tier2: "오프라인", tier3: "랩" },
    { code: "S",     tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "C-G",   tier1: "수수료미징구", tier2: "오프라인", tier3: "무권유저비용" },
    { code: "C-P1",  tier1: "수수료미징구", tier2: "오프라인", tier3: "퇴직연금" },
    { code: "C-P1e", tier1: "수수료미징구", tier2: "온라인",   tier3: "퇴직연금" },
    { code: "C-P2",  tier1: "수수료미징구", tier2: "오프라인", tier3: "개인연금" },
    { code: "C-P2e", tier1: "수수료미징구", tier2: "온라인",   tier3: "개인연금" },
  ],

  // 유진자산운용 — 보수/수수료율 등은 클래스 분류와 무관해서 제외하고 코드-설명만 정리함
  "유진자산운용": [
    { code: "A",     tier1: "수수료선취",   tier2: "오프라인",   tier3: "없음" },
    { code: "A2",    tier1: "수수료선취",   tier2: "오프라인",   tier3: "없음" },
    { code: "A-E",   tier1: "수수료선취",   tier2: "온라인",     tier3: "없음" },
    { code: "C",     tier1: "수수료미징구", tier2: "오프라인",   tier3: "없음" },
    { code: "C-E",   tier1: "수수료미징구", tier2: "온라인",     tier3: "없음" },
    { code: "C-F",   tier1: "수수료미징구", tier2: "오프라인",   tier3: "기관" },
    { code: "C-I",   tier1: "수수료미징구", tier2: "오프라인",   tier3: "고액" },
    { code: "C-I2",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "고액" },
    { code: "C-W",   tier1: "수수료미징구", tier2: "오프라인",   tier3: "랩" },
    { code: "C-P1",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "개인연금" },
    { code: "C-Pe",  tier1: "수수료미징구", tier2: "온라인",     tier3: "개인연금" },
    { code: "C-P2",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "퇴직연금" },
    { code: "C-Pe2", tier1: "수수료미징구", tier2: "온라인",     tier3: "퇴직연금" },
    { code: "S",     tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "S-P",   tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "개인연금" },
    { code: "S-R",   tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "퇴직연금" },
    // 원문 "디폴트옵션" → 표준 2차 옵션엔 없어서 채널 구분 없는 "온오프라인"으로 매핑함 (확인 필요)
    { code: "O",     tier1: "수수료미징구", tier2: "온오프라인", tier3: "퇴직연금" },
    { code: "A-G",   tier1: "수수료선취",   tier2: "오프라인",   tier3: "무권유저비용" },
    { code: "C-G",   tier1: "수수료미징구", tier2: "오프라인",   tier3: "무권유저비용" },
  ],

  // 케이비자산운용
  // "KB RISE 글로벌 AI밸류체인 ETF 모아드림 증권 투자신탁(주식-재간접형)" 투자설명서(p.9)의
  // 종류(클래스) 표 기준으로 확인·갱신함. 기존에 있던 "C-D"(기부)는 이 문서에 없어 제거했고,
  // 실제 문서에 있는 C-W/S-P/C-P/C-Pe/S-퇴직을 추가함. (다른 KB자산운용 펀드는 클래스 구성이
  // 다를 수 있음 — 새 상품 등록 시 실제 문서와 다르면 이 목록도 같이 갱신해주세요)
  "KB자산운용": [
    { code: "A",      tier1: "수수료선취",   tier2: "오프라인",   tier3: "없음" },
    { code: "A-E",    tier1: "수수료선취",   tier2: "온라인",     tier3: "없음" },
    { code: "A-G",    tier1: "수수료선취",   tier2: "오프라인",   tier3: "무권유저비용" },
    { code: "C",      tier1: "수수료미징구", tier2: "오프라인",   tier3: "없음" },
    { code: "C-E",    tier1: "수수료미징구", tier2: "온라인",     tier3: "없음" },
    { code: "C-G",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "무권유저비용" },
    { code: "C-F",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "기관" },
    { code: "C-W",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "랩" },
    { code: "S",      tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "S-P",    tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "개인연금" },
    { code: "C-P",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "개인연금" },
    { code: "C-Pe",   tier1: "수수료미징구", tier2: "온라인",     tier3: "개인연금" },
    { code: "C-퇴직",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "퇴직연금" },
    { code: "C-퇴직e", tier1: "수수료미징구", tier2: "온라인",     tier3: "퇴직연금" },
    { code: "S-퇴직",  tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "퇴직연금" },
  ],

  // 한국투자밸류자산운용 (※ "한국투자신탁운용"과는 다른 별개 회사)
  "한국투자밸류자산운용": [
    { code: "A",    tier1: "수수료선취",   tier2: "오프라인",   tier3: "없음" },
    { code: "A-E",  tier1: "수수료선취",   tier2: "온라인",     tier3: "없음" },
    { code: "A-G",  tier1: "수수료선취",   tier2: "오프라인",   tier3: "무권유저비용" },
    { code: "C",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "없음" },
    { code: "C-E",  tier1: "수수료미징구", tier2: "온라인",     tier3: "없음" },
    { code: "C-G",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "무권유저비용" },
    { code: "S",    tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "C-W",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "랩" },
    { code: "C-I",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "고액" },
    { code: "C-F",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "기관" },
    { code: "C-P",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "개인연금" },
    { code: "C-Pe", tier1: "수수료미징구", tier2: "온라인",     tier3: "개인연금" },
    { code: "C-R",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "퇴직연금" },
    { code: "C-Re", tier1: "수수료미징구", tier2: "온라인",     tier3: "퇴직연금" },
    { code: "S-P",  tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "개인연금" },
    { code: "S-R",  tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "퇴직연금" },
  ],

  // 한화자산운용
  "한화자산운용": [
    { code: "A",    tier1: "수수료선취",   tier2: "오프라인",   tier3: "없음" },
    { code: "A-e",  tier1: "수수료선취",   tier2: "온라인",     tier3: "없음" },
    { code: "C",    tier1: "수수료미징구", tier2: "오프라인",   tier3: "없음" },
    { code: "C-e",  tier1: "수수료미징구", tier2: "온라인",     tier3: "없음" },
    { code: "C-f",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "기관" },
    { code: "C-w",  tier1: "수수료미징구", tier2: "오프라인",   tier3: "랩" },
    { code: "C-P(연금저축)",   tier1: "수수료미징구", tier2: "오프라인", tier3: "개인연금" },
    { code: "C-Pe(연금저축)",  tier1: "수수료미징구", tier2: "온라인",   tier3: "개인연금" },
    { code: "C-RP(퇴직연금)",  tier1: "수수료미징구", tier2: "오프라인", tier3: "퇴직연금" },
    { code: "C-RPe(퇴직연금)", tier1: "수수료미징구", tier2: "온라인",   tier3: "퇴직연금" },
    { code: "S",    tier1: "수수료후취",   tier2: "온라인슈퍼", tier3: "없음" },
    { code: "S-P(연금저축)",   tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "개인연금" },
    { code: "S-RP(퇴직연금)",  tier1: "수수료미징구", tier2: "온라인슈퍼", tier3: "퇴직연금" },
    { code: "AG",   tier1: "수수료선취",   tier2: "오프라인",   tier3: "무권유저비용" },
    { code: "CG",   tier1: "수수료미징구", tier2: "오프라인",   tier3: "무권유저비용" },
    // 원문 "온라인직접판매"/"오프라인직접판매" → 표준 2차 옵션엔 "직판"만 있어서 채널 구분 없이 매핑함
    { code: "J-e",            tier1: "수수료미징구", tier2: "직판", tier3: "없음" },
    { code: "J-P(연금저축)",   tier1: "수수료미징구", tier2: "직판", tier3: "개인연금" },
    { code: "J-Pe(연금저축)",  tier1: "수수료미징구", tier2: "직판", tier3: "개인연금" },
    { code: "J-RPe(퇴직연금)", tier1: "수수료미징구", tier2: "직판", tier3: "퇴직연금" },
  ],

};

// 아직 회사를 특정할 수 없거나(펀드명/운용사 추출 전) 여러 회사에 걸쳐 검사해야 할 때 쓰는
// "전체 통합" 목록 — 등록된 모든 운용사 규칙을 합침.
function getAllClassCodeEntries() {
  return Object.values(CLASS_CODE_MAP_BY_COMPANY).flat();
}

// ------------------------------------------------------------
// PDF 본문에서 직접 클래스 표를 추출하는 기능 (2026-07-16 추가)
//
// 기존엔 회사마다 CLASS_CODE_MAP_BY_COMPANY에 코드표를 하드코딩해두고 그걸로만 매칭했는데,
// 회사마다/펀드마다 실제 클래스 구성이 조금씩 달라서(예: 같은 "하나자산운용"인데 펀드에 따라
// A-U, C1~C5 같은 코드가 있기도 하고 없기도 함) 매번 하드코딩 표를 갱신해줘야 하는 문제가 있었음.
//
// 그래서 지금 열려있는 PDF 본문(searchableText)의 "종류(클래스)" 표 자체를 정규식으로 바로
// 읽어서 1차/2차/3차를 그 자리에서 해석하는 방식을 추가함. 이 방식으로 뽑히면 하드코딩 표보다
// 우선 사용하고(getActiveClassTable/detectClassCode), 표 형식이 특이해서 못 뽑히는 문서만
// 기존 하드코딩 표로 대체함(안전망).
// ------------------------------------------------------------

// 코드의 설명 문구(예: "수수료미징구-오프라인-무권유저비용")를 "-"로 나눠서 그 자리에서 1차/2차/3차로 해석.
// (특정 회사 표를 참조하지 않고, 문구에 어떤 단어가 들어있는지만 보고 표준 옵션에 매핑함)
function parseClassDescription(desc) {
  // PDF에서 뽑은 원문은 줄바꿈 때문에 단어 중간이 끼어 잘리는 경우가 있음
  // (예: "무권\n유저비용", "퇴\n직연금") → 공백/줄바꿈을 다 지우고 나서 키워드 매칭함.
  let raw = (desc || "").replace(/\s+/g, "");

  // 매트릭스형 표(ctExtractMatrixPage)에서 열 경계가 살짝 겹쳐서, 바로 옆 클래스의 글자 1개가
  // "미징"과 "구" 사이에 잘못 끼어드는 경우가 실제로 관찰됨(예: "수수료미징)구", "수수료미징보구").
  // "수수료미징구"는 항상 붙어있는 고정 문구라서, 그 사이에 뭔가 끼어있으면 100% 노이즈로 보고 제거.
  raw = raw.replace(/수수료미징.?구/, "수수료미징구");

  let tier1 = "없음";
  if (raw.includes("수수료선후취")) tier1 = "수수료선후취";
  else if (raw.includes("수수료선취")) tier1 = "수수료선취";
  else if (raw.includes("수수료후취")) tier1 = "수수료후취";
  else if (raw.includes("수수료미징구")) tier1 = "수수료미징구";

  let tier2 = "없음";
  if (raw.includes("온라인슈퍼")) tier2 = "온라인슈퍼";
  else if (raw.includes("온오프라인")) tier2 = "온오프라인";
  // "온라인직접판매"/"오프라인직접판매"는 "온라인"/"오프라인" 문자열을 포함하고 있어서 아래
  // "온라인"/"오프라인" 검사보다 먼저 걸러내야 함 (안 그러면 "직판"이 아니라 "온라인"/"오프라인"로
  // 잘못 분류됨 — 표준 2차 옵션엔 "직판"만 있어서 채널구분 없이 매핑, 한화자산운용 J-e 등에서 확인됨)
  else if (raw.includes("직접판매") || raw.includes("직판")) tier2 = "직판";
  else if (raw.includes("온라인")) tier2 = "온라인";
  else if (raw.includes("오프라인")) tier2 = "오프라인";

  // 좀 더 구체적인 표현을 먼저 검사해야 함(예: "고액투자"/"고액1"/"고액2"가 "고액"에 먼저 걸려버리면 안 됨)
  let tier3 = "없음";
  if (raw.includes("무권유저비용")) tier3 = "무권유저비용";
  else if (raw.includes("퇴직연금") || raw.includes("퇴직")) tier3 = "퇴직연금";
  else if (raw.includes("연금저축") || raw.includes("개인연금")) tier3 = "개인연금";
  else if (raw.includes("기관투자")) tier3 = "기관투자";
  else if (raw.includes("기관")) tier3 = "기관";
  else if (raw.includes("고액투자")) tier3 = "고액투자";
  else if (raw.includes("고액1")) tier3 = "고액1";
  else if (raw.includes("고액2")) tier3 = "고액2";
  else if (raw.includes("고액")) tier3 = "고액";
  else if (raw.includes("보수체감")) tier3 = "보수체감";
  // 매트릭스형 표에서 열 경계 겹침으로 "보수체감"의 "보"가 옆 열로 새는 경우가 있어서, "수체감"만
  // 남아도(3글자라 다른 단어와 헷갈릴 위험이 낮음) 보수체감으로 인정하는 완화 규칙을 하나 더 둠.
  else if (raw.includes("수체감")) tier3 = "보수체감";
  else if (raw.includes("전문투자자")) tier3 = "전문투자자";
  else if (raw.includes("주택마련")) tier3 = "주택마련";
  else if (raw.includes("기부")) tier3 = "기부";
  else if (raw.includes("랩")) tier3 = "랩";
  else if (raw.includes("펀드 등") || raw.includes("펀드등")) tier3 = "펀드 등";
  else if (raw.includes("전환가능")) tier3 = "전환가능";
  // 그 외 표현은 3차 표준 옵션에 대응값이 없어서 "없음"으로 남김 — 필요해지면 위 목록에 옵션을 추가하면 됨.

  return { tier1, tier2, tier3 };
}

// "수수료선취-오프라인-고액" 같은 클래스 설명 문구의 공통 정규식 조각.
// 하이픈/쉼표/슬래시(예: "랩,금전신탁", "랩/신탁")로 이어지는 추가 태그를 최대 4개까지 허용.
// PDF에서 줄바꿈이 단어 중간에 끼어드는 경우(예: "무권\n유저비용")가 흔해서, 태그 안의 각 글자
// 사이에는 공백/줄바꿈이 있어도 매칭되도록 함(뽑힌 뒤엔 parseClassDescription에서 공백을 다 지움).
const CLASS_FEE_TYPE_RE_SRC =
  "(?:" + ["수수료선후취", "수수료선취", "수수료후취", "수수료미징구"].map(loosePattern).join("|") + ")";
const CLASS_DESC_RE_SRC =
  CLASS_FEE_TYPE_RE_SRC + "(?:[-,]\\s*(?:[가-힣0-9/]\\s*){1,14}){0,4}";

// 형태 A: "코드  설명  펀드코드" 순서 (예: "A 수수료선취-오프라인 EE752", "S-퇴직 수수료미징구-온라인슈퍼-퇴직연금 EE771") — KB 등
const CLASS_TABLE_RE_A = new RegExp(
  "(?:^|\\s)([A-Za-z가-힣][A-Za-z가-힣0-9\\-]{0,9})\\s+(" + CLASS_DESC_RE_SRC + ")\\s+([A-Za-z0-9]{4,8})(?=\\s|$)",
  "g"
);

// 형태 B: "설명(코드)  펀드코드" 순서 (예: "수수료선취-오프라인-고액(A) 59921") — 교보악사/하나 등
const CLASS_TABLE_RE_B = new RegExp(
  "(" + CLASS_DESC_RE_SRC + ")\\(([A-Za-z0-9\\-]{1,10})\\)\\s+([A-Za-z0-9]{4,8})",
  "g"
);

// 형태 C: 2단(좌우) 표에서 "오른쪽 칸" 설명이 2줄로 줄바꿈될 때, PDF 텍스트 재구성 과정에서
// 그 줄바꿈 조각이 왼쪽 칸 데이터를 사이에 두고 앞/뒤로 흩어지는 경우 (2026-07-16, 실제 KB
// 법인용 달러 MMF 투자설명서로 확인함). 실제 순서:
//   [오른쪽 설명 앞부분(줄바꿈으로 끊김)] [왼쪽코드] [왼쪽설명] [왼쪽펀드코드] [오른쪽코드] [오른쪽펀드코드] [오른쪽 설명 뒷부분]
// 예: "수수료미징구-오프라인-고" "C" "수수료미징구-오프라인" "DX665" "C-I" "DX667" "액"
//     → C-I의 설명은 앞부분("수수료미징구-오프라인-고") + 뒷부분("액")을 이어붙여야 완성됨.
const CLASS_TABLE_RE_C = new RegExp(
  "(" + CLASS_DESC_RE_SRC + ")[-,]?\\s+" +
  "([A-Za-z가-힣][A-Za-z가-힣0-9\\-]{0,9})\\s+" +
  "(" + CLASS_DESC_RE_SRC + ")[-,]?\\s+" +
  "([A-Za-z0-9]{4,8})\\s+" +
  "([A-Za-z가-힣][A-Za-z가-힣0-9\\-]{0,9})\\s+" +
  "([A-Za-z0-9]{4,8})\\s+" +
  "([가-힣][가-힣0-9/]{0,10})(?=\\s|$)",
  "g"
);

// 형태 D: 형태 C와 같은 문제지만 짝(오른쪽 칸)이 없는 "혼자인 행"의 경우
// (예: "수수료미징구-오프라인-" "C-F" "DX666" "기관" → C-F 하나만 있고 옆칸이 없음)
const CLASS_TABLE_RE_D = new RegExp(
  "(" + CLASS_DESC_RE_SRC + ")[-,]?\\s+" +
  "([A-Za-z가-힣][A-Za-z가-힣0-9\\-]{0,9})\\s+" +
  "([A-Za-z0-9]{4,8})\\s+" +
  "([가-힣][가-힣0-9/]{0,10})(?=\\s|$)",
  "g"
);

// ------------------------------------------------------------
// 좌표 기반 클래스표 파서 (extractClassTableGeometric)
// ------------------------------------------------------------
// 기존 정규식 방식(형태 A/B/C/D)의 근본적인 한계: 좌우 2열로 나열된 클래스표에서 한글 설명이
// 줄바꿈되는 "모양"이 문서마다 다양한데, 그 모양을 전부 정규식으로 미리 예측해서 등록해두는
// 방식이라 새로운 줄바꿈 패턴이 나올 때마다 놓치는 클래스가 생김 (예: 설명 전체가 코드/펀드코드
// 줄 앞뒤로 완전히 밀려나거나, 줄바꿈된 조각 안에 하이픈/쉼표가 끼는 경우 등).
//
// 이 파서는 텍스트가 아니라 PDF 글자 하나하나의 실제 좌표(x,y)를 직접 사용해서, 줄바꿈 "모양"을
// 아예 예측하지 않고 다음 3가지 사실만으로 표를 재구성한다:
//   1) 좌/우 두 열이 있다면 "펀드코드" 헤더가 2번 나오므로, 그 사이의 x간격이 가장 크게 벌어지는
//      지점을 열 경계로 삼는다.
//   2) 각 클래스의 "펀드코드"(예: C0553, DD222)는 항상 코드/설명과 같은 행(y)에 있고, 알파벳+숫자
//      조합이라는 형태적 특징이 뚜렷해서 행의 "기준점(anchor)"으로 삼기에 안전하다.
//   3) 코드와 설명이 여러 줄로 쪼개지더라도, 그 조각들은 항상 자기 행의 펀드코드 y와 가장 가깝다
//      (다른 행의 펀드코드보다 멀리 떨어짐) — 그래서 "가장 가까운 펀드코드 행에 붙이기"만 하면
//      몇 줄로 쪼개지든, 어떤 순서로 흩어지든 상관없이 원래 행으로 정확히 모인다.
//   설명 조각과 코드 조각을 나눌 때도 "수수료선취/후취/미징구/선후취"라는 고정 키워드가 항상
//   설명의 시작이라는 사실만 이용한다 (그 키워드가 시작되는 x보다 왼쪽에 있는 조각 = 코드).
function ctGroupByY(items, tol) {
  const sorted = items.slice().sort((a, b) => b.y - a.y);
  const groups = [];
  sorted.forEach(it => {
    let g = groups.find(g => Math.abs(g.y - it.y) < tol);
    if (!g) { g = { y: it.y, items: [] }; groups.push(g); }
    g.items.push(it);
  });
  return groups;
}

function ctMergeLine(items) {
  const sorted = items.slice().sort((a, b) => a.x - b.x);
  let line = "", prevEnd = null;
  sorted.forEach(p => {
    if (prevEnd !== null) {
      const gap = p.x - prevEnd;
      if (gap > 8) line += "  ";
      else if (gap > 1.5) line += " ";
    }
    line += p.str;
    prevEnd = p.x + (p.width || p.str.length * 4);
  });
  return line.trim();
}

const CT_FEE_KEYWORDS = ["수수료선후취", "수수료선취", "수수료후취", "수수료미징구"];
// 실제 클래스 코드로 보이는 형태(예: A, A-E, C-Pe, C-퇴직e, S-퇴직, S-고액1-2 등)만 인정.
// 회사마다 코드 명명 규칙이 다를 수 있어서(하이픈 여러 개, 좀 더 긴 한글 접미사 등) 폭넓게
// 허용하되, 표와 무관한 페이지(용어정리, 보수표 등)에서 우연히 걸린 조각은 보통 훨씬 길거나
// "수수료"가 섞여있는 등 이 형태를 크게 벗어나므로 여기서 걸러진다.
const CT_VALID_CODE_RE = /^[A-Za-z][A-Za-z0-9]{0,2}(?:-[A-Za-z가-힣0-9][A-Za-z가-힣0-9]{0,5}){0,2}(?:\([가-힣0-9]{1,10}\))?$/;

function ctExtractColumn(colItems, fundHeaderX) {
  // 1) 펀드코드로 보이는 행(y그룹) 찾기 — 펀드코드 헤더 x 근처, 영숫자 4~8자
  const fundBandRaw = colItems.filter(it => Math.abs(it.x - fundHeaderX) < 40);
  let fundGroups = ctGroupByY(fundBandRaw, 1.5)
    .map(g => ({ y: g.y, text: ctMergeLine(g.items).replace(/\s+/g, "") }))
    .filter(g => /^[A-Za-z0-9]{4,8}$/.test(g.text) && /[0-9]/.test(g.text));
  if (fundGroups.length === 0) return [];

  // 1-1) 같은 열에서 실제 펀드코드가 "문자로 시작"하는지/"숫자로만" 이뤄지는지 형식이 갈리면,
  // 그 열의 다수결 형식과 다른 후보는 표와 무관한 노이즈로 보고 제외한다. (2026-07-22: KB자산운용
  // PDF에서 "C" 행의 진짜 펀드코드는 "C0556"(문자 시작)인데, 페이지 위 fundHeaderX 근처에 있던
  // 전혀 무관한 6자리 숫자("491848")가 같은 y 근처로 잘못 걸려서 "C"의 펀드코드로 둔갑한 사례가
  // 실제로 확인됨 — 같은 열의 다른 코드들(C0553, DD222 등)은 전부 문자로 시작하므로 다수결로
  // 걸러낼 수 있음. 형식이 애초에 전부 숫자인 회사(예: 교보악사 "59920" 같은 순수 숫자 코드)도
  // 있어서 무조건 "문자 시작만 허용"으로 고정하면 안 되고, 열 안에서의 다수결로만 판단한다.)
  const alphaGroups = fundGroups.filter(g => /^[A-Za-z]/.test(g.text));
  const numericGroups = fundGroups.filter(g => !/^[A-Za-z]/.test(g.text));
  if (alphaGroups.length > 0 && numericGroups.length > 0) {
    fundGroups = alphaGroups.length >= numericGroups.length ? alphaGroups : numericGroups;
  }
  if (fundGroups.length === 0) return [];

  // 2) 행 간격(펀드코드 y들의 전형적인 간격)을 구해서, "이 조각이 어느 행에 속하는지" 판단할 반경을 정함
  const rowYs = fundGroups.map(f => f.y).sort((a, b) => b - a);
  const spacings = [];
  for (let i = 1; i < rowYs.length; i++) spacings.push(rowYs[i - 1] - rowYs[i]);
  const typicalSpacing = spacings.length
    ? spacings.slice().sort((a, b) => a - b)[Math.floor(spacings.length / 2)]
    : 34;
  const maxRowDist = Math.max(typicalSpacing / 2 - 1, 10);

  function nearestRow(y) {
    let best = null, bestDist = Infinity;
    fundGroups.forEach(f => {
      const d = Math.abs(f.y - y);
      if (d < bestDist) { bestDist = d; best = f; }
    });
    return bestDist <= maxRowDist ? best : null;
  }

  // 3) 펀드코드 자기 자신을 제외한 나머지 조각들 중, 어느 행에도 속하지 않는(= 표와 무관한 다른
  //    본문 내용) 조각은 버림. 남은 조각만 그 행에 배정.
  const fundItemIsSelf = it =>
    Math.abs(it.x - fundHeaderX) < 40 && fundGroups.some(f => Math.abs(f.y - it.y) < 1.5);
  const rows = fundGroups.map(f => ({ fundCode: f.text, y: f.y, items: [] }));
  const rowByY = new Map(rows.map(r => [r.y, r]));

  colItems.forEach(it => {
    if (fundItemIsSelf(it)) return;
    const nr = nearestRow(it.y);
    if (nr) rowByY.get(nr.y).items.push(it);
  });

  // 4) 각 행 안에서, "수수료..." 키워드가 시작되는 x를 기준으로 그보다 왼쪽=코드, 오른쪽=설명으로 나눔
  return rows.sort((a, b) => b.y - a.y).map(r => {
    const feeItems = r.items.filter(it => {
      const t = it.str.replace(/\s+/g, "");
      return CT_FEE_KEYWORDS.some(k => t.startsWith(k));
    });
    const threshX = feeItems.length ? Math.min(...feeItems.map(it => it.x)) - 5 : Infinity;
    const codeItems = r.items.filter(it => it.x < threshX);
    const descItems = r.items.filter(it => it.x >= threshX);
    let code = ctGroupByY(codeItems, 1.5).sort((a, b) => b.y - a.y)
      .map(g => ctMergeLine(g.items)).join("").replace(/\s+/g, "");
    let desc = ctGroupByY(descItems, 1.5).sort((a, b) => b.y - a.y)
      .map(g => ctMergeLine(g.items)).join("").replace(/\s+/g, "");
    // 코드가 별도의 칸으로 안 떨어져 있고("수수료미징구-오프라인-퇴직연금(RP(퇴직연금))"처럼
    // 설명과 코드가 한 덩어리로 붙어있는 표 형식, 예: 한화자산운용) 경우 위 좌우분리로는
    // codeItems가 통째로 비어버림. 이 경우 desc 끝의 마지막 괄호 그룹(중첩 1단계까지 허용)을
    // 코드로 떼어내고, desc에서는 그 부분을 제거함.
    if (!code) {
      const trailingParen = desc.match(/\(([^()]*(?:\([^()]*\))?[^()]*)\)$/);
      if (trailingParen) {
        code = trailingParen[1];
        desc = desc.slice(0, trailingParen.index);
      }
    }
    return { code, desc, fundCode: r.fundCode };
  }).filter(r => CT_VALID_CODE_RE.test(r.code)); // 코드 형태가 아닌 행(=표와 무관한 페이지의 오검출)은 제외
}

// ------------------------------------------------------------
// 매트릭스형 클래스표 파서 (ctExtractMatrixPage) — 2026-07-22 추가, KCGI 등
// ------------------------------------------------------------
// 위 ctExtractColumn/ctExtractPage는 "클래스 하나당 한 행(row)"에 코드+설명+펀드코드가
// 세로로 쌓이는 표를 전제로 한다(KB/하나/교보악사 등 지금까지 다룬 회사가 전부 이 형태).
// 그런데 KCGI 같은 회사는 반대로 "클래스를 가로로 늘어놓고(종류A 종류Ae 종류C1 ...), 그
// 아래에 설명과 펀드코드를 클래스별로 세로 정렬해서 쌓는" 매트릭스형 표를 쓴다. 이 경우 같은
// 클래스의 코드/설명/펀드코드가 전부 다른 y(줄)에 있고, 대신 같은 x(열)를 공유한다 — 그래서
// y가 아니라 x로 클래스를 구분해야 한다.
//
// 클래스 수가 많으면 한 페이지에 이런 "가로 헤더행"이 여러 번 나올 수 있다(예: KCGI는 21개
// 클래스가 11개+10개, 두 블록으로 나뉨). 헤더행이 나올 때마다 새 블록으로 보고, 그 블록의
// 설명/펀드코드는 "이 헤더행 바로 아래 ~ 실제 펀드코드 행을 찾는 순간까지"로 한정해서 읽는다
// (펀드코드 행을 찾은 다음 줄부터는 표 밖 본문이므로 더 보지 않음 — 그렇지 않으면 이 페이지에
// 있는 관련회사 연혁 등 표와 무관한 문단까지 섞여 들어옴).

// 같은 y줄에 "종류" 마커가 3개 이상 있으면 매트릭스 헤더행 후보로 인정.
// 마커는 "종류"만 있는 별도 아이템("종류" 다음에 코드가 별도 아이템으로 옴)이거나,
// "종류A"처럼 코드가 이미 붙어있는 아이템일 수 있음.
function ctFindMatrixHeaderGroups(pageItems) {
  const groups = ctGroupByY(pageItems, 2);
  const headerGroups = [];
  groups.forEach(g => {
    const sorted = g.items.slice().sort((a, b) => a.x - b.x);
    const markers = [];
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i].str;
      if (s === "종류") markers.push({ x: sorted[i].x, idx: i, fused: false });
      else if (/^종류[A-Za-z가-힣0-9\-]/.test(s)) markers.push({ x: sorted[i].x, idx: i, fused: true });
    }
    if (markers.length >= 3) headerGroups.push({ y: g.y, items: sorted, markers });
  });
  return headerGroups.sort((a, b) => b.y - a.y); // 페이지 위쪽(y 큰 값)부터
}

// 헤더행 하나로부터 열(컬럼) 목록 [{x, code}]을 만듦.
function ctBuildColumnsFromHeader(headerGroup) {
  const { items, markers } = headerGroup;
  const cols = [];
  markers.forEach((m, i) => {
    const nextX = i + 1 < markers.length ? markers[i + 1].x : Infinity;
    if (m.fused) {
      cols.push({ x: items[m.idx].x, code: items[m.idx].str.replace(/^종류/, "") });
    } else {
      // "종류" 바로 다음, 다음 마커 전까지 오는 토큰들을 이어붙여 코드로 삼음
      const codeParts = items.filter((it, idx) => idx > m.idx && it.x > m.x && it.x < nextX - 1);
      cols.push({ x: items[m.idx].x, code: codeParts.map(it => it.str).join("").replace(/\s+/g, "") });
    }
  });
  return cols;
}

function ctNearestColumn(cols, x, maxDist) {
  let best = null, bestDist = Infinity;
  cols.forEach(c => {
    const d = Math.abs(c.x - x);
    if (d < bestDist) { bestDist = d; best = c; }
  });
  return bestDist <= maxDist ? best : null;
}

// 매트릭스형 표 전체(여러 헤더블록 가능)를 파싱해서 [{code, desc, fundCode}] 배열로 반환.
// 표가 아닌 페이지(예: "종류CW"/"종류CI" 등이 우연히 한 문장에 여러 번 언급된 연혁 문단)에서
// 헤더행처럼 보이는 줄이 오검출될 수 있어서, 그 블록 안에서 실제 펀드코드 행(영숫자 4~8자,
// 숫자 포함)을 끝내 못 찾으면 그 블록은 통째로 버린다.
function ctExtractMatrixPage(pageItems) {
  const headerGroups = ctFindMatrixHeaderGroups(pageItems);
  if (headerGroups.length === 0) return [];

  const results = [];
  headerGroups.forEach((hg, hi) => {
    const cols = ctBuildColumnsFromHeader(hg);
    if (cols.length < 3) return;

    // 열 간격의 절반을 "같은 열로 인정할 최대 x거리"로 사용(행 기반 파서와 동일한 방식)
    const xs = cols.map(c => c.x).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < xs.length; i++) gaps.push(xs[i] - xs[i - 1]);
    const typicalGap = gaps.length ? gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 40;
    const maxColDist = Math.max(typicalGap / 2 - 2, 15);

    // 스캔범위 상한: 다음 헤더블록이 있으면 그 y까지, 없으면(마지막 블록) 일단 넉넉하게 잡아두고
    // 아래에서 실제 펀드코드 행을 찾는 즉시 멈춰서 표 밖 본문이 섞이지 않게 함.
    const upperY = hg.y - 0.5;
    const softLowerY = hi + 1 < headerGroups.length ? headerGroups[hi + 1].y : upperY - 150;
    const bandItems = pageItems.filter(it => it.y < upperY && it.y > softLowerY);
    const subGroups = ctGroupByY(bandItems, 1.5).sort((a, b) => b.y - a.y);

    const colBuckets = new Map(cols.map(c => [c.code, { desc: [], fundCode: "" }]));
    let foundFundRow = false;

    for (const sg of subGroups) {
      const sorted = sg.items.slice().sort((a, b) => a.x - b.x);
      const perCol = new Map();
      sorted.forEach(it => {
        const col = ctNearestColumn(cols, it.x, maxColDist);
        if (!col) return; // 왼쪽 행라벨("금융투자협회"/"펀드코드" 등)처럼 열과 무관한 텍스트는 버림
        if (!perCol.has(col.code)) perCol.set(col.code, []);
        perCol.get(col.code).push(it.str);
      });
      if (perCol.size === 0) continue;

      const joined = new Map();
      perCol.forEach((parts, code) => joined.set(code, parts.join("").replace(/\s+/g, "")));

      const fundLikeCount = Array.from(joined.values()).filter(v => /^[A-Za-z0-9]{4,8}$/.test(v) && /[0-9]/.test(v)).length;
      const isFundCodeRow = joined.size > 0 && fundLikeCount >= Math.ceil(joined.size * 0.6);

      joined.forEach((v, code) => {
        const bucket = colBuckets.get(code);
        if (!bucket) return;
        if (isFundCodeRow) bucket.fundCode += v;
        else bucket.desc += v;
      });

      // 펀드코드 행을 찾았으면 이 블록은 끝 — 그 아래(표 밖 본문)는 더 보지 않음
      if (isFundCodeRow) { foundFundRow = true; break; }
    }

    if (!foundFundRow) return; // 실제 표가 아니었던 것으로 판단, 이 블록 전체를 버림

    cols.forEach(c => {
      const b = colBuckets.get(c.code);
      if (!b) return;
      results.push({ code: c.code, desc: b.desc, fundCode: b.fundCode });
    });
  });

  return results.filter(r => CT_VALID_CODE_RE.test(r.code));
}

function ctExtractPage(pageItems) {
  // 먼저 매트릭스형(클래스 가로배치) 표인지 시도해보고, 뽑히면 그걸 우선 사용.
  // 못 뽑히면(=이 페이지는 매트릭스형이 아님) 기존의 행 기반 파서로 넘어감.
  const matrixRows = ctExtractMatrixPage(pageItems);
  if (matrixRows.length > 0) return matrixRows;

  const headerItem = pageItems.find(it => it.str.includes("펀드코드"));
  if (!headerItem) return [];

  const headerBand = pageItems.filter(it => Math.abs(it.y - headerItem.y) < 20);
  const headerXs = Array.from(new Set(headerBand.map(it => Math.round(it.x * 10) / 10))).sort((a, b) => a - b);
  let colSplitX = null, maxHeaderGap = 0;
  for (let i = 1; i < headerXs.length; i++) {
    const gap = headerXs[i] - headerXs[i - 1];
    if (gap > maxHeaderGap) { maxHeaderGap = gap; colSplitX = (headerXs[i] + headerXs[i - 1]) / 2; }
  }

  const fundHeaders = pageItems.filter(it => it.str.includes("펀드코드")).sort((a, b) => a.x - b.x);
  const dataItems = pageItems.filter(it => it.y < headerItem.y - 5);

  if (fundHeaders.length < 2 || colSplitX === null) {
    // 1열짜리 클래스표
    return ctExtractColumn(dataItems, fundHeaders[0].x);
  }

  const leftItems = dataItems.filter(it => it.x < colSplitX);
  const rightItems = dataItems.filter(it => it.x >= colSplitX);
  return ctExtractColumn(leftItems, fundHeaders[0].x).concat(ctExtractColumn(rightItems, fundHeaders[1].x));
}

// script.js가 채워두는 전역 classTablePages(= "종류(클래스)"+"펀드코드" 헤더가 있던 페이지들의
// 원본 글자 좌표)를 사용해서 클래스표를 좌표 기반으로 재구성함. 여러 페이지에 걸쳐 같은 표가
// 반복되는 경우(목차/본문 등)에도 페이지 순서대로 훑으며 처음 나온 코드를 채택.
function extractClassTableGeometric() {
  if (typeof classTablePages === "undefined" || !classTablePages || classTablePages.length === 0) return [];
  const results = [];
  const seenCodes = new Set();
  classTablePages.forEach(page => {
    let rows;
    try { rows = ctExtractPage(page.items); } catch (e) { rows = []; }
    rows.forEach(r => {
      if (!r.code || seenCodes.has(r.code)) return;
      seenCodes.add(r.code);
      results.push({ code: r.code, fundCode: r.fundCode, ...parseClassDescription(r.desc) });
    });
  });
  return results;
}

// PDF 원문(searchableText)에서 "종류(클래스)" 표를 직접 읽어 [{code, tier1, tier2, tier3}] 배열로 반환.
// 1차: 좌표 기반 파서(extractClassTableGeometric) — 줄바꿈 모양과 무관하게 동작해서 훨씬 안정적.
// 2차: 좌표 데이터가 없거나(폴백) 좌표 파서가 못 찾았을 때만 기존 정규식 방식(형태 A/B/C/D)으로 시도.
function extractClassTableFromText(text) {
  const geometric = extractClassTableGeometric();
  if (geometric.length > 0) return geometric;

  if (!text) return [];
  const results = [];
  const seenCodes = new Set();
  let m;

  CLASS_TABLE_RE_A.lastIndex = 0;
  while ((m = CLASS_TABLE_RE_A.exec(text)) !== null) {
    const code = m[1];
    // 코드 자체가 줄바꿈으로 두 줄에 걸쳐 있으면(예: "C-퇴직" 다음 줄에 "e") 뒤에 남은 한 글자가
    // 엉뚱하게 새 코드로 잡힐 수 있음 — 알파벳 소문자 한 글자만 있는 경우는 실제 코드가 아니라
    // 이런 줄바꿈 잔여물일 가능성이 높아 건너뜀.
    if (/^[a-z]$/.test(code)) continue;
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);
    results.push({ code, fundCode: m[3], ...parseClassDescription(m[2]) });
  }

  CLASS_TABLE_RE_B.lastIndex = 0;
  while ((m = CLASS_TABLE_RE_B.exec(text)) !== null) {
    const code = m[2];
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);
    results.push({ code, fundCode: m[3], ...parseClassDescription(m[1]) });
  }

  CLASS_TABLE_RE_C.lastIndex = 0;
  while ((m = CLASS_TABLE_RE_C.exec(text)) !== null) {
    const leftCode = m[2], leftDesc = m[3];
    const rightCode = m[5], rightDesc = m[1] + m[7]; // 앞부분 + 뒷부분을 이어붙여 완성
    if (!seenCodes.has(leftCode)) {
      seenCodes.add(leftCode);
      results.push({ code: leftCode, fundCode: m[4], ...parseClassDescription(leftDesc) });
    }
    if (!seenCodes.has(rightCode)) {
      seenCodes.add(rightCode);
      results.push({ code: rightCode, fundCode: m[6], ...parseClassDescription(rightDesc) });
    }
  }

  CLASS_TABLE_RE_D.lastIndex = 0;
  while ((m = CLASS_TABLE_RE_D.exec(text)) !== null) {
    const code = m[2];
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);
    results.push({ code, fundCode: m[3], ...parseClassDescription(m[1] + m[4]) });
  }

  return results;
}

// class-checker.js 회사 선택 드롭다운에 추가되는 가상의 "회사" 키 —
// 실제 회사가 아니라 "지금 열려있는 PDF에서 직접 추출한 표"를 가리킴.
const CURRENT_PDF_TABLE_KEY = "__현재 PDF에서 추출__";

// 본문에서 클래스 코드를 찾아 매핑 항목을 반환.
// 1) 먼저 지금 문서(text) 자체에서 클래스 표를 직접 추출해보고, 뽑히면 그걸 사용함(하드코딩 무관).
// 2) 못 뽑았을 때만 companyName을 지정하면 해당 회사 하드코딩 규칙, 지정 안 하면 전체 회사 규칙을 합쳐서 검사함.
function detectClassCode(text, companyName) {
  let table = extractClassTableFromText(text);
  if (table.length === 0) {
    table = (companyName && CLASS_CODE_MAP_BY_COMPANY[companyName])
      ? CLASS_CODE_MAP_BY_COMPANY[companyName]
      : getAllClassCodeEntries();
  }

  const found = [];
  for (const entry of table) {
    const isShortCode = entry.code.length <= 2 && !entry.code.includes("-");
    const flags = entry.code.includes("-") ? "i" : "";
    const codePattern = loosePattern(entry.code);
    const clsPattern = loosePattern("클래스");
    const boundaryAfter = "(?![A-Za-z0-9\\-])";
    const boundaryBefore = "(?<![A-Za-z0-9\\-])";

    const pattern = isShortCode
      ? `(?:${clsPattern}\\s*${codePattern}${boundaryAfter}|${boundaryBefore}${codePattern}\\s*${clsPattern})`
      : `${boundaryBefore}${codePattern}${boundaryAfter}`;

    try {
      const re = new RegExp(pattern, flags);
      if (re.test(text)) found.push(entry);
    } catch (e) {
      // 일부 구형 브라우저는 lookbehind 미지원 → 해당 코드만 건너뜀
    }
  }

  if (found.length === 0) return null;

  const uniqueResults = [];
  for (const f of found) {
    const isDuplicate = uniqueResults.some(u => u.tier1 === f.tier1 && u.tier2 === f.tier2 && u.tier3 === f.tier3);
    if (!isDuplicate) uniqueResults.push(f);
  }

  if (uniqueResults.length === 1) return uniqueResults[0];
  return null;
}

// ------------------------------------------------------------
// 아래부터는 이번에 추가한 "연동 드롭다운 + 코드 확인" 기능
// ------------------------------------------------------------

// 회사명이 PDF마다 다르게 표기될 수 있음 (예: "KB자산운용" vs "케이비자산운용",
// "IBK자산운용" vs "아이비케이자산운용"). CLASS_CODE_MAP_BY_COMPANY의 키는 실제 PDF에
// 가장 흔히 나오는 표기(주로 영문 약자)로 맞추되, 다르게 표기된 PDF도 놓치지 않도록
// 여기에 별칭을 등록해두면 됨. 키: CLASS_CODE_MAP_BY_COMPANY의 실제 키 / 값: 그 외 흔한 표기들.
const COMPANY_KEY_ALIASES = {
  "KB자산운용":     ["케이비자산운용"],
  "IBK자산운용":    ["아이비케이자산운용"],
  "NH아문디자산운용": ["엔에이치아문디자산운용", "NH-Amundi자산운용", "NH-아문디자산운용"],
};

// 자동 추출된 "집합투자업자(운용사)" 값을 보고 어느 회사 규칙을 쓸지 결정함.
// items는 script.js에서 선언되는 전역 변수 — 이 함수는 이벤트 발생 시점(로드 완료 후)에만 호출되므로 문제없음.
function getDetectedCompanyKey() {
  const managerItem = (typeof items !== "undefined") ? items.find(i => i.key === "manager") : null;
  const managerValue = managerItem ? managerItem.value : "";
  if (!managerValue || managerValue === "없음") return null;
  for (const key of Object.keys(CLASS_CODE_MAP_BY_COMPANY)) {
    if (managerValue.includes(key)) return key;
    const aliases = COMPANY_KEY_ALIASES[key] || [];
    if (aliases.some(alias => managerValue.includes(alias))) return key;
  }
  return null;
}

// 지금 사용할 코드표를 반환.
// 1) 지금 열려있는 PDF 원문에서 클래스 표를 직접 뽑을 수 있으면 그걸 최우선으로 사용
//    (하드코딩된 회사별 표에 기대지 않고, 실제 문서에 적힌 코드/문구를 그대로 반영함)
// 2) 못 뽑았을 때만(표 형식이 특이한 문서 등) 회사가 특정되면 그 회사 하드코딩 표, 아니면 전체를 합쳐서
function getActiveClassTable() {
  const liveText = (typeof searchableText !== "undefined") ? searchableText : "";
  const extracted = extractClassTableFromText(liveText);
  if (extracted.length > 0) return extracted;

  const key = getDetectedCompanyKey();
  return key ? CLASS_CODE_MAP_BY_COMPANY[key] : getAllClassCodeEntries();
}
