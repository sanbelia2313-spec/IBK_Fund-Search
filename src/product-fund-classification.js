// ============================================================
// product-fund-classification.js — 두번째 "상품공통정보" 카드
// (펀드종류구분 / 펀드유형구분 / 펀드형태구분 / 환매가능유형구분 / 파생투자여부 /
//  펀드유형(자본시장법상) / 파생결합증권편입구분 / 펀드유형(수익률평가) / 적정성원칙 대상여부)
//
// 아래 추출 규칙은 실제 사용자가 지정한 규칙입니다 (추측이 아님):
//
// 1. 펀드종류구분: 기본값 수익증권. 펀드명에 "USD"가 있으면 외화표시펀드. 국내뮤추얼은 사실상 없음(자동선택 안 함).
// 2. 펀드유형구분: 펀드명에서 판단. 우선순위 1등=부동산투자/특별자산투자, 2등=파생상품, 3등=나머지(증권→주식형,
//    주식혼합/채권혼합, MMF는 펀드명의 개인/법인 표기로 구분).
// 3. 펀드형태구분 & 환매가능유형구분: 투자설명서의 "분류" 라인(요약정보 표의 "분류 투자신탁, 증권(주식형),
//    개방형(...), 추가형(...), 종류형" 형태)에서 추출.
// 4. 파생투자여부: 펀드유형구분이 "파생상품"이면 예, 그 외에는 전부 아니오.
// 5. 펀드유형(자본시장법상): "분류" 라인에서 증권/부동산/특별자산/혼합자산/단기금융 + 하위분류(괄호 안) 추출.
// 6. 파생결합증권편입구분(미사용): 4번과 동일 — 펀드유형구분이 파생상품이면 예, 아니면 아니오.
// 7. 펀드유형(수익률평가): 항상 해당없음.
// 8. 적정성원칙 대상여부: "고난도금융투자상품 해당여부" 항목에 ○/O가 적혀있으면 예,
//    X이거나 해당사항 없음이거나 그 항목 자체가 없으면 아니오.
// ============================================================

const FC_DOM_MAP = {
  fcKind:       "fund_kind",
  fcType:       "fund_type",
  fcForm:       "fund_form",
  fcRedeemType: "fund_redeem_type",
  fcDerivative: "fund_derivative",
  fcCapitalType:"fund_capital_type",
  fcElsUsage:   "fund_els_usage",
  fcYieldType:  "fund_yield_type",
  fcSuitability:"fund_suitability",
  fcHighDifficulty: "fund_high_difficulty",       // 고난도상품여부: 적정성원칙 대상여부와 동일
  fcPbPrime:        "fund_pb_prime",              // PB전용(PRIME)여부: 항상 아니오
  fcPreEducation:   "fund_pre_education",         // 고난도적정성사전교육대상: 적정성원칙 대상여부와 동일
  fcTrustee:        "fund_trustee",                // 수탁사
  fcAdminCompany:   "fund_admin_company",          // 사무수탁사
  fcInceptionDate:  "fund_inception_date",         // 최초설정일자
  fcNextSettlement: "fund_next_settlement",        // 차기결산예정일
  fcBizDayType:     "fund_biz_day_type",           // 펀드영업일구분
  fcElderlyNotice:  "fund_elderly_notice",         // 고령층계약알림여부: 파생상품이면 예
  fcLeverageHappyCall: "fund_leverage_happy_call", // 레버리지 해피콜여부: 펀드명에 레버리지/리버스/인버스 포함시 예
  fcCurrencyCode:   "fund_currency_code",          // 거래통화코드: 펀드명에 usd 포함시 USD(달러), 아니면 KRW(원)
  fcAmountDecimalDigits: "fund_amount_decimal_digits", // 금액소수자리수: KRW→0, USD→2
};
// fcCapitalSubType(자본시장법상 유형의 하위분류)는 부모값에 따라 옵션 자체가 바뀌는 종속
// 드롭다운이라 위 맵과 별도로 관리한다 (fund_capital_subtype 상태키 사용)

const FC_SUBTYPE_OPTIONS = {
  "증권":   ["주식형", "채권형", "혼합주식형", "혼합채권형", "투자계약증권형", "재간접"],
  "단기금융": ["MMF개인용", "MMF법인용"],
};

const FC_TRUSTEE_OPTIONS = [
  "산업은행","기업은행","국민은행","외환은행","수협","농협중앙회","농협 (단위)","우리은행",
  "제일은행","서울은행","한미은행","대구은행","부산은행","광주은행","제주은행","전북은행",
  "경남은행","새마을금고","신용협동조합","상호신용금고","체이스맨해탄은행","씨티은행",
  "홍콩상하이은행","도이치은행","다이이찌강코","도쿄미쯔비시","우체국","하나은행","평화은행",
  "신한은행","증권금융","미래에셋증권",
];

