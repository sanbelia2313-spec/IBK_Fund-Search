pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// ---------------------------------------------
// 1. 등록 항목 기본 세트 (필요에 맞게 자유롭게 수정/추가하세요)
// ---------------------------------------------
// valuePattern: 키워드가 발견된 지점부터 이어지는 한 줄(또는 짧은 구간) 안에서
// "실제 값"만 뽑아내기 위한 정규식. 캡처그룹(그룹1)이 최종 값이 됩니다.
// 못 찾으면 키워드 주변 텍스트를 그대로 보여주고 "확인 필요"로 표시합니다.
const DATE_RE   = "(\\d{4}\\s*[.\\-/년]\\s*\\d{1,2}\\s*[.\\-/월]\\s*\\d{1,2}\\s*일?)";
const NAME_RE_KR = "[가-힣A-Za-z0-9()·\\-]{2,25}(?:자산운용|투자신탁운용|자산운용사|은행|증권|투자증권|증권사)";
// 역외(외국) 펀드는 운용사/수탁사 이름이 영문 법인명으로 표기됨 → 흔한 법인 접미사 인식
const NAME_RE_FOREIGN = "[A-Za-zÀ-ÿ0-9.,()&'\\-]{2,20}(?:\\s+[A-Za-zÀ-ÿ0-9.,()&'\\-]{1,20}){0,6}\\s*(?:S\\.?\\s?à\\s?\\s?r\\.?\\s?l\\.?|S\\.?A\\.?|N\\.?V\\.?|GmbH|PLC|Ltd\\.?|LLC|Inc\\.?|Limited|Corporation|Corp\\.?|AG)";
const NAME_RE   = "(" + NAME_RE_KR + "|" + NAME_RE_FOREIGN + ")";

// 이 배열은 이제 "등록 항목" UI 없이, 다른 카드(상품명/상품공통정보)가 필요로 하는
// 최소한의 내부 항목만 담습니다. manager → 운용사 자동 감지(클래스 코드 매칭용),
// risk_grade → 상품공통정보 카드의 "상품위험등급" 자동 채움용.
// (보수율 항목들은 클래스별로 값이 다른 표 형태라 여기 범용 키워드 매칭 대신
//  product-individual-info.js의 표 전용 파서(computeFeeTableValues)에서 처리합니다.)
let items = [
  { key:"manager",      label:"집합투자업자(운용사)",   keywords:expandKeywords(["집합투자업자","외국집합투자업자","자산운용회사"]), valuePattern:NAME_RE, squeeze:false, value:"" },
  // "투자위험등급"이라는 라벨은 문서에 여러 번 등장하지만, 정작 등급 숫자 없이 일반론적으로만
  // 언급되는 곳이 많음(예: "투자위험등급 및 적합한 투자자유형에 대한 기재사항을 참고하고").
  // 그래서 훨씬 덜 애매한 "N등급(...위험...)" 조합 패턴(예: "6등급(매우 낮은 위험)")을
  // leadPattern으로 먼저 시도하고, 못 찾을 때만 기존 키워드 방식으로 넘어감.
  { key:"risk_grade",   label:"투자위험등급",
    leadPattern: "(\\d\\s*" + loosePattern("등급") + ")\\s*\\([^()]{0,20}" + loosePattern("위험") + "[^()]{0,20}\\)",
    keywords:expandKeywords(["투자위험등급","위험등급"]), valuePattern:"(\\d\\s?등급)", squeeze:true, value:"" },
];

// ---------------------------------------------
// 2. 상태
// ---------------------------------------------
let fullText = "";           // 페이지 태그 포함 전체 텍스트 (원문 표시용, 항상 전체) — 투자설명서
let searchableText = "";     // 실제 항목 검색에 쓰는 텍스트 (표지의 2단 레이아웃 뒤섞임 구간 제외됨) — 투자설명서
let searchOffset = 0;        // searchableText가 fullText에서 시작하는 위치 (페이지 번호 계산 보정용)
let summaryEntries = [];     // "1. 라벨 : 값" 형태의 요약 목록 (투자설명서 맨 앞부분에 흔히 있음)
let pageBreaks = [];         // [{charIndex, pageNum}] — 투자설명서

