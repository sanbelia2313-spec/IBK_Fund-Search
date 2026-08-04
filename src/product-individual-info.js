// ============================================================
// product-individual-info.js — 상품개별정보(전환그룹코드(명)/클래스구분/전환가능여부/
// 인터넷뱅킹판매/예탁원·협회 코드) 관련 로직.
// utils.js, class-rules.js, product-name.js, product-fund-classification.js보다
// 뒤에, script.js보다 앞에 로드되어야 합니다.
// (여기서 쓰는 pnFields·baseKrName은 product-name.js, getActiveClassTable·
//  getDetectedCompanyKey·CLASS_CODE_MAP_BY_COMPANY는 class-rules.js에 이미 선언됨)
// ============================================================

const piFields = {
  convertGroupName: $("#piConvertGroupName"),
  classDivision: $("#piClassDivision"),
  convertible: $("#piConvertible"),
  internetBanking: $("#piInternetBanking"),
  feeCollectMethod: $("#piFeeCollectMethod"),
  investRegionSector: $("#piInvestRegionSector"),
  fundCharacterType: $("#piFundCharacterType"),
  taxReductionType: $("#piTaxReductionType"),
  openableIm: $("#piOpenableIm"),
  openableJeok: $("#piOpenableJeok"),
  openableGeo: $("#piOpenableGeo"),
  imNewMin: $("#piImNewMin"),
  jeokNewMin: $("#piJeokNewMin"),
  geoNewMin: $("#piGeoNewMin"),
  imAddMin: $("#piImAddMin"),
  jeokAddMin: $("#piJeokAddMin"),
  newMax: $("#piNewMax"),
  newBuyUnit: $("#piNewBuyUnit"),
  addBuyUnit: $("#piAddBuyUnit"),
  redeemUnit: $("#piRedeemUnit"),
  navPerUnit: $("#piNavPerUnit"),
  navCalcUnit: $("#piNavCalcUnit"),
  openIndiv: $("#piOpenIndiv"),
  openBizIndiv: $("#piOpenBizIndiv"),
  openCorp: $("#piOpenCorp"),
  livelihood: $("#piLivelihood"),
  taxBenefit: $("#piTaxBenefit"),
  specialEarlyTermination: $("#piSpecialEarlyTermination"),
  separateTaxation: $("#piSeparateTaxation"),
  nonResident: $("#piNonResident"),
  overseasListedTaxExempt: $("#piOverseasListedTaxExempt"),
  professionalOnly: $("#piProfessionalOnly"),
  cleanClass: $("#piCleanClass"),
  recommendedFundType: $("#piRecommendedFundType"),
  pledgeSelf: $("#piPledgeSelf"),
  pledgeThirdParty: $("#piPledgeThirdParty"),
  pledgeRatio: $("#piPledgeRatio"),
  isaTrust: $("#piIsaTrust"),
  isaDiscretionary: $("#piIsaDiscretionary"),
  dealerTransfer: $("#piDealerTransfer"),
  ratioTransfer: $("#piRatioTransfer"),
  tabletBanking: $("#piTabletBanking"),
  totalFee: $("#piTotalFee"),
  saleFeeRate: $("#piSaleFeeRate"),
  manageFeeRate: $("#piManageFeeRate"),
  trusteeFeeRate: $("#piTrusteeFeeRate"),
  adminFeeRate: $("#piAdminFeeRate"),
  frontLoadFee: $("#piFrontLoadFee"),
  syntheticFeeFundYn: $("#piSyntheticFeeFundYn"),
  syntheticFee: $("#piSyntheticFee"),
};

// "클래스구분" 표준 옵션(사내 등록용 19종) — 운용사마다 제각각인 실제 코드(class-rules.js의
// code, 예: "A-E", "C-P2E", "AG")를 여기 표준 클래스로 정규화해서 보여줌.
// 회사마다 표기 방식이 달라 100% 정확한 자동 매핑은 불가능하므로, 애매한 조합(연금·기관 등
// 세부 tier가 섞인 코드)은 자동으로 채우지 않고 사용자가 직접 드롭다운에서 고르도록 비워둠.
const STANDARD_CLASS_OPTIONS = [
  "A Class", "Ae Class", "B Class", "C Class", "C1 Class", "C2 Class", "C3 Class", "C4 Class", "C5 Class",
  "Ce Class", "CP Class", "CPe Class", "CW Class", "D Class", "F Class", "I Class",
  "A-G Class", "C-G Class", "C-O Class", "C-Oe Class",
];

// 인터넷뱅킹판매가 "인터넷전용판매"가 되는 클래스
const INTERNET_ONLY_CLASSES = ["Ae Class", "Ce Class", "CPe Class"];

// 하이픈/공백 제거 + 소문자 변환 — 회사마다 다른 표기(A-E vs Ae vs A-e)를 같은 키로 비교하기 위함
function normalizeCodeKey(s) {
  return s.replace(/-/g, "").replace(/\s+/g, "").toLowerCase();
}

// 표준 클래스 옵션을 정규화 키 기준으로 조회할 수 있게 미리 테이블로 구성
const STANDARD_CLASS_LOOKUP = {};
STANDARD_CLASS_OPTIONS.forEach(opt => {
  const bare = opt.replace(/\s*Class$/, "");
  STANDARD_CLASS_LOOKUP[normalizeCodeKey(bare)] = opt;
});
// 회사마다 단독으로 다르게 쓰는 표기 → 표준 키로 매핑 (예: "W" 단독 표기 → CW Class)
const CODE_ALIAS = { w: "cw" };

function normalizeToStandardClass(rawCode) {
  if (!rawCode) return "";
  const key = normalizeCodeKey(rawCode);
  const aliasedKey = CODE_ALIAS[key] || key;
  return STANDARD_CLASS_LOOKUP[aliasedKey] || "";
}

// 현재 1~3차 조합으로 실제 회사 코드가 "하나로" 특정되는 경우에만 그 code를 반환.
// "없음"은 2차/3차에서 "아직 선택 안 함"(와일드카드)의 의미로도 쓰이지만, 동시에 일부 코드는
// 실제로 tier3="없음"을 갖고 있음(예: A는 tier3=없음, A-G는 tier3=무권유저비용 — 1~2차는 같음).
// 그래서 먼저 지금 선택된 값 그대로("없음"도 포함) 완전히 일치하는 코드를 찾고, 그게 하나로
// 특정되면 그걸 쓴다. 완전 일치가 없거나 여러 개면 그때 "없음"을 와일드카드로 넓혀서 다시 찾는다.
function getResolvedClassCode() {
  if (!pnFields.class1.value || pnFields.class1.value === "없음") return "";
  const table = getActiveClassTable();

  // 핀(클래스 규칙 확인 표에서 직접 클릭했거나, PDF에 코드가 정확히 1개뿐이라 자동 확정된
  // 정확한 코드)이 지금도 유효하면 최우선으로 사용 — 1~3차 조합만으로 여러 코드가 동시에
  // 들어맞는 경우(예: KCGI의 A/A1, C1~C4)도 정확히 구분됨 (2026-07-22 추가, product-name.js).
  const pinned = (typeof getPinnedClassCode === "function") ? getPinnedClassCode() : null;
  if (pinned) return pinned;

  const t1 = pnFields.class1.value, t2 = pnFields.class2.value, t3 = pnFields.class3.value;

  const exactMatch = table.filter(e => e.tier1 === t1 && e.tier2 === t2 && e.tier3 === t3);
  if (exactMatch.length === 1) return exactMatch[0].code;

  const matched = table.filter(e =>
    e.tier1 === t1 &&
    (t2 === "없음" || e.tier2 === t2) &&
    (t3 === "없음" || e.tier3 === t3)
  );
  return matched.length === 1 ? matched[0].code : "";
}

// class-rules.js에 등록된 모든 회사의 code 값을 모아, 긴 코드부터 비교되도록 길이순 정렬
// (예: "C-P2E"가 "E"보다 먼저 매칭되어야 잘못 잘리지 않음)
let allKnownCodesSorted = null;
function getAllKnownCodesSorted() {
  if (!allKnownCodesSorted) {
    const set = new Set();
    Object.values(CLASS_CODE_MAP_BY_COMPANY).flat().forEach(e => set.add(e.code));
    allKnownCodesSorted = Array.from(set).sort((a, b) => b.length - a.length);
  }
  return allKnownCodesSorted;
}

// 약칭펀드명 뒤에 클래스 코드가 붙어있으면 그 부분만 제거 (전환그룹코드명은 "코드 없는" 이름)
function stripTrailingClassCode(shortName) {
  if (!shortName || shortName === "없음") return "";
  for (const code of getAllKnownCodesSorted()) {
    if (code && shortName.endsWith(code)) {
      return shortName.slice(0, shortName.length - code.length).trim();
    }
  }
  return shortName;
}

// ---------------------------------------------
// 보수율 — 투자설명서의 "나. 집합투자기구에 부과되는 보수 및 비용" 표에서, 지금 선택된 클래스의
// 실제 회사 코드(getResolvedClassCode(), 예: "A-E")에 해당하는 행을 찾아 값을 가져옴.
// 표 열 순서는 금융투자협회 표준 서식 기준(운용사→판매사→수탁사→사무관리사→투자신탁총보수→
// 기타비용→총보수·비용→동종유형총보수→합성총보수·비용→증권거래비용)을 가정함 — 실제 예시
// 문서로 이 순서를 확인함. 회사마다 열 구성이 살짝 다를 수 있어, 운용사+판매사+수탁사+사무관리사
// 합계가 투자신탁총보수와 맞는지 자체 검증해서 신뢰도(초록=확인됨/주황=열 순서 확인 필요)를 표시함.
// ---------------------------------------------
// 펀드 형태(투자신탁/투자회사/투자유한회사/투자합자회사)에 따라 소제목 문구가 달라서
// 형태별로 다 등록해둠. (예: 이 상품처럼 투자신탁형이면 "투자신탁에 부과되는 보수 및 비용")
const FEE_TABLE_PRIMARY_ANCHORS = [
  "집합투자기구에 부과되는 보수 및 비용",
  "투자신탁에 부과되는 보수 및 비용",
  "투자회사에 부과되는 보수 및 비용",
  "투자유한회사에 부과되는 보수 및 비용",
  "투자합자회사에 부과되는 보수 및 비용",
];
const FEE_TABLE_FALLBACK_ANCHOR = "보수 및 수수료에 관한 사항";
// O클래스(맨 마지막 행)까지 페이지 넘김을 포함해 다 들어오도록 여유있게 잡음
// (6000자였던 걸로도 대부분 되긴 했지만, 아래 "공통값 한 번만 표기" 패턴을 잡으려면
//  표 전체에서 최소 한 행이라도 온전히 파싱돼야 하므로 넉넉하게 늘려둠)
const FEE_TABLE_WINDOW = 9000;

// 표준 10칸 열 순서(모든 클래스마다 값이 다 적혀있는 문서용):
//   [집합투자업자보수, 판매회사보수, 신탁업자보수, 일반사무관리보수, 총보수,
//    기타비용, 총보수·비용, 동종유형총보수, 합성총보수·비용, 증권거래비용]
// "간략 7칸" 열 순서(집합투자업자·신탁업자·일반사무관리보수 3칸이 전 클래스 공통이라
//  표에서 통째로 빠지고 판매회사보수부터 시작하는 문서용):
//   [판매회사보수, 총보수, 기타비용, 총보수·비용, 동종유형총보수, 합성총보수·비용, 증권거래비용]
//
// 실제 투자설명서는 이 둘 중 하나로 나오는데, 어느 쪽인지 문서마다 다르고 같은 문서 안에서도
// "공통값이 어느 행에 끼어서 나오는지"가 랜덤이라(우리가 검증한 예시에서는 중간의 무권유저비용
// 클래스 행에 끼어 나왔음), 행 하나를 콕 찍어 파싱하는 대신 표 전체를 훑어서:
//  1) 어떤 식으로든 "운용사+신탁업자+일반사무관리+판매사 보수의 합 = 총보수"가 맞아떨어지는
//     행을 찾아 그 행에서 집합투자업자/신탁업자/일반사무관리보수(공통값)를 확정하고,
//  2) 그 공통값을 표의 모든 행(판매사보수·총보수만 갖고 있는 축약행 포함)에 동일하게 적용한다.
// → 표기 방식이 어느 쪽이든(매 칸 반복형이든 공통값 병합형이든) 같은 로직으로 처리 가능.

function feeToNum(raw) {
  if (raw === undefined || raw === null) return NaN;
  if (/^[-－–]+$/.test(raw)) return NaN;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? NaN : n;
}
function feeToDisplay(raw) {
  if (raw === undefined || raw === null) return undefined;
  if (/^[-－–]+$/.test(raw)) return undefined;
  const cleaned = String(raw).replace(/[^0-9.]/g, "");
  return cleaned ? cleaned + "%" : undefined;
}

// 해석1) "표준 10칸" 그대로: tokens[0..4]=운용/판매/수탁/사무관리/총보수, tokens[8]=합성총보수.
// 자체 검증(운용+판매+수탁+사무관리 ≈ 총보수)까지 통과해야 이 해석을 채택한다.
function feeTryFull(tokens) {
  if (tokens.length < 5) return null;
  const manage = feeToNum(tokens[0]), sale = feeToNum(tokens[1]);
  const trustee = feeToNum(tokens[2]), admin = feeToNum(tokens[3]);
  const total = feeToNum(tokens[4]);
  if ([manage, sale, trustee, admin, total].some(Number.isNaN)) return null;
  const consistent = Math.abs((manage + sale + trustee + admin) - total) < 0.02;
  return {
    consistent,
    triple: { manage: tokens[0], trustee: tokens[2], admin: tokens[3] },
    row: { sale: tokens[1], total: tokens[4], synthetic: tokens[8] },
  };
}

