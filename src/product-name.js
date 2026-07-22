// ============================================================
// product-name.js — 상품명 폼(한글/영문/약칭/SMS발송용펀드명 + 클래스 1~3차) 관련 로직
// utils.js, class-rules.js보다 뒤에, script.js보다 앞에 로드되어야 합니다.
// (여기서 쓰는 searchableText/summaryEntries는 script.js에서 선언되며,
//  autoFillProductName()이 실제 호출되는 시점=PDF 업로드 이후에는 이미 값이 채워져 있어 문제없습니다.)
// ============================================================

// "이 투자설명서는 OOO에 대한 자세한 내용을 담고 있습니다" — 투자설명서 맨 앞의 표준 안내문구.
// OOO 부분이 펀드명이며, 반드시 "펀드"라는 글자로 끝나지 않는 경우도 있어서(예: "OO증권 성장주식 1호")
// "펀드"로 끝나야 한다는 제약 없이, "투자설명서는" ~ "에 대한" 사이 전체를 그대로 캡처함.
// 캡처 구간은 [\s\S] 사용 — 일반 "."은 줄바꿈을 못 건너뛰어서, PDF에서 펀드명 중간에 줄바꿈이
// 끼어드는 경우(예: "…투자신탁\n[채권]") 매칭이 통째로 실패하는 문제가 있었음.
const FUND_NAME_LEAD_PATTERN =
  loosePattern("이") + "\\s*" + loosePattern("투자설명서는") + "\\s+([\\s\\S]{1,150}?)\\s*" + loosePattern("에") + "\\s*" + loosePattern("대한");

// PDF에서 "["/"("와 내용, "]"/")"가 각각 별개 글자 조각으로 저장되어 있으면
// 텍스트 재구성 과정에서 그 사이에 공백이 끼어들 수 있음 (예: "…신탁 [ 채권 ]", "…신탁 ( 주식 )").
// 한글펀드명은 원래 공백 없이 이어 써야 하므로(2026-07-15 확인), 괄호 주변뿐 아니라 모든 공백을 제거함.
function cleanFundName(str) {
  return str.replace(/\s+/g, "").trim();
}

// ---------------------------------------------
// 상품명 폼 DOM 연결 (영문/한글/약칭/SMS명 + 클래스 1~3차) — 실제 등록 화면과 동일한 필드 구성
// ---------------------------------------------
const pnFields = {
  kr: $("#krName"),
  short: $("#shortName"),
  sms: $("#smsName"),
  class1: $("#class1"),
  class2: $("#class2"),
  class3: $("#class3"),
};

function fillSelect(selectEl, options) {
  const prev = selectEl.value; // 값 유지 시도용
  selectEl.innerHTML = options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
  if (options.includes(prev)) selectEl.value = prev;
}
fillSelect(pnFields.class1, CLASS1_OPTIONS);
fillSelect(pnFields.class2, CLASS2_OPTIONS);
fillSelect(pnFields.class3, CLASS3_OPTIONS);

// 사용자가 자동채움/제안값을 직접 확인·수정하면 강조 표시(색)를 지움
Object.values(pnFields).forEach(el => {
  el.addEventListener("input", () => el.classList.remove("auto-filled", "suggested", "none-found"));
  el.addEventListener("change", () => el.classList.remove("auto-filled", "suggested", "none-found"));
});

// ---------------------------------------------
// 클래스 연동 드롭다운 + "지금 조합이 실제 어떤 코드인지" 확인 표시
// 1차를 고르면 → 그 운용사(자동 추출된 "집합투자업자" 기준. 못 찾았으면 전체 회사 통합)에
// 실제로 존재하는 2차만 보여주고, 2차까지 고르면 → 실제로 존재하는 3차만 보여줌.
// ---------------------------------------------
const classMatchHint = $("#classMatchHint");

