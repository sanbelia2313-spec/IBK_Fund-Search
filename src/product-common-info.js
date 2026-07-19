// ============================================================
// product-common-info.js — "상품공통정보" 카드
//
// - 상품위험등급 / 펀드운용회사: script.js의 items[](manager, risk_grade)에서
//   값을 그대로 가져와 표시 (자동 추출, 읽기전용)
// - 매수일수 / 환매체결일수 / 환매결제일수: "매입방법"/"환매방법" 문구를
//   직접 파싱해서 자동으로 채움. 상품명 필드처럼 자동으로 값이 들어가지만
//   readonly는 아니라서 잘못 채워졌으면 직접 고칠 수 있음.
//
//   ⚠️ 이 10개 필드는 script.js의 items[] 배열과 완전히 분리된 별도 상태
//   (CI_DAY_STATE)로 관리합니다. items[]의 범용 키워드 매칭이 이 필드들을
//   건드리는 일이 절대 없도록 하기 위함 — 예전에 "의 연장" 같은 엉뚱한 값이
//   나왔던 원인이 바로 그 둘이 섞여있었기 때문입니다.
// ============================================================

const CI_AUTO_FIELD_MAP = {
  ciRiskGrade: "risk_grade",
  ciManager:   "manager",
};

// 매입/환매방법 파서가 채우는 필드 (key → 실제 input id)
const CI_DAY_DOM_MAP = {
  buy_before:              "ciBuyBefore",
  buy_after:                "ciBuyAfter",
  redeem_on_before_exec:    "ciOnBeforeExec",
  redeem_on_before_settle:  "ciOnBeforeSettle",
  redeem_on_after_exec:     "ciOnAfterExec",
  redeem_on_after_settle:   "ciOnAfterSettle",
  redeem_post_before_exec:  "ciPostBeforeExec",
  redeem_post_before_settle:"ciPostBeforeSettle",
  redeem_post_after_exec:   "ciPostAfterExec",
  redeem_post_after_settle: "ciPostAfterSettle",
  market_close_time:        "ciMarketCloseTime", // 장마감시각 — "OO시 이전/경과후" 마커에서 실제 시각을 뽑아 HH:MM:SS로 기입
};

// 위 10개 필드의 값/발견여부를 items[]와 별도로 보관 (사용자가 직접 수정하면 여기 반영)
const CI_DAY_STATE = {};
Object.keys(CI_DAY_DOM_MAP).forEach(k => { CI_DAY_STATE[k] = { value: "", found: null }; });

function ciFindItem(key) {
  return (typeof items !== "undefined") ? items.find(it => it.key === key) : null;
}

// ---------------------------------------------
// 매입(매수)방법 / 환매방법 문구 전용 파서
// ---------------------------------------------
// 국내시장 기준 장마감 15시30분, 해외시장 기준 17시 — 두 표기 모두 인식
// 특정 시각을 하드코딩하지 않고, "13시", "14시30분", "15:30", "오후 5시" 등 어떤 시각 표현이든
// 다 인식하도록 일반화 (시장마다 마감시각이 13:00/14:30/15:30/17:00 등으로 다양하기 때문)
const CI_CUTOFF_SRC = "(?:오전|오후)?\\s*\\d{1,2}\\s*(?::\\s*\\d{2}|시\\s*(?:\\d{1,2}\\s*분)?)";
// 컷오프 시각 뒤에 "(15시 30분)"처럼 같은 시각을 다른 표기로 병기하는 경우가 있어서,
// 이전/이후 마커 앞에 짧은 괄호구가 하나 더 와도 통과시킴
const CI_BEFORE_MARKER_RE = new RegExp(CI_CUTOFF_SRC + "(?:\\s*\\([^)]{0,20}\\))?\\s*(?:이전|이하)");
const CI_AFTER_MARKER_RE  = new RegExp(CI_CUTOFF_SRC + "(?:\\s*\\([^)]{0,20}\\))?\\s*(?:경과\\s*후|이후|초과|지난\\s*후)");

// CI_CUTOFF_SRC와 동일한 시각 표현에서 실제 시/분 숫자를 뽑아내기 위한 캡처용 정규식.
// 그룹: 1=오전/오후, 2=시, 3=분(콜론 표기), 4=분("시 30분" 표기)
const CI_CUTOFF_CAPTURE_RE = /(오전|오후)?\s*(\d{1,2})\s*(?::\s*(\d{2})|시\s*(?:(\d{1,2})\s*분)?)/;