// 판매사보수·총보수를 "몇 번째 칸인지"로 찾지 않고 "총보수 = 공통값 합 + 판매사보수"라는
// 관계식 자체로 찾는다. 대시(동종유형총보수 등)가 토큰으로 잡히는지 여부, 앞에 다른 값이
// 더 끼어있는지 등으로 행마다 실제 칸 수가 들쑥날쑥해서 위치 기준으로는 계속 틀어지기
// 때문에(예: Ae처럼 다른 행과 칸 수가 다르면 바로 어긋남), 값 자체로 찾는 게 훨씬 안전하다.
// tripleSum이 아직 없으면(공통값을 찾는 1차 단계 등) 옛 방식대로 앞 두 칸을 추정값으로 씀.
function feeFindSaleTotal(tokens, tripleSum) {
  if (tripleSum !== null && tripleSum !== undefined && !Number.isNaN(tripleSum)) {
    for (let i = 0; i < tokens.length; i++) {
      const x = feeToNum(tokens[i]);
      if (Number.isNaN(x)) continue;
      for (let j = 0; j < tokens.length; j++) {
        if (i === j) continue;
        const y = feeToNum(tokens[j]);
        if (Number.isNaN(y)) continue;
        if (Math.abs((x + tripleSum) - y) < 0.02) return { sale: tokens[i], total: tokens[j] };
      }
    }
    // tripleSum이 있는데도 못 찾았으면(이 행은 정말 안 맞는 경우) 억지로 앞 두 칸을 쓰지 않고 실패 처리
    return null;
  }
  const sale = feeToNum(tokens[0]), total = feeToNum(tokens[1]);
  if ([sale, total].some(Number.isNaN)) return null;
  return { sale: tokens[0], total: tokens[1] };
}

// 합성총보수(합성총보수·비용)는 항상 "증권거래비용(맨 마지막 칸)" 바로 앞칸이라, 그 앞쪽
// (기타비용/총보수·비용/동종유형총보수)이 몇 개 있든 없든 뒤에서 두 번째라는 위치는 안 흔들린다.
// → 앞쪽 칸 개수 변화에 안 흔들리는 유일하게 안전한 기준점이라 이건 그대로 위치 기준 사용.
function feeFindSynthetic(tokens) {
  const nonDash = tokens.filter(t => !/^[-－–]+$/.test(t));
  if (nonDash.length < 2) return undefined;
  return nonDash[nonDash.length - 2];
}

// row 파싱(코드/행 경계 인식) 결과와 무관하게, region 안의 숫자만 순서대로 다 모아서
// "이 3개 숫자를 공통 운용/신탁업자/일반사무관리보수라고 하면 여러 클래스 행에서
// 판매사보수+공통값=총보수가 실제로 성립하는가"를 직접 검증한다.
// PDF-to-text 라이브러리에 따라 이 공통값이 어느 라벨에 붙는지(심지어 라벨이 전혀
// 없는 조각으로 떨어져 나가는지)가 제각각이라, buildFeeTableRows의 행 경계 인식에
// 기대지 않는 이 방식이 훨씬 안전하다. roughRows(추정 판매/총보수) 중 과반수 이상에서
// 식이 맞아떨어져야 채택하므로(우연히 한두 행만 맞는 건 배제), 오탐 위험도 낮다.
function feeFindOrphanTriple(region, roughRows) {
  if (!roughRows || roughRows.length < 2) return null;
  const cleaned = stripPageArtifacts(region);
  const allTokens = cleaned.split(/\s+/).filter(Boolean).filter(t => /^[-－–0-9.%]+$/.test(t));
  const need = Math.max(3, Math.ceil(roughRows.length * 0.5));

  for (let i = 0; i + 2 < allTokens.length; i++) {
    const manage = feeToNum(allTokens[i]), trustee = feeToNum(allTokens[i + 1]), admin = feeToNum(allTokens[i + 2]);
    if ([manage, trustee, admin].some(Number.isNaN)) continue;
    let hits = 0;
    for (const r of roughRows) {
      const s = feeToNum(r.row.sale), tot = feeToNum(r.row.total);
      if (Number.isNaN(s) || Number.isNaN(tot)) continue;
      if (Math.abs((manage + trustee + admin + s) - tot) < 0.02) hits++;
    }
    if (hits >= need) {
      return { manage: allTokens[i], trustee: allTokens[i + 1], admin: allTokens[i + 2] };
    }
  }
  return null;
}

// region 전체를 훑어서: 클래스별 행(sale/total/synthetic)과, 표 안에 공통값이 끼어있다면
// 그 공통 운용사/신탁업자/일반사무관리보수(triple)를 함께 뽑아낸다.
//
// 1) 표에서 제일 흔한 토큰 개수(다수결)로 "간략형(공통값 없음)" vs "표준형(매 행 반복)"을 정함.
// 2) 간략형이면: 우선 각 행을 "앞 두 칸=판매/총보수"로 대충 추정한 뒤, 그 추정치들을 가지고
//    region 전체에서 공통값(triple)을 찾는다(feeFindOrphanTriple) — 공통값이 어느 행에
//    끼어 나오든, 심지어 라벨 없이 완전히 떨어져 나오든 위치와 무관하게 찾아낸다.
// 3) 공통값(과 그 합)을 알게 되면, 그 관계식으로 모든 행의 판매/총보수를 "위치가 아니라
//    값으로" 다시 찾는다 — 이래야 Ae처럼 남들과 실제 칸 수가 다른 행도 안 틀어진다.
function feeAnalyzeRegion(region, codesByLengthDesc, knownCodes) {
  const rows = buildFeeTableRows(region, knownCodes);
  const candidateRows = [];
  for (const r of rows) {
    if (r.tokens.length < 2) continue;
    const code = extractRowCodeFromLabelLine(r.label) ||
      (isCodeLikeToken(r.label) ? r.label : null) ||
      extractTrailingKnownCode(r.label, codesByLengthDesc) ||
      r.inlineCode || null;
    if (code) candidateRows.push({ code, tokens: r.tokens });
  }
  if (!candidateRows.length) return { parsed: [], commonTriple: null };

  const lengthCounts = {};
  candidateRows.forEach(r => { lengthCounts[r.tokens.length] = (lengthCounts[r.tokens.length] || 0) + 1; });
  const modeLength = Number(Object.keys(lengthCounts).sort((a, b) => lengthCounts[b] - lengthCounts[a])[0]);
  const isReducedDominant = modeLength <= 8; // 7~8칸=간략형 다수, 9칸 이상=표준(매 행 반복)형 다수

  let commonTriple = null;
  if (isReducedDominant) {
    const roughRows = candidateRows
      .map(r => ({ row: feeFindSaleTotal(r.tokens, null) }))
      .filter(r => r.row);
    commonTriple = feeFindOrphanTriple(region, roughRows);
  }
  const tripleSum = commonTriple
    ? feeToNum(commonTriple.manage) + feeToNum(commonTriple.trustee) + feeToNum(commonTriple.admin)
    : null;

  const parsed = [];
  for (const r of candidateRows) {
    if (isReducedDominant) {
      // tripleSum을 알면 값 기준으로, 모르면(공통값을 못 찾은 경우) 위치 추정을 최후 수단으로 사용
      const st = feeFindSaleTotal(r.tokens, tripleSum) || feeFindSaleTotal(r.tokens, null);
      if (st) {
        parsed.push({
          code: r.code,
          kind: tripleSum !== null ? "reduced" : "reduced-unverified",
          row: { sale: st.sale, total: st.total, synthetic: feeFindSynthetic(r.tokens) },
          tripleFromSelf: null,
        });
      }
    } else {
      // 표준(매 행 반복)형: 행마다 이미 운용/판매/수탁/사무관리보수가 다 적혀있으니 그대로 사용.
      const full = feeTryFull(r.tokens);
      if (full) {
        parsed.push({ code: r.code, kind: full.consistent ? "full" : "full-unverified", row: full.row, tripleFromSelf: full.triple });
      }
    }
  }

  return { parsed, commonTriple };
}

// ---------------------------------------------
// 선취수수료 납입금액 — "나. 종류형 구조" 하위의 "이 투자신탁이 보유한 종류의 집합투자증권은
// 아래와 같습니다" 표(종류/가입자격/선취판매/후취판매/환매/보수...)에서, 지금 선택된 클래스의
// "선취판매" 칸 값을 그대로 가져옴 (예: "납입금액의 0.8%이내"). 위쪽 "보수율" 표(퍼센트 3~5개
// 칸짜리)와는 완전히 다른 표라서 별도 파서로 둔다 — 저 표의 정교한 토큰 정렬 로직에 얹으려다
// 기존 동작을 깨뜨릴 위험이 있어, 독립적이고 단순한 "코드~다음코드 사이 구간에서 정규식 검색"
// 방식으로 구현함 (2026-07-24 추가).
const FRONT_LOAD_TABLE_ANCHORS = [
  "보유한 종류의 집합투자증권은 아래와",
  "판매수수료가 다른 여러",
  "선취판매 후취판매 환매",
];
const FRONT_LOAD_TABLE_WINDOW = 6000;

function findFrontLoadFeeTableRegion() {
  if (typeof searchableText === "undefined" || !searchableText) return null;
  for (const anchor of FRONT_LOAD_TABLE_ANCHORS) {
    const m = searchableText.match(new RegExp(loosePattern(anchor)));
    if (m) return searchableText.slice(m.index, m.index + FRONT_LOAD_TABLE_WINDOW);
  }
  return null;
}