// 클래스 코드가 붙기 전, PDF에서 뽑아낸 "원본" 한글펀드명을 따로 저장해둠.
// 사용자가 클래스 규칙 확인 표에서 이 코드 저 코드 눌러봐도, 항상 이 원본 기준으로
// 다시 이어붙이기 때문에 코드가 계속 누적되어 붙는 일이 없음.
let baseKrName = "";
// 공백이 다 지워지지 않은 "원본" 버전. 화면 표시(#krName)는 공백 없는 baseKrName을 쓰지만,
// 외부 API 검색(공공데이터 등)처럼 실제 등록명의 띄어쓰기가 살아있어야 하는 곳에서 씀.
let baseKrNameRaw = "";
// 약칭펀드명도 마찬가지로 "클래스 코드 붙기 전" 원본을 저장해둠 (2026-07-15: 클래스 선택 시
// 한글펀드명뿐 아니라 약칭펀드명에도 코드가 같이 표기되도록 함).
let baseShortName = "";

function refreshClassDependentOptions() {
  const table = getActiveClassTable();
  const companyKey = getDetectedCompanyKey();
  const t1 = pnFields.class1.value;

  // 2차 옵션: 1차가 선택돼 있으면 그 1차에 실제로 존재하는 2차만, 아니면 표준 옵션 전체
  const t2Candidates = (t1 && t1 !== "없음")
    ? Array.from(new Set(table.filter(e => e.tier1 === t1).map(e => e.tier2))).filter(v => CLASS2_OPTIONS.includes(v))
    : null;
  fillSelect(pnFields.class2, ["없음", ...(t2Candidates && t2Candidates.length ? t2Candidates : CLASS2_OPTIONS.slice(1))]);

  // 3차 옵션: 1차+2차 조합에 실제로 존재하는 3차만, 아니면 표준 옵션 전체
  const t2 = pnFields.class2.value;
  const t3Candidates = (t1 && t1 !== "없음" && t2 && t2 !== "없음")
    ? Array.from(new Set(table.filter(e => e.tier1 === t1 && e.tier2 === t2).map(e => e.tier3)))
    : null;
  fillSelect(pnFields.class3, ["없음", ...(t3Candidates && t3Candidates.length ? t3Candidates : CLASS3_OPTIONS.slice(1))]);

  // 지금 조합이 실제로 어떤 코드에 해당하는지 확인용 텍스트 표시
  if (!classMatchHint) return;
  const t3 = pnFields.class3.value;
  if (t1 === "없음") {
    classMatchHint.textContent = "1차를 선택하면 실제 코드와 대조해서 보여드려요.";
    return;
  }
  const matched = table.filter(e =>
    e.tier1 === t1 &&
    (t2 === "없음" || e.tier2 === t2) &&
    (t3 === "없음" || e.tier3 === t3)
  );
  const companyLabel = companyKey ? `[${companyKey}]` : "[운용사 미확정 · 전체 회사 통합 검사]";
  if (matched.length === 0) {
    classMatchHint.textContent = `${companyLabel} 이 조합에 해당하는 코드가 없어요. 확인해보세요.`;
  } else {
    classMatchHint.textContent = `${companyLabel} 해당 코드: ${matched.map(m => m.code).join(", ")}`;
  }
}

pnFields.class1.addEventListener("change", () => { refreshClassDependentOptions(); refreshKofiaCodeForCurrentClass(); });
pnFields.class2.addEventListener("change", () => { refreshClassDependentOptions(); refreshKofiaCodeForCurrentClass(); });
pnFields.class3.addEventListener("change", () => { refreshClassDependentOptions(); refreshKofiaCodeForCurrentClass(); });

// 지금 1~3차 드롭다운 조합에 해당하는 클래스표 행을 찾아 반환 (fundCode 포함 — product-public-api.js의
// applyKofiaCodeForCurrentClass가 이 fundCode로 협회표준코드를 다시 찾아 넣는 데 씀).
// refreshClassDependentOptions()의 "matched" 계산과 동일한 기준이지만, 여러 건이 매칭되면
// (예: 2차/3차를 아직 안 좁혔을 때) 그중 첫 번째만 사용함 — 협회표준코드는 참고용 보조값이라
// 완벽한 단일 매칭이 아니어도 괜찮음.
function getCurrentClassEntry() {
  const table = getActiveClassTable();
  const t1 = pnFields.class1.value, t2 = pnFields.class2.value, t3 = pnFields.class3.value;
  if (!t1 || t1 === "없음") return null;
  return table.find(e =>
    e.tier1 === t1 &&
    (t2 === "없음" || e.tier2 === t2) &&
    (t3 === "없음" || e.tier3 === t3)
  ) || null;
}

