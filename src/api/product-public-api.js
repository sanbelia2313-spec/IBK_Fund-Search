// ============================================================
// product-public-api.js — 금융위원회_펀드상품기본정보(공공데이터포털) 연동
// utils.js, product-name.js, product-fund-classification.js보다 뒤에,
// script.js보다 앞에 로드되어야 합니다. (index.html에 <script> 태그 추가 필요)
//
// 공식 "공공데이터 오픈API 활용가이드" 문서 + Open API 명세(영문 페이지에서 Request
// Parameter 표 확인, 2026-07-21)로 확인된 필드명 (추측 아님):
//   srtnCd    - 단축코드 (요청 파라미터명. 응답 필드에도 동일한 이름으로 내려옴 —
//               이 API의 다른 필드들(fndTp/prdClsfCd 등)도 요청·응답 필드명이 같은 관례를 따름)
//   setpDt    - 설정일 (YYYYMMDD)
//   fndTp     - 펀드유형 (문자열, 예: "파생상품")
//   prdClsfCd - 상품분류코드 (20자리). 2차분류=2~3번째 자리, 11차분류=16~17번째 자리 — 둘 다 확인됨.
//   asoStdCd  - 협회표준코드 (클래스마다 다름 — 같은 펀드도 클래스별로 별도 레코드/레코드마다
//               다른 asoStdCd를 가짐. 그래서 대표값 하나로 고정하면 안 되고, "지금 선택된
//               클래스가 뭔지"에 따라 다시 조회해서 넣어줘야 함)
// 응답 경로: response.body.items.item (배열 또는 단일 객체)
//
// ★ PDF↔API 매칭 기준 (2026-07-21 변경): 예전엔 펀드명(likeFndNm 퍼지검색)으로 매칭했는데,
//   PDF에서 뽑은 한글펀드명이 API의 fndNm과 공백·표기 차이로 완전히 일치 안 할 수 있어서
//   신뢰도가 낮았음. → 이제는 "PDF 클래스표에 적힌 금융투자협회 펀드코드"와 "API의
//   단축코드(srtnCd)"가 정확히 일치하는지로만 판단함(펀드코드=단축코드는 같은 값이라
//   둘이 다를 일이 없음). PDF 클래스표의 펀드코드 각각을 srtnCd로 그대로 조회해서,
//   하나라도 일치하는 레코드가 나오면 그때부터 "이 펀드는 API에 등록돼 있다"고 보고
//   작업을 시작함. 하나도 안 나오면(=API 미등록 또는 조회 실패) 기존 PDF기반 로직만 씀.
//
// ⚠️ 서비스키를 브라우저 코드에 그대로 넣습니다. 리포는 private이라 소스 유출 위험은
//    없지만, 배포된 사이트(GitHub Pages 등)에 접속해서 개발자도구 Network 탭을 보면
//    누구나 이 키를 볼 수 있습니다. 트래픽이 이상하게 빨리 줄면 서버리스 프록시로
//    옮기는 걸 고려하세요 (지금은 "일단 직접호출로" 결정하셔서 이 형태로 둡니다).
// ============================================================

const PUBLIC_API_BASE = "https://apis.data.go.kr/1160100/service/GetFundProductInfoService/getStandardCodeInfo";
const PUBLIC_API_SERVICE_KEY = "f46da0c4f687f0be2bf32aa604573a9db630491d318fc724ddee2e294d18b363"; // TODO: 나중에 프록시로 옮기면 여기서 제거

// 2차분류코드 중 "파생형" 코드 → 그 기본형(비파생) 코드로의 정규화 테이블.
// (2026-07-21 사용자 확정 규칙) 채권파생형(12)→채권형(11), 주식파생형(22)→주식형(21),
// 혼합주식파생형(32)→혼합주식형(31), 혼합채권파생형(42)→혼합채권형(41),
// 투자계약증권파생(52)→투자계약증권(51), 재간접파생형(62)→재간접형(61),
// 부동산파생(72)→부동산(71), 특별자산파생(82)→특별자산(81), 혼합자산파생(92)→혼합자산(91),
// 기업성장파생(B2)→기업성장(B1).
// 예전엔 "code2.endsWith('2')"라는 우연한 문자열 매칭으로 파생 여부를 판단했는데,
// 그건 "B2"가 우연히 문자 '2'로 끝나서 얻어걸린 것일 뿐 의도가 드러나지 않아서, 아래처럼
// 명시적인 테이블로 바꿔서 어떤 코드가 파생형인지/기본형이 뭔지 한 곳에서 관리한다.
const PRDCLSFCD_2ND_BASE_CODE = {
  "12": "11", "22": "21", "32": "31", "42": "41",
  "52": "51", "62": "61", "72": "71", "82": "81",
  "92": "91", "B2": "B1",
};

