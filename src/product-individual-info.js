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
  syntheticFeeFundYn: $("#piSyntheticFeeFundYn"),
  syntheticFee: $("#piSyntheticFee"),
};

// "클래스구분" 표준 옵션(사내 등록용 19종) — 운용사마다 제각각인 실제 코드(class-rules.js의
// code, 예: "A-E", "C-P2E", "AG")를 여기 표준 클래스로 정규화해서 보여줌.
// 회사마다 표기 방식이 달라 100% 정확한 자동 매핑은 불가능하므로, 애매한 조합(연금·기관 등
// 세부 tier가 섞인 코드)은 자동으로 채우지 않고 사용자가 직접 드롭다운에서 고르도록 비워둠.
const STANDARD_CLASS_OPTIONS = [
  "A Class", "Ae Class", "B Class", "C1 Class", "C2 Class", "C3 Class", "C4 Class", "C5 Class",
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

// 해석2) "간략 N칸"(운용/신탁/사무관리보수 3칸이 공통이라 이 행엔 아예 없는 서식):
// tokens[0]=판매사보수, tokens[1]=총보수, tokens[5]=합성총보수. 공통값(triple)은 별도로 채워야 함.
function feeTryReduced(tokens) {
  if (tokens.length < 2) return null;
  const sale = feeToNum(tokens[0]), total = feeToNum(tokens[1]);
  if ([sale, total].some(Number.isNaN)) return null;
  return { row: { sale: tokens[0], total: tokens[1], synthetic: tokens[5] } };
}

// region 전체를 훑어서: 클래스별 행(sale/total/synthetic)과, 표 안에 공통값이 끼어있다면
// 그 공통 운용사/신탁업자/일반사무관리보수(triple)를 함께 뽑아낸다.
//
// "표준 10칸으로 볼지, 공통값이 낀 간략행으로 볼지"는 그 행 하나의 산술검증(합계=총보수)만으론
// 구분이 안 된다 — 어느 쪽으로 읽어도 "앞 4칸의 합 = 5번째 칸"이라는 같은 식이 되기 때문에
// (라벨만 다르게 붙을 뿐 더하는 숫자 자체는 동일). 그래서 행 하나가 아니라 표 전체를 보고,
// "이 표에서 제일 흔한 토큰 개수(다수결)"로 서식을 먼저 정한다:
//  - 다수가 짧은(7~8칸) 간략행이면 → 그보다 정확히 3칸 더 긴 행이 "공통값이 낀 행"
//  - 다수가 긴(9칸 이상) 표준행이면 → 매 행에 다 적힌 것이므로 그대로 표준 매핑 사용
function feeAnalyzeRegion(region, codesByLengthDesc, knownCodes) {
  const rows = buildFeeTableRows(region, knownCodes);
  const candidateRows = [];
  for (const r of rows) {
    if (r.tokens.length < 2) continue;
    const code = extractRowCodeFromLabelLine(r.label) ||
      (isCodeLikeToken(r.label) ? r.label : null) ||
      extractTrailingKnownCode(r.label, codesByLengthDesc);
    if (code) candidateRows.push({ code, tokens: r.tokens });
  }
  if (!candidateRows.length) return { parsed: [], commonTriple: null };

  const lengthCounts = {};
  candidateRows.forEach(r => { lengthCounts[r.tokens.length] = (lengthCounts[r.tokens.length] || 0) + 1; });
  const modeLength = Number(Object.keys(lengthCounts).sort((a, b) => lengthCounts[b] - lengthCounts[a])[0]);
  const isReducedDominant = modeLength <= 8; // 7~8칸=간략형 다수, 9칸 이상=표준(매 행 반복)형 다수

  const parsed = [];
  let commonTriple = null;

  if (isReducedDominant) {
    for (const r of candidateRows) {
      const extra = r.tokens.length - modeLength;
      if (extra === 3) {
        // 앞 3칸을 공통값으로 떼어내고, 나머지를 그 행 고유의 간략 데이터로 다시 해석
        const triple = { manage: r.tokens[0], trustee: r.tokens[1], admin: r.tokens[2] };
        const own = feeTryReduced(r.tokens.slice(3));
        if (own) {
          const m = feeToNum(triple.manage), t = feeToNum(triple.trustee), a = feeToNum(triple.admin);
          const s = feeToNum(own.row.sale), tot = feeToNum(own.row.total);
          const consistent = ![m, t, a, s, tot].some(Number.isNaN) && Math.abs((m + t + a + s) - tot) < 0.02;
          if (consistent && !commonTriple) commonTriple = triple;
          parsed.push({ code: r.code, kind: "embedded", row: own.row, tripleFromSelf: consistent ? triple : null });
          continue;
        }
      }
      const reduced = feeTryReduced(r.tokens);
      if (reduced) parsed.push({ code: r.code, kind: "reduced", row: reduced.row, tripleFromSelf: null });
    }
  } else {
    // 표준(매 행 반복)형: 행마다 이미 운용/판매/수탁/사무관리보수가 다 적혀있으니 그대로 사용.
    for (const r of candidateRows) {
      const full = feeTryFull(r.tokens);
      if (full) {
        parsed.push({ code: r.code, kind: full.consistent ? "full" : "full-unverified", row: full.row, tripleFromSelf: full.triple });
      }
    }
  }

  return { parsed, commonTriple };
}

function findFeeTableRegion() {
  if (typeof searchableText === "undefined" || !searchableText) return null;

  for (const anchor of FEE_TABLE_PRIMARY_ANCHORS) {
    const m = searchableText.match(new RegExp(loosePattern(anchor)));
    if (m) return searchableText.slice(m.index, m.index + FEE_TABLE_WINDOW);
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
function buildFeeTableRows(region, knownCodes) {
  const cleaned = stripPageArtifacts(region);
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const rows = [];
  let label = "";
  let numbers = [];
  let mode = "label"; // "label": 숫자데이터 이전, "afterdata": 숫자데이터 수집 중/이후
  let suffixCount = 0;
  const SUFFIX_CAP = 4;

  function finalizeRow() {
    if (label || numbers.length) rows.push({ label, tokens: numbers });
    label = ""; numbers = []; mode = "label"; suffixCount = 0;
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
function findParsedFeeEntry(parsed, targetCode) {
  if (!parsed || !targetCode) return null;
  const rawKey = normalizeCodeKey(targetCode);
  const aliasedKey = CODE_ALIAS[rawKey] || rawKey;
  const candidateKeys = new Set([rawKey, aliasedKey]);
  return parsed.find(p => candidateKeys.has(normalizeCodeKey(p.code))) || null;
}

function computeFeeTableValues() {
  const region = findFeeTableRegion();
  if (!region) return null;
  const resolvedCode = getResolvedClassCode();
  if (!resolvedCode) return null;

  // 현재(감지된) 회사의 실제 코드 목록 — 코드 단독 라벨 서식에서 행 시작을 인식하고,
  // 헤더 텍스트가 앞에 붙은 라벨에서도 실제 코드를 뽑아내기 위해 필요함.
  const activeCodes = Array.from(new Set(getActiveClassTable().map(e => e.code)));
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
}

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
// 그다음 CW(ISA) 클래스, 나머지는 일반펀드 기본값. 아직 기준이 없으면 미입력으로 둠.
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
             separateTaxation:"아니오", nonResident:"아니오", overseasListedTaxExempt:"아니오",
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

// 질권설정비율 — 펀드유형(자본시장법상: fcCapitalType)과 그 하위분류(fcCapitalSubType) 기준.
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
// 태블릿뱅킹 신규가능여부 — 위 두 개와는 별개로, 클래스구분이 A 계열이나 C 계열이면 예, 아니면 아니오.
function computeTabletBanking() {
  const cls = piFields.classDivision.value;
  if (!cls) return "";
  const codePart = cls.replace(/\s*Class$/, "");
  const firstChar = codePart.charAt(0).toUpperCase();
  return (firstChar === "A" || firstChar === "C") ? "예" : "아니오";
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