// 정규식 특수문자가 섞인 코드(예: "C-P")도 안전하게 리터럴로 이스케이프
function escapeRegExpLiteral(s) {
  return s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

// region 안에서 "줄 맨 앞에 코드가 단독으로 나오는" 위치를 찾음 (표의 "종류(클래스)" 열).
// 본문 문장 속에 우연히 코드 문자열이 섞여 나오는 경우를 배제하기 위해, 코드 앞은 줄바꿈,
// 뒤는 공백/줄바꿈이 오는 경우만 인정한다. 매치의 시작(줄 시작)과 끝(코드 바로 뒤, 즉 이
// 클래스의 실제 셀 내용이 시작되는 지점)을 둘 다 돌려준다.
function findClassCellStart(cleanedRegion, code, fromIndex) {
  const re = new RegExp("(?:^|[\\n\\r])[ \\t]*" + escapeRegExpLiteral(code) + "(?=[ \\t\\n\\r])", "g");
  re.lastIndex = fromIndex || 0;
  const m = re.exec(cleanedRegion);
  return m ? { lineStart: m.index, contentStart: m.index + m[0].length } : null;
}

// 지금 선택된 클래스(code)의 "선취판매" 칸 값을 찾아 반환.
//
// (2026-07-24 최초 구현 → 실제 앱 데이터로 재검증하며 재수정)
// 처음엔 "납입금액의 0.8%이내"가 한 덩어리로(코드 뒤에) 붙어있다고 가정했는데, 실제 PDF
// 추출 텍스트를 콘솔로 까보니 표 셀이 2줄로 줄바꿈되면서 "납입금액의"는 클래스 코드 줄
// "바로 앞"에, "0.8%이내"는 코드 줄 "바로 뒤"에 떨어져서 나오는 문서도 있었다(코드 줄
// 자체가 그 사이에 끼어있음):
//   납입금액의
//   A 수수료선취-오프라인 제한없음 - 0.350
//   0.8%이내
// PDF마다 추출 방식이 달라 어느 쪽으로 나올지 알 수 없으므로, 두 형태를 모두 시도한다.
//   1) 코드 뒤(다음 코드 전까지)에서 "납입금액의 ~ 이내"가 (사이에 다른 텍스트가 약간
//      끼어도) 잡히는지 먼저 시도 — 표 안쪽 잡음(각주 번호, 줄바꿈 등)에 대비해 사이 간격을
//      좀 여유있게 허용한다. 어차피 "다음 클래스 코드가 나오기 전까지"로 엄격히 막혀 있어서
//      다른 클래스 값을 잘못 끌어올 위험은 없다.
//   2) 안 잡히면, 코드 "바로 앞"에 "납입금액의"가 있는지 확인하고(이 확인은 문자열
//      맨 끝(`$`)에 고정되어 있어 얼마나 멀리서부터 보든 안전함) 있으면 코드 뒤에서
//      "숫자%이내" 완성분만 찾아 합친다.
//   둘 다 안 되면 이 클래스는 선취 대상이 아님(C/S 계열 등) → null(미입력)
//
// (참고: 처음엔 "표 전체에서 문구를 찾아 가장 가까운 코드에 붙이는" 훨씬 느슨한 3차
// 안전망도 시도했었는데, 그 방식은 선취수수료가 없는 클래스(C/S 계열)에도 옆 클래스의
// 값이 잘못 붙는 오탐이 실제로 확인되어 제외함 — 대신 아래처럼 "이 클래스 고유의 안전한
// 경계(afterBlock/코드 직전 위치) 안에서 허용 간격만 넉넉하게 넓히는" 방식으로 대체함.
// 이 방식은 클래스 경계를 절대 넘지 않아서 오탐 위험 없이 안전망 역할을 한다.)
// (2026-07-24 추가) 한화 투자설명서로 검증하며 발견한 두 가지 추가 변형:
//   - "0.5%이내"가 아니라 "0.5% 이하"라고 쓰는 문서가 있음
//   - A클래스처럼 아예 "이내/이하" 같은 말 없이 그냥 "1.0%"만 쓰는 경우도 있음
// 그래서 1)/2)의 접미사 부분을 "이내" 고정이 아니라 "(이내|이하)?"로 느슨하게 바꿈.
const FRONT_LOAD_SUFFIX = "(?:\\s*(?:이내|이하))?";

// (2026-07-24 추가) 3차 안전망: "종류형 구조" 표 자체에 실제 수치가 없고(설명 문구만 있고),
// 대신 법정 표준 섹션인 "13. 보수 및 수수료에 관한 사항 > 가. 투자자에게 직접 부과되는
// 수수료" 표에만 실제 수치가 있는 문서(한화 등)를 위한 것. 이 표는 "납입금액의" 접두어가
// 전혀 없이 "수수료선취-오프라인(A)    1.0%    -    -    -" 처럼 클래스명(코드) 바로 뒤에
// 선취판매수수료가 옴. 위 1)/2)와 완전히 다른 표라 별도 앵커/파서로 둔다.
const DIRECT_FEE_TABLE_ANCHORS = ["투자자에게 직접 부과되는 수수료"];
const DIRECT_FEE_TABLE_WINDOW = 4000;

function findDirectFeeTableRegion() {
  if (typeof searchableText === "undefined" || !searchableText) return null;
  for (const anchor of DIRECT_FEE_TABLE_ANCHORS) {
    const m = searchableText.match(new RegExp(loosePattern(anchor)));
    if (m) return stripPageArtifacts(searchableText.slice(m.index, m.index + DIRECT_FEE_TABLE_WINDOW));
  }
  return null;
}

// 공통 로직(1/2번) — "코드가 줄 맨 앞에 단독으로 나오고, 그 앞/뒤 어딘가에 '납입금액의 N%'가
// 딸려나오는" 표 레이아웃이면 어떤 표(region)에든 적용 가능하도록 분리함 (2026-07-24 리팩터링).
// 원래는 findFrontLoadFeeTableRegion()이 찾은 "종류형 구조" 표에만 쓰였는데, KCGI 등 일부
// 문서는 "13. 가. 투자자에게 직접 부과되는 수수료" 표조차 "(A)"처럼 괄호로 코드를 감싸지 않고
// "A"를 그냥 단독 줄로 뽑아내면서, 값도 코드 줄 앞/뒤로 떨어져 나오는 "종류형 구조"와 똑같은
// 레이아웃이라, 기존의 괄호 전용 파서(computeFrontLoadFeeFromDirectTable)로는 못 잡았음.
function tryExtractFrontLoadFromRegion(cleaned, code) {
  const startHit = findClassCellStart(cleaned, code, 0);
  if (!startHit) return null;

  const activeCodes = (typeof getActiveClassTable === "function")
    ? Array.from(new Set(getActiveClassTable().map(e => e.code)))
    : [];
  const startIdx = startHit.contentStart;
  let endIdx = Math.min(cleaned.length, startIdx + 400);
  activeCodes
    .filter(c => c && c !== code)
    .forEach(other => {
      const otherHit = findClassCellStart(cleaned, other, startIdx);
      if (otherHit && otherHit.lineStart > startIdx && otherHit.lineStart < endIdx) {
        endIdx = otherHit.lineStart;
      }
    });
  const afterBlock = cleaned.slice(startIdx, endIdx);

  // 1) 코드 뒤(=다음 클래스 코드 전까지, 절대 안 넘어감)에서 "납입금액의 ~ (이내/이하/없음)"를
  // 찾음. 사이에 약간의 잡음(각주표시, 줄바꿈 등)이 끼어도 잡히도록 간격을 30자까지 허용.
  const combinedRe = new RegExp("납입금액의[\\s\\S]{0,30}?([0-9]+(?:\\.[0-9]+)?)\\s*%" + FRONT_LOAD_SUFFIX);
  const combined = afterBlock.match(combinedRe);
  if (combined) return "납입금액의 " + combined[1] + "%" + (combined[0].includes("이내") ? "이내" : "");

  // 2) 코드 "바로 앞"에 "납입금액의"가 떨어져 나오는 형태. 문자열 끝(`$`)에 고정된 검사라
  // 창을 넉넉히(150자) 잡아도 다른 행 내용과 혼동될 위험이 없음(중간에 다른 텍스트가
  // 있어도 "바로 앞"이 "납입금액의"가 아니면 그냥 매치 실패로 끝나기 때문).
  const beforeText = cleaned.slice(Math.max(0, startHit.lineStart - 150), startHit.lineStart);
  if (/납입금액의\s*$/.test(beforeText)) {
    const feeRe = new RegExp("([0-9]+(?:\\.[0-9]+)?)\\s*%" + FRONT_LOAD_SUFFIX);
    const feeMatch = afterBlock.match(feeRe);
    if (feeMatch) return "납입금액의 " + feeMatch[1] + "%" + (feeMatch[0].includes("이내") ? "이내" : "");
  }

  // 3) "납입금액"과 "의"가 클래스 코드 자체를 사이에 두고 쪼개져 나오는 경우 (KCGI 등에서 확인,
  // 2026-07-24 추가). 예: "...판매수수료가 징구되며, 판    납입금액 / Ae    온라인    ...전용
  // 의 0.35%    -    -    -" — "납입금액"은 코드 줄 바로 앞에서 끝나고, "의 N%"는 코드 뒤
  // afterBlock 안 어딘가(같은 줄 다른 칸일 수 있음)에 등장한다. "의" 하나만 보면 "회사의"처럼
  // 무관한 조사와 혼동될 수 있으므로, 반드시 "의" 바로 뒤에 숫자+%가 붙어있는 경우만 인정한다.
  if (/납입금액\s*$/.test(beforeText)) {
    const feeRe2 = new RegExp("의\\s*([0-9]+(?:\\.[0-9]+)?)\\s*%" + FRONT_LOAD_SUFFIX);
    const feeMatch2 = afterBlock.match(feeRe2);
    if (feeMatch2) return "납입금액의 " + feeMatch2[1] + "%" + (feeMatch2[0].includes("이내") ? "이내" : "");
  }
  return null;
}

// "(코드)" 가 속한 표 행 블록 안에서 값을 찾는다 — 그 칸이 "-"면 선취 대상이 아님(null),
// 숫자%면 그 값을 반환. "이내"/"이하"가 붙어 있으면 그대로 살리고, 없으면 안 붙인다.
// (2026-08-04 수정, 2차) 처음엔 값이 항상 "(코드)" 바로 뒤에 온다고 가정했는데, 실제 앱에서
// PDF.js가 뽑아내는 순서를 콘솔로 직접 까보니(IBK자산운용 PDF로 확인) 아래처럼 값이 코드보다
// "앞"에 오는 행도 있었다(라벨이 "수수료선취-오프라인-고액" + 코드 "(B)"로 두 줄에 걸쳐 있고,
// 다른 칸들(후취/환매/전환)의 "없음"이 값과 코드 사이에 끼어들면서 순서가 뒤섞임):
//   수수료선취-오프라인
//   납입금액의 0.5%이내    없음    없음    없음
//   -고액(B)
// 코드 바로 뒤/바로 앞만 보는 방식으로는 이런 문서를 절반(A/Ae는 되고 B/AG 등은 안 됨)만
// 잡아서, 대신 "이 행이 어디서 시작해서 어디서 끝나는지"부터 먼저 찾는다. 표의 각 행은 항상
// FEE_ROW_START_MARKERS(수수료선취/후취/미징구/선후취)로 시작하므로, "(코드)"가 나온 위치의
// 앞뒤에서 가장 가까운 시작 마커 두 개를 찾아 그 사이를 "이 행 전체"로 보고, 그 안에서
// "납입금액의 N%"를 순서와 무관하게 찾는다 — 같은 행 안에만 있으면 되므로 코드와 값의 정확한
// 앞뒤 순서를 몰라도 안전하게 잡힌다(다른 행 값을 잘못 끌어올 위험 없음).
function computeFrontLoadFeeFromDirectTable(code) {
  const region = findDirectFeeTableRegion();
  if (!region) return null;
  const codeMarker = "(" + code + ")";
  const idx = region.indexOf(codeMarker);
  if (idx !== -1) {
    let blockStart = 0;
    FEE_ROW_START_MARKERS.forEach(marker => {
      const pos = region.lastIndexOf(marker, idx);
      if (pos !== -1 && pos > blockStart) blockStart = pos;
    });
    let blockEnd = region.length;
    FEE_ROW_START_MARKERS.forEach(marker => {
      const pos = region.indexOf(marker, idx + 1);
      if (pos !== -1 && pos < blockEnd) blockEnd = pos;
    });
    const block = region.slice(blockStart, blockEnd);

    const rowVal = block.match(/납입금액의\s*([0-9]+(?:\.[0-9]+)?)\s*%(?:\s*(?:이내|이하))?/);
    if (rowVal) return "납입금액의 " + rowVal[1] + "%" + (/이내/.test(rowVal[0]) ? "이내" : "");

    // 접두어("납입금액의") 없이 "(코드)" 바로 뒤에 숫자%만 오는 문서(기존 KB 등)용 폴백
    const after = region.slice(idx + codeMarker.length, idx + codeMarker.length + 40);
    const m = after.match(/^\s*(-|[0-9]+(?:\.[0-9]+)?\s*%(?:\s*(?:이내|이하))?)/);
    if (m && m[1] !== "-") {
      const num = m[1].match(/[0-9]+(?:\.[0-9]+)?/)[0];
      return "납입금액의 " + num + "%" + (/이내/.test(m[1]) ? "이내" : "");
    }
    if (m) return null; // "-"로 명시적으로 확인된 경우만 여기서 "선취 대상 아님"으로 확정
  }

  // (2026-07-24 추가) KCGI 등 일부 문서는 이 표에서도 코드를 괄호 없이 "A"처럼 단독 줄로
  // 뽑아내고, 값("0.7%이내")은 코드 줄 앞/뒤로 떨어져 나온다(종류형 구조 표와 동일 레이아웃).
  // → 괄호 매칭이 실패하면 같은 region에 대해 공통 파서로 한 번 더 시도.
  const cleaned = stripPageArtifacts(region);
  return tryExtractFrontLoadFromRegion(cleaned, code);
}

function computeFrontLoadFeeValue(code) {
  if (!code) return null;

  // 1)/2): "종류형 구조" 계열 표(코드가 줄 맨 앞에 단독으로 나오는 표)에서 시도.
  // 이 표 자체가 없거나(region 없음) 이 표에 코드가 단독으로 안 나오는 경우(예: "선취(A)"처럼
  // 코드가 다른 글자에 바로 붙어 나오는 설명형 표)에는 조용히 다음 단계(3차)로 넘어간다.
  const region = findFrontLoadFeeTableRegion();
  if (region) {
    const cleaned = stripPageArtifacts(region);
    const val = tryExtractFrontLoadFromRegion(cleaned, code);
    if (val) return val;
  }

  // 3) 1)/2) 둘 다 실패한 경우(예: "종류형 구조" 표엔 수치가 없고 법정 표준 섹션인
  // "13. 보수 및 수수료에 관한 사항 > 가. 투자자에게 직접 부과되는 수수료" 표에만 수치가
  // 있는 문서) — 괄호 형식("(A)") 또는 코드 단독 줄 형식 둘 다 재시도
  return computeFrontLoadFeeFromDirectTable(code);
}

function refreshFrontLoadFeeField() {
  if (!piFields.frontLoadFee) return;
  const resolvedCode = getResolvedClassCode();
  piFields.frontLoadFee.classList.remove("auto-filled", "suggested", "none-found");
  if (!resolvedCode) {
    piFields.frontLoadFee.value = "";
    piFields.frontLoadFee.classList.add("none-found");
    return;
  }
  // (2026-07-24 추가) 수수료징수방법(computeFeeCollectMethod)이 "선취"가 아니면 그 클래스는
  // 애초에 선취수수료 자체가 없는 것이므로, 표에서 못 찾아 비어있는 것과 구분하기 위해
  // 명시적으로 "-"를 채운다. (예: 후취/미징구/선후취 클래스는 늘 "-", A 계열만 실제 % 값)
  const feeMethod = computeFeeCollectMethod();
  if (feeMethod && feeMethod !== "선취") {
    piFields.frontLoadFee.value = "-";
    piFields.frontLoadFee.classList.add("auto-filled");
    return;
  }
  const val = computeFrontLoadFeeValue(resolvedCode);
  if (val) {
    piFields.frontLoadFee.value = val;
    piFields.frontLoadFee.classList.add("auto-filled");
  } else {
    // 선취 클래스인데 표에서 값을 못 찾은 경우만 미입력으로 남김 (직접 확인 필요)
    piFields.frontLoadFee.value = "";
    piFields.frontLoadFee.classList.add("none-found");
  }
}

// 콘솔 디버그용: 개발자도구(F12)에서 frontLoadFeeDebugDump() 실행하면
// 앵커를 찾았는지, 어떤 앵커로 찾았는지, 지금 선택된 클래스가 표에서 어디부터 어디까지로
// 잘렸는지, 그 구간 원문이 정확히 무엇인지를 그대로 출력함. "미입력"으로 나올 때 원인 확인용.
function frontLoadFeeDebugDump() {
  const resolvedCode = getResolvedClassCode();
  console.log("[선취수수료] 현재 선택된 클래스코드(getResolvedClassCode):", resolvedCode);

  if (typeof searchableText === "undefined" || !searchableText) {
    console.log("[선취수수료] searchableText가 없음 (파일이 아직 안 올라간 상태?)");
    return;
  }

  let usedAnchor = null, anchorIdx = -1;
  for (const anchor of FRONT_LOAD_TABLE_ANCHORS) {
    const m = searchableText.match(new RegExp(loosePattern(anchor)));
    if (m) { usedAnchor = anchor; anchorIdx = m.index; break; }
  }
  console.log("[선취수수료] 매치된 앵커:", usedAnchor, "위치:", anchorIdx);
  if (!usedAnchor) {
    console.log("[선취수수료] 앵커 3종 모두 못 찾음 → 표 자체를 못 찾은 상태.");
    console.log("[선취수수료] FRONT_LOAD_TABLE_ANCHORS:", FRONT_LOAD_TABLE_ANCHORS);
    return;
  }

  const region = searchableText.slice(anchorIdx, anchorIdx + FRONT_LOAD_TABLE_WINDOW);
  const cleaned = stripPageArtifacts(region);
  console.log("[선취수수료] 표 영역(정리 후) 앞부분 500자:\n", cleaned.slice(0, 500));

  if (!resolvedCode) {
    console.log("[선취수수료] 클래스가 특정되지 않아 여기서 중단 (1~3차 클래스구분을 먼저 선택해야 함)");
    return;
  }

  const startHit = findClassCellStart(cleaned, resolvedCode, 0);
  console.log("[선취수수료] 클래스 '" + resolvedCode + "' 셀 시작 위치(findClassCellStart):", startHit);
  if (!startHit) {
    console.log("[선취수수료] → 표 영역 안에서 '" + resolvedCode + "'가 줄 맨 앞 단독으로 등장하는 곳을 못 찾음.");
    console.log("[선취수수료] 표 영역 전체(정리 후):\n", cleaned);
    return;
  }

  const beforeText = cleaned.slice(Math.max(0, startHit.lineStart - 150), startHit.lineStart);
  console.log("[선취수수료] 코드 줄 바로 앞 60자(\"납입금액의\" 있어야 선취 대상):", JSON.stringify(beforeText));
  console.log("[선취수수료] → 선취 대상 판정:", /납입금액의\s*$/.test(beforeText));

  const val = computeFrontLoadFeeValue(resolvedCode);
  console.log("[선취수수료] computeFrontLoadFeeValue 최종 결과:", val);
  return { resolvedCode, usedAnchor, region: cleaned, startHit, beforeText, val };
}
window.frontLoadFeeDebugDump = frontLoadFeeDebugDump;

// (2026-07-29 추가) 헤딩 문구("집합투자기구에 부과되는 보수 및 비용" 등)가 실제 표 제목뿐 아니라
// 완전히 무관한 각주에도 똑같이 등장하는 경우가 실제로 확인됨 — 예: "...비교지수의 수익률에는
// 운용보수 등 집합투자기구에 부과되는 보수 및 비용이 반영되지 않았습니다." (투자실적 각주, 표보다
// 훨씬 앞쪽인 요약정보 부분에 나옴). 예전처럼 "첫 번째 매치"만 쓰면 이런 각주에 걸려서 완전히
// 엉뚱한 위치(운용전문인력 표, 과세 조항 등)를 표 영역으로 잘못 잡아버리는 문제가 있었음.
// → 같은 문구가 여러 번 나오면, 그 중 바로 뒤에 "지급비율" 라벨이나 실제 보수율처럼 보이는
// 소수넷째자리 숫자(예: 0.7446)가 붙어 있는 위치만 "진짜 표"로 인정하고, 그런 위치가 하나도
// 없으면 안전하게 첫 매치로 돌아간다(기존 동작 유지).
function findVerifiedAnchorIndex(text, phrase) {
  const re = new RegExp(loosePattern(phrase), "g");
  const indices = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    indices.push(m.index);
    if (m[0].length === 0) re.lastIndex++; // 빈 매칭 무한루프 방지
  }
  if (!indices.length) return -1;
  const tableSignalRe = new RegExp(loosePattern("지급비율"));
  const numericSignalRe = /\d\.\d{4}/; // 실제 보수율 표는 소수넷째자리(예: 0.7446)로 적힘
  for (const idx of indices) {
    const nearby = text.slice(idx, idx + 400);
    if (tableSignalRe.test(nearby) || numericSignalRe.test(nearby)) return idx;
  }
  return indices[0];
}