// 신탁계약서(집합투자규약서)용 상태 — "영업일" 정의 조항 등 투자설명서엔 없는 내용을 별도로 파싱
let trustDeedFullText = "";
let trustDeedSearchableText = "";
let trustDeedPageBreaks = [];

let currentMatches = [];     // 현재 검색어의 매치 offset 배열
let currentMatchIdx = -1;
let activeDoc = "prospectus"; // 가운데 원문 뷰어가 지금 보여주는 문서: "prospectus" | "trustDeed"

const textView = $("#textView");
const searchInput = $("#searchInput");
const matchInfo = $("#matchInfo");

// 투자설명서 맨 앞부분엔 흔히 "1. 집합투자기구 명칭 : ~  2. 집합투자업자 명칭 : ~ ..." 처럼
// 번호 붙은 요약 목록이 있음. 이건 300페이지 전체를 헤매는 것보다 훨씬 신뢰도 높은 정답 소스라서
// 별도로 파싱해서 최우선으로 사용함.
function extractSummaryEntries(text, maxChars) {
  const chunk = text.slice(0, maxChars || 8000);
  const entries = [];
  const re = /(\d{1,2})\s*\.\s*([^\n:：]{1,40}?)\s*[:：]\s*([\s\S]*?)(?=\n?\s*\d{1,2}\s*\.\s*[^\n:：]{1,40}?\s*[:：]|$)/g;
  let m;
  while ((m = re.exec(chunk)) !== null) {
    const label = m[2].replace(/\s+/g, "").trim();
    const value = m[3].replace(/\s+/g, " ").trim();
    if (label && value) entries.push({ num: m[1], label, value });
  }
  return entries;
}

// 요약 목록에서 이 항목의 키워드/라벨과 겹치는 항목을 찾음 (공백 무시하고 부분일치)
function findSummaryEntryForItem(item, entries) {
  const candidates = item.keywords.concat([item.label]);
  for (const kw of candidates) {
    const kwCompact = kw.replace(/\s+/g, "");
    const found = entries.find(e => e.label.includes(kwCompact) || kwCompact.includes(e.label));
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------
// 3. PDF 업로드 & 텍스트 추출
// ---------------------------------------------
const dropzone = $("#dropzone");
const fileInput = $("#fileInput");
const dropzoneTrust = $("#dropzoneTrust");
const fileInputTrust = $("#fileInputTrust");

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("drag"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("drag");
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

if (dropzoneTrust && fileInputTrust) {
  dropzoneTrust.addEventListener("click", () => fileInputTrust.click());
  dropzoneTrust.addEventListener("dragover", (e) => { e.preventDefault(); dropzoneTrust.classList.add("drag"); });
  dropzoneTrust.addEventListener("dragleave", () => dropzoneTrust.classList.remove("drag"));
  dropzoneTrust.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzoneTrust.classList.remove("drag");
    if (e.dataTransfer.files.length) handleTrustDeedFile(e.dataTransfer.files[0]);
  });
  fileInputTrust.addEventListener("change", (e) => {
    if (e.target.files.length) handleTrustDeedFile(e.target.files[0]);
  });
}

// PDF 한 개를 열어서 페이지별 텍스트를 y좌표(줄)ㆍx좌표(칸) 순으로 재구성한 전체 텍스트로 반환.
// 투자설명서/신탁계약서 둘 다 이 함수 하나로 처리한다 (진행률 표시 UI만 progressIds로 구분).
async function extractPdfText(file, progressIds, onNumPages) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  if (onNumPages) onNumPages(numPages);

  let textParts = [];
  const pageBreaksLocal = [];
  let runningLength = 0;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // y좌표(줄) 기준으로 그룹핑 후, 같은 줄은 x좌표 순으로 정렬해 이어붙임
    // → "설정일 : 2021.03.15" 같은 라벨-값 구조가 최대한 원문처럼 유지됨
    const lineMap = new Map(); // key: 반올림된 y좌표, value: [{x, str, width}]
    content.items.forEach(it => {
      if (!it.str.trim()) return;
      const y = Math.round(it.transform[5] / 2) * 2; // 2px 단위로 반올림해 같은 줄 묶기
      const x = it.transform[4];
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x, str: it.str, width: it.width || it.str.length * 4 });
    });

    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a); // 위에서 아래로
    const pageText = sortedYs.map(y => {
      const parts = lineMap.get(y).sort((a, b) => a.x - b.x);
      let line = "";
      let prevEnd = null;
      parts.forEach(p => {
        if (prevEnd !== null) {
          const gap = p.x - prevEnd;
          // 원문에서 칸(표 컬럼 등)이 벌어져 있으면 공백 여러 개로 표시
          // → 나중에 "라벨"과 "값"을 공백 뭉치로 구분하는 단서로 사용
          // 간격이 거의 없으면(글자 조각이 서로 붙어있으면, 예: "[" "채권" "]") 공백을 넣지 않음
          // → 안 그러면 "하나초단기채증권투자신탁 [ 채권 ]"처럼 원문에 없던 공백이 생겨버림
          if (gap > 8) line += "    ";
          else if (gap > 1.5) line += " ";
          // else: 공백 없이 그대로 이어붙임
        }
        line += p.str;
        prevEnd = p.x + p.width;
      });
      return line;
    }).join("\n");

    const tag = `\n\n[PAGE ${i}]\n\n`;
    pageBreaksLocal.push({ charIndex: runningLength, pageNum: i });
    textParts.push(tag + pageText);
    runningLength += tag.length + pageText.length;

    if (progressIds) setProgressFor(progressIds, Math.round((i / numPages) * 100), `페이지 ${i} / ${numPages} 읽는 중…`);
    // UI 블로킹 방지
    if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
  }

  return { fullText: textParts.join(""), pageBreaks: pageBreaksLocal, numPages };
}