const FC_ADMIN_OPTIONS = [
  "한화투신운용(주)","하나펀드서비스","(주)코스콤펀드서비스","미래에셋증권","신한금융투자",
  "삼성투신운용(주)","우리펀드서비스(주)","삼성증권","신한펀드파트너스","한국펀드파트너스",
  "HSBC 펀드서비스","SC제일펀드서비스(회계팀)","SC제일펀드서비스","외환펀드서비스","KB펀드파트너스",
];

const FC_STATE = {};
Object.values(FC_DOM_MAP).forEach(k => { FC_STATE[k] = { value: "", found: null }; });
FC_STATE.fund_capital_subtype = { value: "", found: null };

function fcSet(key, value) {
  FC_STATE[key] = { value, found: true };
}

function fcProductName() {
  // 영문펀드명 필드가 없어진 뒤로는 한글펀드명 하나로 판단한다. "(USD)" 같은 표기도
  // 이제 분리되지 않고 한글펀드명에 그대로 포함돼 있으므로 키워드 판단(usd/부동산/파생 등)에 문제없다.
  return $("#krName") ? $("#krName").value : "";
}

// 회사명 후보 문자열(raw) 안에 옵션 목록 중 어떤 이름이 들어있는지 찾는다.
// "(주)"/"㈜"/공백 차이는 무시하고 비교하며, 여러 개 걸리면 더 긴(더 구체적인) 이름을 우선한다.
// 회사명이 "KB"처럼 영문 약칭으로 등록되어 있어도 투자설명서에는 "케이비"처럼 한글 발음으로
// 표기되는 경우가 있어(예: KB펀드파트너스 → 케이비펀드파트너스) 그 표기 차이도 동일하게 취급한다.
function fcMatchOption(rawText, options) {
  if (!rawText) return null;
  const norm = s => s.replace(/\(주\)|㈜|\s+/g, "").replace(/케이비/g, "KB").toUpperCase();
  const normalizedRaw = norm(rawText);
  let best = null;
  for (const opt of options) {
    if (normalizedRaw.includes(norm(opt))) {
      if (!best || opt.length > best.length) best = opt;
    }
  }
  return best;
}

// ---------------------------------------------
// 수탁사 / 사무수탁사: "신탁업자"/"일반사무관리회사" 섹션 주변에서 옵션 목록과 대조
// ---------------------------------------------
// 문서 안에서 정규식과 매칭되는 모든 위치를 "등장 순서대로" 반환한다.
// (예전에는 "마지막 매칭"만 봤는데, 그 방식은 문서 뒷부분에서 같은 단어가 무관한 문맥으로
//  한 번 더 나오면 실제 정답 위치를 지나쳐버리는 문제가 있었다. 예: "신탁업자"라는 단어는
//  회사 정보 섹션 이후에도 투자자보호 관련 조항 등에서 여러 번 더 등장하는데, 그 중 진짜
//  "회사명"이 적힌 곳은 앞쪽에 있는 경우가 많다.)
function fcFindAllMatches(text, re) {
  const g = new RegExp(re.source, "g");
  const indices = [];
  let m;
  while ((m = g.exec(text)) !== null) {
    indices.push(m.index);
    if (m[0].length === 0) g.lastIndex++;
  }
  return indices;
}

// 정규식에 매칭되는 모든 위치를 순서대로 훑어서, 그 뒤 windowSize 안에 옵션 목록 중
// 하나라도 걸리는 "첫 번째" 위치의 결과를 반환한다. 단순히 마지막(혹은 첫) 매칭 위치만
// 보는 것보다, 같은 키워드가 문서 여러 곳에 등장하는 경우에도 실제 회사명이 적힌
// 위치를 훨씬 안정적으로 찾아낸다.
function fcFindOptionNearMatches(text, re, options, windowSize) {
  const indices = fcFindAllMatches(text, re);
  for (const idx of indices) {
    const found = fcMatchOption(text.slice(idx, idx + windowSize), options);
    if (found) return found;
  }
  return null;
}

function fcExtractTrustee(text) {
  // 1차: "집합투자재산 관리회사" 문구 주변 (투자회사형 등에서 흔한 표현)
  // 참고: 헤딩과 회사명 사이에 줄바꿈이 끼는 경우가 많아 "."가 아니라 "[\s\S]"로 이어준다
  // (JS 정규식의 "."은 기본적으로 줄바꿈 문자를 건너뛰지 못함)
  const found1 = fcFindOptionNearMatches(
    text,
    new RegExp(loosePattern("집합투자재산") + "[\\s\\S]{0,15}" + loosePattern("관리회사")),
    FC_TRUSTEE_OPTIONS,
    400
  );
  if (found1) return found1;
  // 2차: "투자신탁재산 관리회사에 관한 사항(신탁업자)" 처럼 "신탁업자" 단어가 들어간 헤딩 주변
  // (KB스타 한국 인덱스 투자설명서 등 투자신탁형 문서에서 쓰이는 표현)
  return fcFindOptionNearMatches(
    text,
    new RegExp(loosePattern("신탁업자") + "[\\s\\S]{0,20}" + loosePattern("회사")),
    FC_TRUSTEE_OPTIONS,
    400
  );
}