function findFeeTableRegion() {
  if (typeof searchableText === "undefined" || !searchableText) return null;

  for (const anchor of FEE_TABLE_PRIMARY_ANCHORS) {
    const idx = findVerifiedAnchorIndex(searchableText, anchor);
    if (idx !== -1) return searchableText.slice(idx, idx + FEE_TABLE_WINDOW);
  }

  // 위 앵커가 전부 실패한 경우에만 fallback 사용.
  // fallback 문구("보수 및 수수료에 관한 사항")는 본문 소제목뿐 아니라 목차에도 그대로
  // 나오는 경우가 많음 — 목차는 항상 본문보다 앞에 등장하므로, 첫 매치가 아니라
  // 마지막 매치를 골라야 실제 보수율 표에 도달함.
  const re = new RegExp(loosePattern(FEE_TABLE_FALLBACK_ANCHOR), "g");
  let m, last = null;
  while ((m = re.exec(searchableText)) !== null) {
    last = m;
    if (m[0].length === 0) re.lastIndex++; // 빈 매칭 무한루프 방지
  }
  if (!last) return null;
  return searchableText.slice(last.index, last.index + FEE_TABLE_WINDOW);
}

// 라벨 줄의 "끝"에서 "(코드)" 패턴을 찾아 코드만 추출함 (라벨이 여러 줄을 이어붙인
// 하나의 문자열로 들어옴 — buildFeeTableRows에서 이미 합쳐진 상태).
// 코드 자체에 괄호가 중첩된 경우도 있음 (예: "(C4(장마))" → 코드는 "C4"). 이 경우 안쪽
// "(장마)" 같은 부가설명 괄호는 통째로 건너뛰고 그 앞의 alnum/하이픈 토큰만 코드로 씀.
function extractRowCodeFromLabelLine(line) {
  const m = line.match(/\(([A-Za-z0-9\-]+)(?:\([^()]*\))?\)\s*$/);
  return m ? m[1] : null;
}

// 토큰이 "코드"처럼 보이는지 (숫자/퍼센트/대시로만 된 데이터 토큰이 아니라 알파벳이 섞인 짧은 코드)
function isCodeLikeToken(t) {
  return /^[A-Za-z0-9\-]+$/.test(t) && !/^[-－–0-9.%]+$/.test(t);
}

// PDF 텍스트 추출시 페이지 사이에 끼워진 "[PAGE N]" 태그와 그 앞뒤의 쪽번호(페이지 하단/상단에
// 찍힌 단독 숫자 한 줄)를 제거함. 이 태그/쪽번호가 보수표 행 중간(라벨이 두 페이지에 걸쳐
// 줄바꿈되는 지점 등)에 그대로 끼어있으면 뒤의 buildFeeTableRows 토큰 스트림이 오염됨
// (숫자로 오인되거나 라벨 사이에 낑겨 붙음) — 2025-07-16 확인.
function stripPageArtifacts(text) {
  return text
    .replace(/\n[ \t]*\d{1,4}[ \t]*\n+\[PAGE\s*\d+\]/g, "\n[PAGE_BREAK]")
    .replace(/\[PAGE\s*\d+\]\n+[ \t]*\d{1,4}[ \t]*\n/g, "[PAGE_BREAK]\n")
    .replace(/\[PAGE\s*\d+\]/g, "[PAGE_BREAK]");
}

// 보수표 각 행의 라벨은 항상 "수수료선취"/"수수료후취"/"수수료미징구"/"수수료선후취" 중 하나로
// 시작함 — 이 값을 "새 행의 시작" 신호로 씀 (2025-07-16 확인).
const FEE_ROW_START_MARKERS = ["수수료선취", "수수료후취", "수수료미징구", "수수료선후취"];
function looksLikeFeeRowStart(token) {
  return FEE_ROW_START_MARKERS.some(m => token.startsWith(m));
}

// region을 "논리적 행" 단위로 재구성함.
// 실제 투자설명서 보수표는 셀 높이 때문에 라벨이 2줄로 줄바꿈되는데, 그 숫자 데이터 줄이
// "라벨 1번째 줄"과 "라벨 2번째 줄(코드가 담긴 꼬리 부분, 예: '인-고액(A)')" 사이에 끼어
// 나오는 경우가 흔함(줄 순서: 라벨앞부분 → 숫자9개 → 라벨뒷부분(코드)). 그래서 예전처럼
// "숫자 줄 이전 = 라벨 전체"로 가정하면 코드가 담긴 꼬리 부분을 다음 행의 라벨 앞에 잘못
// 붙이게 되어 모든 행의 코드 매칭이 통째로 실패한다 (2025-07-16 확인).
// 이를 피하려면 줄 구분을 버리고 전체를 토큰 스트림으로 본 뒤:
//   - 숫자 토큰은 계속 누적(줄이 나뉘어도 상관없음 — 숫자 데이터 자체가 두 줄에 걸쳐
//     나오는 경우도 있음)
//   - 숫자 데이터를 만난 "이후"에 나오는 텍스트 토큰은, 새 행의 시작 마커(FEE_ROW_START_MARKERS)가
//     아니라면 지금 행 라벨의 "꼬리"로 계속 붙인다 — 코드 패턴 "(코드)"가 완성되는 순간 그 행을
//     확정한다. (완성되지 않아도 다음 행 시작 마커가 나오면 그 시점에 확정한다.)
// 코드 패턴이 페이지 경계를 넘어 여러 토큰(예: "인" + "슈퍼-개인연금" + "(S-P)")으로 나뉘는
// 경우도 있어 SUFFIX_CAP으로 약간의 여유를 둔다.
// knownCodes: 현재(감지된) 회사의 실제 클래스 코드를 normalizeCodeKey()로 정규화한 Set.
// "수수료선취-오프라인(A)"처럼 설명형 라벨이 아니라, 코드 하나만 단독으로 행 라벨이 되는
// 서식(예: "A", "A-E", "C-W" ...)에서 다음 행의 시작을 인식하기 위해 필요함 — 2026-07-16 확인
// (해당 서식에는 FEE_ROW_START_MARKERS("수수료선취" 등) 접두어도, "(코드)" 괄호도 전혀 없어서
// 기존 로직으로는 다음 행 라벨이 이전 행 라벨 뒤에 계속 이어붙어 파싱이 통째로 깨졌었음).
// (2026-07-29 수정) 지금까지는 코드가 "(A)"처럼 라벨 끝에 괄호로 붙거나, 숫자 데이터가 다
// 끝난 뒤(afterdata)에 코드 하나만 단독으로 다음 행 시작을 알리는 두 가지 서식만 지원했음.
// 그런데 일부 문서(이번에 확인된 하나자산운용 서식 등)는 라벨이 숫자 데이터보다 "먼저" 나오는
// 도중에 코드가 끼어 있음: "수수료선취-오프 A 0.7446 0.7374 ... 0.3546 라인" 처럼 라벨 앞부분
// → 코드 → 숫자 10개 → 라벨 뒷부분 순서. 이 경우 코드 토큰이 label 문자열 안에 그대로
// 파묻혀버려서(예: "수수료선취-오프A라인") 기존의 두 방식 모두 코드를 못 찾아 해당 문서의
// 보수율이 전 클래스에 걸쳐 하나도 채워지지 않는 문제가 있었음. 그래서 숫자 데이터가 시작되기
// "전"(label 수집 단계)에도, 토큰이 현재 펀드의 실제 클래스 코드와 정확히 일치하면 그 값을
// inlineCode로 별도 보관해두고(라벨 문자열 자체는 그대로 이어붙이되), 다른 방식으로 코드를
// 못 찾았을 때 최후수단으로 이 inlineCode를 사용한다.
function buildFeeTableRows(region, knownCodes) {
  const cleaned = stripPageArtifacts(region);
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const rows = [];
  let label = "";
  let numbers = [];
  let mode = "label"; // "label": 숫자데이터 이전, "afterdata": 숫자데이터 수집 중/이후
  let suffixCount = 0;
  let inlineCode = null;
  const SUFFIX_CAP = 4;

  function finalizeRow() {
    if (label || numbers.length) rows.push({ label, tokens: numbers, inlineCode });
    label = ""; numbers = []; mode = "label"; suffixCount = 0; inlineCode = null;
  }

  for (const t of tokens) {
    if (t === "[PAGE_BREAK]") continue; // 페이지 경계 자체는 완전히 무시
    const isNumeric = /^[-－–0-9.%]+$/.test(t);
    if (isNumeric) {
      numbers.push(t);
      mode = "afterdata";
      continue;
    }
    if (mode === "afterdata") {
      // 코드 단독 라벨 서식: 이미 숫자 데이터를 쌓은 상태에서, 토큰이 현재 회사의 실제 코드와
      // 정확히 일치하면 그 자체로 새 행의 시작으로 봄 (접두어/괄호가 전혀 없어도 인식 가능하게).
      const isBareCodeRowStart = knownCodes && knownCodes.has(normalizeCodeKey(t));
      if (looksLikeFeeRowStart(t) || isBareCodeRowStart) {
        finalizeRow();
        label = t;
        mode = "label";
      } else {
        label += t; // 공백 없이 이어붙임 — 원문 라벨엔 줄바꿈 지점에 공백이 없음
        if (extractRowCodeFromLabelLine(label)) {
          finalizeRow(); // 코드 패턴이 완성되면 즉시 행을 확정 (뒤에 붙는 무관한 텍스트에 오염되지 않게)
        } else {
          suffixCount++;
          if (suffixCount >= SUFFIX_CAP) finalizeRow(); // 안전장치: 끝없이 이어붙는 것 방지
        }
      }
    } else {
      // 숫자 데이터가 시작되기 전(label 수집 단계)인데 지금 토큰이 실제 클래스 코드와 정확히
      // 일치하면, 뒤에 라벨 텍스트가 더 이어지더라도 이 값을 이번 행의 코드로 기억해둔다.
      if (knownCodes && knownCodes.has(normalizeCodeKey(t))) inlineCode = t;
      label += t;
    }
  }
  finalizeRow();
  return rows;
}

// 라벨 앞에 표 헤더 문구 등 무관한 텍스트가 그대로 이어붙어 있어도(표의 "첫 번째" 행은 앵커
// 이후의 헤더 텍스트가 전부 라벨에 흡수되는 경우가 흔함), 라벨의 "끝"이 실제 코드와 정확히
// 일치하면 그 코드를 인정함. codesByLengthDesc는 긴 코드부터 비교해야 "A-E"의 라벨 끝을
// "E"로 잘못 매칭하는 일이 없음 — 2026-07-16 확인.
function extractTrailingKnownCode(label, codesByLengthDesc) {
  for (const code of codesByLengthDesc) {
    if (label.endsWith(code)) return code;
  }
  return null;
}

