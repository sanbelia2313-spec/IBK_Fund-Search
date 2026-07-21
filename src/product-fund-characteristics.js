// ============================================================
// product-fund-characteristics.js — "위험등급변경이력" 그룹(펀드특징 관련 문구) 자동 추출.
// utils.js, class-rules.js, product-name.js, product-individual-info.js보다 뒤에,
// script.js보다 앞에 로드되어야 합니다.
//
// 추출 규칙(사용자가 지정한 규칙, 추측 아님):
// 1. 요약정보: 투자설명서 "9. 집합투자기구의 투자전략, 투자방침 및 수익구조" 안의
//    "(1) 투자전략"에서, 번호 항목(1), 2)...)이 시작해서 "① ..." (첫 동그라미숫자 소제목)가
//    나오기 직전까지만 가져옴. (①부터는 "투자 유니버스" 같은 세부 소제목이라 제외)
// 2. 이익손실발생구조: 같은 섹션의 "나. 수익구조: ..." 문단 전체(다음 번호 소제목 전까지).
// ============================================================

const piFundCharFields = {
  summaryInfo: $("#piSummaryInfo"),
  profitLossStructure: $("#piProfitLossStructure"),
};

// PDF 텍스트 재구성 과정에서 끼어드는 "[PAGE N]" 태그와 페이지 하단/상단의 단독 쪽번호
// 줄(예: "- 19 -")을 제거하고, 줄바꿈으로 흩어진 문장을 다시 자연스러운 문단으로 정리함.
// 번호/기호 마커(1), 2), ①, ※ 등) 앞에는 줄바꿈을 다시 넣어 읽기 쉽게 함.
function cleanFundCharParagraph(str) {
  if (!str) return "";
  let s = str.replace(/\[PAGE\s*\d+\]/g, " ");
  s = s.replace(/\n\s*-?\s*\d{1,4}\s*-?\s*\n/g, " "); // 단독 쪽번호 줄 제거
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/\s*(?=(?:\d{1,2}\)|①|②|③|④|⑤|⑥|※))/g, "\n").trim();
  return s;
}

// 요약정보: "투자전략" 헤딩(운용사에 따라 "(1) 투자전략" 또는 "가. 투자전략" 등으로 표기됨)
// 바로 다음부터, 다음 것들 중 가장 먼저 나오는 지점 직전까지만 가져옴:
//   - 첫 "①" 소제목
//   - 다음 대등한 소제목("나." — 위험관리)
//   - "비교지수" 언급 (예: "※ 비교지수: 나스닥 100 지수...") — 대부분 이 지점부터는
//     투자전략 본문이 아니라 비교지수의 정의/선정사유/모투자신탁 투자전략 재인용 등
//     부연설명으로 넘어가므로, 있으면 최우선으로 여기서 끊음.
function findInvestStrategySummary(text) {
  if (!text) return null;
  // "(1)투자전략" / "1)투자전략" / "가.투자전략" 등 운용사별 표기를 모두 인식
  const anchorRe = new RegExp(
    "(?:\\(\\s*1\\s*\\)|1\\s*\\)|가\\s*\\.)\\s*" + loosePattern("투자전략") + "(?![가-힣])"
  );
  const m = text.match(anchorRe);
  if (!m) return null;
  const start = m.index + m[0].length;

  // 종료지점 후보: 첫 "①" 소제목, 다음 대등한 소제목("나." — 위험관리), "비교지수" 언급
  const candidates = [];
  const circleIdx = text.indexOf("①", start);
  if (circleIdx !== -1) candidates.push(circleIdx);

  const searchWindow = text.slice(start, start + 3000); // 과도한 탐색 방지
  const nextHeadingMatch = searchWindow.match(/\n\s*나\s*\./);
  if (nextHeadingMatch) candidates.push(start + nextHeadingMatch.index);

  const compareIdxMatch = searchWindow.match(new RegExp(loosePattern("비교지수")));
  if (compareIdxMatch) {
    let cutAt = start + compareIdxMatch.index;
    // "※ 비교지수: ..." 처럼 표시 기호가 바로 앞에 붙는 경우가 많음 — 그 기호까지 함께 잘라내서
    // 요약문 끝에 외따로 "※"만 남는 걸 방지
    const before = text.slice(Math.max(0, cutAt - 15), cutAt);
    const markerMatch = before.match(/※\s*$/);
    if (markerMatch) cutAt -= markerMatch[0].length;
    candidates.push(cutAt);
  }

  const end = candidates.length ? Math.min(...candidates) : Math.min(start + 1500, text.length);
  if (end <= start) return null;
  const cleaned = cleanFundCharParagraph(text.slice(start, end));
  return cleaned || null;
}