function fcExtractAdminCompany(text) {
  // 1차: "일반사무관리회사에 관한 사항" 처럼 "관한"이 붙는 헤딩 (KB 스타일)
  const found1 = fcFindOptionNearMatches(
    text,
    new RegExp(loosePattern("일반사무관리회사") + "[\\s\\S]{0,15}" + loosePattern("관한")),
    FC_ADMIN_OPTIONS,
    400
  );
  if (found1) return found1;
  // 2차: "나. 일반사무관리회사" 처럼 "관한" 없이 회사명이 바로 뒤에 나오는 헤딩 (하나펀드서비스 스타일 등)
  // "일반사무관리회사"라는 단어 자체는 문서 여러 곳(연대책임 조항 등)에 등장하지만,
  // fcFindOptionNearMatches가 실제 회사명이 뒤따르는 위치만 채택하므로 안전하다.
  return fcFindOptionNearMatches(
    text,
    new RegExp(loosePattern("일반사무관리회사")),
    FC_ADMIN_OPTIONS,
    400
  );
}

// 목차에는 헤딩명이 미리 나오지만 실제 본문은 그 뒤에 다시 나오므로, "연혁" 헤딩처럼
// 실질적인 등장이 마지막 쪽에 있는 경우를 위해 "마지막 매칭"용 헬퍼를 별도로 남겨둔다.
function fcFindLastMatch(text, re) {
  const indices = fcFindAllMatches(text, re);
  return indices.length ? indices[indices.length - 1] : -1;
}

// ---------------------------------------------
// 최초설정일자 / 차기결산예정일
// 최초설정일자: "집합투자기구의 연혁"과 클래스별 "최초설정일" 컬럼에 나온 모든 날짜 중 가장 이른 날짜.
// 차기결산예정일: 최초설정일자의 (월-일)에서 일자를 -1한 날짜의, 오늘 이후로 가장 빨리 돌아오는 연도.
// ---------------------------------------------
function fcFormatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fcFindDatesInText(text) {
  const dates = [];
  const re = /(\d{4})\s*[.\-]\s*(\d{1,2})\s*[.\-]\s*(\d{1,2})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) dates.push(new Date(y, mo - 1, d));
  }
  return dates;
}

function fcExtractInceptionDate(text) {
  let allDates = [];

  // "집합투자기구의 연혁" 표 (목차에도 헤딩으로 나오므로 실제 내용이 있는 마지막 등장 위치 사용)
  const historyIdx = fcFindLastMatch(text, new RegExp(loosePattern("집합투자기구") + "\\s*의?\\s*" + loosePattern("연혁")));
  if (historyIdx !== -1) {
    allDates = allDates.concat(fcFindDatesInText(text.slice(historyIdx, historyIdx + 2000)));
  }

  // 클래스별 "최초설정일" 컬럼 (여러 클래스의 설정일이 나열됨 — 그 중 가장 이른 날짜를 사용)
  const classIdx = text.search(new RegExp(loosePattern("최초") + "\\s*" + loosePattern("설정일")));
  if (classIdx !== -1) {
    allDates = allDates.concat(fcFindDatesInText(text.slice(classIdx, classIdx + 4000)));
  }

  if (allDates.length === 0) return null;
  const minDate = allDates.reduce((a, b) => (a < b ? a : b));
  return fcFormatDate(minDate);
}

function fcComputeNextSettlement(inceptionDateStr) {
  if (!inceptionDateStr) return null;
  const parts = inceptionDateStr.split("-").map(Number);
  const m0 = parts[1], d0 = parts[2];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  // day=0이면 JS Date가 자동으로 전월 마지막날로 보정해준다 (예: 3월1일 → 2월말일)
  let candidate = new Date(year, m0 - 1, d0 - 1);
  candidate.setHours(0, 0, 0, 0);
  if (candidate < today) {
    candidate = new Date(year + 1, m0 - 1, d0 - 1);
  }
  return fcFormatDate(candidate);
}

// ---------------------------------------------
// 1. 펀드종류구분: 기본 수익증권, 이름에 USD 있으면 외화표시펀드
// ---------------------------------------------
function fcExtractFundKind() {
  const name = fcProductName();
  if (!name.trim()) return null;
  return /usd/i.test(name) ? "외화표시펀드" : "수익증권";
}