// 클래스 선택이 바뀔 때마다(자동감지/수동클릭/드롭다운 직접수정 전부) 협회표준코드도 같이
// 다시 맞춰줌. product-public-api.js가 아직 로드 전이거나 API 매칭이 아예 없었던 경우엔
// PUBLIC_API_STATE.srtnCdMap이 비어있을 뿐이라 조용히 아무 것도 안 하고 넘어감.
function refreshKofiaCodeForCurrentClass() {
  if (typeof applyKofiaCodeForCurrentClass === "function") applyKofiaCodeForCurrentClass();
}

// "클래스 규칙 확인" 표에서 코드를 클릭했을 때 호출됨 (class-checker.js에서 호출).
// 1) 1~3차 드롭다운을 그 코드에 맞게 세팅
// 2) 한글펀드명/약칭펀드명을 "원본 이름 + 코드"로 갱신 (구분기호 없이 그대로 이어붙임, 기존에
//    붙어있던 다른 코드가 있었다면 원본 기준으로 다시 계산하므로 코드가 누적되지 않음)
// 3) sms발송용펀드명은 그렇게 갱신된 약칭펀드명을 기준으로 다시 20바이트 잘라 생성함.
function applyClassCodeSelection(entry) {
  // 드롭다운에 원하는 값이 없는 상태(좁혀진 옵션)일 수 있으니, 먼저 전체 옵션으로 열어둔 뒤 값을 넣음
  fillSelect(pnFields.class2, CLASS2_OPTIONS);
  fillSelect(pnFields.class3, CLASS3_OPTIONS);
  pnFields.class1.value = entry.tier1;
  pnFields.class2.value = entry.tier2;
  pnFields.class3.value = entry.tier3;
  refreshClassDependentOptions(); // 실제 값 기준으로 옵션 목록을 다시 좁히고 힌트 갱신

  [pnFields.class1, pnFields.class2, pnFields.class3].forEach(el => {
    el.classList.remove("none-found", "suggested");
    el.classList.add("auto-filled");
  });

  if (baseKrName) {
    pnFields.kr.value = baseKrName + entry.code;
    pnFields.kr.classList.remove("none-found");
    pnFields.kr.classList.add("auto-filled");
  }

  if (baseShortName) {
    pnFields.short.value = baseShortName + entry.code;
    pnFields.short.classList.remove("none-found", "suggested");
    pnFields.short.classList.add("auto-filled");

    const smsSuggestion = suggestSmsName(pnFields.short.value);
    pnFields.sms.value = smsSuggestion || "없음";
    pnFields.sms.classList.remove("none-found", "suggested");
    pnFields.sms.classList.add(smsSuggestion ? "auto-filled" : "none-found");
  }

  // 상품개별정보(전환그룹코드/클래스구분/인터넷뱅킹판매)도 이 클래스 선택 기준으로 다시 계산
  if (typeof refreshIndividualInfo === "function") refreshIndividualInfo();

  // 협회표준코드도 이 클래스 선택 기준으로 다시 맞춤 (클래스마다 다른 값이라 API 매칭이
  // 있었다면 여기서 새로 찾아 넣어줘야 함 — product-public-api.js)
  refreshKofiaCodeForCurrentClass();
}