// targetCode(예: "C-P2")에 해당하는, feeAnalyzeRegion이 이미 분류해둔 항목을 찾아 반환.
// CODE_ALIAS(예: "W" ↔ "CW")로 매핑되는 표기 차이도 함께 시도함.
// ⚠️ (2026-07-22 추가) extractRowCodeFromLabelLine()은 보수표의 "(RP(퇴직연금))"류 라벨에서
// 중첩된 괄호를 부가설명으로 보고 일부러 버려서 코드를 "RP"로만 뽑는다(그래야 "(C4(장마))"
// 같은 다른 회사 서식에서 코드가 "C4"로 올바르게 뽑힘). 그런데 클래스표(class-rules.js) 쪽은
// 반대로 이 괄호를 코드의 일부로 취급해서 "RP(퇴직연금)", "S-P(연금저축)" 형태를 그대로 코드로
// 쓴다(한화자산운용에서 실제 확인). 그래서 둘이 서로 다른 문자열이 되어 매칭이 실패하고, 해당
// 클래스들(RP, RPe, S-P, S-RP, J-Pe, J-RPe 등 연금/퇴직연금 클래스 전부)의 보수율이 하나도
// 채워지지 않는 문제가 있었음. 정확히 일치하는 게 없으면, targetCode 끝의 "(...)" 부가설명을
// 떼어낸 짧은 버전으로 한 번 더 시도한다 — 추출 로직 자체는 그대로 두고 조회만 관대하게 만듦.
function findParsedFeeEntry(parsed, targetCode) {
  if (!parsed || !targetCode) return null;
  const rawKey = normalizeCodeKey(targetCode);
  const aliasedKey = CODE_ALIAS[rawKey] || rawKey;
  const candidateKeys = new Set([rawKey, aliasedKey]);

  const strippedCode = targetCode.replace(/\([^()]*\)\s*$/, "");
  if (strippedCode && strippedCode !== targetCode) {
    const strippedKey = normalizeCodeKey(strippedCode);
    candidateKeys.add(strippedKey);
    candidateKeys.add(CODE_ALIAS[strippedKey] || strippedKey);
  }

  return parsed.find(p => candidateKeys.has(normalizeCodeKey(p.code))) || null;
}

// ---------------------------------------------
// 매트릭스형 보수표 파서 (2026-07-22 추가, KCGI 등)
// ---------------------------------------------
// 위 buildFeeTableRows/feeAnalyzeRegion은 "클래스 하나당 한 행"에 보수 수치들이 가로로 나열되는
// 표를 전제로 한다. 그런데 class-rules.js의 클래스표와 마찬가지로, 일부 운용사는 보수표도
// "클래스를 가로로 늘어놓고 보수종류를 세로로 쌓는" 매트릭스형으로 만든다(예: KCGI). 이 경우
// 클래스별 수치가 전부 다른 x(열)에 있고, 보수종류(집합투자업자보수/판매회사보수/...)가 y(행)를
// 공유한다 — 그래서 텍스트 순서가 아니라 좌표(x,y)로 재구성해야 한다.
//
// feeTablePages(script.js가 "판매회사보수" 문구가 있는 페이지마다 보존해둔 원본 좌표)를 이용해서,
// 클래스 코드 헤더행(예: "A Ae C1 C2 ...")을 찾고, 그 아래에서 알려진 보수종류 라벨
// (FEE_MATRIX_LABEL_SEQUENCE)이 순서대로 등장하는 지점의 y를 기준으로 각 행의 데이터 구간을
// 잘라 클래스별 값을 뽑는다. 클래스 수가 많으면 표가 여러 블록(페이지)에 걸쳐 나뉠 수 있어서,
// 블록마다 다음 블록이 시작되는 지점을 넘어가지 않도록 경계를 둔다.
function fmGroupByY(items, tol) {
  const sorted = items.slice().sort((a, b) => b.y - a.y);
  const groups = [];
  sorted.forEach(it => {
    let g = groups.find(g => Math.abs(g.y - it.y) < tol);
    if (!g) { g = { y: it.y, items: [] }; groups.push(g); }
    g.items.push(it);
  });
  return groups;
}

// 작은 x간격(기본 8pt 미만)으로 붙어있는 조각들을 하나의 "칸" 텍스트로 합침.
// "C" + "-" + "P2"처럼 복합코드가 여러 아이템으로 쪼개져 나오는 경우를 한 칸으로 모으기 위함.
function fmMergeCells(items, gap) {
  const sorted = items.slice().sort((a, b) => a.x - b.x);
  const cells = [];
  let cur = null;
  sorted.forEach(it => {
    const w = it.width || it.str.length * 4;
    if (cur && (it.x - cur.endX) < gap) {
      cur.text += it.str;
      cur.endX = it.x + w;
    } else {
      if (cur) cells.push(cur);
      cur = { x: it.x, text: it.str, endX: it.x + w };
    }
  });
  if (cur) cells.push(cur);
  return cells;
}

// 페이지 안에서 "알려진 클래스 코드가 3개 이상 같은 줄에 나열된" 헤더행을 전부 찾음.
function fmFindHeaderGroups(pageItems, knownCodesSet) {
  const groups = fmGroupByY(pageItems, 2);
  const out = [];
  groups.forEach(g => {
    const cells = fmMergeCells(g.items, 8);
    const matches = cells.filter(c => knownCodesSet.has(normalizeCodeKey(c.text)));
    if (matches.length >= 3) out.push({ y: g.y, cols: matches.map(c => ({ x: c.x, code: c.text })) });
  });
  return out;
}

// 보수표 행 라벨을 등장 순서대로 나열(투자설명서 표준 서식 순서와 동일).
// text는 stripForFeeLabel()로 정규화한 뒤 비교할 값 — 공백/줄바꿈/가운뎃점(·, ㆍ)/괄호 등은
// 전부 제거하고 순수 한글/영숫자만 남긴 형태로 적어둠.
const FEE_MATRIX_LABEL_SEQUENCE = [
  { key: "manage", text: "집합투자업자보수" },
  { key: "sale", text: "판매회사보수" },
  { key: "trustee", text: "신탁회사보수" },
  { key: "admin", text: "일반사무관리회사보수" },
  { key: "total", text: "총보수" },
  { key: "other", text: "기타비용" },
  { key: "totalWithCost", text: "총보수비용" },
  { key: "peer", text: "동종유형총보수" },
  { key: "synthetic", text: "총보수비용피투자집합투자기구보수포함" },
  { key: "brokerage", text: "증권거래비용" },
];
// 실제 UI 필드로 옮길 필요가 있는 항목만 (나머지는 위치 파악용으로만 씀)
const FEE_MATRIX_NEEDED_KEYS = new Set(["manage", "sale", "trustee", "admin", "total", "synthetic"]);

// PDF마다 "·"(U+00B7)와 "ㆍ"(U+318D, 한글 호환 자모라 유니코드 Hangul 스크립트로 분류됨)가
// 뒤섞여 나오는 경우가 있어서(2026-07-22, KCGI로 확인: "총보수·비용"과 "총보수ㆍ비용(피투자...)"
// 에 서로 다른 가운뎃점 문자가 쓰임), 둘 다 명시적으로 먼저 제거하고 나머지 비한글/비영숫자
// 문자를 지움.
function stripForFeeLabel(s) {
  return s.replace(/[·ㆍ]/g, "").replace(/[^\p{Script=Hangul}A-Za-z0-9]/gu, "");
}

// 헤더블록 하나(여러 페이지에 걸칠 수 있음)를 파싱해서 { code: {manage,sale,trustee,admin,total,synthetic} }로 반환.
// hardStop이 있으면(다음 헤더블록의 시작점) 그 지점을 절대 넘어가지 않음 — 블록끼리 섞이는 것 방지.
function fmExtractBlock(headerInfo, pageList, startPageIdx, hardStop) {
  const cols = headerInfo.cols;
  const firstColX = Math.min(...cols.map(c => c.x));
  const lastColX = Math.max(...cols.map(c => c.x));
  const xs = cols.map(c => c.x).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < xs.length; i++) gaps.push(xs[i] - xs[i - 1]);
  const typicalGap = gaps.length ? gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 40;
  const maxColDist = Math.max(typicalGap / 2 + 4, 15);

  const leftItemsFlat = [];
  const dataItemsFlat = [];
  let stopped = false;

  for (let pi = startPageIdx; pi < pageList.length && !stopped; pi++) {
    const items = pageList[pi].items;
    const startY = (pi === startPageIdx) ? headerInfo.y - 0.5 : Infinity;
    const sortedItems = items.filter(it => it.y < startY).sort((a, b) => b.y - a.y || a.x - b.x);
    for (const it of sortedItems) {
      if (hardStop && (pi > hardStop.pageIdx || (pi === hardStop.pageIdx && it.y <= hardStop.y + 3))) {
        stopped = true; break;
      }
      if (it.x < firstColX - 15) leftItemsFlat.push({ text: it.str, y: it.y, pageIdx: pi });
      else if (it.x <= lastColX + 25) dataItemsFlat.push({ x: it.x, y: it.y, str: it.str, pageIdx: pi });

      // 표의 마지막 행(증권거래비용)까지 라벨을 다 모았으면 그 즉시 멈춤(합성총보수까지는 이미 확보됨)
      const concatSoFar = stripForFeeLabel(leftItemsFlat.map(l => l.text).join(""));
      if (concatSoFar.includes(stripForFeeLabel("증권거래비용"))) { stopped = true; break; }
    }
  }

  let bigStr = "";
  const itemOffsets = [];
  leftItemsFlat.forEach(l => {
    const t = stripForFeeLabel(l.text);
    itemOffsets.push({ start: bigStr.length, end: bigStr.length + t.length, y: l.y, pageIdx: l.pageIdx });
    bigStr += t;
  });
  function yAtOffset(off) {
    const hit = itemOffsets.find(o => off >= o.start && off < o.end) || itemOffsets[itemOffsets.length - 1];
    return hit ? { y: hit.y, pageIdx: hit.pageIdx } : null;
  }

  let searchFrom = 0;
  const boundaries = [];
  for (const lbl of FEE_MATRIX_LABEL_SEQUENCE) {
    const idx = bigStr.indexOf(lbl.text, searchFrom);
    if (idx === -1) { boundaries.push(null); continue; }
    const pos = yAtOffset(idx);
    boundaries.push({ key: lbl.key, y: pos.y, pageIdx: pos.pageIdx });
    searchFrom = idx + lbl.text.length;
  }

  const rowsByKey = {};
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    if (!b || !FEE_MATRIX_NEEDED_KEYS.has(b.key)) continue;
    let next = null;
    for (let j = i + 1; j < boundaries.length; j++) { if (boundaries[j]) { next = boundaries[j]; break; } }
    const inRange = (d) => {
      if (d.pageIdx < b.pageIdx) return false;
      if (d.pageIdx === b.pageIdx && d.y > b.y + 3) return false;
      if (next) {
        if (d.pageIdx > next.pageIdx) return false;
        if (d.pageIdx === next.pageIdx && d.y <= next.y + 3) return false;
      }
      return true;
    };
    const perCol = new Map();
    dataItemsFlat.filter(inRange).forEach(it => {
      let best = null, bestDist = Infinity;
      cols.forEach(c => { const dd = Math.abs(c.x - it.x); if (dd < bestDist) { bestDist = dd; best = c; } });
      if (!best || bestDist > maxColDist) return;
      if (!perCol.has(best.code)) perCol.set(best.code, []);
      perCol.get(best.code).push(it);
    });
    const values = {};
    perCol.forEach((arr, code) => {
      const sorted = arr.slice().sort((a, b) => b.y - a.y || a.x - b.x);
      // "주6)" 같은 각주 표시가 셀 값에 그대로 붙어있는 경우(예: Ae/Ce의 판매보수 각주),
      // 각주 번호가 숫자에 섞여 "0.2250" → "0.22506"처럼 오염되는 걸 막기 위해 먼저 제거.
      values[code] = sorted.map(x => x.str).join("").replace(/주\d*\)/g, "");
    });
    rowsByKey[b.key] = values;
  }

  const perCode = {};
  cols.forEach(c => { perCode[c.code] = {}; });
  Object.entries(rowsByKey).forEach(([key, values]) => {
    Object.entries(values).forEach(([code, v]) => { if (perCode[code]) perCode[code][key] = v; });
  });
  return perCode;
}

// feeTablePages 전체를 훑어서 { code: {manage,sale,trustee,admin,total,synthetic} } 형태로 반환.
// 매트릭스형 표가 아니면(헤더블록을 하나도 못 찾으면) null.
function extractFeeMatrixTable(knownCodes) {
  if (typeof feeTablePages === "undefined" || !feeTablePages || feeTablePages.length === 0) return null;
  const knownCodesSet = new Set(knownCodes.map(normalizeCodeKey));

  const pageList = feeTablePages;
  const allHeaders = [];
  pageList.forEach((p, idx) => {
    fmFindHeaderGroups(p.items, knownCodesSet).forEach(h => allHeaders.push({ ...h, pageIdx: idx }));
  });
  if (allHeaders.length === 0) return null;

  const merged = {};
  allHeaders.forEach((h, hi) => {
    const nextHeader = allHeaders[hi + 1] || null;
    const perCode = fmExtractBlock(h, pageList, h.pageIdx, nextHeader);
    Object.assign(merged, perCode);
  });
  return merged;
}