// ---------------------------------------------
// 2. 펀드유형구분: 펀드명에서 판단, 우선순위 부동산/특별자산 > 파생상품 > 나머지
// ---------------------------------------------
function fcExtractFundType() {
  const name = fcProductName();
  if (!name.trim()) return null;

  if (/부동산/.test(name)) return "부동산투자";
  if (/특별자산/.test(name)) return "특별자산투자";
  if (/파생/.test(name)) return "파생상품";

  if (/주식\s*혼합|혼합\s*주식/.test(name)) return "주식혼합형";
  if (/채권\s*혼합|혼합\s*채권/.test(name)) return "채권혼합형";
  if (/MMF/i.test(name)) return /법인/.test(name) ? "MMF(법인)" : "MMF(개인)";
  if (/증권/.test(name)) return "주식형"; // "증권"이 들어가면 주식형
  if (/주식/.test(name)) return "주식형";
  if (/채권/.test(name)) return "채권형";
  return null;
}

// ---------------------------------------------
// 3, 5. "분류" 라인에서 펀드형태구분 / 환매가능유형구분 / 자본시장법상 유형(+하위분류) 추출
//    예: "분류 투자신탁, 증권(주식형), 개방형(중도환매가능), 추가형(추가납입가능), 종류형"
// ---------------------------------------------
function fcFindClassificationLine(text) {
  const re = new RegExp(loosePattern("분류"), "g");
  const openRe = new RegExp(loosePattern("개방형") + "|" + loosePattern("폐쇄형"));
  const addRe = new RegExp(loosePattern("추가형") + "|" + loosePattern("단위형") + "|" + loosePattern("청산형"));
  let m;
  while ((m = re.exec(text)) !== null) {
    // "분류" 라벨이 표/박스 레이아웃에서 실제 값(투자신탁, 증권, 개방형...)보다 뒤에 재구성되는
    // 문서가 있어서, 뒤쪽만 보지 않고 앞쪽도 같이 살펴봄 (라벨 앞 400자 ~ 뒤 250자)
    const windowText = text.slice(Math.max(0, m.index - 400), m.index + 250);
    // "분류" 주변에 개방형/폐쇄형 + 추가형/단위형/청산형이 같이 나오는 자리가 진짜 요약표 분류행
    if (openRe.test(windowText) && addRe.test(windowText)) {
      return windowText;
    }
    if (m[0].length === 0) re.lastIndex++;
  }
  return null;
}

// ---------------------------------------------
// "2. 집합투자기구의 종류 및 형태" 항목은 "가. 형태별 종류 / 나. 운용자산별 종류 /
// 다. 개방형·폐쇄형 구분 / 라. 추가형·단위형 구분" 라벨이 붙은 표준 공시 양식으로,
// 애매함 없이 값을 바로 집어낼 수 있다. "분류" 요약줄(콤마로 나열된 한 줄) 방식보다
// 훨씬 안정적이라 이 라벨 구조를 1차로 시도하고, 못 찾을 때만 "분류" 줄로 넘어간다.
// (참고: "분류" 줄 주변은 문맥상 "집합투자증권" 같은 일반 문구도 많이 섞여 있어서,
//  "증권"처럼 흔한 단어를 우선 검사하면 정작 정답인 "단기금융" 등을 놓치고 오탐하기 쉽다)
// ---------------------------------------------
function fcExtractLabeledSegment(text, labelParts, windowSize) {
  if (!text) return null;
  const re = new RegExp(labelParts.map(loosePattern).join("[\\s\\S]{0,8}"));
  const m = text.match(re);
  if (!m) return null;
  return text.slice(m.index + m[0].length, m.index + m[0].length + (windowSize || 100));
}

function fcExtractLabeledForm(text) {
  const seg = fcExtractLabeledSegment(text, ["추가형", "단위형", "구분"], 60);
  if (!seg) return null;
  if (new RegExp(loosePattern("추가형")).test(seg)) return "추가형";
  if (new RegExp(loosePattern("단위형")).test(seg)) return "단위형";
  if (new RegExp(loosePattern("청산형")).test(seg)) return "청산형";
  return null;
}

function fcExtractLabeledRedeemType(text) {
  const seg = fcExtractLabeledSegment(text, ["개방형", "폐쇄형", "구분"], 60);
  if (!seg) return null;
  if (new RegExp(loosePattern("개방형")).test(seg)) return "개방형";
  if (new RegExp(loosePattern("폐쇄형")).test(seg)) return "폐쇄형";
  return null;
}