// 2차분류(집합투자기구종류) "기본형" 코드 → 기존 #fcCapitalType(자본시장법상 유형) /
// #fcCapitalSubType(하위분류) 드롭다운 값 매핑. (코드북 캡처 기준)
// 파생형 코드(12/22/32/...)는 위 PRDCLSFCD_2ND_BASE_CODE로 먼저 기본형으로 정규화한 뒤
// 이 표에서 조회하므로, 파생형 코드를 이 표에 따로 또 적어둘 필요가 없다.
// B1/B2(기업성장), VV(변액보험)는 기존 드롭다운에 대응 옵션이 없어서 매핑 제외 —
// 이 값이 나오면 그냥 건너뛰고 skipped에 로그만 남긴다.
const PRDCLSFCD_2ND_MAP = {
  "11": { parent: "증권", sub: "채권형" },
  "21": { parent: "증권", sub: "주식형" },
  "31": { parent: "증권", sub: "혼합주식형" },
  "41": { parent: "증권", sub: "혼합채권형" },
  "51": { parent: "증권", sub: "투자계약증권형" },
  "61": { parent: "증권", sub: "재간접" },
  "71": { parent: "부동산", sub: null },
  "81": { parent: "특별자산", sub: null },
  "91": { parent: "혼합자산", sub: null },
  "EE": { parent: "단기금융", sub: null },
};

// ⚠️ 실험적: prdClsfCd(20자리) 안에서 2차분류가 "2~3번째 자리(0-index 1~2)"라는 건
// 활용가이드 예제 1건("...[주식-파생형]" 펀드의 코드에서 그 위치에 "22"가 있었던 것)
// 으로만 검증됐다. 응답명세의 항목크기가 30으로 돼있는데 실제 샘플은 20자리인 걸 보면
// 펀드유형에 따라 길이가 달라지는 가변코드일 가능성이 있어서, 다른 유형의 펀드에서는
// 이 위치가 밀려서 틀릴 수 있다. 여러 건 검증 전까지는 결과를 무조건 신뢰하지 말 것.
function parseSecondLevelClassification(prdClsfCd) {
  if (!prdClsfCd || prdClsfCd.length < 3) return null;
  const raw = prdClsfCd.slice(1, 3);
  const baseCode = PRDCLSFCD_2ND_BASE_CODE[raw] || raw; // 파생형이면 기본형 코드로 정규화 후 조회
  return PRDCLSFCD_2ND_MAP[baseCode] ? { code: raw, ...PRDCLSFCD_2ND_MAP[baseCode] } : null;
}

// 기존 "펀드유형구분"(#fcType) 드롭다운에 이미 있는 값들.
// API의 fndTp가 이 중 하나와 정확히 일치할 때만 "검증됨"으로 보고 그대로 채운다.
// (금투협 fndTp의 분류 단위가 이 드롭다운보다 더 크거나 다르게 나뉠 수 있어서,
//  안 맞는 값을 억지로 매핑하면 오히려 PDF기반 로직보다 부정확해질 수 있음)
const FUND_TYPE_KNOWN_OPTIONS = [
  "주식혼합형", "채권혼합형", "특별자산투자", "주식형", "채권형",
  "MMF(개인)", "파생상품", "부동산투자", "MMF(법인)",
  "주식고편입형", "주식저편입형", "채권투자형", "부동산투자형", "파생상품투자형",
  "특별자산투자형", "인덱스투자형", "MMF형", // 재간접형(61)의 11차분류 6~8 확장분(2026-07-21)
  "기타-미분류",
];