// (2026-07-29 수정) 1차 매트릭스 파서(extractFeeMatrixTable)는 PDF 글자 좌표(x,y)를 직접 다루는
// 코드라, 문서 레이아웃이 조금만 예상과 달라도 예외가 날 수 있다. 지금까지는 이 예외를 그대로
// 던져버려서(try/catch 없음) 1차가 실패하면 이미 검증된 2차(텍스트 기반) 파서까지 아예 실행되지
// 못하고 보수율 전체가 "미입력"으로 비어버리는 문제가 있었다. 1차는 어디까지나 "되면 더 정확한"
// 보너스 경로일 뿐이므로, 여기서 예외가 나도 2차로 안전하게 넘어가도록 감싼다. computeFeeTableValues
// 전체도 한 번 더 감싸서, 예상 못 한 어떤 오류가 나도 보수율만 "못 찾음"으로 처리되고 나머지
// 자동채움 항목들에는 영향이 없도록 한다.
function computeFeeTableValues() {
  try {
    const resolvedCode = getResolvedClassCode();
    if (!resolvedCode) return null;

    const activeCodes = Array.from(new Set(getActiveClassTable().map(e => e.code)));

    // 1차: 매트릭스형(클래스 가로배치) 보수표 시도 — 뽑히면 이걸 우선 사용. 실패(예외 포함)하면 2차로 폴백.
    let matrixTable = null;
    try {
      matrixTable = extractFeeMatrixTable(activeCodes);
    } catch (e) {
      console.warn("[보수율] 매트릭스 파서(1차)에서 오류 발생 — 텍스트 파서(2차)로 폴백합니다.", e);
      matrixTable = null;
    }
    if (matrixTable) {
      const matrixKey = Object.keys(matrixTable).find(c => normalizeCodeKey(c) === normalizeCodeKey(resolvedCode));
      const row = matrixKey ? matrixTable[matrixKey] : null;
      if (row && (row.total !== undefined || row.sale !== undefined)) {
        const values = {};
        if (row.sale !== undefined) values.saleFeeRate = feeToDisplay(row.sale);
        if (row.total !== undefined) values.totalFee = feeToDisplay(row.total);
        if (row.synthetic !== undefined) values.syntheticFee = feeToDisplay(row.synthetic);
        if (row.manage !== undefined) values.manageFeeRate = feeToDisplay(row.manage);
        if (row.trustee !== undefined) values.trusteeFeeRate = feeToDisplay(row.trustee);
        if (row.admin !== undefined) values.adminFeeRate = feeToDisplay(row.admin);
        const m = feeToNum(row.manage), t = feeToNum(row.trustee), a = feeToNum(row.admin);
        const s = feeToNum(row.sale), tot = feeToNum(row.total);
        const confident = ![m, t, a, s, tot].some(Number.isNaN) && Math.abs((m + t + a + s) - tot) < 0.02;
        return { values, confident };
      }
      // 매트릭스 표는 찾았지만 이 클래스 행을 못 찾았으면(예: 표에 없는 코드) 아래 텍스트 기반으로 폴백
    }

    // 2차: 기존 텍스트 기반(클래스당 한 행) 파서
    const region = findFeeTableRegion();
    if (!region) return null;

    // 현재(감지된) 회사의 실제 코드 목록 — 코드 단독 라벨 서식에서 행 시작을 인식하고,
    // 헤더 텍스트가 앞에 붙은 라벨에서도 실제 코드를 뽑아내기 위해 필요함.
    const knownCodes = new Set(activeCodes.map(c => normalizeCodeKey(c)));
    const codesByLengthDesc = activeCodes.slice().sort((a, b) => b.length - a.length);

    const { parsed, commonTriple } = feeAnalyzeRegion(region, codesByLengthDesc, knownCodes);
    const entry = findParsedFeeEntry(parsed, resolvedCode);
    if (!entry) return null;

    const values = {};
    if (entry.row.sale !== undefined) values.saleFeeRate = feeToDisplay(entry.row.sale);
    if (entry.row.total !== undefined) values.totalFee = feeToDisplay(entry.row.total);
    if (entry.row.synthetic !== undefined) values.syntheticFee = feeToDisplay(entry.row.synthetic);

    // 운용사/신탁업자/일반사무관리보수: 이 행 자체에 값이 있으면(표준 10칸/공통값이 이 행에 낀
    // 경우) 그 값을 그대로 쓰고, 없으면(간략 7칸 행) 표 전체에서 검증된 공통값으로 채운다.
    const triple = entry.tripleFromSelf || commonTriple;
    let confident = false;
    if (triple) {
      values.manageFeeRate = feeToDisplay(triple.manage);
      values.trusteeFeeRate = feeToDisplay(triple.trustee);
      values.adminFeeRate = feeToDisplay(triple.admin);
      const m = feeToNum(triple.manage), t = feeToNum(triple.trustee), a = feeToNum(triple.admin);
      const s = feeToNum(entry.row.sale), tot = feeToNum(entry.row.total);
      confident = ![m, t, a, s, tot].some(Number.isNaN) && Math.abs((m + t + a + s) - tot) < 0.02;
    }

    return { values, confident };
  } catch (e) {
    console.warn("[보수율] computeFeeTableValues에서 예상치 못한 오류가 발생해 '못 찾음'으로 처리합니다.", e);
    return null;
  }
}

// 콘솔 디버그용: 개발자도구(F12)에서 feeDebugDump() 실행하면 지금 인식된 보수표의
// 모든 행(라벨/토큰), 공통값(triple), 최종 파싱 결과가 그대로 출력됨.
// PDF-to-text 라이브러리마다 실제 토큰 순서가 달라 코드만으로는 모든 경우를 예측하기
// 어려우므로, 이상값이 나오면 이걸로 원문 그대로를 확인해서 대응한다.
function feeDebugDump() {
  const region = findFeeTableRegion();
  if (!region) { console.log("[보수표] 표 영역(앵커)을 못 찾음"); return; }
  const activeCodes = Array.from(new Set(getActiveClassTable().map(e => e.code)));
  const knownCodes = new Set(activeCodes.map(c => normalizeCodeKey(c)));
  const codesByLengthDesc = activeCodes.slice().sort((a, b) => b.length - a.length);

  const rows = buildFeeTableRows(region, knownCodes);
  console.log("[보수표] 활성 클래스 코드:", activeCodes);
  console.log("[보수표] 인식된 행 " + rows.length + "개:");
  rows.forEach((r, i) => {
    const code = extractRowCodeFromLabelLine(r.label) ||
      (isCodeLikeToken(r.label) ? r.label : null) ||
      extractTrailingKnownCode(r.label, codesByLengthDesc) ||
      r.inlineCode || null;
    console.log(
      "  #" + i, "code=" + (code || "(인식실패)"),
      "tokens=" + JSON.stringify(r.tokens),
      "label끝=…" + r.label.slice(-30)
    );
  });

  const { parsed, commonTriple } = feeAnalyzeRegion(region, codesByLengthDesc, knownCodes);
  console.log("[보수표] commonTriple:", commonTriple);
  console.log("[보수표] 최종 파싱 결과:");
  parsed.forEach(p => {
    console.log("  ", p.code, p.kind, JSON.stringify(p.row), "자체triple=", p.tripleFromSelf);
  });
  console.log("[보수표] 현재 선택된 클래스코드(getResolvedClassCode):", getResolvedClassCode());
  return { rows, parsed, commonTriple };
}
window.feeDebugDump = feeDebugDump;

// 매트릭스형 보수표 전용 디버그: 개발자도구(F12)에서 feeMatrixDebugDump() 실행하면
// feeTablePages가 채워졌는지, 헤더블록이 몇 개/어디서 잡혔는지, 각 블록에서 실제로
// 어떤 코드ㆍ값이 나왔는지를 그대로 출력함. "클래스 선택 표에서 코드를 클릭해도 보수율이
// 하나도 안 잡힌다"는 문제가 생기면 이걸로 실제 브라우저에서 무슨 값이 나오는지 바로 확인 가능.
function feeMatrixDebugDump() {
  console.log("[매트릭스보수표] feeTablePages 존재 여부:", typeof feeTablePages !== "undefined");
  console.log("[매트릭스보수표] feeTablePages 페이지 수:", (typeof feeTablePages !== "undefined" && feeTablePages) ? feeTablePages.length : "(없음)");
  if (typeof feeTablePages !== "undefined" && feeTablePages) {
    console.log("[매트릭스보수표] feeTablePages 페이지 번호:", feeTablePages.map(p => p.pageNum));
  }

  const activeCodes = Array.from(new Set(getActiveClassTable().map(e => e.code)));
  console.log("[매트릭스보수표] 활성 클래스 코드:", activeCodes);

  const knownCodesSet = new Set(activeCodes.map(normalizeCodeKey));
  if (typeof feeTablePages !== "undefined" && feeTablePages) {
    feeTablePages.forEach((p, idx) => {
      const headers = fmFindHeaderGroups(p.items, knownCodesSet);
      console.log(`[매트릭스보수표] 페이지 ${p.pageNum} (idx=${idx}) 헤더블록 ${headers.length}개:`,
        headers.map(h => ({ y: h.y, codes: h.cols.map(c => c.code) })));
    });
  }

  const matrixTable = extractFeeMatrixTable(activeCodes);
  console.log("[매트릭스보수표] extractFeeMatrixTable 결과:", matrixTable);

  console.log("[매트릭스보수표] 현재 선택된 클래스코드(getResolvedClassCode):", getResolvedClassCode());
  console.log("[매트릭스보수표] computeFeeTableValues():", computeFeeTableValues());
  return matrixTable;
}
window.feeMatrixDebugDump = feeMatrixDebugDump;

const FEE_RATE_FIELD_KEYS = ["totalFee", "saleFeeRate", "manageFeeRate", "trusteeFeeRate", "adminFeeRate"];
function refreshFeeRateFields() {
  const result = computeFeeTableValues();
  FEE_RATE_FIELD_KEYS.forEach(k => {
    const el = piFields[k];
    if (!el) return;
    el.classList.remove("auto-filled", "suggested", "none-found");
    const val = result && result.values[k];
    if (val) {
      el.value = val;
      el.classList.add(result.confident ? "auto-filled" : "suggested");
    } else {
      el.value = "";
      el.classList.add("none-found");
    }
  });
}

// 합성총보수발생펀드 — 펀드명에 "자투자" 또는 "재간접"이 들어있으면 예, 아니면 아니오.
// "아니오"인 펀드는 표에 합성총보수 항목 자체가 없는 경우가 많아, 굳이 추출을 시도하지 않고
// 바로 "없음"으로 표시함.
function isSyntheticFeeFund() {
  const nameText = (pnFields.kr.value || "") + " " + (pnFields.short.value || "");
  return /자투자|재간접/.test(nameText);
}
function refreshSyntheticFeeFields() {
  if (!hasProductBasis()) {
    clearSelectField(piFields.syntheticFeeFundYn);
    clearReadonlyField(piFields.syntheticFee);
    return;
  }
  const isSynthetic = isSyntheticFeeFund();
  piFields.syntheticFeeFundYn.classList.remove("auto-filled", "suggested", "none-found");
  piFields.syntheticFeeFundYn.value = isSynthetic ? "예" : "아니오";
  piFields.syntheticFeeFundYn.classList.add("auto-filled");

  piFields.syntheticFee.classList.remove("auto-filled", "suggested", "none-found");
  if (!isSynthetic) {
    piFields.syntheticFee.value = "없음";
    piFields.syntheticFee.classList.add("auto-filled");
    return;
  }
  const result = computeFeeTableValues();
  const val = result && result.values.syntheticFee;
  if (val) {
    piFields.syntheticFee.value = val;
    piFields.syntheticFee.classList.add(result.confident ? "auto-filled" : "suggested");
  } else {
    piFields.syntheticFee.value = "";
    piFields.syntheticFee.classList.add("none-found");
  }
}

// 수수료징수방법 — 문자열 패턴 추측 대신 class-rules.js에 등록된 실제 tier1 값을 그대로 사용함.
// (예전엔 "A"/"Ae"만 선취로 보고 A-G, A-E, A-P 등 나머지 A계열은 전부 후취로 잘못 분류됐음—
// class-rules.js에는 A-G/A-E/A-P 등도 tier1="수수료선취"로 등록돼 있어서 이 방식이 맞음)
const FEE_COLLECT_METHOD_MAP = {
  "수수료선취": "선취",
  "수수료후취": "후취",
  "수수료미징구": "미징구",
  "수수료선후취": "선후취",
};
function computeFeeCollectMethod() {
  const resolvedCode = getResolvedClassCode();
  if (!resolvedCode) return "";
  const table = getActiveClassTable();
  const entry = table.find(e => e.code === resolvedCode);
  if (!entry) return "";
  return FEE_COLLECT_METHOD_MAP[entry.tier1] || "";
}
function refreshFeeCollectMethod() {
  if (!piFields.feeCollectMethod) return;
  if (!hasProductBasis()) { clearSelectField(piFields.feeCollectMethod); return; }
  const mapped = computeFeeCollectMethod();
  piFields.feeCollectMethod.classList.remove("auto-filled", "suggested", "none-found");
  if (mapped) {
    piFields.feeCollectMethod.value = mapped;
    piFields.feeCollectMethod.classList.add("auto-filled");
  } else {
    piFields.feeCollectMethod.value = "";
    piFields.feeCollectMethod.classList.add("none-found");
  }
}

// 펀드명(한글펀드명/약칭펀드명) 또는 펀드유형구분(fcType)에 "MMF"가 포함되는지 확인
function isMmfFund() {
  const nameText = (pnFields.kr.value || "") + " " + (pnFields.short.value || "");
  if (/MMF/i.test(nameText)) return true;
  const fcTypeEl = $("#fcType");
  return !!(fcTypeEl && /MMF/i.test(fcTypeEl.value));
}

// 펀드명에 "usd"/"USD"가 포함되는지, 또는 거래통화코드가 USD로 설정돼있는지 확인
function isUsdFund() {
  const nameText = (pnFields.kr.value || "") + " " + (pnFields.short.value || "");
  if (/usd/i.test(nameText)) return true;
  const fcCurrencyEl = $("#fcCurrencyCode");
  return !!(fcCurrencyEl && /USD/i.test(fcCurrencyEl.value));
}