function fcExtractLabeledCapitalType(text) {
  const seg = fcExtractLabeledSegment(text, ["운용자산별", "종류"], 60);
  if (!seg) return null;
  // 더 구체적인 유형(단기금융/부동산/특별자산/혼합자산)을 먼저 검사하고, "증권"은 가장 나중에
  // 검사한다 — "증권(주식형)"처럼 실제로 증권형인 경우에만 최종적으로 걸리도록.
  if (new RegExp(loosePattern("단기") + "\\s*" + loosePattern("금융")).test(seg) || /MMF/i.test(seg)) return "단기금융";
  if (new RegExp(loosePattern("부동산")).test(seg)) return "부동산";
  if (new RegExp(loosePattern("특별") + "\\s*" + loosePattern("자산")).test(seg)) return "특별자산";
  if (new RegExp(loosePattern("혼합") + "\\s*" + loosePattern("자산")).test(seg)) return "혼합자산";
  if (new RegExp(loosePattern("증권")).test(seg)) return "증권";
  return null;
}

function fcExtractForm(classLine) {
  if (!classLine) return null;
  if (new RegExp(loosePattern("추가형")).test(classLine)) return "추가형";
  if (new RegExp(loosePattern("단위형")).test(classLine)) return "단위형";
  if (new RegExp(loosePattern("청산형")).test(classLine)) return "청산형";
  return null;
}

function fcExtractRedeemType(classLine) {
  if (!classLine) return null;
  if (new RegExp(loosePattern("개방형")).test(classLine)) return "개방형";
  if (new RegExp(loosePattern("폐쇄형")).test(classLine)) return "폐쇄형";
  return null;
}

function fcExtractCapitalType(classLine) {
  if (!classLine) return null;
  // "분류" 요약줄 fallback에서도 구체적인 유형을 먼저 검사 (동일한 이유로 순서 중요)
  if (new RegExp(loosePattern("단기") + "\\s*" + loosePattern("금융")).test(classLine) || /MMF/i.test(classLine)) return "단기금융";
  if (new RegExp(loosePattern("부동산")).test(classLine)) return "부동산";
  if (new RegExp(loosePattern("특별") + "\\s*" + loosePattern("자산")).test(classLine)) return "특별자산";
  if (new RegExp(loosePattern("혼합") + "\\s*" + loosePattern("자산")).test(classLine)) return "혼합자산";
  if (new RegExp(loosePattern("증권")).test(classLine)) return "증권";
  return null;
}

function fcExtractCapitalSubType(classLine, capitalType) {
  if (!classLine || !FC_SUBTYPE_OPTIONS[capitalType]) return null;
  if (capitalType === "증권") {
    if (new RegExp(loosePattern("주식") + "\\s*" + loosePattern("혼합")).test(classLine) || new RegExp(loosePattern("혼합") + "\\s*" + loosePattern("주식")).test(classLine)) return "혼합주식형";
    if (new RegExp(loosePattern("채권") + "\\s*" + loosePattern("혼합")).test(classLine) || new RegExp(loosePattern("혼합") + "\\s*" + loosePattern("채권")).test(classLine)) return "혼합채권형";
    if (new RegExp(loosePattern("투자계약증권")).test(classLine)) return "투자계약증권형";
    if (new RegExp(loosePattern("재간접")).test(classLine)) return "재간접";
    // "주식파생형"/"주식-파생형"/"주식 파생형" 등은 파생상품을 활용해 주식형 성격의 수익을 추구하는
    // 형태로, 세부유형상으로는 "주식형"으로 취급한다.
    if (new RegExp(loosePattern("주식") + "\\s*-?\\s*" + loosePattern("파생") + "\\s*" + loosePattern("형")).test(classLine)) return "주식형";
    if (new RegExp(loosePattern("주식형")).test(classLine)) return "주식형";
    if (new RegExp(loosePattern("채권형")).test(classLine)) return "채권형";
    return null;
  }
  if (capitalType === "단기금융") {
    return new RegExp(loosePattern("법인")).test(classLine) ? "MMF법인용" : "MMF개인용";
  }
  return null;
}