// 이익손실발생구조: "나. 수익구조:" 또는 "다. 수익구조:" (운용사별 표기 차이) 문단 전체
// (다음 대분류 번호소제목, [ ]괄호헤딩, 또는 다음 가./나./다. 소제목 전까지, 최대 1200자)
function findProfitLossStructure(text) {
  if (!text) return null;
  const anchorRe = new RegExp(
    "(?:나|다)\\s*\\.\\s*" + loosePattern("수익구조")
  );
  const m = text.match(anchorRe);
  if (!m) return null;
  let start = m.index + m[0].length;
  // 헤딩 바로 뒤 콜론(:／：)이 있으면 그 다음부터 본문 시작
  const nearby = text.slice(start, start + 5);
  const colonIdx = nearby.search(/[:：]/);
  if (colonIdx !== -1) start += colonIdx + 1;

  const windowText = text.slice(start, start + 1200);
  // 다음 대분류 번호 소제목(예: "\n10. 집합투자기구의 투자위험"), "[...]" 괄호헤딩,
  // 또는 다음 가./나./다. 소제목이 나오면 그 전까지만
  const nextHeading = windowText.match(/\n\s*(?:\d{1,2}\s*\.\s*[가-힣]|\[|가\s*\.|나\s*\.|다\s*\.)/);
  const end = nextHeading ? nextHeading.index : windowText.length;
  const cleaned = cleanFundCharParagraph(windowText.slice(0, end));
  return cleaned || null;
}

function fundCharAutoExtract() {
  if (!piFundCharFields.summaryInfo || !piFundCharFields.profitLossStructure) return false;
  if (typeof searchableText === "undefined" || !searchableText) return false;
  let didFind = false;

  const summary = findInvestStrategySummary(searchableText);
  piFundCharFields.summaryInfo.classList.remove("auto-filled", "none-found");
  if (summary) {
    piFundCharFields.summaryInfo.value = summary;
    piFundCharFields.summaryInfo.classList.add("auto-filled");
    didFind = true;
  } else {
    piFundCharFields.summaryInfo.value = "";
    piFundCharFields.summaryInfo.classList.add("none-found");
  }

  const profitLoss = findProfitLossStructure(searchableText);
  piFundCharFields.profitLossStructure.classList.remove("auto-filled", "none-found");
  if (profitLoss) {
    piFundCharFields.profitLossStructure.value = profitLoss;
    piFundCharFields.profitLossStructure.classList.add("auto-filled");
    didFind = true;
  } else {
    piFundCharFields.profitLossStructure.value = "";
    piFundCharFields.profitLossStructure.classList.add("none-found");
  }

  return didFind;
}

// 사용자가 직접 수정하면 자동채움 강조 표시 제거 (다른 자동채움 필드들과 동일한 UX)
[piFundCharFields.summaryInfo, piFundCharFields.profitLossStructure].forEach(el => {
  if (!el) return;
  el.addEventListener("input", () => el.classList.remove("auto-filled", "none-found"));
});

// PDF 업로드로 다른 카드들이 자동 갱신된 뒤(script.js에서) 호출할 수 있도록 전역 노출
window.fundCharAutoExtract = fundCharAutoExtract;
