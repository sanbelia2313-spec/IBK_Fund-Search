// ============================================================
// utils.js — 여러 파일에서 공통으로 쓰는 유틸 함수
// 반드시 다른 파일(class-rules.js, product-name.js, script.js)보다 먼저 로드되어야 합니다.
// ============================================================

const $ = (sel) => document.querySelector(sel);

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// "~의 명칭" 처럼 조사 "의"가 붙은 키워드는 "~ 명칭"(조사 없는 버전)도 자동으로 함께 검색 대상에 추가
// → 문서마다 "의" 유무 표현이 달라서 아예 매칭 자체가 안 되는 문제를 줄여줌
function expandKeywords(kws) {
  const set = new Set();
  kws.forEach(k => {
    set.add(k);
    if (k.includes("의 ")) set.add(k.replace(/의 /g, " "));
  });
  return Array.from(set);
}

// PDF에서 추출한 텍스트는 글자 사이에 예상치 못한 공백/줄바꿈이 섞여 나올 수 있음
// (열/줄 재구성 로직의 한계, 또는 PDF 자체의 글자 배치 방식 때문)
// → 문자열을 그대로 찾는 대신, 글자 사이사이에 공백이 있어도 찾아낼 수 있는 "느슨한" 정규식으로 변환
function loosePattern(str) {
  return str.split("").map(ch => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*");
}

// 키워드가 텍스트 내 몇 번 등장하든 전부 찾아서 위치+매칭길이를 배열로 반환 (최대 60개까지만, 성능 보호)
// 느슨한 매칭(loosePattern) 사용 → 글자 사이 공백/줄바꿈이 있어도 찾아냄
function findAllMatches(text, kw) {
  const re = new RegExp(loosePattern(kw), "g");
  const results = [];
  let m;
  while ((m = re.exec(text)) !== null && results.length < 60) {
    results.push({ index: m.index, length: m[0].length });
    if (m[0].length === 0) re.lastIndex++; // 빈 매칭 무한루프 방지
  }
  return results;
}