// ---------------------------------------------
// 8. 적정성원칙 대상여부: "고난도금융투자상품 해당여부"에 O 표시가 있으면 예, 아니면 아니오
// ---------------------------------------------
// "해당여부" 옆의 O/X 표시는 문서마다 특수 글꼴(심볼 폰트)로 찍혀 있는 경우가 많아
// 실제로는 화면엔 O로 보여도 유니코드 코드값이 우리가 검사하는 문자 목록에 없어 못 잡히는 일이 잦다.
// 그래서 훨씬 안정적인 "이 투자신탁은 ~고난도금융투자상품에 해당합니다/해당하지 않습니다" 같은
// 평문 확인 문장을 1차 신호로 쓰고, O/X 기호는 그 문장이 없을 때만 보조로 확인한다.
function fcExtractSuitability(text) {
  // 1차: 평문 확인/부인 문장 (폰트 이슈 없는 일반 한글 텍스트라 훨씬 안정적)
  const confirmRe = new RegExp(
    loosePattern("고난도") + "\\s*" + loosePattern("금융투자상품") + "[\\s\\S]{0,40}?" + loosePattern("해당") + "(?!\\s*여부)"
  );
  const cm = text.match(confirmRe);
  if (cm) {
    const tail = text.slice(cm.index, cm.index + cm[0].length + 15);
    if (new RegExp(loosePattern("해당하지") + "\\s*" + loosePattern("않")).test(tail) || new RegExp(loosePattern("해당") + "\\s*" + loosePattern("없")).test(tail)) {
      return "아니오";
    }
    if (new RegExp(loosePattern("해당") + "\\s*" + loosePattern("합니다")).test(tail)) {
      return "예";
    }
  }

  // 2차: "해당여부" 옆 O/X 표시 기호 (평문 문장이 없는 문서용 보조 수단)
  const idx = text.search(new RegExp(loosePattern("고난도") + "\\s*" + loosePattern("금융투자상품") + "\\s*" + loosePattern("해당여부")));
  if (idx === -1) return "아니오";
  const windowText = text.slice(idx, idx + 40);
  // O 계열(원문자 포함)과 X 계열 표시를 폭넓게 인식
  if (/해당사항\s*없|없음/.test(windowText)) return "아니오";
  if (/[○◯●⊙OΟοＯｏ0]/.test(windowText)) return "예";
  if (/[X×✕✗☒xX]/.test(windowText)) return "아니오";
  return "아니오";
}

// ---------------------------------------------
// 펀드영업일구분: 당사영업일 / 증권거래소 / 해외영업일 중 자동 판단
// 투자설명서가 아니라 "신탁계약서(집합투자규약서)"의 제2조(용어의 정의) 등에 나오는
// "영업일"이라 함은 ~ 을/를 말한다" 조항을 근거로 판단한다. 회사마다 표현이 달라서
// 정의 문구 안에 등장하는 핵심 단어로 3가지 중 하나로 분류한다.
//   - "해외"/"외국" 언급 → 해외영업일
//   - "거래소"(한국거래소/증권거래소 등) 언급 → 증권거래소
//   - "판매회사"/"당사"/"당행"/"은행"/"본사" 등 자기 자신을 지칭하는 표현 → 당사영업일
//     (예: "판매회사의 영업일", "당행의 영업일" 등은 모두 당사영업일로 취급)
// ---------------------------------------------

// "영업일"이라 함은 ~ 말한다/본다/의미한다/뜻한다" 형태의 정의 조항 본문(캡처된 부분)을 찾는다.
// 정의와 종결어미 사이에 줄바꿈이 끼는 경우가 흔해 "."가 아니라 "[\s\S]"로 이어준다.
function fcFindBizDayDefinition(text) {
  const endings = ["말한다", "본다", "의미한다", "뜻한다", "칭한다"];
  const endingPattern = endings.map(loosePattern).join("|");
  const re = new RegExp(
    loosePattern("영업일") + "[\\s\\S]{0,10}" + loosePattern("함은") +
    "([\\s\\S]{1,150}?)(?:" + endingPattern + ")"
  );
  const m = text.match(re);
  return m ? m[1] : null;
}

function fcClassifyBizDayType(definitionText) {
  if (!definitionText) return null;
  if (/해외|외국/.test(definitionText)) return "해외영업일";
  if (/거래소/.test(definitionText)) return "증권거래소";
  if (/판매회사|당사|당행|당\s*은행|본사|회사|은행/.test(definitionText)) return "당사영업일";
  return null;
}

function fcExtractBizDayType(text) {
  const definition = fcFindBizDayDefinition(text);
  return fcClassifyBizDayType(definition);
}

// 신탁계약서 업로드 시 별도로 호출되는 진입점 (fcAutoExtract와 독립적으로 동작함 —
// 투자설명서 유무와 상관없이 신탁계약서만 올라오면 바로 판단할 수 있어야 하기 때문)
function fcAutoExtractBizDayType() {
  if (typeof trustDeedSearchableText === "undefined" || !trustDeedSearchableText) return false;
  const bizDayType = fcExtractBizDayType(trustDeedSearchableText);
  if (bizDayType) {
    fcSet("fund_biz_day_type", bizDayType);
    return true;
  }
  FC_STATE.fund_biz_day_type = { value: "", found: false };
  return false;
}