async function handleFile(file) {
  if (file.type !== "application/pdf") {
    alert("PDF 파일만 업로드할 수 있습니다.");
    return;
  }

  $("#fileMeta").style.display = "block";
  $("#fname").textContent = file.name;
  $("#fsize").textContent = (file.size / 1024 / 1024).toFixed(2) + " MB";

  $("#progressWrap").style.display = "block";
  setProgress(0, "PDF 여는 중…");

  const { fullText: text, pageBreaks: pb } = await extractPdfText(
    file,
    { fillId: "progressFill", labelId: "progressLabel" },
    (numPages) => { $("#statPages").textContent = numPages; }
  );
  fullText = text;
  pageBreaks = pb;
  $("#statChars").textContent = fullText.length.toLocaleString();

  // "이 투자설명서는 ~에 대한 자세한 내용을 담고 있습니다" 안내문구 위치를 찾아서,
  // 그 앞부분(표지의 위험등급 표 + 설명 문단이 2단 레이아웃으로 뒤섞이는 구간)은
  // 항목 검색 대상에서 제외함. 이 문구가 없는 문서면 그냥 전체를 검색 대상으로 둠.
  const introAnchorRe = new RegExp(loosePattern("이") + "\\s*" + loosePattern("투자설명서는"));
  const introMatch = fullText.match(introAnchorRe);
  searchOffset = introMatch ? introMatch.index : 0;
  searchableText = fullText.slice(searchOffset);
  summaryEntries = extractSummaryEntries(searchableText);

  // 운용사(집합투자업자)를 먼저 추출해둬야, 상품명 폼의 클래스 코드 매칭이
  // "전체 회사 통합 검사"가 아니라 해당 운용사 규칙으로 정확하게 이뤄짐
  runSafely(() => {
    const managerItem = items.find(i => i.key === "manager");
    if (managerItem) autoFillItem(managerItem, true);
  }, "운용사 자동추출");
  runSafely(() => autoFillProductName(), "상품명 자동추출");

  setProgress(100, "완료");
  setTimeout(() => { $("#progressWrap").style.display = "none"; }, 800);

  if (activeDoc === "prospectus") renderFullText();

  // PDF 파싱이 끝나면 버튼 클릭 없이 바로 항목(운용사/위험등급) 자동 추출
  // 각 단계를 개별적으로 try/catch로 감싸서, 한 단계(예: 펀드분류 카드)에서 예외가 나도
  // 나머지 단계(상품명, 상품공통정보 등)의 자동 채움은 영향받지 않도록 함.
  runSafely(() => items.forEach(item => autoFillItem(item, true)), "항목(운용사/위험등급) 자동추출");
  runSafely(() => { if (typeof ciAutoExtractDayCounts === "function") ciAutoExtractDayCounts(); }, "매수·환매일수 자동추출");
  runSafely(() => { if (typeof renderCommonInfo === "function") renderCommonInfo(); }, "상품공통정보 렌더링");
  runSafely(() => { if (typeof fcAutoExtract === "function") fcAutoExtract(); }, "펀드분류 자동추출");
  runSafely(() => { if (typeof renderFundClass === "function") renderFundClass(); }, "펀드분류 렌더링");

  // 공공데이터포털(금융위원회_펀드상품기본정보) 조회로 설정일/펀드유형/협회표준코드/
  // 상품분류코드(2차·11차분류) 보강. PDF기반 값이 이미 채워진 뒤 덮어쓰는 순서.
  // 조회가 실패해도(네트워크 오류, 매칭 실패 등) 예외를 던지지 않으므로 이후 단계는 그대로 진행됨.
  if (typeof publicApiAutoFill === "function" && typeof baseKrName !== "undefined" && baseKrName) {
    await publicApiAutoFill(baseKrName);
  }

  runSafely(() => { if (typeof refreshIndividualInfo === "function") refreshIndividualInfo(); }, "상품개별정보 자동계산");
  runSafely(() => { if (typeof fundCharAutoExtract === "function") fundCharAutoExtract(); }, "펀드특징(위험등급변경이력) 자동추출");
}