function pubApiFormatDate(yyyymmdd) {
  if (!yyyymmdd || String(yyyymmdd).length !== 8) return null;
  const s = String(yyyymmdd);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

// 11차분류(투자대상자산 등) 2자리 값의 앞자리 → 9개 대카테고리(+ZZ=기타-미분류).
// (세부 서브카테고리(일반/가치주/성장주/배당주/섹터 등)까지는 필요 없고, 재간접(비파생)형
// 펀드의 펀드유형구분을 이 카테고리 중 하나로 판정하는 데만 씀. 재간접파생형(62)은 여기로
// 오지 않고 다른 "OOO파생형" 코드들과 함께 무조건 "파생상품"으로 처리됨 — determineFundType 참고)
const LV11_CATEGORY_BY_LEADING_DIGIT = {
  "1": "주식고편입형",
  "2": "주식저편입형",
  "3": "채권투자형",
  "4": "부동산투자형",
  "5": "파생상품투자형",
  "6": "특별자산투자형",
  "7": "인덱스투자형",
  "8": "MMF형",
};

// 11차분류(투자대상자산 등)는 20자리 중 16~17번째 자리(0-index 15~16)에 위치.
// 앞자리 1~8이면 9개 대카테고리 중 하나로, "ZZ"면 <기타-미분류>로 판정한다.
function parseEleventhLevelCategory(prdClsfCd) {
  if (!prdClsfCd || prdClsfCd.length < 17) return null;
  const code = prdClsfCd.slice(15, 17);
  if (code === "ZZ") return { code, category: "기타-미분류" };
  const category = LV11_CATEGORY_BY_LEADING_DIGIT[code[0]];
  return category ? { code, category } : null;
}

// 2차분류가 재간접형(61)도 아니고 "OOO파생형"(62 포함)도 아닐 때,
// 그 2차분류 값 자체를 펀드유형구분(#fcType) 표기로 바꾸는 매핑.
// (51 투자계약증권, 91 혼합자산은 #fcType 드롭다운에 대응 옵션이 없어서 매핑 제외)
const FUND_TYPE_BY_2ND_CODE = {
  "11": "채권형",
  "21": "주식형",
  "31": "주식혼합형",
  "41": "채권혼합형",
  "71": "부동산투자",
  "81": "특별자산투자",
};

// 펀드유형구분(#fcType) 결정 규칙 — 사용자 지정:
//  1) 2차분류가 재간접형(61, 비파생)인 경우에만 → 11차분류 카테고리(9종) 사용
//  2) 2차분류가 "OOO파생형"(끝자리가 2)인 경우 → "파생상품"
//     - 재간접파생형(62)도 여기 포함됨(1번의 재간접형과 달리 11차분류로 안 넘어가고
//       바로 "파생상품"으로 확정됨 — 재간접형(61)과 재간접파생형(62)을 같이 취급하던
//       기존 버그를 수정함, 2026-07-21)
//     - 기업성장파생(B2)도 code2.endsWith("2")에 걸려서 여기 포함됨(기업성장(B1) 자체는
//       #fcType에 대응 옵션이 없어서 미분류지만, 그 파생형(B2)만은 무조건 "파생상품")
//  3) 그 외 → 2차분류에 대응하는 펀드유형구분 값 사용
//     (2차분류가 EE(단기금융/MMF)면 개인/법인 구분이 2차분류만으론 안 되므로
//      여기서 손대지 않고 null 반환 → 기존 PDF기반 로직이 채운 값을 그대로 둠)
function determineFundType(prdClsfCd) {
  if (!prdClsfCd || prdClsfCd.length < 3) return null;
  const code2 = prdClsfCd.slice(1, 3);

  if (code2 === "EE") return null;
  if (code2 === "61") { // 재간접형(비파생)만 11차분류로 위임. 62(재간접파생형)는 아래 endsWith("2")로 빠짐
    const lv11 = parseEleventhLevelCategory(prdClsfCd);
    return lv11 ? lv11.category : null;
  }
  if (code2.endsWith("2")) return "파생상품"; // 채권/주식/혼합주식/혼합채권/투자계약증권/재간접/부동산/특별자산/혼합자산/기업성장 각 "파생형"

  return FUND_TYPE_BY_2ND_CODE[code2] || null;
}

// srtnCd(단축코드) 하나를 정확히 조회. 단축코드 조회이므로 결과는 0건 아니면 1건이어야 정상.
// (혹시 여러 건이 오는 비정상 상황이면 그냥 첫 번째를 씀 — 이 API는 srtnCd 단위로 유일해야 함)
async function fetchFundInfoBySrtnCd(srtnCd) {
  if (!srtnCd) return null;

  const params = new URLSearchParams({
    serviceKey: PUBLIC_API_SERVICE_KEY,
    resultType: "json",
    numOfRows: "5",
    pageNo: "1",
    srtnCd,
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
  return items.length ? items[0] : null;
}

// fetchFundInfoBySrtnCd를 최대 2번까지 재시도(총 3회 시도)하는 래퍼.
// (2026-07-22 추가) 이 공공데이터 API는 한 펀드당 클래스별로 srtnCd가 10개 넘게 있는 경우가
// 흔한데, matchPdfFundCodesToApi가 그걸 전부 한꺼번에(Promise.all) 동시 호출하다 보니 API의
// 초당/동시 요청 제한에 걸려서 일부 요청만 랜덤하게 실패하는 문제가 실제로 확인됨(같은 srtnCd를
// curl로 단독 호출하면 정상 응답이 오는데, 브라우저에서 다른 14개와 동시에 호출하면 그 중 몇
// 개는 실패함). 실패한 호출만 짧은 대기 후 재시도해서 이 문제를 완화한다.
async function fetchFundInfoBySrtnCdWithRetry(srtnCd, maxRetries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFundInfoBySrtnCd(srtnCd);
    } catch (e) {
      lastErr = e;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1))); // 300ms, 600ms 대기 후 재시도
      }
    }
  }
  throw lastErr;
}

