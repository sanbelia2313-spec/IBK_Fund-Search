// ============================================================
// class-checker.js — class-rules.js에 등록한 회사별 클래스 코드 규칙이
// 맞게 분류되는지 PDF 없이 바로 확인할 수 있는 검증용 UI.
// class-rules.js보다 뒤에, product-name.js보다 앞에 로드되어야 합니다.
//
// 새 운용사 규칙을 class-rules.js에 추가/수정한 뒤, 화면에서 그 운용사를
// 선택해보면 코드별로 1차/2차/3차가 의도한 대로 나오는지 바로 확인할 수 있습니다.
// ============================================================

// company가 CURRENT_PDF_TABLE_KEY(가상의 "현재 PDF에서 추출" 항목)면 지금 열려있는 PDF 본문에서
// 직접 뽑은 표를, 그 외엔 하드코딩된 회사별 표를 반환함.
function getClassTableForChecker(company) {
  if (company === CURRENT_PDF_TABLE_KEY) {
    const liveText = (typeof searchableText !== "undefined") ? searchableText : "";
    return extractClassTableFromText(liveText);
  }
  return CLASS_CODE_MAP_BY_COMPANY[company] || [];
}

function renderClassCheckTable(company, selectedCode, overrideTable) {
  const table = $("#checkTable");
  // overrideTable이 있으면 그걸 그대로 씀 (예: 드롭박스엔 회사명을 보여주되, 표 내용은 지금
  // PDF에서 뽑은 걸 그대로 쓰고 싶을 때). 없으면 평소대로 company 기준으로 표를 결정함.
  const rules = overrideTable || getClassTableForChecker(company);

  if (rules.length === 0) {
    const emptyMsg = company === CURRENT_PDF_TABLE_KEY
      ? "지금 PDF 본문에서 클래스 표를 자동으로 뽑아내지 못했습니다. 다른 회사를 선택해서 참고표를 확인해보세요."
      : "이 운용사에 등록된 코드가 없습니다.";
    table.innerHTML = `<tbody><tr><td class="check-empty">${escapeHtml(emptyMsg)}</td></tr></tbody>`;
    return;
  }

  const rows = rules.map((r, i) => `
    <tr class="check-row${r.code === selectedCode ? " selected" : ""}" data-idx="${i}">
      <td class="check-code">${escapeHtml(r.code)}</td>
      <td>${escapeHtml(r.tier1)}</td>
      <td>${escapeHtml(r.tier2)}</td>
      <td>${escapeHtml(r.tier3)}</td>
    </tr>
  `).join("");

  table.innerHTML = `
    <thead>
      <tr><th>코드</th><th>1차</th><th>2차</th><th>3차</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  `;

  // 행을 클릭하면 그 코드를 "이 상품의 클래스"로 확정함
  // → 1~3차 드롭다운에 반영 + 한글펀드명 뒤에 코드를 그대로 붙임 (product-name.js의 applyClassCodeSelection)
  table.querySelectorAll(".check-row").forEach(row => {
    row.addEventListener("click", () => {
      const idx = +row.dataset.idx;
      const entry = rules[idx];
      table.querySelectorAll(".check-row").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");
      if (typeof applyClassCodeSelection === "function") applyClassCodeSelection(entry);
    });
  });
}

const checkCompanySelect = $("#checkCompany");
if (checkCompanySelect) {
  const companies = Object.keys(CLASS_CODE_MAP_BY_COMPANY);
  // 맨 위에 "현재 PDF에서 추출" 가상 옵션을 추가 — PDF 업로드 후 선택하면 하드코딩 표 대신
  // 지금 문서에서 직접 뽑은 클래스 표를 바로 보여줌
  checkCompanySelect.innerHTML =
    `<option value="${escapeHtml(CURRENT_PDF_TABLE_KEY)}">현재 PDF에서 추출한 표</option>` +
    companies.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

  checkCompanySelect.addEventListener("change", () => renderClassCheckTable(checkCompanySelect.value));

  // 첫 화면 로딩 시(아직 PDF 업로드 전) "현재 PDF에서 추출" 표를 기본으로 보여줌 (비어있으면 안내문 표시)
  renderClassCheckTable(CURRENT_PDF_TABLE_KEY);
}