// 자동추출 단계 하나를 실행하되, 예외가 나도 콘솔에만 남기고 이후 단계는 계속 진행되게 함.
function runSafely(fn, label) {
  try {
    fn();
  } catch (e) {
    console.error(`[자동추출 오류] ${label}:`, e);
  }
}

// 신탁계약서(집합투자규약서) 업로드 처리. 투자설명서와 별도의 텍스트로 보관하며,
// "펀드영업일구분"처럼 신탁계약서에서만 얻을 수 있는 항목을 자동 추출한다.
async function handleTrustDeedFile(file) {
  if (file.type !== "application/pdf") {
    alert("PDF 파일만 업로드할 수 있습니다.");
    return;
  }

  $("#fileMetaTrust").style.display = "block";
  $("#fnameTrust").textContent = file.name;
  $("#fsizeTrust").textContent = (file.size / 1024 / 1024).toFixed(2) + " MB";

  $("#progressWrapTrust").style.display = "block";
  setProgressFor({ fillId: "progressFillTrust", labelId: "progressLabelTrust" }, 0, "PDF 여는 중…");

  const { fullText: text, pageBreaks: pb } = await extractPdfText(
    file,
    { fillId: "progressFillTrust", labelId: "progressLabelTrust" }
  );
  trustDeedFullText = text;
  trustDeedPageBreaks = pb;
  trustDeedSearchableText = trustDeedFullText; // 신탁계약서는 표지 2단 레이아웃 이슈가 없어 전체를 그대로 사용

  setProgressFor({ fillId: "progressFillTrust", labelId: "progressLabelTrust" }, 100, "완료");
  setTimeout(() => { $("#progressWrapTrust").style.display = "none"; }, 800);

  if (activeDoc === "trustDeed") renderFullText();

  // "펀드영업일구분"은 신탁계약서의 "영업일"이라 함은 ~ 정의 조항에서만 판단 가능
  runSafely(() => { if (typeof fcAutoExtractBizDayType === "function") fcAutoExtractBizDayType(); }, "펀드영업일구분 자동추출");
  runSafely(() => { if (typeof renderFundClass === "function") renderFundClass(); }, "펀드분류 렌더링");
}