function fcAutoExtract() {
  if (typeof searchableText === "undefined" || !searchableText) return false;
  let didFind = false;

  const fundKind = fcExtractFundKind();
  if (fundKind) { fcSet("fund_kind", fundKind); didFind = true; }

  const fundType = fcExtractFundType();
  if (fundType) { fcSet("fund_type", fundType); didFind = true; }

  // 파생투자여부 / 파생결합증권편입구분: 펀드유형구분이 "파생상품"이면 예, 아니면 아니오
  const derivativeAnswer = fundType === "파생상품" ? "예" : "아니오";
  fcSet("fund_derivative", derivativeAnswer);
  fcSet("fund_els_usage", derivativeAnswer);
  didFind = true;

  const classLine = fcFindClassificationLine(searchableText);

  // "2. 집합투자기구의 종류 및 형태"의 가~바 라벨 구조를 1차로 시도 (훨씬 안정적),
  // 못 찾으면 "분류" 요약줄 방식으로 넘어감.
  const form = fcExtractLabeledForm(searchableText) || fcExtractForm(classLine);
  if (form) { fcSet("fund_form", form); didFind = true; }

  const redeemType = fcExtractLabeledRedeemType(searchableText) || fcExtractRedeemType(classLine);
  if (redeemType) { fcSet("fund_redeem_type", redeemType); didFind = true; }

  const capitalType = fcExtractLabeledCapitalType(searchableText) || fcExtractCapitalType(classLine);
  if (capitalType) { fcSet("fund_capital_type", capitalType); didFind = true; }

  const capitalSubType = fcExtractCapitalSubType(classLine, capitalType);
  if (capitalSubType) { fcSet("fund_capital_subtype", capitalSubType); didFind = true; }

  // 펀드유형(수익률평가): 항상 해당없음
  fcSet("fund_yield_type", "해당없음");

  // 고난도상품여부: PDF의 "고난도금융투자상품 해당여부" 항목에서 그대로 추출 (기존 로직 그대로)
  const highDifficulty = fcExtractSuitability(searchableText);
  fcSet("fund_high_difficulty", highDifficulty);

  // 고난도적정성사전교육대상: 고난도상품여부와 동일하게 따라감 (기존 방식 그대로)
  fcSet("fund_pre_education", highDifficulty);

  // 적정성원칙 대상여부:
  //   - 고난도상품여부가 "예"면 그대로 "예"
  //   - 고난도상품여부가 "아니오"면 파생투자여부(derivativeAnswer)에 따라 갈림
  //       · 파생투자여부 "예"  → "비중확인필요" (파생 비중을 봐야 실제 대상 여부가 갈리므로)
  //       · 파생투자여부 "아니오" → "아니오"
  const suitability = highDifficulty === "예"
    ? "예"
    : (derivativeAnswer === "예" ? "비중확인필요" : "아니오");
  fcSet("fund_suitability", suitability);

  // PB전용(PRIME)여부: 항상 아니오
  fcSet("fund_pb_prime", "아니오");

  const trustee = fcExtractTrustee(searchableText);
  if (trustee) { fcSet("fund_trustee", trustee); didFind = true; }

  const adminCompany = fcExtractAdminCompany(searchableText);
  if (adminCompany) { fcSet("fund_admin_company", adminCompany); didFind = true; }

  const inceptionDate = fcExtractInceptionDate(searchableText);
  if (inceptionDate) {
    fcSet("fund_inception_date", inceptionDate);
    const nextSettlement = fcComputeNextSettlement(inceptionDate);
    if (nextSettlement) fcSet("fund_next_settlement", nextSettlement);
    didFind = true;
  }

  // 펀드영업일구분은 신탁계약서 기준이라 별도 진입점(fcAutoExtractBizDayType)에서 처리한다.
  // 다만 투자설명서보다 신탁계약서가 먼저 업로드된 경우에도 값이 남아있도록 여기서도 한 번 시도.
  if (fcAutoExtractBizDayType()) didFind = true;

  // 고령층계약알림여부: 펀드유형구분이 "파생상품"이면 예, 아니면 아니오 (derivativeAnswer와 동일 기준)
  fcSet("fund_elderly_notice", derivativeAnswer);

  // 레버리지 해피콜여부 / 거래통화코드 / 금액소수자리수: 한글펀드명(product-name.js가 채워둔
  // baseKrName)에 등장하는 키워드로 판단. autoFillProductName()이 fcAutoExtract()보다 먼저
  // 실행되므로(script.js의 handleFile 참고) 이 시점엔 이미 값이 확정돼 있음.
  const krNameForFc = (typeof baseKrName !== "undefined" && baseKrName) ? baseKrName : "";

  const leverageHappyCall = /레버리지|리버스|인버스/.test(krNameForFc) ? "예" : "아니오";
  fcSet("fund_leverage_happy_call", leverageHappyCall);

  const currencyCode = /usd/i.test(krNameForFc) ? "USD(달러)" : "KRW(원)";
  fcSet("fund_currency_code", currencyCode);
  fcSet("fund_amount_decimal_digits", currencyCode === "USD(달러)" ? "2" : "0");

  didFind = true;

  return didFind;
}

