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
  // "결정됩니\n다." 처럼 "~습니다/됩니다/합니다" 등이 PDF에서 줄바꿈으로 "니"와 "다."로 쪼개졌던 경우,
  // 위 공백 정리 과정에서 줄바꿈이 그냥 공백 하나로 바뀌어 "니 다."처럼 어색하게 떨어져 보이게 됨.
  // 원래 한 단어였던 것이므로 다시 붙여줌. ("니"+공백+"다." 조합은 자연스러운 한국어 문장에서 거의
  // 나오지 않으므로 오탐 위험은 낮음)
  s = s.replace(/니\s+다\./g, "니다.");
  s = s.replace(/\s*(?=(?:\d{1,2}\)|①|②|③|④|⑤|⑥|※))/g, "\n").trim();
  // "- 이 투자신탁은 ~~~. - 이 투자신탁은 ~~~." 처럼 이어지는 "- 문장" 글머리 기호(bullet)들을
  // 한 줄에 다 붙여서 보여주면 눈에 잘 안 들어오므로, 문장 중간의 "- " 글머리 기호 앞에서 문단을 나눔.
  // (날짜/숫자 범위 등에 쓰이는 하이픈과 헷갈리지 않도록, 뒤에 한글이 오는 "- "만 글머리 기호로 인식함)
  s = s.replace(/\s-\s+(?=[가-힣])/g, "\n\n- ").trim();
  return s;
}