function setProgress(pct, label) {
  setProgressFor({ fillId: "progressFill", labelId: "progressLabel" }, pct, label);
}

function setProgressFor(ids, pct, label) {
  const fillEl = $("#" + ids.fillId);
  const labelEl = $("#" + ids.labelId);
  if (fillEl) fillEl.style.width = pct + "%";
  if (labelEl) labelEl.textContent = label;
}

function pageOfIndex(idx) {
  let page = 1;
  for (const b of pageBreaks) {
    if (b.charIndex <= idx) page = b.pageNum; else break;
  }
  return page;
}

// ---------------------------------------------
// 4. 원문 렌더링 & 검색
// ---------------------------------------------
// 가운데 뷰어는 activeDoc에 따라 투자설명서/신탁계약서 중 하나의 텍스트를 보여준다.
// (항목 자동추출에 쓰는 fullText/searchableText 등은 이 탭 상태와 무관하게 항상 투자설명서 기준 그대로 유지됨)
function activeDocText() {
  return activeDoc === "trustDeed" ? trustDeedFullText : fullText;
}

function switchDocTab(doc) {
  activeDoc = doc;
  $("#docTabProspectus").classList.toggle("active", doc === "prospectus");
  $("#docTabTrustDeed").classList.toggle("active", doc === "trustDeed");
  const term = searchInput.value.trim();
  if (term) runSearch(term);
  else renderFullText();
}

const docTabProspectusEl = $("#docTabProspectus");
const docTabTrustDeedEl = $("#docTabTrustDeed");
if (docTabProspectusEl) docTabProspectusEl.addEventListener("click", () => switchDocTab("prospectus"));
if (docTabTrustDeedEl) docTabTrustDeedEl.addEventListener("click", () => switchDocTab("trustDeed"));

function renderFullText(highlightTerm) {
  const text = activeDocText();
  if (!text) {
    const label = activeDoc === "trustDeed" ? "신탁계약서" : "투자설명서";
    textView.innerHTML = `<div id="emptyText">${label} PDF를 업로드하면 여기에 전체 텍스트가 표시됩니다.</div>`;
    return;
  }

  let html = escapeHtml(text)
    .replace(/\[PAGE (\d+)\]/g, `<span class="page-tag">PAGE $1</span>`);

  if (highlightTerm) {
    const escaped = highlightTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    html = html.replace(re, (m) => `<mark>${m}</mark>`);
  }

  textView.innerHTML = html;
}

function runSearch(term, jumpToIndex) {
  if (!activeDocText() || !term) {
    matchInfo.textContent = "";
    currentMatches = [];
    currentMatchIdx = -1;
    return;
  }

  renderFullText(term);

  const marks = Array.from(textView.querySelectorAll("mark"));
  currentMatches = marks;

  if (marks.length === 0) {
    matchInfo.innerHTML = `<mark>0</mark>건 일치`;
    currentMatchIdx = -1;
    return;
  }

  currentMatchIdx = jumpToIndex !== undefined ? jumpToIndex : 0;
  goToMatch(currentMatchIdx);
}

function goToMatch(idx) {
  if (!currentMatches.length) return;
  currentMatches.forEach(m => m.classList.remove("active"));
  const wrapped = ((idx % currentMatches.length) + currentMatches.length) % currentMatches.length;
  currentMatchIdx = wrapped;
  const target = currentMatches[wrapped];
  target.classList.add("active");
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  matchInfo.innerHTML = `<mark>${wrapped + 1} / ${currentMatches.length}</mark> 건 일치`;
}

searchInput.addEventListener("input", (e) => runSearch(e.target.value.trim()));
$("#nextMatch").addEventListener("click", () => goToMatch(currentMatchIdx + 1));
$("#prevMatch").addEventListener("click", () => goToMatch(currentMatchIdx - 1));
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") goToMatch(currentMatchIdx + 1);
});