// PDF 업로드 시 상품명 칸 7개를 전부 채움. 못 찾은 항목은 값 자체를 "없음"으로 명시함
// (빈칸으로 남겨서 "아직 안 봤나?" 헷갈리지 않도록, 확인해봤지만 없었다는 걸 분명히 표시).
function autoFillProductName() {
  // 매번 초기화: 이전 PDF의 값이 남아있지 않도록
  baseKrName = "";
  baseKrNameRaw = "";
  baseShortName = "";
  pnFields.kr.value = "없음";
  pnFields.short.value = "없음";
  pnFields.sms.value = "없음";
  pnFields.class1.value = "없음";
  pnFields.class2.value = "없음";
  pnFields.class3.value = "없음";
  Object.values(pnFields).forEach(el => el.classList.remove("auto-filled", "suggested", "none-found"));

  if (!searchableText) {
    Object.values(pnFields).forEach(el => el.classList.add("none-found"));
    return;
  }

  // 한글펀드명: "이 투자설명서는 OOO에 대한 자세한 내용을 담고 있습니다" 문장에서 OOO를 그대로 가져옴.
  // OOO에 이미 "(USD)", "(주식-재간접형)" 같은 괄호 표기가 포함돼 있어도 그대로 유지한다.
  // (예전엔 괄호 안에 영문자가 있으면 "영문펀드명"으로 따로 떼어냈었는데, "(USD)"처럼 영문자가
  //  섞인 통화/분류 표기까지 영문명으로 오분류하는 문제가 있어 그 분리 로직 자체를 없앴다.)
  const re = new RegExp(FUND_NAME_LEAD_PATTERN);
  const m = searchableText.match(re);
  if (m) {
    pnFields.kr.value = cleanFundName(m[1]);
    pnFields.kr.classList.add("auto-filled");
    // 줄바꿈으로 쪼개진 공백만 하나로 합치고, 실제 띄어쓰기는 그대로 유지 (외부 API 검색용)
    baseKrNameRaw = m[1].replace(/\s+/g, " ").trim();
  } else {
    pnFields.kr.classList.add("none-found");
    baseKrNameRaw = "";
  }

  // 클래스 코드가 붙기 전 상태를 "원본"으로 저장 (없음이면 빈 문자열)
  baseKrName = (pnFields.kr.value !== "없음") ? pnFields.kr.value : "";

  // 1.5) 약칭펀드명 / sms발송용펀드명 원본(baseShortName) 미리 계산 — 클래스 코드는 아직 안 붙은 상태.
  //    (제안일 뿐 확정 값이 아니므로 "auto-filled"이 아닌 "suggested" 색으로 구분 표시)
  //    아래 3번에서 클래스가 자동 감지되면 applyClassCodeSelection()이 이 baseShortName 기준으로
  //    코드를 붙여 최종값을 만들기 때문에, 클래스 감지보다 먼저 계산해둬야 함.
  if (baseKrName) {
    baseShortName = suggestShortName(baseKrName);
    pnFields.short.value = baseShortName || "없음";
    pnFields.short.classList.add(baseShortName ? "suggested" : "none-found");

    const smsSuggestion = suggestSmsName(baseShortName);
    pnFields.sms.value = smsSuggestion || "없음";
    pnFields.sms.classList.add(smsSuggestion ? "suggested" : "none-found");
  } else {
    baseShortName = "";
    pnFields.short.classList.add("none-found");
    pnFields.sms.classList.add("none-found");
  }

  // 2) 운용사 자동 감지 → "클래스 규칙 확인" 표의 운용사 드롭다운도 자동으로 그 회사로 맞춰줌.
  //    표에 실제로 채우는 데이터는(운용사 이름과 별개로) 지금 PDF에서 직접 뽑아낼 수 있으면
  //    그걸 우선 쓰고, 못 뽑았을 때만 하드코딩된 그 회사 표로 대체함.
  const companyKey = getDetectedCompanyKey();
  const extractedFromPdf = extractClassTableFromText(searchableText);
  const usingLiveTable = extractedFromPdf.length > 0;
  // 드롭박스에 보여줄 값: 운용사를 알아냈으면 항상 그 회사 이름을 보여줌(원래 동작대로).
  // 운용사를 못 알아냈을 때만 "현재 PDF에서 추출한 표" 가상 옵션을 보여줌.
  const dropdownValue = companyKey || CURRENT_PDF_TABLE_KEY;
  if (typeof checkCompanySelect !== "undefined" && checkCompanySelect) {
    checkCompanySelect.value = dropdownValue;
  }

  // 3) 클래스한글명(1차/2차/3차) — 본문에 코드가 정확히 1개만 있으면 자동으로 확정.
  //    (여러 클래스가 섞인 대표 투자설명서라 애매하면 "없음"으로 남기고, 사용자가 아래 표에서
  //    직접 코드를 클릭해서 확정하도록 함 — applyClassCodeSelection이 동일한 로직을 처리함)
  const classEntry = detectClassCode(searchableText, companyKey);

  // 표를 보여주고, 자동으로 찾은 코드가 있으면 그 행을 선택 표시함.
  // 운용사 이름은 dropdownValue로 그대로 보여주되, 표 내용은 PDF에서 뽑혔으면 그걸 그대로 사용함
  // (overrideTable로 강제 지정 — 안 그러면 회사 이름 선택 시 하드코딩 표로 다시 덮어써짐).
  if (typeof renderClassCheckTable === "function") {
    renderClassCheckTable(dropdownValue, classEntry ? classEntry.code : null, usingLiveTable ? extractedFromPdf : null);
  }

  if (classEntry) {
    applyClassCodeSelection(classEntry); // baseKrName/baseShortName 기준으로 코드를 붙여 kr/short/sms 전부 갱신
  } else {
    pnFields.class1.classList.add("none-found");
    pnFields.class2.classList.add("none-found");
    pnFields.class3.classList.add("none-found");
    refreshClassDependentOptions(); // 드롭다운을 표준 옵션으로 채우고, 힌트도 "없음" 상태로 갱신
  }
}