// 요약정보(맨 앞 [요약정보] 표) 안의 "투자목적 및 투자전략" 행 — 본문 9번 항목(투자전략)보다
// 이걸 우선 사용함(2026-07-22 변경). 본문 쪽은 "①" 소제목이나 "비교지수" 언급이 일찍 나오면
// 문장이 중간에 잘리는 경우가 실제로 있는 반면, 요약정보 표의 이 행은 완결된 한 문단으로
// 깔끔하게 적혀있어서 훨씬 안정적임.
//
// ⚠ 실제 pdf.js 좌표 기반 재구성 결과를 보면, 이 표의 "라벨"(투자목적 및 / 투자전략, 2줄)과
// "본문"(3줄 이상인 문단) 셀이 원본 PDF에서 세로로 나란히 배치되어 있어서, y좌표 기준으로 줄을
// 재구성하면 라벨 줄과 본문 줄이 서로 엇갈려서 끼어든다(예: 본문1줄 → 라벨1줄 → 본문2줄 → 라벨2줄
// → 본문3줄). 그래서 "투자목적 및 투자전략" 뒤에 바로 본문이 이어진다고 가정하면 안 되고, 대신
// [요약정보] 표 전체 구간을 통째로 잡은 뒤 "라벨만 있는 줄"(투자목적/및/투자전략 단독)만 걸러내고
// 나머지 줄을 순서대로 이어붙여야 원래 문단이 복원된다(2026-07-22, KCGI 실제 데이터로 확인).
function findInvestStrategyFromSummaryBox(text) {
  if (!text) return null;
  // ⚠ (2026-07-29 수정) "요약정보" 문구는 문서 안에 여러 번 나올 수 있다: (1) 페이지 상단의
  // 큰 장식용 제목(예: "[요 약 정 보]" — 글자 사이 간격을 둔 헤딩), (2) 본문 최상단 안내문
  // ("이 요약정보는 ~~~ 담고 있습니다."), (3) 실제 "투자목적 및 투자전략" 표 바로 위에 붙는
  // 작은 섹션 라벨(운용사에 따라 "[요약정보]", "■ 요약정보" 등 표기가 다름). 예전 코드는
  // text.match()로 "가장 먼저 나오는" 매칭 하나만 썼는데, 이게 (1)/(2)번에 걸리면 그 사이에
  // 낀 표지 문구까지 결과에 통째로 딸려 들어오는 문제가 있었다(교보악사 파워인덱스 실제
  // 데이터로 확인). → "요약정보" 매칭을 전부 찾은 뒤, 그중 "투자목적" 라벨이 가장 가까이
  // (바로 뒤에) 붙어있는 매칭을 골라서 진짜 표 위치를 앵커로 삼는다.
  // ⚠ (2026-07-29 재수정) 앵커 패턴에 대괄호("[요약정보]")를 필수로 넣었었는데, KB자산운용
  // 문서들은 대괄호 없이 "■ 요약정보"(네모 불릿) 형태를 쓴다. 대괄호가 없다는 이유만으로
  // 앵커를 아예 못 찾아 폴백(본문 9번 항목)으로 새는 문제가 있었음(KB스타 미국 나스닥 100
  // 인덱스 등 실제 데이터로 확인). → 앞에 어떤 기호(■, [, □ 등)가 붙든 상관없이 "요약정보"
  // 라는 글자 자체만 앵커로 찾는다.
  const boxAnchorRe = new RegExp(loosePattern("요약정보"), "g");
  const targetRe = new RegExp(loosePattern("투자목적"));
  let boxMatch = null;
  let bestGap = Infinity;
  let m;
  while ((m = boxAnchorRe.exec(text)) !== null) {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 200);
    const targetMatch = after.match(targetRe);
    if (targetMatch && targetMatch.index < bestGap) {
      bestGap = targetMatch.index;
      boxMatch = m;
    }
    if (m[0].length === 0) boxAnchorRe.lastIndex++; // 빈 매칭 무한루프 방지
  }
  if (!boxMatch) return null;
  let boxStart = boxMatch.index + boxMatch[0].length;
  // "요약정보" 앵커가 원래 "[요약정보]"처럼 대괄호로 감싸져 있던 경우, 여는 대괄호는 앵커 매칭
  // 이전(문서 원문)에 있으므로 상관없지만, 닫는 대괄호 "]"는 매칭 바로 뒤에 그대로 남아 결과
  // 맨 앞에 "]"가 붙어나오는 문제가 있었다(대괄호 요구조건을 없앤 부작용, 2026-07-29 확인).
  // → 앵커 뒤에 곧바로 오는 닫는 괄호류 문자는 건너뛴다.
  while (boxStart < text.length && /[\])】》」』]/.test(text[boxStart])) boxStart++;

  const windowText = text.slice(boxStart, boxStart + 2000);
  // 이 표에 "투자목적" 라벨 자체가 없으면(운용사마다 요약정보 구성이 다를 수 있음) 폴백으로 넘김
  if (!new RegExp(loosePattern("투자목적")).test(windowText)) return null;

  // 종료 지점: 다음 행 라벨("분 류"/"분류" — 거의 모든 투자설명서 요약정보에 있는 표준 행) 직전까지.
  // 못 찾으면 안전하게 윈도우 전체(2000자)로 제한해서 과도한 오검출을 막음.
  const nextRowMatch = windowText.match(new RegExp(loosePattern("분") + "\\s*" + loosePattern("류")));
  let rawSpan = nextRowMatch ? windowText.slice(0, nextRowMatch.index) : windowText;

  // ⚠ (2026-07-29 수정) "분류" 라벨 직전까지만 자르면, 그 사이에 있는 "모투자신탁의 투자목적 및
  // 전략" 뒤에 이어지는 "* 비교지수(Benchmark): ..." 설명과 "[위험관리]" 문단까지 전부 같이
  // 딸려 들어오는 문제가 있었음(모자형 펀드 문서에서 흔함). 원래 규칙(요약정보는 "비교지수"
  // 언급 직전까지만)대로, "비교지수" 또는 "[위험관리]" 헤딩 중 더 먼저 나오는 지점에서 추가로
  // 한 번 더 잘라낸다.
  //
  // ⚠ (2026-07-29 재수정) "비교지수"라는 단어가 나오기만 하면 무조건 섹션 전환으로 보고 잘라내면
  // 안 된다. "...종목선정을 통해 비교지수 대비 초과수익을 추구합니다." 처럼, 투자목적 문장 자체
  // 안에서 "비교지수"라는 단어가 자연스럽게 쓰이는 경우가 실제로 있다(한화글로벌헬스케어 실제
  // 데이터로 확인 — 이 경우 뒤에 이어지는 "비교지수 대비 초과수익을 추구합니다." 부분이 통째로
  // 잘려나가는 문제가 있었음). 반면 정말 별도 섹션(벤치마크 정의문)으로 넘어가는 경우는
  // "비교지수(Benchmark): ..." 처럼 "비교지수" 바로 뒤에 콜론(:)이나 괄호가 따라붙는 형태로만
  // 나타난다. → "비교지수" 뒤에 (공백 제외) 콜론/괄호가 바로 오는 경우만 섹션 전환으로 간주하고,
  // 문장 중간에 자연스럽게 쓰인 경우는 무시한다.
  function findCompareIdxHeading(str) {
    const re = new RegExp(loosePattern("비교지수"), "g");
    let mm;
    while ((mm = re.exec(str)) !== null) {
      const after = str.slice(mm.index + mm[0].length, mm.index + mm[0].length + 6);
      if (/^\s*[:：(（]/.test(after)) return mm.index;
      if (mm[0].length === 0) re.lastIndex++; // 빈 매칭 무한루프 방지
    }
    return -1;
  }
  const compareIdx = findCompareIdxHeading(rawSpan);
  const riskHeadingMatch = rawSpan.match(new RegExp(loosePattern("[위험관리]")));
  const cutCandidates = [];
  if (compareIdx !== -1) cutCandidates.push(compareIdx);
  if (riskHeadingMatch) cutCandidates.push(riskHeadingMatch.index);
  if (cutCandidates.length) {
    let cutAt = Math.min(...cutCandidates);
    // "* 비교지수..." 처럼 글머리 기호(*, ※ 등)가 바로 앞에 붙는 경우가 많아, 그 기호까지
    // 함께 잘라내서 요약문 끝에 외따로 기호만 남는 것을 방지
    const before = rawSpan.slice(Math.max(0, cutAt - 5), cutAt);
    const markerMatch = before.match(/[*※]\s*$/);
    if (markerMatch) cutAt -= markerMatch[0].length;
    rawSpan = rawSpan.slice(0, cutAt);
  }

  // ⚠ (2026-07-29 재수정) PDF 좌표 재구성 특성상 라벨 단어("모투자신탁의"/"투자목적"/"및"/
  // "전략"/"투자전략")가 줄 전체를 혼자 차지하는 게 아니라, 본문 줄의 맨 앞이나 맨 뒤에
  // 섞여 붙는 경우가 많다(예: "모투자신탁의 국내 주식 중 IT...", "...투자목적 및 전략
  // 투자대상으로 하여...", 문장 끝에 남는 "및 전략" 등). 줄 전체가 라벨과 정확히 일치할
  // 때만 버리는 방식으로는 이런 줄들을 걸러내지 못해 라벨 파편이 본문 앞뒤에 그대로
  // 끼어드는 문제가 있었음. 그래서 줄 전체를 보는 대신, 각 줄의 맨 앞/맨 뒤에서부터
  // 라벨 어휘에 정확히 일치하는 "토큰"만 하나씩 벗겨내고 가운데 남은 본문만 사용한다.
  // (참고: "[모투자신탁의 투자목적 및 투자전략]" 같은 대괄호 헤딩은 첫 토큰이 "[모투자신탁의"로
  // 라벨 어휘와 정확히 일치하지 않으므로 그대로 보존된다.)
  const LABEL_TOKENS = new Set(["모투자신탁의", "투자목적", "및", "전략", "투자전략"]);
  function stripLabelEdgeTokens(line) {
    const tokens = line.split(/\s+/).filter(Boolean);
    let start = 0;
    let end = tokens.length;
    while (start < end && LABEL_TOKENS.has(tokens[start])) start++;
    while (end > start && LABEL_TOKENS.has(tokens[end - 1])) end--;
    return tokens.slice(start, end).join(" ");
  }
  const kept = rawSpan.split("\n")
    .map(line => stripLabelEdgeTokens(line))
    .filter(line => line.length > 0);
  if (kept.length === 0) return null;
  const cleaned = cleanFundCharParagraph(kept.join(" "));
  return cleaned || null;
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
  // "(1)투자전략" / "1)투자전략" 표기를 최우선으로 찾음 — 이 표기는 언제나 투자전략만 단독으로 가리키는
  // 소제목이라 안전함. "가.투자전략"도 일부 운용사는 단독 소제목으로 쓰지만, 다른 운용사(예: KB자산운용)는
  // "가. 투자전략 및 위험관리"처럼 하위의 "(1) 투자전략"과 "(2) 위험관리"를 함께 묶는 상위 소제목으로 쓴다.
  // 이 경우 예전 정규식은 "가. 투자전략"까지만 보고 매칭해버려서, 시작 지점이 " 및 위험관리 (1) 투자전략" 앞
  // 이 되어 "및 위험관리"가 요약문 맨 앞에 끼어 붙는 문제가 있었음. 그래서 "가." 매칭은 뒤에 "및"이나 ","가
  // 붙어 다른 항목과 묶여있지 않은 경우에만(즉 진짜 단독 소제목일 때만) 허용하고, (1)/1) 표기가 있으면 항상
  // 그것을 우선 사용함(2026-07-22, KB자산운용 실제 데이터로 확인).
  const numberedRe = new RegExp(
    "(?:\\(\\s*1\\s*\\)|1\\s*\\))\\s*" + loosePattern("투자전략") + "(?![가-힣])"
  );
  const plainGaRe = new RegExp(
    "가\\s*\\.\\s*" + loosePattern("투자전략") + "(?!\\s*[,및])(?![가-힣])"
  );
  const m = text.match(numberedRe) || text.match(plainGaRe);
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
// (다음 대분류 번호소제목, [ ]괄호헤딩, 또는 다음 가./나./다. 소제목 전까지, 최대 3000자)
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

  const windowText = text.slice(start, start + 3000); // 과도한 탐색 방지
  const candidates = [];

  // 다음 대분류 번호 소제목(예: "\n10. 집합투자기구의 투자위험")
  const numberedMatch = windowText.match(/\n\s*\d{1,2}\s*\.\s*[가-힣]/);
  if (numberedMatch) candidates.push(numberedMatch.index);

  // "[...]" 괄호헤딩
  const bracketMatch = windowText.match(/\n\s*\[/);
  if (bracketMatch) candidates.push(bracketMatch.index);

  // 다음 가./나./다. 소제목. 단, 한국어 문장은 거의 전부 "~습니다."처럼 "다."로 끝나기 때문에, PDF에서
  // 줄이 재구성될 때 이 마지막 "다."가 우연히 새 줄의 맨 앞에 오면(예: "결정됩니\n다.") 소제목으로
  // 오인되어 문단이 진짜 끝나기 직전(마지막 "다."가 잘려나간 채)에서 잘리는 문제가 있었음. 그래서
  // "다." 바로 앞 글자가 "니"이면("습니다"/"됩니다"/"합니다" 등이 줄바꿈으로 쪼개진 것) 소제목이 아니라
  // 문장의 자연스러운 끝으로 보고 후보에서 제외함(2026-07-22, 실제 오탐 사례로 확인).
  const letterRe = /\n\s*(가|나|다)\s*\./g;
  let letterMatch;
  while ((letterMatch = letterRe.exec(windowText)) !== null) {
    const before = windowText.slice(Math.max(0, letterMatch.index - 3), letterMatch.index);
    if (letterMatch[1] === "다" && /니\s*$/.test(before)) continue; // "~니다." 오탐 제외
    candidates.push(letterMatch.index);
    break; // 첫 유효 매칭만 종료 지점 후보로 사용
  }

  const end = candidates.length ? Math.min(...candidates) : windowText.length;
  const cleaned = cleanFundCharParagraph(windowText.slice(0, end));
  return cleaned || null;
}

function fundCharAutoExtract() {
  if (!piFundCharFields.summaryInfo || !piFundCharFields.profitLossStructure) return false;
  if (typeof searchableText === "undefined" || !searchableText) return false;
  let didFind = false;

  // ⚠ (2026-07-29 수정) 예전에는 요약정보 표에서 못 찾으면(findInvestStrategyFromSummaryBox가
  // null) 본문 "9. 집합투자기구의 투자전략..." 섹션(findInvestStrategySummary)에서 대신
  // 가져오는 폴백이 있었음. 그런데 이 필드는 항상 "[요약정보]" 표의 "투자목적 및 투자전략" 행
  // 에서만 가져와야 하는 필드라서, 문서에 따라 표에서 가져오기도 하고 본문에서 가져오기도
  // 하면 내용의 출처/형식이 뒤죽박죽 섞여버리는 문제가 있었다(KB스타 미국 S&P500 인덱스 등
  // 실제 사례로 확인). → 본문 폴백을 제거하고, 요약정보 표에서 못 찾으면 빈 칸으로 두어
  // 사용자가 직접 확인하도록 한다(잘못된 다른 섹션 내용이 조용히 채워지는 것보다 안전함).
  const summary = findInvestStrategyFromSummaryBox(searchableText);
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