// 배열의 각 항목에 대해 비동기 작업을 실행하되, 동시에 최대 `limit`개까지만 진행시키는
// 간단한 동시성 제한 헬퍼. (2026-07-22 추가 — 위 재시도 로직과 함께, API 요청 제한 문제의
// 근본 원인인 "한꺼번에 다 쏘기"를 없애기 위함. limit=4 정도면 15개 안팎의 클래스 수에서도
// 체감 속도 저하 없이 요청 제한을 피할 수 있었음)
async function runWithConcurrencyLimit(items, limit, worker) {
  const queue = items.slice();
  const runners = new Array(Math.min(limit, queue.length)).fill(null).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(runners);
}

// classTable: getActiveClassTable()이 반환하는 행 배열([{code, tier1, tier2, tier3, fundCode}, ...]).
// fundCode(=PDF에 적힌 "금융투자협회 펀드코드")가 있는 행만 대상으로, 그 값을 그대로 srtnCd로
// 조회함. 하드코딩된 참고표(회사별로 미리 등록해둔 표)로 대체된 경우엔 fundCode 자체가 없으므로
// (실제 펀드마다 다른 값이라 하드코딩할 수 없음) 자동으로 대상에서 빠짐 — 이 경우 매칭 결과가
// 통째로 0건이 되어 아래 publicApiAutoFill에서 "API 미등록"으로 간주되고 PDF기반 값만 쓰게 됨.
// 반환값: { fundCode: apiRecord } 맵. 조회 실패/불일치 건은 그냥 맵에서 빠짐(전체 흐름은 안 막음).
//
// ⚠️ (2026-07-22) 이 방식은 이제 "보조 수단"으로만 남겨둠 — PDF 표에서 클래스별 펀드코드
// 15개 안팎을 좌표로 하나하나 추출해야 해서 표 레이아웃이 조금만 틀어져도(실제로 KB자산운용
// PDF에서 "C" 클래스 행에 무관한 6자리 숫자가 잘못 걸리는 사례로 확인됨) 틀린 값이 섞여들
// 위험이 있음. 아래 matchFundNameToApi()(이름검색 기반)가 훨씬 안정적이라 그걸 우선 쓰고,
// 이름검색이 실패했을 때만(이름 자체를 못 뽑았거나 API가 이름으로 못 찾을 때) 이걸로 대체함.
async function matchPdfFundCodesToApi(classTable) {
  const fundCodes = Array.from(new Set(
    (classTable || []).map(r => r.fundCode).filter(Boolean)
  ));

  const srtnCdMap = {};
  // 예전엔 Promise.all로 전부 동시에 쐈는데, 그러면 API 요청 제한에 걸려 일부가 랜덤하게
  // 실패했음(위 fetchFundInfoBySrtnCdWithRetry 주석 참고). 동시 4개로 제한 + 실패 시 재시도.
  await runWithConcurrencyLimit(fundCodes, 4, async fundCode => {
    try {
      const rec = await fetchFundInfoBySrtnCdWithRetry(fundCode);
      // rec.srtnCd가 요청한 fundCode와 실제로 같은지 한 번 더 확인 (API가 혹시 다른 필드로도
      // 매칭해서 다른 코드를 돌려주는 예외적인 경우를 대비한 방어적 체크)
      if (rec && (!rec.srtnCd || rec.srtnCd === fundCode)) {
        srtnCdMap[fundCode] = rec;
      }
    } catch (e) {
      console.warn(`[공공데이터] srtnCd=${fundCode} 조회 실패(재시도 포함):`, e.message);
    }
  });
  return srtnCdMap;
}