// ---------------------------------------------
// 6. 항목별 [찾기] — 키워드로 첫 후보 위치 이동 + 스니펫 제안
// ---------------------------------------------
// 목차 점선("......"), 페이지 번호만 있는 값, 한 글자짜리 값, 안내/면책 문단 조각 등 "쓰레기 값" 판별
const BOILERPLATE_WORDS = ["감안하여","분류하였","변동성","판단을","유의하","변경될","실적","시장 상황","등급은"];
function isGarbageValue(v) {
  if (!v) return true;
  const stripped = v.replace(/[.\s·…]/g, "");
  if (stripped.length === 0) return true;          // 점선/공백만 있는 경우 (목차 줄)
  if (/^\d{1,3}$/.test(stripped)) return true;      // 숫자 1~3자리만 있는 경우 (목차 페이지번호)
  if (stripped.length < 2) return true;             // 조사 한 글자 등("는", "가")
  if (BOILERPLATE_WORDS.some(w => v.includes(w))) return true; // 설명/면책 문단 조각으로 보이는 경우
  return false;
}

function findSnippetForItem(item) {
  if (!searchableText) return null;

  // leadPattern이 있는 항목은 "표준 안내문구" 등 전용 패턴을 최우선으로 시도
  // (여러 키워드 등장 위치를 헤매지 않고, 훨씬 신뢰도 높은 값을 바로 확정)
  if (item.leadPattern) {
    const leadRe = new RegExp(item.leadPattern);
    const leadMatch = searchableText.match(leadRe);
    if (leadMatch) {
      return {
        keyword: "(안내문구 패턴)",
        value: item.squeeze
          ? leadMatch[1].replace(/\s+/g, "").trim()
          : leadMatch[1].replace(/\s+/g, " ").trim(),
        page: pageOfIndex(leadMatch.index + searchOffset),
        confident: true,
      };
    }
    // 안내문구가 없는 문서면 그냥 아래 일반 키워드 매칭으로 계속 진행
  }

  // 요약 목록(번호 붙은 "라벨 : 값" 목록)에서 먼저 찾아봄
  // → 300페이지 전체를 헤매다 엉뚱한 곳에서 잘못 확정해버리는 걸 방지
  if (summaryEntries.length) {
    const entry = findSummaryEntryForItem(item, summaryEntries);
    if (entry) {
      if (item.valuePattern) {
        const re = new RegExp(item.valuePattern);
        const m = entry.value.match(re);
        if (m) {
          const cleaned = item.squeeze
            ? m[1].replace(/\s+/g, "").trim()
            : m[1].replace(/\s+/g, " ").trim();
          return { keyword: `(요약 목록 ${entry.num}번)`, value: cleaned, page: pageOfIndex(searchOffset), confident: true };
        }
        // 패턴엔 안 맞지만, 그래도 요약 목록에서 찾은 값이니 전체 문서 스캔보다는 신뢰도 높음
      }
      // 서술형이거나 패턴이 안 맞은 경우: 문장 앞부분만 정리해서 사용
      let cleanedVal = entry.value;
      const stopMatch = cleanedVal.match(/^(.{1,50}?)[.。](?:\s|$)/);
      if (stopMatch) cleanedVal = stopMatch[1];
      if (cleanedVal.length > 60) cleanedVal = cleanedVal.slice(0, 60) + "…";
      return { keyword: `(요약 목록 ${entry.num}번)`, value: cleanedVal, page: pageOfIndex(searchOffset), confident: false };
    }
  }

  const fallbacks = []; // 끝까지 못 찾았을 때 쓸 후보들 (신뢰도 낮음) — 다 모아서 가장 깨끗한 걸 고름

  for (const kw of item.keywords) {
    const matches = findAllMatches(searchableText, kw);

    for (const { index: idx, length: matchLen } of matches) {
      const page = pageOfIndex(idx + searchOffset);
      let lineEnd = searchableText.indexOf("\n", idx);
      if (lineEnd === -1) lineEnd = searchableText.length;
      let nextLineEnd = searchableText.indexOf("\n", lineEnd + 1);
      if (nextLineEnd === -1) nextLineEnd = searchableText.length;

      const sameLineAfter = searchableText.slice(idx + matchLen, lineEnd);
      const nextLine = searchableText.slice(lineEnd + 1, nextLineEnd);

      if (item.valuePattern) {
        const re = new RegExp(item.valuePattern);
        const m = sameLineAfter.match(re) || nextLine.match(re);
        if (m) {
          // 형식(날짜/%/금액/등급/회사명)에 딱 맞는 값을 찾음 → 바로 확정, 더 이상 안 찾음
          const cleaned = item.squeeze
            ? m[1].replace(/\s+/g, "").trim()   // 날짜/%/금액/등급: 공백 다 제거
            : m[1].replace(/\s+/g, " ").trim(); // 회사명(영문 포함): 단어 사이 공백은 유지
          return { keyword: kw, value: cleaned, page, confident: true };
        }
        // 이번 등장 위치는 패턴이 안 맞음 → 후보로 저장해두고 다음 등장 위치로 계속 탐색
        const raw = shortValueAfterKeyword(sameLineAfter, nextLine);
        if (!isGarbageValue(raw)) fallbacks.push({ keyword: kw, value: raw, page, confident: false });
        continue;
      }

      // 패턴이 없는 서술형 항목: 쓰레기 값이 아닌 후보를 전부 모아둠 (나중에 가장 깨끗한 것 선택)
      const val = shortValueAfterKeyword(sameLineAfter, nextLine);
      if (!isGarbageValue(val)) {
        fallbacks.push({ keyword: kw, value: val, page, confident: false });
      }
    }

    // 이 키워드에서 이미 괜찮은 후보를 찾았으면, 굳이 다음 키워드(더 일반적인 표현)까지는 안 감
    if (fallbacks.length > 0) break;
  }

  if (fallbacks.length === 0) return null;
  // 후보 중 가장 짧고 깨끗한 값을 채택 (문장 조각일수록 길고 지저분한 경향이 있음)
  fallbacks.sort((a, b) => a.value.length - b.value.length);
  return fallbacks[0];
}