// 원화/외화 × 일반/MMF 4가지 유형별 금액 세트 (신규/추가최저금액, 신규최대금액,
// 신규·추가매입단위금액, 환매단위금액, 좌당기준가격, 기준가산정단위)
const FUND_AMOUNT_TABLE = {
  krw_general: { imNewMin:"50,000", jeokNewMin:"50,000", geoNewMin:"0",
                 imAddMin:"50,000", jeokAddMin:"50,000", newMax:"0",
                 newBuyUnit:"1", addBuyUnit:"1", redeemUnit:"0",
                 navPerUnit:"1", navCalcUnit:"1,000" },
  usd_general: { imNewMin:"100", jeokNewMin:"100", geoNewMin:"0",
                 imAddMin:"50", jeokAddMin:"50", newMax:"0",
                 newBuyUnit:"1", addBuyUnit:"1", redeemUnit:"0",
                 navPerUnit:"0.01", navCalcUnit:"1,000" },
  krw_mmf:     { imNewMin:"0", jeokNewMin:"0", geoNewMin:"0",
                 imAddMin:"0", jeokAddMin:"0", newMax:"0",
                 newBuyUnit:"1", addBuyUnit:"1", redeemUnit:"0",
                 navPerUnit:"0.01", navCalcUnit:"1,000" },
  usd_mmf:     { imNewMin:"100", jeokNewMin:"0", geoNewMin:"0",
                 imAddMin:"50", jeokAddMin:"0", newMax:"0",
                 newBuyUnit:"1", addBuyUnit:"1", redeemUnit:"0",
                 navPerUnit:"0.01", navCalcUnit:"1,000" },
};
const AMOUNT_FIELD_KEYS = [
  "imNewMin", "jeokNewMin", "geoNewMin", "imAddMin", "jeokAddMin", "newMax",
  "newBuyUnit", "addBuyUnit", "redeemUnit", "navPerUnit", "navCalcUnit",
];

// 원화/외화 · 일반/MMF 유형에 따라 신규·추가최저금액 등 11개 금액 필드를 채움.
// 아직 기준이 없으면(초기 상태) 미입력으로 둠 — 다른 자동채움 필드들과 동일한 규칙.
function refreshAmountFields() {
  if (!hasProductBasis()) {
    AMOUNT_FIELD_KEYS.forEach(k => clearReadonlyField(piFields[k]));
    return;
  }
  const usd = isUsdFund();
  const mmf = isMmfFund();
  const tableKey = usd && mmf ? "usd_mmf" : usd ? "usd_general" : mmf ? "krw_mmf" : "krw_general";
  const values = FUND_AMOUNT_TABLE[tableKey];
  AMOUNT_FIELD_KEYS.forEach(k => {
    const el = piFields[k];
    if (!el) return;
    el.classList.remove("auto-filled", "suggested", "none-found");
    el.value = values[k];
    el.classList.add("auto-filled");
  });
}

// PDF 업로드가 됐거나(펀드명이 채워짐) 사용자가 클래스구분을 직접 골랐을 때만 "기본값"을 계산함.
// 그 전(완전히 빈 초기 상태)에는 예/예/아니오 같은 기본값을 미리 보여주지 않고 그냥 미입력으로 둠 —
// 안 그러면 아직 아무 정보도 없는데 마치 확정된 값처럼 보여서 오해할 수 있음.
function hasProductBasis() {
  return (pnFields.kr.value !== "") || (pnFields.short.value !== "") || (piFields.classDivision.value !== "");
}

function clearSelectField(el) {
  if (!el) return;
  el.classList.remove("auto-filled", "suggested", "none-found");
  el.value = "";
}

function clearReadonlyField(el) {
  if (!el) return;
  el.classList.remove("auto-filled", "suggested", "none-found");
  el.value = "";
}

// 인터넷뱅킹판매 — 클래스구분이 Ae/Ce/CPe면 인터넷전용판매, 아니면 인터넷판매불가.
// 아직 아무 기준도 없으면(펀드명도 없고 클래스구분도 안 골랐으면) 미입력으로 둠.
function applyInternetBankingFromClass(markAs) {
  if (!hasProductBasis()) { clearSelectField(piFields.internetBanking); return; }
  const currentClass = piFields.classDivision.value;
  piFields.internetBanking.value = INTERNET_ONLY_CLASSES.includes(currentClass)
    ? "인터넷전용판매"
    : "인터넷판매불가";
  piFields.internetBanking.classList.remove("auto-filled", "suggested", "none-found");
  piFields.internetBanking.classList.add(markAs || "auto-filled");
}

// "연금 클래스" 여부 — 회사마다 코드 문자열(CP/CPe/CP2/C-P2/C-P1 등)이 가리키는 의미가 완전히
// 뒤섞여 있음 (예: 어떤 회사는 "CP"=퇴직연금, "C-P2"=개인연금 인데, 다른 회사는 정반대로
// "CP"=개인연금, "CP2"=퇴직연금). 그래서 코드 문자열이나 그걸 정규화한 classDivision 값으로는
// 개인연금/퇴직연금 여부를 절대 판별할 수 없음 — 대신 사용자가 실제로 고른 3차(tier3) 라벨을
// 직접 봄. "개인연금"이든 "퇴직연금"이든 라벨에 "연금"이 들어있으면 연금 클래스로 취급한다.
function isCpFamilyClass() {
  const t3 = pnFields.class3 ? pnFields.class3.value : "";
  return typeof t3 === "string" && t3.includes("연금");
}

function isCwClass() {
  return piFields.classDivision.value === "CW Class";
}

function nameContains(keyword) {
  const nameText = (pnFields.kr.value || "") + " " + (pnFields.short.value || "");
  return nameText.includes(keyword);
}

// 개인/개인사업자/법인 개설가능 — 펀드명에 "개인"+MMF, "법인"+MMF 조합을 최우선으로 보고,
// 그다음 CW(ISA) 클래스, 그다음 연금클래스(3차명에 "연금" 포함, isCpFamilyClass())는 개인만 개설
// 가능하므로 개인사업자/법인은 무조건 "아니오"로 고정. 나머지는 일반펀드 기본값. 아직 기준이 없으면
// 미입력으로 둠.
function refreshAccountTypeOpenability() {
  if (!hasProductBasis()) {
    [piFields.openIndiv, piFields.openBizIndiv, piFields.openCorp].forEach(clearSelectField);
    return;
  }
  const mmf = isMmfFund();
  let indiv = "예", bizIndiv = "예", corp = "예";
  if (mmf && nameContains("개인")) {
    indiv = "예"; bizIndiv = "예"; corp = "아니오";
  } else if (mmf && nameContains("법인")) {
    indiv = "아니오"; bizIndiv = "아니오"; corp = "예";
  } else if (isCwClass()) {
    indiv = "예"; bizIndiv = "아니오"; corp = "예";
  } else if (isCpFamilyClass()) {
    indiv = "예"; bizIndiv = "아니오"; corp = "아니오";
  }
  [[piFields.openIndiv, indiv], [piFields.openBizIndiv, bizIndiv], [piFields.openCorp, corp]].forEach(([el, val]) => {
    if (!el) return;
    el.classList.remove("auto-filled", "suggested", "none-found");
    el.value = val;
    el.classList.add("auto-filled");
  });
}

// 생계형가능/세금우대가능/특별중도해지/분리과세가능/비거주자개설/해외상장주식 비과세여부/
// 전문투자자전용여부/클린클래스여부/추천펀드구분 — 일반펀드/CW(ISA)/연금클래스(3차명에 "연금"
// 포함, isCpFamilyClass()) 3가지 유형별 고정값.
const SPECIAL_FLAGS_TABLE = {
  general: { livelihood:"예", taxBenefit:"아니오", specialEarlyTermination:"아니오",
             separateTaxation:"아니오", nonResident:"예", overseasListedTaxExempt:"아니오",
             professionalOnly:"아니오", cleanClass:"아니오", recommendedFundType:"해당무" },
  cw:      { livelihood:"아니오", taxBenefit:"아니오", specialEarlyTermination:"예",
             separateTaxation:"예", nonResident:"아니오", overseasListedTaxExempt:"아니오",
             professionalOnly:"아니오", cleanClass:"아니오", recommendedFundType:"해당무" },
  cp:      { livelihood:"아니오", taxBenefit:"아니오", specialEarlyTermination:"예",
             separateTaxation:"예", nonResident:"아니오", overseasListedTaxExempt:"아니오",
             professionalOnly:"아니오", cleanClass:"아니오", recommendedFundType:"해당무" },
};
const SPECIAL_FLAG_KEYS = [
  "livelihood", "taxBenefit", "specialEarlyTermination", "separateTaxation", "nonResident",
  "overseasListedTaxExempt", "professionalOnly", "cleanClass", "recommendedFundType",
];
function isCleanClass() {
  return piFields.classDivision.value.includes("G"); // A-G Class / C-G Class만 G를 포함함
}

function refreshSpecialFlags() {
  if (!hasProductBasis()) {
    SPECIAL_FLAG_KEYS.forEach(k => clearSelectField(piFields[k]));
    return;
  }
  const tableKey = isCwClass() ? "cw" : isCpFamilyClass() ? "cp" : "general";
  const values = SPECIAL_FLAGS_TABLE[tableKey];
  SPECIAL_FLAG_KEYS.forEach(k => {
    const el = piFields[k];
    if (!el) return;
    el.classList.remove("auto-filled", "suggested", "none-found");
    el.value = values[k];
    el.classList.add("auto-filled");
  });
  // 클린클래스여부는 위 표와 무관하게, 클래스구분에 "G"가 포함되면(A-G/C-G) 무조건 예로 덮어씀
  if (piFields.cleanClass) {
    piFields.cleanClass.value = isCleanClass() ? "예" : values.cleanClass;
  }
}

// 질권설정비율 — 우선 연금클래스(isCpFamilyClass()) 여부를 먼저 보고, 아니면 펀드유형
// (자본시장법상: fcCapitalType)과 그 하위분류(fcCapitalSubType) 기준으로 계산한다.
// 하위분류가 "재간접"인 경우엔 그 자체만으로는 주식/채권 성격을 알 수 없으므로, 위쪽
// "펀드유형구분"(fcType — 펀드명 기반으로 이미 주식형/채권형/혼합형/MMF 등을 판정해둔 값)을
// 그대로 따라가서 같은 비율표를 적용한다. (2026-07-15 확인: "재간접형은 위에 펀드유형구분을
// 따라가면돼") — "투자계약증권형"은 아직 규칙이 없어 그대로 빈 값(확인 필요)으로 둠.
function pledgeRatioFromFundType(fundType) {
  if (fundType === "채권형") return "90%";
  if (fundType === "채권혼합형") return "70%";
  if (fundType === "주식형" || fundType === "주식혼합형") return "50%";
  if (fundType === "부동산투자" || fundType === "특별자산투자") return "50%";
  if (fundType === "MMF(법인)" || fundType === "MMF(개인)") return "100%";
  return ""; // 파생상품/미선택 — 규칙 미정, 직접 확인 필요
}

function computePledgeRatio() {
  // (2026-07-24 추가) 연금클래스(3차명에 "연금" 포함 — isCpFamilyClass())는 펀드의 실제
  // 자산유형(주식형/채권형 등)과 무관하게 무조건 50%를 우선 적용한다. 사용자 확인: "펀드유형과는
  // 무관하게 우선적으로 클래스가 연금클래스면 50%로 나와야해". 아래 자산유형 기준 계산보다
  // 먼저 검사해서, 예를 들어 채권형 펀드의 개인연금/퇴직연금 클래스도 50%로 나오게 한다.
  if (typeof isCpFamilyClass === "function" && isCpFamilyClass()) return "50%";

  const capitalType = ($("#fcCapitalType") || {}).value || "";
  const subType = ($("#fcCapitalSubType") || {}).value || "";
  if (capitalType === "단기금융") return "100%";
  if (capitalType === "증권") {
    if (subType === "채권형") return "90%";
    if (subType === "혼합채권형") return "70%";
    if (subType === "주식형" || subType === "혼합주식형") return "50%";
    if (subType === "재간접") {
      const fundType = ($("#fcType") || {}).value || "";
      return pledgeRatioFromFundType(fundType);
    }
    return ""; // 투자계약증권형/미선택 — 규칙 미정, 직접 확인 필요
  }
  if (capitalType === "부동산" || capitalType === "특별자산" || capitalType === "혼합자산") return "50%";
  return ""; // fcCapitalType 미선택
}

// 본인당행/제3자당행 질권설정 가능여부 — 기본 예/예, CW(ISA) 클래스만 아니오/아니오.
// 질권설정비율은 CW 여부와 무관하게 위 계산식을 그대로 사용.
function refreshPledgeFields() {
  if (!hasProductBasis()) {
    [piFields.pledgeSelf, piFields.pledgeThirdParty, piFields.pledgeRatio].forEach(clearSelectField);
    return;
  }
  const cw = isCwClass();
  [[piFields.pledgeSelf, cw ? "아니오" : "예"], [piFields.pledgeThirdParty, cw ? "아니오" : "예"]].forEach(([el, val]) => {
    if (!el) return;
    el.classList.remove("auto-filled", "suggested", "none-found");
    el.value = val;
    el.classList.add("auto-filled");
  });
  const ratio = computePledgeRatio();
  if (piFields.pledgeRatio) {
    piFields.pledgeRatio.classList.remove("auto-filled", "suggested", "none-found");
    if (ratio) {
      piFields.pledgeRatio.value = ratio;
      piFields.pledgeRatio.classList.add("auto-filled");
    } else {
      piFields.pledgeRatio.value = "";
      piFields.pledgeRatio.classList.add("none-found");
    }
  }
}

// ISA가능여부(신탁형/일임형) — 기본 아니오/아니오, CW(ISA) 클래스면 담당자확인필요/담당자확인필요.
function refreshIsaFields() {
  if (!hasProductBasis()) {
    [piFields.isaTrust, piFields.isaDiscretionary].forEach(clearSelectField);
    return;
  }
  const val = isCwClass() ? "담당자확인필요" : "아니오";
  [piFields.isaTrust, piFields.isaDiscretionary].forEach(el => {
    if (!el) return;
    el.classList.remove("auto-filled", "suggested", "none-found");
    el.value = val;
    el.classList.add("auto-filled");
  });
}