// "15시 30분(오후 3시 30분) 이전" 처럼 마커에 매칭된 원문 조각(markerText)에서
// 시/분을 뽑아 "HH:MM:SS" 문자열로 반환한다. 못 찾으면 null.
function ciParseCutoffTime(markerText) {
  if (!markerText) return null;
  const m = markerText.match(CI_CUTOFF_CAPTURE_RE);
  if (!m) return null;
  let hour = parseInt(m[2], 10);
  const minute = m[3] !== undefined ? parseInt(m[3], 10) : (m[4] !== undefined ? parseInt(m[4], 10) : 0);
  const ampm = m[1];
  if (ampm === "오후" && hour < 12) hour += 12;
  if (ampm === "오전" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}
const CI_DAYNUM_RE = /제?\s*(\d+)\s*(?:영\s*업\s*일|거\s*래\s*일)/g;
// "제N영업일" 표현이 없이 "다음 영업일(T+1)"처럼 (D+n)/(T+n) 오프셋만 적힌 경우를 위한 보조 패턴
// (Nth영업일 = 기준일 + (N-1) 관례이므로 오프셋 n → N = n+1로 환산)
const CI_OFFSET_RE = /\(\s*[DT]\s*\+\s*(\d+)\s*\)/g;

const CI_BUY_HEADINGS    = ["매입청구시 적용되는 기준가격", "매입방법", "매수방법", "매입 방법", "매수 방법", "매수시 기준가격", "매입시 적용가격"];
const CI_REDEEM_HEADINGS = ["환매청구시 적용되는 기준가격", "환매방법", "환매 방법", "환매시 기준가격", "환매청구시 적용가격"];

// headingList의 각 후보 문구를, 문서 내 등장하는 모든 위치에서 시도해서
// 실제로 "이전/이후 분기 + 숫자"가 다 나오는 첫번째 결과만 채택한다.
// (표지의 2단 레이아웃 요약 상자에 걸리면 텍스트가 뒤섞여 숫자를 못 찾을 수 있어서,
//  실패하면 다음 문구/다음 등장위치로 계속 넘어간다 — 본문의 정식 조항 쪽이 항상 단일 컬럼이라 더 안정적)
function ciTryExtractBranches(text, headingList, windowLen, minNums) {
  for (const h of headingList) {
    const re = new RegExp(loosePattern(h), "g");
    let m;
    let guard = 0;
    while ((m = re.exec(text)) !== null && guard < 10) {
      guard++;
      const window = text.slice(m.index, m.index + windowLen);
      const branches = ciSplitBranches(window);
      if (branches) {
        const beforeNums = ciDayNums(branches.beforeText);
        const afterNums = ciDayNums(branches.afterText);
        if (beforeNums.length >= minNums && afterNums.length >= minNums) {
          return { beforeNums, afterNums, cutoffMarkerText: branches.cutoffMarkerText };
        }
      }
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return null;
}

// windowText 안에서 "OO시 이전" 분기와 "OO시 경과후/이후" 분기 텍스트를 나눠서 반환
function ciSplitBranches(windowText) {
  const beforeM = windowText.match(CI_BEFORE_MARKER_RE);
  if (!beforeM) return null;
  const beforeEnd = beforeM.index + beforeM[0].length;

  const sub = windowText.slice(beforeEnd);
  const afterM = sub.match(CI_AFTER_MARKER_RE);

  const beforeText = afterM ? sub.slice(0, afterM.index) : sub.slice(0, 250);
  const afterText  = afterM ? sub.slice(afterM.index + afterM[0].length, afterM.index + afterM[0].length + 250) : "";
  return { beforeText, afterText, cutoffMarkerText: beforeM[0] };
}

// 텍스트 안의 "제N영업일" 류 숫자를 등장 순서대로 배열로 반환.
// type이 주어지면, 그 숫자 바로 앞 문맥이 반대 타입(매입/환매)에 명백히 속한 경우는 제외한다.
// (2단 레이아웃이 뒤섞여서 옆 분기의 숫자가 끼어드는 경우를 걸러내기 위함)
function ciNumContext(text, startIdx) {
  const beforeCtx = text.slice(Math.max(0, startIdx - 20), startIdx);
  const isRedeemCtx = /환매/.test(beforeCtx);
  const isBuyCtx = /납입|매입|매수/.test(beforeCtx);
  return { isRedeemCtx, isBuyCtx };
}

function ciDayNums(text, type) {
  const matches = [];
  const re = /제?\s*(\d+)\s*(?:영\s*업\s*일|거\s*래\s*일)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const ctx = ciNumContext(text, m.index);
    matches.push({ num: parseInt(m[1], 10), ...ctx });
  }
  if (matches.length > 0) {
    if (type) {
      // 문맥이 명백히 반대 타입인 것만 제외한다 (애매하거나 내 타입인 건 남김)
      const lenient = matches.filter(x => type === "redeem" ? !(x.isBuyCtx && !x.isRedeemCtx) : !(x.isRedeemCtx && !x.isBuyCtx));
      if (lenient.length > 0) return lenient.map(x => x.num);
    } else {
      return matches.map(x => x.num);
    }
  }

  // "제N영업일"이 명시되지 않고 "다음 영업일(T+1)"처럼 오프셋 표기만 있는 경우의 보조 추출
  const offsetNums = [];
  CI_OFFSET_RE.lastIndex = 0;
  let om;
  while ((om = CI_OFFSET_RE.exec(text)) !== null) offsetNums.push(parseInt(om[1], 10) + 1);
  if (offsetNums.length > 0) return offsetNums;

  // 최후의 수단: 2단 레이아웃이 뒤섞여 "영업일"의 "일"이 전혀 다른 줄로 떨어져 나간 경우,
  // "영업"까지만이라도 붙어있는 숫자를 후보로 잡는다 (문맥이 명백히 내 타입인 것만)
  if (!type) return [];
  const looseRe = /제?\s*(\d+)\s*영\s*업\b/g;
  const looseMatches = [];
  let lm;
  while ((lm = looseRe.exec(text)) !== null) {
    const ctx = ciNumContext(text, lm.index);
    looseMatches.push({ num: parseInt(lm[1], 10), ...ctx });
  }
  const looseStrict = looseMatches.filter(x => type === "redeem" ? (x.isRedeemCtx && !x.isBuyCtx) : (x.isBuyCtx && !x.isRedeemCtx));
  return looseStrict.map(x => x.num);
}

// ---------------------------------------------
// 제목(헤딩) 없이 그냥 "ㆍ오후5시이전에자금을납입한경우: ..." 처럼
// 글머리표만 있는 문서를 위한 보조 파서. 특정 제목을 찾지 않고 문서 전체에서
// "OO시 이전/이후" 표현을 다 찾아서, 마커 바로 뒤 문맥에 "환매"가 있으면 환매 쪽,
// "납입"/"매입"이 있으면 매수 쪽으로 분류한다. 숫자 구간은 다음 글머리표(ㆍ·∙•)
// 앞까지만 본다 (그래야 다음 항목의 숫자를 잘못 끌어오지 않음).
// ---------------------------------------------
function ciNumsAfterMarker(text, matchEnd, maxLen, type, oppositeMarkerRe) {
  let slice = text.slice(matchEnd, matchEnd + maxLen);
  // 반대 방향 마커(이전 스캔 중이면 경과후/이후, 경과후 스캔 중이면 이전)가 다시 나오는 지점 = 다음 분기쌍으로
  // 넘어갔다는 뜻이므로 그 앞에서 끊는다. 2단 레이아웃이 뒤섞여 두 분기의 내용이 서로 겹쳐 있어도
  // 이 경계 안에서는 타입 필터(ciDayNums의 type 인자)가 옆 분기 숫자를 걸러낸다.
  if (oppositeMarkerRe) {
    const om = slice.match(oppositeMarkerRe);
    if (om) slice = slice.slice(0, om.index);
  }
  return ciDayNums(slice, type);
}

function ciClassifyAfterMarker(text, matchEnd) {
  const ctx = text.slice(matchEnd, matchEnd + 18);
  const redeemIdx = ctx.search(/환매/);
  const buyIdx = ctx.search(/납입|매입|매수/);
  if (redeemIdx === -1 && buyIdx === -1) return null;
  if (redeemIdx === -1) return "buy";
  if (buyIdx === -1) return "redeem";
  return redeemIdx < buyIdx ? "redeem" : "buy";
}

function ciDirectScan(text) {
  const result = { buyBeforeNums: null, buyAfterNums: null, redeemBeforeNums: null, redeemAfterNums: null, cutoffMarkerText: null };

  function scan(markerRe, oppositeMarkerRe, isBefore) {
    const re = new RegExp(markerRe.source, "g");
    let m, guard = 0;
    while ((m = re.exec(text)) !== null && guard < 60) {
      guard++;
      const matchEnd = m.index + m[0].length;
      const type = ciClassifyAfterMarker(text, matchEnd);
      if (type) {
        const nums = ciNumsAfterMarker(text, matchEnd, 300, type, oppositeMarkerRe);
        if (nums.length > 0) {
          if (isBefore && result.cutoffMarkerText === null) result.cutoffMarkerText = m[0];
          if (type === "buy") {
            if (isBefore && result.buyBeforeNums === null) result.buyBeforeNums = nums;
            if (!isBefore && result.buyAfterNums === null) result.buyAfterNums = nums;
          } else {
            if (isBefore && result.redeemBeforeNums === null) result.redeemBeforeNums = nums;
            if (!isBefore && result.redeemAfterNums === null) result.redeemAfterNums = nums;
          }
        }
      }
      if (m[0].length === 0) re.lastIndex++;
    }
  }

  scan(CI_BEFORE_MARKER_RE, CI_AFTER_MARKER_RE, true);
  scan(CI_AFTER_MARKER_RE, CI_BEFORE_MARKER_RE, false);
  return result;
}

function ciSetDay(key, value) {
  CI_DAY_STATE[key] = { value: String(value), found: true };
}

// 매입방법/환매방법 문구를 찾아 CI_DAY_STATE의 값들을 채움. 반환값: 하나라도 채웠으면 true
function ciAutoExtractDayCounts() {
  if (typeof searchableText === "undefined" || !searchableText) return false;
  let didFind = false;

  // 1차: 제목("매입청구시 적용되는 기준가격" 등)을 앵커로 찾는 방식 — 정식 조항(단일 컬럼)에 걸리면 가장 안정적
  const buyResult = ciTryExtractBranches(searchableText, CI_BUY_HEADINGS, 500, 1);
  const redeemResult = ciTryExtractBranches(searchableText, CI_REDEEM_HEADINGS, 700, 2);

  let buyBeforeNums = buyResult ? buyResult.beforeNums : null;
  let buyAfterNums  = buyResult ? buyResult.afterNums  : null;
  let redeemBeforeNums = (redeemResult && redeemResult.beforeNums.length >= 2) ? redeemResult.beforeNums : null;
  let redeemAfterNums  = (redeemResult && redeemResult.afterNums.length  >= 2) ? redeemResult.afterNums  : null;

  // 2차: 제목이 없거나 못 찾은 부분만, 제목 없이 "OO시 이전/이후" 마커를 직접 찾는 방식으로 보완
  let scanned = null;
  if (!buyBeforeNums || !buyAfterNums || !redeemBeforeNums || !redeemAfterNums) {
    scanned = ciDirectScan(searchableText);
    if (!buyBeforeNums) buyBeforeNums = scanned.buyBeforeNums;
    if (!buyAfterNums)  buyAfterNums  = scanned.buyAfterNums;
    if (!redeemBeforeNums) redeemBeforeNums = scanned.redeemBeforeNums;
    if (!redeemAfterNums)  redeemAfterNums  = scanned.redeemAfterNums;
  }

  // 매수일수: 이전 분기 숫자 1개 → 장마감전, 이후 분기 숫자 1개 → 장마감후
  if (buyBeforeNums && buyBeforeNums[0] !== undefined) { ciSetDay("buy_before", buyBeforeNums[0]); didFind = true; }
  if (buyAfterNums  && buyAfterNums[0]  !== undefined) { ciSetDay("buy_after",  buyAfterNums[0]);  didFind = true; }

  // 환매일수: 분기마다 숫자 2개 [기준가격적용일, 지급일] → [환매체결일수, 환매결제일수]
  // 판매후 항목은 별도 언급이 없으면 판매중과 동일하게 채운다.
  if (redeemBeforeNums && redeemBeforeNums.length >= 2) {
    ciSetDay("redeem_on_before_exec", redeemBeforeNums[0]);
    ciSetDay("redeem_on_before_settle",   redeemBeforeNums[1]);
    ciSetDay("redeem_post_before_exec", redeemBeforeNums[0]);
    ciSetDay("redeem_post_before_settle",   redeemBeforeNums[1]);
    didFind = true;
  }
  if (redeemAfterNums && redeemAfterNums.length >= 2) {
    ciSetDay("redeem_on_after_exec", redeemAfterNums[0]);
    ciSetDay("redeem_on_after_settle",   redeemAfterNums[1]);
    ciSetDay("redeem_post_after_exec", redeemAfterNums[0]);
    ciSetDay("redeem_post_after_settle",   redeemAfterNums[1]);
    didFind = true;
  }

  // 장마감시각: 매수/환매 일수를 찾을 때 실제로 매칭됐던 "OO시 이전" 마커 원문에서 시각만 뽑아 기입.
  // 매입방법 쪽 마커를 우선 사용(단일 컬럼이라 더 안정적), 없으면 환매방법 쪽, 그래도 없으면 직접 스캔 결과를 사용.
  const cutoffMarkerText = (buyResult && buyResult.cutoffMarkerText)
    || (redeemResult && redeemResult.cutoffMarkerText)
    || (scanned && scanned.cutoffMarkerText)
    || null;
  const closeTime = ciParseCutoffTime(cutoffMarkerText);
  if (closeTime) { ciSetDay("market_close_time", closeTime); didFind = true; }

  return didFind;
}

function renderCommonInfo() {
  // 상품위험등급 / 펀드운용회사 (items[] 연동, 읽기전용)
  Object.entries(CI_AUTO_FIELD_MAP).forEach(([inputId, itemKey]) => {
    const el = $("#" + inputId);
    if (!el) return;
    const item = ciFindItem(itemKey);

    el.classList.remove("auto-filled", "suggested", "none-found");

    if (!item || !item.value) {
      el.value = "";
      el.placeholder = "미입력";
      if (item && item.found === false) el.classList.add("none-found");
      return;
    }

    el.value = item.value;
    if (item.confident) el.classList.add("auto-filled");
    else el.classList.add("suggested");
  });

  // 매수일수 / 환매체결·결제일수 (CI_DAY_STATE 연동, 자동 채움 + 직접 수정 가능)
  Object.entries(CI_DAY_DOM_MAP).forEach(([key, inputId]) => {
    const el = $("#" + inputId);
    if (!el) return;
    const state = CI_DAY_STATE[key];

    el.classList.remove("auto-filled", "none-found");
    if (state.found) {
      el.value = state.value;
      el.classList.add("auto-filled");
    } else if (state.found === false) {
      el.classList.add("none-found");
    }
  });
}

// 사용자가 직접 수정하면 CI_DAY_STATE에도 반영 (다음 렌더링에서 값이 안 날아가도록)
Object.entries(CI_DAY_DOM_MAP).forEach(([key, inputId]) => {
  const el = $("#" + inputId);
  if (!el) return;
  el.addEventListener("input", () => {
    CI_DAY_STATE[key] = { value: el.value, found: !!el.value };
    el.classList.remove("auto-filled", "none-found");
  });
});

// "다시 추출" 버튼: 상품위험등급/펀드운용회사 + 매수일수/환매일수 전부 재추출
const ciRefreshBtn = $("#ciRefreshBtn");
if (ciRefreshBtn) {
  ciRefreshBtn.addEventListener("click", () => {
    Object.values(CI_AUTO_FIELD_MAP).forEach(key => {
      const item = ciFindItem(key);
      if (item && typeof autoFillItem === "function") autoFillItem(item, true);
    });
    const found = ciAutoExtractDayCounts();
    if (!found) alert("매입방법/환매방법 문구를 찾지 못했습니다. 문구가 특이한 형태라면 직접 입력해주세요.");
    renderCommonInfo();
  });
}

// 초기 1회 렌더 (PDF 업로드 전이라 대부분 비어있음)
renderCommonInfo();