// 키워드 뒤에 오는 텍스트에서, 여러 칸 공백(표 컬럼 경계) 또는 문장부호를 기준으로
// 짧은 "값" 부분만 잘라낸다. 절대 긴 문장을 통째로 반환하지 않음.
function shortValueAfterKeyword(sameLineAfter, nextLine) {
  let text = sameLineAfter.replace(/^[\s:：\-–]+/, ""); // 콜론/공백 제거

  // 표처럼 공백이 여러 칸 벌어진 경우 → 첫 컬럼(값)만 사용
  let candidate = text.split(/\s{2,}/)[0].trim();

  // 같은 줄에 값이 없으면(라벨만 있고 값은 다음 줄) 다음 줄 첫 컬럼 사용
  if (!candidate) {
    candidate = nextLine.trim().split(/\s{2,}/)[0].trim();
  }

  // 문장형으로 길게 붙은 경우 마침표/쉼표 앞까지만 사용
  const stopMatch = candidate.match(/^(.{1,40}?)[.。](?:\s|$)/);
  if (stopMatch) candidate = stopMatch[1];

  // 그래도 너무 길면(문장 추출 실패) 40자에서 자르고 "..." 표시 → 사람이 확인하도록 유도
  if (candidate.length > 40) candidate = candidate.slice(0, 40) + "…";

  return candidate.trim();
}

function autoFillItem(item, silent) {
  const found = findSnippetForItem(item);
  if (found) {
    item.value = found.value;
    item.confident = found.confident;
    item.found = true;
    if (!silent) {
      searchInput.value = found.keyword;
      runSearch(found.keyword);
    }
  } else {
    item.found = false;
    item.confident = false;
    if (!silent) {
      alert(`"${item.label}"에 해당하는 키워드를 본문에서 찾지 못했습니다. 키워드를 조정하거나 직접 검색해보세요.`);
    }
  }
  return !!found;
}

// ---------------------------------------------
// 7. (등록 항목 UI는 제거됨 — manager/risk_grade는 PDF 업로드 시 자동으로만 채워짐)
// ---------------------------------------------