// ------------------------------------------------------------
// 이름검색(likeFndNm) 기반 매칭 — 2026-07-22 추가, 이제 이게 기본(1차) 경로임.
//
// PDF 좌표에서 클래스별 펀드코드를 일일이 추출하는 대신, PDF에서 이미 뽑아둔 "클래스 코드
// 붙기 전 원본 펀드명"(product-name.js의 baseKrNameRaw)을 그대로 이 API의 likeFndNm(펀드명
// 퍼지검색) 파라미터에 넣어서, 같은 펀드의 모든 클래스 레코드를 한 번에 받아온다.
// 이 API의 fndNm은 "OOO증권 자투자신탁(주식-파생형)(H) C-Pe" 처럼 원본 펀드명 뒤에 정확히
// 클래스 코드가 붙어 나오므로(실제 KB자산운용 펀드로 직접 확인함, 2026-07-22), 그 꼬리 부분만
// 떼어내면 "클래스 코드 → API 레코드" 맵을 좌표 추정 없이 그대로 만들 수 있다.
// (모펀드 자체 레코드는 꼬리가 "(운용)" 같은 식이라 클래스 코드 형식이 아니므로 자동으로 걸러짐)
async function fetchFundInfoByLikeFndNm(likeFndNm) {
  if (!likeFndNm) return [];

  const params = new URLSearchParams({
    serviceKey: PUBLIC_API_SERVICE_KEY,
    resultType: "json",
    numOfRows: "50", // 클래스가 아무리 많아도(보통 15개 안팎) 한 번에 다 담기에 충분한 여유치
    pageNo: "1",
    likeFndNm,
  });

  const res = await fetch(`${PUBLIC_API_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`공공데이터 API HTTP 오류: ${res.status}`);
  const data = await res.json();

  const header = data?.response?.header;
  if (header && header.resultCode !== "00") {
    throw new Error(`공공데이터 API 오류 [${header.resultCode}] ${header.resultMsg}`);
  }

  const rawItems = data?.response?.body?.items?.item;
  if (!rawItems) return [];
  return Array.isArray(rawItems) ? rawItems : [rawItems];
}

// 실제 클래스 코드로 보이는 형태인지 검사. class-rules.js의 CT_VALID_CODE_RE와 동일한 기준을
// 쓰되, 그 파일이 어떤 이유로 아직 로드 전이거나 없어도(로드 순서 방어) 안전하게 동작하도록
// 이 파일 안에도 동일한 정규식을 하나 더 갖고 있는다(중복이지만 이 파일의 독립성을 위함).
const PA_VALID_CLASS_CODE_RE = /^[A-Za-z][A-Za-z0-9]{0,2}(?:-[A-Za-z가-힣0-9][A-Za-z가-힣0-9]{0,5}){0,2}(?:\([가-힣0-9]{1,10}\))?$/;

// fndNm(예: "KB스타 미국 나스닥 100 인덱스 증권 자투자신탁(주식-파생형)(H) C-Pe")에서
// baseName(예: "KB스타 미국 나스닥 100 인덱스 증권 자투자신탁(주식-파생형)(H)") 접두어를 뗀
// 나머지를 클래스 코드로 반환. PDF와 API 양쪽의 공백 표기가 완전히 같지 않을 수 있어서, 공백을
// 다 지운 문자열끼리 비교해 접두어 일치 여부/길이를 구하고, 그 길이만큼만 원본(공백 포함)
// fndNm에서 건너뛰어 꼬리를 얻는다(중간에 공백이 있어도 어긋나지 않도록).
function stripBaseNameToClassCode(fndNm, baseName) {
  if (!fndNm || !baseName) return "";
  const normFnd = fndNm.replace(/\s+/g, "");
  const normBase = baseName.replace(/\s+/g, "");
  if (!normFnd.startsWith(normBase)) return "";

  let normConsumed = 0, rawIdx = 0;
  while (normConsumed < normBase.length && rawIdx < fndNm.length) {
    if (!/\s/.test(fndNm[rawIdx])) normConsumed++;
    rawIdx++;
  }
  return fndNm.slice(rawIdx).trim();
}

// API 레코드 자신의 fndNm에서 마지막 공백 토큰(클래스 코드, 예: "C", "C-Pe")을 떼어내
// "API가 실제로 쓰는 정확한 공백 표기의 원본 펀드명"을 얻는다. (2026-07-22 추가)
// PDF에서 뽑은 baseKrNameRaw를 그대로 likeFndNm에 쓰면, PDF와 API의 공백 표기가 완전히
// 같지 않을 때(실제로 공백 위치가 하나만 달라도 0건 반환되는 걸 확인함) 조용히 실패할 위험이
// 있음. 반대로 이미 확인된 API 레코드 자신의 문자열에서 뽑으면 공백 표기가 API와 100% 일치
// 하므로 이 문제가 원천적으로 없다. 마지막 토큰이 클래스 코드 형식(PA_VALID_CLASS_CODE_RE)이
// 아니면(예: 모펀드 자체 레코드처럼 "...(H)(운용)"으로 끝나 공백 분리가 안 되는 경우) 신뢰할 수
// 없다고 보고 빈 문자열을 반환한다 — 호출부가 이 경우 다른 방법으로 넘어간다.
function deriveBaseNameFromAnchorRecord(fndNm) {
  if (!fndNm) return "";
  const trimmed = fndNm.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) return "";
  const suffix = trimmed.slice(lastSpace + 1).trim();
  if (!PA_VALID_CLASS_CODE_RE.test(suffix)) return "";
  return trimmed.slice(0, lastSpace).trim();
}

// baseName(클래스 코드 붙기 전 원본 펀드명)으로 likeFndNm 검색해서, 클래스 코드별 API 레코드
// 맵({ classCode: apiRecord })을 만들어 반환. 검색 자체가 실패하거나(네트워크 오류 등) 결과가
// 0건이면 빈 객체를 반환 — 호출부(publicApiAutoFill)가 그때 기존 PDF기반 방식으로 대체한다.
async function matchFundNameToApi(baseName) {
  if (!baseName) return {};
  let records;
  try {
    records = await fetchFundInfoByLikeFndNm(baseName);
  } catch (e) {
    console.warn("[공공데이터] likeFndNm 검색 실패:", e.message);
    return {};
  }

  const classCodeMap = {};
  records.forEach(rec => {
    const code = stripBaseNameToClassCode(rec.fndNm, baseName);
    if (code && PA_VALID_CLASS_CODE_RE.test(code) && !classCodeMap[code]) {
      classCodeMap[code] = rec;
    }
  });
  return classCodeMap;
}



// item: matchPdfFundCodesToApi()로 확보한 매칭 레코드 중 대표 1건(설정일이 가장 이른 것).
// 화면에 반영하고 어떤 항목을 채웠는지/건너뛰었는지 알려준다 (콘솔 확인 및 추후 UI 안내용).
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

  // 펀드유형구분 -> #fcType. 2차분류/11차분류 규칙(determineFundType)이 1순위,
  // 규칙이 값을 못 내놓으면(EE=MMF 등) API의 fndTp가 드롭다운 옵션과 정확히 일치할 때만
  // 보조로 채택 (그래도 안 맞으면 기존 PDF기반 로직이 채운 값을 그대로 둔다).
  const typeEl = $("#fcType");
  if (typeEl) {
    const ruleBasedType = item.prdClsfCd ? determineFundType(item.prdClsfCd) : null;
    if (ruleBasedType && FUND_TYPE_KNOWN_OPTIONS.includes(ruleBasedType)) {
      typeEl.value = ruleBasedType;
      typeEl.classList.remove("none-found");
      typeEl.classList.add("auto-filled");
      if (typeof FC_STATE !== "undefined") {
        FC_STATE.fund_type = { value: ruleBasedType, found: true };
      }
      result.applied.push(`펀드유형(2차/11차분류 → ${ruleBasedType})`);
    } else if (item.fndTp && FUND_TYPE_KNOWN_OPTIONS.includes(item.fndTp)) {
      typeEl.value = item.fndTp;
      typeEl.classList.remove("none-found");
      typeEl.classList.add("auto-filled");
      if (typeof FC_STATE !== "undefined") {
        FC_STATE.fund_type = { value: item.fndTp, found: true };
      }
      result.applied.push("펀드유형(fndTp)");
    } else if (item.fndTp) {
      result.skipped.push(`펀드유형: API값 "${item.fndTp}"이 드롭다운 옵션과 불일치 (수동 확인 필요)`);
    }
  }

  // 협회표준코드(#piKofiaFundCode)는 여기서 다루지 않음 — 클래스마다 다른 값이라
  // 대표 레코드 하나로 고정할 수 없음. applyKofiaCodeForCurrentClass()가 "지금 선택된
  // 클래스"에 맞는 값을 srtnCdMap에서 따로 찾아서 넣어준다 (publicApiAutoFill 참고).

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
    const code2 = item.prdClsfCd.slice(1, 3);
    // 62(재간접파생형)는 이제 11차분류를 아예 쓰지 않고(determineFundType에서 곧바로
    // "파생상품"으로 확정) 61(재간접형)만 11차분류에 의존하므로, 이 경고도 61만 대상으로 함.
    if (code2 === "61" && !parseEleventhLevelCategory(item.prdClsfCd)) {
      result.skipped.push(`재간접형 펀드인데 11차분류 코드(${item.prdClsfCd.slice(15, 17)})를 인식하지 못함`);
    }
  }

  return result;
}

// srtnCdMap: matchPdfFundCodesToApi()(보조/폴백)가 만들어둔 { 펀드코드(=srtnCd): API레코드 } 맵.
// classCodeMap: matchFundNameToApi()(기본/1차)가 만들어둔 { 클래스코드(예: "C","C-Pe"): API레코드 } 맵.
// publicApiAutoFill이 조회에 성공할 때마다 여기 채워두고, 클래스 선택이 바뀔 때마다
// (product-name.js의 applyClassCodeSelection / class1~3 change 이벤트에서) 다시 조회함.
const PUBLIC_API_STATE = { srtnCdMap: {}, classCodeMap: {} };

// "지금 선택된 클래스"에 맞는 협회표준코드를 #piKofiaFundCode에 채워 넣음.
// getCurrentClassEntry()(product-name.js)로 현재 1~3차 드롭다운 조합에 해당하는 행을 찾고,
// 1차로 그 코드(entry.code, 예: "C")를 classCodeMap에서 찾고, 거기 없을 때만(이름검색이
// 실패했거나 그 클래스만 이름검색 결과에 없는 경우) fundCode 기준 srtnCdMap으로 대체 조회함.
// - 클래스 선택이 바뀔 때마다 다시 불러야 하므로 window에 노출해서 product-name.js에서 호출함.
// - 이 클래스에 대해 API에서 확인된 값이 없으면 건드리지 않고 그대로 둠
//   (PDF기반 값이 이미 있다면 그걸 유지, 없다면 그냥 미입력 상태 유지).
function applyKofiaCodeForCurrentClass() {
  const kofiaCodeEl = $("#piKofiaFundCode");
  if (!kofiaCodeEl) return false;

  const entry = (typeof getCurrentClassEntry === "function") ? getCurrentClassEntry() : null;
  const rec = entry
    ? (PUBLIC_API_STATE.classCodeMap[entry.code] || (entry.fundCode && PUBLIC_API_STATE.srtnCdMap[entry.fundCode]))
    : null;

  if (rec && rec.asoStdCd) {
    kofiaCodeEl.value = rec.asoStdCd;
    kofiaCodeEl.classList.remove("none-found");
    kofiaCodeEl.classList.add("auto-filled");
    return true;
  }
  // 지금 클래스에 대해 API로 확인된 값이 없음 — 이전 클래스 선택 때 auto-filled로 채워졌던
  // 값이 남아있으면(=지금 클래스엔 안 맞는 값일 수 있음) 강조 표시만 지워서 헷갈리지 않게 함.
  kofiaCodeEl.classList.remove("auto-filled");
  return false;
}

// script.js의 handleFile()에서 클래스표 추출 뒤 호출하는 진입점.
// classTable: getActiveClassTable()의 결과(= PDF에서 직접 뽑은 클래스표. fundCode 포함,
// matchPdfFundCodesToApi 폴백에서만 씀).
// 실패해도(네트워크 오류, 매칭 실패 등) 예외를 던지지 않고 콘솔에만 남긴다 —
// 공공데이터 조회가 실패해도 나머지(PDF기반) 자동채움 흐름은 막히면 안 되므로.
async function publicApiAutoFill(classTable) {
  try {
    // 1) PDF에서 뽑은 펀드코드 후보들로 "앵커" 레코드 하나 확보 시도. 전부 다 맞을 필요는
    // 없음 — 딱 하나만 성공해도, 그 레코드의 fndNm에서 API가 실제로 쓰는 정확한 공백 표기의
    // "원본 펀드명"을 거꾸로 얻어낼 수 있기 때문(아래 2번). 여러 개 성공하면 앵커 후보가
    // 여러 개인 것뿐이고, 그중 첫 번째만 있으면 충분하다.
    const srtnCdMap = await matchPdfFundCodesToApi(classTable || []);
    const anchorRecords = Object.values(srtnCdMap);

    let classCodeMap = {};
    let matchSource = "";

    if (anchorRecords.length > 0) {
      // 2) 앵커 레코드의 fndNm에서 클래스 코드(마지막 공백 토큰)를 떼어 "정확한 원본 펀드명"을
      // 얻음. PDF에서 뽑은 baseKrNameRaw는 공백 표기가 API와 정확히 일치하지 않으면 likeFndNm이
      // 조용히 0건을 반환하는 문제가 실제로 확인됐으므로, API 자기 자신의 문자열을 기준으로 삼는
      // 게 훨씬 안전하다.
      const canonicalBaseName = deriveBaseNameFromAnchorRecord(anchorRecords[0].fndNm);
      if (canonicalBaseName) {
        classCodeMap = await matchFundNameToApi(canonicalBaseName);
        if (Object.keys(classCodeMap).length) {
          matchSource = `이름검색(API 자체 레코드 기준 "${canonicalBaseName}")`;
        }
      }
    }

    // 3) 위가 실패했으면(앵커가 없거나, 앵커의 fndNm에서 클래스 코드를 못 뗐거나, 이름검색
    // 자체가 0건) PDF에서 뽑은 baseKrNameRaw로 한 번 더 시도 (공백이 우연히 일치하면 성공).
    if (Object.keys(classCodeMap).length === 0) {
      const pdfBaseName = (typeof baseKrNameRaw !== "undefined") ? baseKrNameRaw : "";
      classCodeMap = await matchFundNameToApi(pdfBaseName);
      if (Object.keys(classCodeMap).length) {
        matchSource = "이름검색(PDF 추출명 기준)";
      }
    }

    let matchedRecords = Object.values(classCodeMap);

    // 4) 그래도 이름검색이 전부 실패했으면, 최후 수단으로 앵커(펀드코드 직접매칭) 결과만이라도 씀.
    if (matchedRecords.length === 0 && anchorRecords.length > 0) {
      matchedRecords = anchorRecords;
      matchSource = "PDF 펀드코드↔API srtnCd(최종 폴백)";
    }

    if (!matchedRecords.length) {
      console.warn("[공공데이터] 이름검색/펀드코드 매칭 모두 실패 — 미등록으로 간주, PDF기반 값 유지");
      return { applied: [], skipped: ["이름검색/펀드코드 매칭 모두 실패 — API 미등록으로 간주"] };
    }

    PUBLIC_API_STATE.classCodeMap = classCodeMap;
    PUBLIC_API_STATE.srtnCdMap = srtnCdMap;

    // 설정일/펀드유형/상품분류코드처럼 클래스 상관없이 동일한 항목은, 매칭된 것들 중
    // 설정일이 가장 이른 레코드 하나를 대표로 삼아 그대로 쓴다.
    const representative = matchedRecords.reduce((earliest, cur) =>
      (cur.setpDt && (!earliest.setpDt || cur.setpDt < earliest.setpDt)) ? cur : earliest
    );
    const result = applyPublicApiFields(representative);
    result.applied.push(`${matchSource} 매칭 ${matchedRecords.length}건`);

    // 협회표준코드는 대표 레코드가 아니라 "지금 선택된 클래스"에 맞는 값으로 별도 갱신
    if (applyKofiaCodeForCurrentClass()) {
      result.applied.push("협회표준코드(현재 클래스 기준)");
    } else {
      result.skipped.push("협회표준코드: 현재 선택된 클래스에 대응하는 API 레코드 없음");
    }

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

window.fetchFundInfoBySrtnCd = fetchFundInfoBySrtnCd;
window.fetchFundInfoBySrtnCdWithRetry = fetchFundInfoBySrtnCdWithRetry;
window.fetchFundInfoByLikeFndNm = fetchFundInfoByLikeFndNm;
window.matchFundNameToApi = matchFundNameToApi;
window.deriveBaseNameFromAnchorRecord = deriveBaseNameFromAnchorRecord;
window.matchPdfFundCodesToApi = matchPdfFundCodesToApi;
window.applyPublicApiFields = applyPublicApiFields;
window.applyKofiaCodeForCurrentClass = applyKofiaCodeForCurrentClass;
window.publicApiAutoFill = publicApiAutoFill;
