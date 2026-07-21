// ============================================================
// product-public-api.js — 금융위원회_펀드상품기본정보(공공데이터포털) 연동
// utils.js, product-name.js, product-fund-classification.js보다 뒤에,
// script.js보다 앞에 로드되어야 합니다. (index.html에 <script> 태그 추가 필요)
//
// 공식 "공공데이터 오픈API 활용가이드" 문서로 확인된 필드명 (추측 아님):
//   setpDt    - 설정일 (YYYYMMDD)
//   fndTp     - 펀드유형 (문자열, 예: "파생상품")
//   prdClsfCd - 상품분류코드 (20자리) ← 2차분류/11차분류 자릿수 매핑 아직 미확정. 미반영.
//   asoStdCd  - 협회표준코드
// 응답 경로: response.body.items.item (배열 또는 단일 객체)
//
// ⚠️ 서비스키를 브라우저 코드에 그대로 넣습니다. 리포는 private이라 소스 유출 위험은
//    없지만, 배포된 사이트(GitHub Pages 등)에 접속해서 개발자도구 Network 탭을 보면
//    누구나 이 키를 볼 수 있습니다. 트래픽이 이상하게 빨리 줄면 서버리스 프록시로
//    옮기는 걸 고려하세요 (지금은 "일단 직접호출로" 결정하셔서 이 형태로 둡니다).
// ============================================================

const PUBLIC_API_BASE = "https://apis.data.go.kr/1160100/service/GetFundProductInfoService/getStandardCodeInfo";
const PUBLIC_API_SERVICE_KEY = "f46da0c4f687f0be2bf32aa604573a9db630491d318fc724ddee2e294d18b363"; // TODO: 나중에 프록시로 옮기면 여기서 제거

// 2차분류(집합투자기구종류) 코드 → 기존 #fcCapitalType(자본시장법상 유형) /
// #fcCapitalSubType(하위분류) 드롭다운 값 매핑. (코드북 캡처 기준)
// B1/B2(기업성장), VV(변액보험)는 기존 드롭다운에 대응 옵션이 없어서 매핑 제외 —
// 이 값이 나오면 그냥 건너뛰고 skipped에 로그만 남긴다.
const PRDCLSFCD_2ND_MAP = {
  "11": { parent: "증권", sub: "채권형" },
  "12": { parent: "증권", sub: "채권형" },       // 채권파생형 (파생여부는 별도 로직이 처리)
  "21": { parent: "증권", sub: "주식형" },
  "22": { parent: "증권", sub: "주식형" },       // 주식파생형
  "31": { parent: "증권", sub: "혼합주식형" },
  "32": { parent: "증권", sub: "혼합주식형" },   // 혼합주식파생형
  "41": { parent: "증권", sub: "혼합채권형" },
  "42": { parent: "증권", sub: "혼합채권형" },   // 혼합채권파생형
  "51": { parent: "증권", sub: "투자계약증권형" },
  "52": { parent: "증권", sub: "투자계약증권형" },
  "61": { parent: "증권", sub: "재간접" },
  "62": { parent: "증권", sub: "재간접" },
  "71": { parent: "부동산", sub: null },
  "72": { parent: "부동산", sub: null },
  "81": { parent: "특별자산", sub: null },
  "82": { parent: "특별자산", sub: null },
  "91": { parent: "혼합자산", sub: null },
  "92": { parent: "혼합자산", sub: null },
  "EE": { parent: "단기금융", sub: null },
};

// ⚠️ 실험적: prdClsfCd(20자리) 안에서 2차분류가 "2~3번째 자리(0-index 1~2)"라는 건
// 활용가이드 예제 1건("...[주식-파생형]" 펀드의 코드에서 그 위치에 "22"가 있었던 것)
// 으로만 검증됐다. 응답명세의 항목크기가 30으로 돼있는데 실제 샘플은 20자리인 걸 보면
// 펀드유형에 따라 길이가 달라지는 가변코드일 가능성이 있어서, 다른 유형의 펀드에서는
// 이 위치가 밀려서 틀릴 수 있다. 여러 건 검증 전까지는 결과를 무조건 신뢰하지 말 것.
function parseSecondLevelClassification(prdClsfCd) {
  if (!prdClsfCd || prdClsfCd.length < 3) return null;
  const code = prdClsfCd.slice(1, 3);
  return PRDCLSFCD_2ND_MAP[code] ? { code, ...PRDCLSFCD_2ND_MAP[code] } : null;
}