// 부모값(fund_capital_type)에 따라 하위분류 옵션 자체를 바꾼다.
// 옵션이 없는 부모값(부동산/특별자산/혼합자산)이면 선택 불가(빈칸)로 비활성화.
function fcPopulateSubType(parentValue, selectedValue) {
  const sel = $("#fcCapitalSubType");
  if (!sel) return;
  const opts = FC_SUBTYPE_OPTIONS[parentValue];
  if (!opts) {
    sel.innerHTML = '<option value="">－</option>';
    sel.disabled = true;
    sel.value = "";
    return;
  }
  sel.disabled = false;
  sel.innerHTML = '<option value="">미입력</option>' + opts.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
  sel.value = (selectedValue && opts.includes(selectedValue)) ? selectedValue : "";
}

function renderFundClass() {
  Object.entries(FC_DOM_MAP).forEach(([domId, key]) => {
    const el = $("#" + domId);
    if (!el) return;
    const state = FC_STATE[key];
    el.classList.remove("auto-filled", "none-found");
    if (state.found) {
      el.value = state.value;
      el.classList.add("auto-filled");
    } else if (state.found === false) {
      el.classList.add("none-found");
    }
  });

  const subEl = $("#fcCapitalSubType");
  if (subEl) {
    fcPopulateSubType(FC_STATE.fund_capital_type.value, FC_STATE.fund_capital_subtype.value);
    subEl.classList.remove("auto-filled", "none-found");
    if (FC_STATE.fund_capital_subtype.found) subEl.classList.add("auto-filled");
  }
}

const fcCapitalTypeEl = $("#fcCapitalType");
if (fcCapitalTypeEl) {
  fcCapitalTypeEl.addEventListener("change", () => {
    FC_STATE.fund_capital_type = { value: fcCapitalTypeEl.value, found: !!fcCapitalTypeEl.value };
    fcCapitalTypeEl.classList.remove("auto-filled", "none-found");
    FC_STATE.fund_capital_subtype = { value: "", found: false };
    fcPopulateSubType(fcCapitalTypeEl.value, null);
  });
}
const fcCapitalSubTypeEl = $("#fcCapitalSubType");
if (fcCapitalSubTypeEl) {
  fcCapitalSubTypeEl.addEventListener("change", () => {
    FC_STATE.fund_capital_subtype = { value: fcCapitalSubTypeEl.value, found: !!fcCapitalSubTypeEl.value };
    fcCapitalSubTypeEl.classList.remove("auto-filled", "none-found");
  });
}

// 최초설정일자를 직접 바꾸면 차기결산예정일도 그에 맞게 다시 계산해서 갱신
// 📅 버튼: 숨겨진 날짜 선택기(input[type=date])를 열고, 선택한 날짜를 옆 텍스트칸에 YYYY-MM-DD로 채운다.
// (input[type=date]의 .value는 브라우저 로캘과 무관하게 항상 YYYY-MM-DD이므로 그대로 사용해도 안전함)
document.querySelectorAll(".date-cal-btn").forEach(btn => {
  const picker = $("#" + btn.dataset.for);
  if (!picker) return;
  btn.addEventListener("click", () => {
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  });
  picker.addEventListener("change", () => {
    const textId = btn.dataset.for.replace(/Picker$/, "");
    const textEl = $("#" + textId);
    if (textEl && picker.value) {
      textEl.value = picker.value;
      textEl.dispatchEvent(new Event("change"));
    }
  });
});

const fcInceptionDateEl = $("#fcInceptionDate");
if (fcInceptionDateEl) {
  fcInceptionDateEl.addEventListener("change", () => {
    FC_STATE.fund_inception_date = { value: fcInceptionDateEl.value, found: !!fcInceptionDateEl.value };
    fcInceptionDateEl.classList.remove("auto-filled", "none-found");
    const nextSettlement = fcComputeNextSettlement(fcInceptionDateEl.value);
    const nextEl = $("#fcNextSettlement");
    if (nextSettlement && nextEl) {
      FC_STATE.fund_next_settlement = { value: nextSettlement, found: true };
      nextEl.value = nextSettlement;
      nextEl.classList.remove("none-found");
      nextEl.classList.add("auto-filled");
    }
  });
}

// 사용자가 직접 바꾸면 상태에도 반영 (다시 추출해도 값이 안 날아가도록)
Object.entries(FC_DOM_MAP).forEach(([domId, key]) => {
  const el = $("#" + domId);
  if (!el) return;
  el.addEventListener("change", () => {
    FC_STATE[key] = { value: el.value, found: !!el.value };
    el.classList.remove("auto-filled", "none-found");
  });
});

const fcRefreshBtn = $("#fcRefreshBtn");
if (fcRefreshBtn) {
  fcRefreshBtn.addEventListener("click", () => {
    const found = fcAutoExtract();
    if (!found) alert("펀드 종류/유형 관련 문구를 찾지 못했습니다. 직접 선택해주세요.");
    renderFundClass();
  });
}

renderFundClass();