// 약칭펀드명 제안 (2026-07-15 규칙 변경):
// 1) 첫 번째 괄호("(" 또는 "[")가 나오는 지점을 기준으로 이름을 둘로 나눔.
//    - "이름 부분"(그 앞쪽): 여기서만 흔한 구조 용어를 제거함.
//    - "꼬리 부분"(그 괄호부터 끝까지): 분류표기("(주식-재간접형)"), 헤지구분("(UH)"),
//      클래스 코드("C-W") 등이 전부 여기 들어있으므로 손대지 않고 그대로 보존함.
//      (예전엔 뒤쪽 괄호를 통째로 지워버려서 헤지구분·분류표기가 다 날아갔었음 — 이제는 유지)
// 2) "증권", "자투자신탁"/"모투자신탁"/"투자신탁"은 이름 부분 "끝"이 아니라 중간에 있어도 제거함
//    — "OO증권투자신탁K-1호"처럼 회차번호(K-1호)가 "투자신탁" 뒤, 괄호 앞에 붙는 경우가 흔해서,
//    끝에만 앵커링하면 못 지웠음(2026-07-15 확인). "투자" 단독 단어는 "한국투자"처럼 운용사 이름
//    일부일 수 있어 절대 건드리지 않고, 반드시 "투자신탁" 4글자 통짜로만 매칭함.
// 3) "집합투자기구"/"펀드"는 기존대로 이름 부분 맨 끝에 붙은 경우만 제거함(중간에 낄 일이 거의 없음).
function suggestShortName(krName) {
  if (!krName) return "";

  const bracketIdx = krName.search(/[([]/);
  const namePart = bracketIdx === -1 ? krName : krName.slice(0, bracketIdx);
  const tailPart = bracketIdx === -1 ? "" : krName.slice(bracketIdx);

  const cleanedName = namePart
    .replace(/(증권\s*)?(자|모)?\s*투자신탁/g, "")
    .replace(/집합투자기구\s*$/, "")
    .replace(/펀드\s*$/, "")
    .trim();

  return cleanedName + tailPart;
}

// sms발송용펀드명 제안 (2026-07-15 규칙 변경): 회사명 축약이나 의미단위 자르기 없이,
// 약칭펀드명을 완성형(EUC-KR) 바이트 기준 앞에서부터 20바이트까지만 그대로 자름.
// 한글/한자 등 비ASCII 문자는 2바이트, 영문·숫자·기호(ASCII)는 1바이트로 계산.
// 단어나 의미 단위가 잘려도 상관없음 — 20바이트 한도만 지키면 됨.
const SMS_MAX_BYTES = 20;
function byteLengthOf(ch) {
  return ch.charCodeAt(0) > 127 ? 2 : 1;
}
function suggestSmsName(shortName) {
  if (!shortName) return "";
  let result = "";
  let bytes = 0;
  for (const ch of shortName) {
    const chBytes = byteLengthOf(ch);
    if (bytes + chBytes > SMS_MAX_BYTES) break;
    result += ch;
    bytes += chBytes;
  }
  return result;
}