// 기존 "펀드유형구분"(#fcType) 드롭다운에 이미 있는 값들.
// API의 fndTp가 이 중 하나와 정확히 일치할 때만 "검증됨"으로 보고 그대로 채운다.
// (금투협 fndTp의 분류 단위가 이 드롭다운보다 더 크거나 다르게 나뉠 수 있어서,
//  안 맞는 값을 억지로 매핑하면 오히려 PDF기반 로직보다 부정확해질 수 있음)
const FUND_TYPE_KNOWN_OPTIONS = [
  "주식혼합형", "채권혼합형", "특별자산투자", "주식형", "채권형",
  "MMF(개인)", "파생상품", "부동산투자", "MMF(법인)",
];

function pubApiFormatDate(yyyymmdd) {
  if (!yyyymmdd || String(yyyymmdd).length !== 8) return null;
  const s = String(yyyymmdd);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

// likeFndNm(포함 검색)으로 조회 → 완전히 같은 펀드명이 있으면 그걸 채택,
// 없으면 첫 결과를 채택 (클래스별로 여러 건이 잡힐 수 있어서).
async function fetchFundInfoByName(fundName) {
  if (!fundName) return null;

  const params = new URLSearchParams({
    serviceKey: PUBLIC_API_SERVICE_KEY,
    resultType: "json",
    numOfRows: "20",
    pageNo: "1",
    likeFndNm: fundName,
  });

  const res = await fetch(`${PUBLIC_API_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`공공데이터 API HTTP 오류: ${res.status}`);
  const data = await res.json();

  const header = data?.response?.header;
  if (header && header.resultCode !== "00") {
    throw new Error(`공공데이터 API 오류 [${header.resultCode}] ${header.resultMsg}`);
  }

  const rawItems = data?.response?.body?.items?.item;
  if (!rawItems) return null;
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  const exact = items.find(it => it.fndNm === fundName);
  return exact || items[0];
}

// item: fetchFundInfoByName()이 반환한 객체. 화면에 반영하고 어떤 항목을
// 채웠는지/건너뛰었는지 알려준다 (콘솔 확인 및 추후 UI 안내용).
function applyPublicApiFields(item) {
  const result = { applied: [], skipped: [] };
  if (!item) {
    result.skipped.push("공공데이터에서 일치하는 펀드를 찾지 못함");
    return result;
  }

  // 설정일 -> 최초설정일자(#fcInceptionDate) + 차기결산예정일 재계산. 그대로 사용.
  const inceptionEl = $("#fcInceptionDate");
  if (inceptionEl && item.setpDt) {
    const formatted = pubApiFormatDate(item.setpDt);
    if (formatted) {
      inceptionEl.value = formatted;
      inceptionEl.classList.remove("none-found");
      inceptionEl.classList.add("auto-filled");
      if (typeof FC_STATE !== "undefined") {
        FC_STATE.fund_inception_date = { value: formatted, found: true };
      }
      if (typeof fcComputeNextSettlement === "function") {
        const nextSettlement = fcComputeNextSettlement(formatted);
        const nextEl = $("#fcNextSettlement");
        if (nextSettlement && nextEl) {
          nextEl.value = nextSettlement;
          nextEl.classList.remove("none-found");
          nextEl.classList.add("auto-filled");
          if (typeof FC_STATE !== "undefined") {
            FC_STATE.fund_next_settlement = { value: nextSettlement, found: true };
          }
        }
      }
      result.applied.push("설정일");
    }
  }

  // 펀드유형 -> #fcType. 기존 드롭다운 옵션과 정확히 일치할 때만 검증 채택.
  const typeEl = $("#fcType");
  if (typeEl && item.fndTp) {
    if (FUND_TYPE_KNOWN_OPTIONS.includes(item.fndTp)) {
      typeEl.value = item.fndTp;
      typeEl.classList.remove("none-found");
      typeEl.classList.add("auto-filled");
      if (typeof FC_STATE !== "undefined") {
        FC_STATE.fund_type = { value: item.fndTp, found: true };
      }
      result.applied.push("펀드유형");
    } else {
      result.skipped.push(`펀드유형: API값 "${item.fndTp}"이 드롭다운 옵션과 불일치 (수동 확인 필요)`);
    }
  }

  // 협회표준코드 -> #piKofiaFundCode. 그대로 사용.
  const kofiaCodeEl = $("#piKofiaFundCode");
  if (kofiaCodeEl && item.asoStdCd) {
    kofiaCodeEl.value = item.asoStdCd;
    kofiaCodeEl.classList.remove("none-found");
    kofiaCodeEl.classList.add("auto-filled");
    result.applied.push("협회표준코드");
  }

  // 상품분류코드(prdClsfCd) 2차분류 -> #fcCapitalType(자본시장법상 유형) + #fcCapitalSubType(하위분류)
  // 11차분류는 아직 자리 위치가 확인되지 않아서 반영하지 않음.
  const capitalTypeEl = $("#fcCapitalType");
  if (item.prdClsfCd && capitalTypeEl) {
    const parsed = parseSecondLevelClassification(item.prdClsfCd);
    if (parsed) {
      capitalTypeEl.value = parsed.parent;
      capitalTypeEl.classList.remove("none-found");
      capitalTypeEl.classList.add("auto-filled");
      if (typeof FC_STATE !== "undefined") {
        FC_STATE.fund_capital_type = { value: parsed.parent, found: true };
      }
      // fcCapitalSubType 옵션 목록은 부모값에 따라 동적으로 바뀌므로, 기존 헬퍼로 다시 그려준다
      if (typeof fcPopulateSubType === "function") {
        fcPopulateSubType(parsed.parent, parsed.sub);
      }
      const capitalSubTypeEl = $("#fcCapitalSubType");
      if (parsed.sub && capitalSubTypeEl) {
        capitalSubTypeEl.value = parsed.sub;
        capitalSubTypeEl.classList.remove("none-found");
        capitalSubTypeEl.classList.add("auto-filled");
        if (typeof FC_STATE !== "undefined") {
          FC_STATE.fund_capital_subtype = { value: parsed.sub, found: true };
        }
      }
      result.applied.push(`2차분류(${parsed.code} → ${parsed.parent}${parsed.sub ? "/" + parsed.sub : ""})`);
    } else {
      result.skipped.push(`2차분류 코드(${item.prdClsfCd.slice(1, 3)})가 매핑표에 없음 — 수동 확인 필요`);
    }
  }
  if (item.prdClsfCd) {
    result.skipped.push("11차분류 — 자릿수 위치 미확인, 미반영");
  }

  return result;
}

// script.js의 handleFile()에서 펀드명 추출 뒤 호출하는 진입점.
// 실패해도(네트워크 오류, 매칭 실패 등) 예외를 던지지 않고 콘솔에만 남긴다 —
// 공공데이터 조회가 실패해도 나머지(PDF기반) 자동채움 흐름은 막히면 안 되므로.
async function publicApiAutoFill(fundName) {
  try {
    const item = await fetchFundInfoByName(fundName);
    const result = applyPublicApiFields(item);
    if (result.applied.length) {
      console.log("[공공데이터] 채움:", result.applied.join(", "));
    }
    if (result.skipped.length) {
      console.warn("[공공데이터] 건너뜀:", result.skipped.join(" / "));
    }
    return result;
  } catch (err) {
    console.warn("[공공데이터] 조회 실패:", err.message);
    return { applied: [], skipped: [`조회 실패: ${err.message}`] };
  }
}

window.fetchFundInfoByName = fetchFundInfoByName;
window.applyPublicApiFields = applyPublicApiFields;
window.publicApiAutoFill = publicApiAutoFill;