// 판매사이동가능여부/비율이체가능여부 — 일반펀드면 예/예, 연금클래스(3차명에 "연금" 포함)·CW면 아니오/예.
// 태블릿뱅킹 신규가능여부 — 위 두 개와는 별개로, 클래스구분이 "A", "C", "C1" 이 셋 중 하나일 때만 예,
// 그 외(A-E, A-U, A-G, C2, C3, C4, C5, CW, C-P2 등 A/C로 "시작"만 하는 나머지 파생 클래스 전부 포함)는 아니오.
// (2026-07-29 추가) C1까지는 예, C2부터는 다시 아니오로 확정.
// ⚠️ 이전 버전은 codePart의 첫 글자만 비교해서 A-E/C1 같은 파생 클래스까지 잘못 "예"로 처리했음.
// ⚠️ (2026-07-29 재수정) "클래스구분" 드롭다운은 사내 표준 19종으로만 구성돼 있어, C-P2(퇴직연금)처럼
// 표준 목록에 아예 없는 코드는 매핑에 실패해 classDivision 값 자체가 빈 값("미입력")으로 남는다.
// 그러면 태블릿뱅킹도 판단 근거가 없어져 "미입력"으로 같이 비어버렸음 — 정작 C-P2는 "A/C/C1 딱 그
// 자체"가 아니므로 명백히 "아니오"가 나와야 하는 케이스. 그래서 classDivision이 비어있을 때는
// 표준화되지 않은 원본 코드(getResolvedClassCode, 예: "C-P2")로 한 번 더 판단해서 폴백한다.
const TABLET_BANKING_ALLOWED_CLASSES = new Set(["A", "C", "C1"]);
function computeTabletBanking() {
  let cls = piFields.classDivision.value;
  if (!cls && typeof getResolvedClassCode === "function") {
    cls = getResolvedClassCode(); // 표준 클래스로 매핑 안 되는 원본 코드(예: "C-P2")로 폴백
  }
  if (!cls) return "";
  const codePart = cls.replace(/\s*Class$/, "").trim().toUpperCase();
  return TABLET_BANKING_ALLOWED_CLASSES.has(codePart) ? "예" : "아니오";
}
function refreshDealerTransferFields() {
  if (!hasProductBasis()) {
    [piFields.dealerTransfer, piFields.ratioTransfer, piFields.tabletBanking].forEach(clearSelectField);
    return;
  }
  const restricted = isCpFamilyClass() || isCwClass();
  piFields.dealerTransfer.classList.remove("auto-filled", "suggested", "none-found");
  piFields.dealerTransfer.value = restricted ? "아니오" : "예";
  piFields.dealerTransfer.classList.add("auto-filled");

  piFields.ratioTransfer.classList.remove("auto-filled", "suggested", "none-found");
  piFields.ratioTransfer.value = "예"; // 일반펀드/연금클래스/CW 모두 "예"로 동일
  piFields.ratioTransfer.classList.add("auto-filled");

  const tablet = computeTabletBanking();
  piFields.tabletBanking.classList.remove("auto-filled", "suggested", "none-found");
  if (tablet) {
    piFields.tabletBanking.value = tablet;
    piFields.tabletBanking.classList.add("auto-filled");
  } else {
    piFields.tabletBanking.value = "";
    piFields.tabletBanking.classList.add("none-found");
  }
}

// 투자지역/섹터 · 펀드특성구분 · 감면상품구분 — 기본은 "담당자확인필요", 연금클래스(3차명에
// "연금" 포함)면 각각 세제적격/연금펀드/연금저축. 아직 기준이 없으면(초기 상태) 미입력으로 둠.
function refreshCpDerivedFields() {
  if (!hasProductBasis()) {
    [piFields.investRegionSector, piFields.fundCharacterType, piFields.taxReductionType].forEach(clearReadonlyField);
    return;
  }
  const cp = isCpFamilyClass();
  const setField = (el, cpValue) => {
    if (!el) return;
    el.classList.remove("auto-filled", "suggested", "none-found");
    el.value = cp ? cpValue : "담당자확인필요";
    el.classList.add("auto-filled");
  };
  setField(piFields.investRegionSector, "세제적격");
  setField(piFields.fundCharacterType, "연금펀드");
  setField(piFields.taxReductionType, "연금저축");
}

// (임)/(적)/(거) 개설가능 — 기본 예/예/아니오. 연금클래스(3차명에 "연금" 포함)면 아니오/예/아니오.
// 펀드명에 MMF가 들어가면 예/아니오/아니오. 둘 다 해당하면 MMF가 우선(예/아니오/아니오).
// 아직 기준이 없으면(초기 상태) 미입력으로 둠.
function refreshAccountOpenability() {
  if (!hasProductBasis()) {
    [piFields.openableIm, piFields.openableJeok, piFields.openableGeo].forEach(clearSelectField);
    return;
  }
  let im = "예", jeok = "예", geo = "아니오";
  if (isMmfFund()) {
    im = "예"; jeok = "아니오"; geo = "아니오";
  } else if (isCpFamilyClass()) {
    im = "아니오"; jeok = "예"; geo = "아니오";
  }
  [[piFields.openableIm, im], [piFields.openableJeok, jeok], [piFields.openableGeo, geo]].forEach(([el, val]) => {
    if (!el) return;
    el.classList.remove("auto-filled", "suggested", "none-found");
    el.value = val;
    el.classList.add("auto-filled");
  });
}


function refreshIndividualInfo() {
  if (!piFields.convertGroupName) return; // 폼이 아직 없으면 무시

  // 1) 전환그룹코드(명) — 약칭펀드명에서 클래스 코드만 제거
  const groupName = stripTrailingClassCode(pnFields.short.value);
  piFields.convertGroupName.classList.remove("none-found", "suggested", "auto-filled");
  if (groupName) {
    piFields.convertGroupName.value = groupName;
    piFields.convertGroupName.classList.add("auto-filled");
  } else {
    piFields.convertGroupName.value = "없음";
    piFields.convertGroupName.classList.add("none-found");
  }

  // 2) 클래스구분 — 현재 1~3차 조합으로 특정된 회사 코드를 표준 19종 클래스로 정규화해서 제안
  const resolvedCode = getResolvedClassCode();
  const standardClass = normalizeToStandardClass(resolvedCode);
  piFields.classDivision.classList.remove("auto-filled", "suggested", "none-found");
  if (standardClass) {
    piFields.classDivision.value = standardClass;
    piFields.classDivision.classList.add("suggested"); // 회사마다 표기가 달라 100% 확정은 아니므로 "제안값"
  } else {
    piFields.classDivision.value = "";
    piFields.classDivision.classList.add("none-found");
  }

  // 3) 전환가능여부 — 전환가능횟수(fcConvertCount)가 0보다 크면 "예", 아니면 "아니오"
  const convertCountEl = $("#fcConvertCount");
  const convertCount = convertCountEl ? (parseInt(convertCountEl.value, 10) || 0) : 0;
  piFields.convertible.value = convertCount > 0 ? "예" : "아니오";
  piFields.convertible.classList.remove("none-found", "suggested");
  piFields.convertible.classList.add("auto-filled");

  // 4) 인터넷뱅킹판매 — 클래스구분이 Ae/Ce/CPe면 인터넷전용판매, 아니면 인터넷판매불가
  applyInternetBankingFromClass();

  // 5) 보수율 자동기입칸 — 투자설명서 보수 표에서 현재 클래스에 맞는 행을 찾아 채움
  refreshFeeRateFields();

  // 5-1) 선취수수료 납입금액 — "종류형 구조" 표의 선취판매 칸에서 현재 클래스에 맞는 값을 찾아 채움
  //      (A 계열처럼 선취수수료가 있는 클래스가 아니면 미입력으로 남김)
  refreshFrontLoadFeeField();

  // 6) 수수료징수방법 — 클래스구분(19종) 기준
  refreshFeeCollectMethod();

  // 6-1) 합성총보수발생펀드/합성총보수 — 펀드명에 자투자/재간접 포함 여부 기준
  refreshSyntheticFeeFields();

  // 7) 투자지역/섹터 · 펀드특성구분 · 감면상품구분 — 연금클래스(3차명에 "연금" 포함) 여부로 결정
  refreshCpDerivedFields();

  // 8) (임)/(적)/(거) 개설가능 — MMF 여부·연금클래스 여부로 결정 (MMF 우선)
  refreshAccountOpenability();

  // 9) 신규/추가최저금액·신규최대금액·매입/환매단위금액·좌당기준가격·기준가산정단위
  //    — 원화/외화 × 일반/MMF 4가지 유형에 따라 결정 (MMF·USD 여부는 이름/유형/통화코드로 판단)
  refreshAmountFields();

  // 10) 개인/개인사업자/법인 개설가능 — 개인MMF/법인MMF/CW(ISA)/일반펀드 순으로 판정
  refreshAccountTypeOpenability();

  // 11) 생계형가능~추천펀드구분 — 일반펀드/CW(ISA)/연금클래스(3차명에 "연금" 포함) 3가지 유형별 고정값
  refreshSpecialFlags();

  // 12) 질권설정 가능여부·질권설정비율 — CW 여부 + 펀드유형(자본시장법상) 기준
  refreshPledgeFields();

  // 13) ISA가능여부(신탁형/일임형) — CW 여부 기준
  refreshIsaFields();

  // 14) 판매사이동/비율이체/태블릿뱅킹 신규가능여부
  refreshDealerTransferFields();
}

// 사용자가 값을 직접 고치면 자동채움 강조 표시 제거 (다른 자동채움 필드들과 동일한 UX)
[
  piFields.convertGroupName, piFields.classDivision, piFields.convertible, piFields.internetBanking,
  piFields.feeCollectMethod, piFields.investRegionSector, piFields.fundCharacterType, piFields.taxReductionType,
  piFields.openableIm, piFields.openableJeok, piFields.openableGeo,
  piFields.imNewMin, piFields.jeokNewMin, piFields.geoNewMin, piFields.imAddMin, piFields.jeokAddMin, piFields.newMax,
  piFields.newBuyUnit, piFields.addBuyUnit, piFields.redeemUnit, piFields.navPerUnit, piFields.navCalcUnit,
  piFields.openIndiv, piFields.openBizIndiv, piFields.openCorp,
  piFields.livelihood, piFields.taxBenefit, piFields.specialEarlyTermination,
  piFields.separateTaxation, piFields.nonResident, piFields.overseasListedTaxExempt,
  piFields.professionalOnly, piFields.cleanClass, piFields.recommendedFundType,
  piFields.pledgeSelf, piFields.pledgeThirdParty, piFields.pledgeRatio,
  piFields.isaTrust, piFields.isaDiscretionary,
  piFields.dealerTransfer, piFields.ratioTransfer, piFields.tabletBanking,
  piFields.totalFee, piFields.saleFeeRate, piFields.manageFeeRate, piFields.trusteeFeeRate, piFields.adminFeeRate,
  piFields.frontLoadFee,
  piFields.syntheticFeeFundYn, piFields.syntheticFee,
].forEach(el => {
  if (!el) return;
  el.addEventListener("input", () => el.classList.remove("auto-filled", "suggested", "none-found"));
  el.addEventListener("change", () => el.classList.remove("auto-filled", "suggested", "none-found"));
});

// 한글펀드명/약칭펀드명이 바뀌거나(직접 수정/자동채움), 1~3차 클래스 선택이 바뀔 때마다 다시 계산
// (MMF/USD 판정이 두 이름 필드를 모두 참조하므로 둘 다 감시해야 함)
if (pnFields.kr) {
  pnFields.kr.addEventListener("input", refreshIndividualInfo);
  pnFields.kr.addEventListener("change", refreshIndividualInfo);
}
if (pnFields.short) {
  pnFields.short.addEventListener("input", refreshIndividualInfo);
  pnFields.short.addEventListener("change", refreshIndividualInfo);
}
[pnFields.class1, pnFields.class2, pnFields.class3].forEach(el => {
  if (el) el.addEventListener("change", refreshIndividualInfo);
});

// 클래스구분을 사용자가 직접 드롭다운에서 바꾸면, 이 값에 의존하는 나머지 필드들도 다시 계산
// (전환그룹코드/전환가능여부는 클래스구분과 무관하므로 그대로 둠)
if (piFields.classDivision) {
  piFields.classDivision.addEventListener("change", () => {
    applyInternetBankingFromClass("suggested");
    refreshFeeRateFields();
    refreshFrontLoadFeeField();
    refreshFeeCollectMethod();
    refreshCpDerivedFields();
    refreshAccountOpenability();
    refreshAccountTypeOpenability();
    refreshSpecialFlags();
    refreshPledgeFields();
    refreshIsaFields();
    refreshDealerTransferFields();
  });
}

// 펀드유형(자본시장법상)·하위분류가 바뀌면 질권설정비율 다시 계산
const piFcCapitalTypeEl = $("#fcCapitalType");
if (piFcCapitalTypeEl) piFcCapitalTypeEl.addEventListener("change", refreshPledgeFields);
const piFcCapitalSubTypeEl = $("#fcCapitalSubType");
if (piFcCapitalSubTypeEl) piFcCapitalSubTypeEl.addEventListener("change", refreshPledgeFields);

// 펀드유형구분(fcType)이 바뀌면 MMF 여부가 달라질 수 있으므로 개설가능 여부·금액 필드 다시 계산
const piFcTypeEl = $("#fcType");
if (piFcTypeEl) piFcTypeEl.addEventListener("change", () => { refreshAccountOpenability(); refreshAmountFields(); refreshAccountTypeOpenability(); refreshPledgeFields(); });

// 거래통화코드(fcCurrencyCode)가 바뀌면 외화(USD) 여부가 달라질 수 있으므로 금액 필드 다시 계산
const piFcCurrencyEl = $("#fcCurrencyCode");
if (piFcCurrencyEl) piFcCurrencyEl.addEventListener("change", refreshAmountFields);

// PDF 업로드로 상품명/펀드분류가 자동 갱신된 뒤(script.js에서) 한 번 더 호출할 수 있도록 전역 노출
window.refreshIndividualInfo = refreshIndividualInfo;

// 최초 로딩 시 한 번 실행 (빈 상태 기준으로 초기화)
refreshIndividualInfo();
