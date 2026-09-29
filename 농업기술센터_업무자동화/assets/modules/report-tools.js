/**
 * 농업기술센터 로컬 업무자동화 포털 - 보고서 및 데이터 처리 도구 (메뉴 21~25)
 * 21. 보고서용 표 생성 (공문서/한글HWP 즉시 붙여넣기 표, 합계행, 천단위 콤마)
 * 22. 체크리스트 생성 (시범사업 심사, 현장점검, localStorage 저장)
 * 23. 데이터 비교 (이전 CSV vs 신규 CSV 비교, 추가/삭제/변경 식별)
 * 24. 데이터 필터링 (복합 조건식 AND 필터)
 * 25. 데이터 정렬 (다중 컬럼 오름/내림차순 정렬)
 */

window.PortalModules = window.PortalModules || {};

/* ==========================================================================
   21. 보고서용 표 생성
   ========================================================================== */
PortalModules['report-table'] = {
  id: 'report-table',
  title: '보고서용 표 생성',
  subtitle: '한글(HWP) 및 기안문에 그대로 붙여넣을 수 있는 공공기관 서식의 표(합계행, 천단위 콤마)를 생성합니다.',
  category: '보고서·데이터 가공',

  state: { raw: null, tableHtml: '' },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📑 공문서·보고서용 정갈한 표 자동 생성</h3>
            <p>CSV 데이터를 공공기관 문서 규격에 맞는 깔끔한 표로 변환하여 '한글(HWP)'이나 메일에 즉시 붙여넣을 수 있습니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">📋</div>
            <div class="drop-zone-title">표로 변환할 CSV 파일을 선택하세요</div>
            <input type="file" id="rpt-file-input" accept=".csv,.txt" />
          </div>

          <div id="rpt-config-area" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">표 제목</label>
                <input type="text" class="form-control" id="rpt-title" value="〈 관내 주요 작목별 현황 및 사업비 집계표 〉">
              </div>
              <div class="form-group">
                <label class="form-label">단위 표기</label>
                <input type="text" class="form-control" id="rpt-unit" value="(단위: 천원, ㎡, 호)">
              </div>
              <div class="form-group">
                <label class="form-label">합계 행 자동 추가</label>
                <div style="margin-top: 10px;">
                  <label class="form-check">
                    <input type="checkbox" id="rpt-add-total" checked>
                    <span>표 하단에 '합계(계)' 행 자동 계산 추가</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-copy-table-clip">
                <span>📋</span> 표 클립보드 복사 (한글/워드에 바로 붙여넣기)
              </button>
              <button class="btn btn-success" id="btn-download-table-html">
                <span>💾</span> HTML 표 파일 다운로드
              </button>
            </div>
          </div>

          <div id="rpt-preview-area" style="margin-top: 28px; display: none;">
            <div id="rpt-table-output" style="background: #ffffff; padding: 24px; border: 1px solid var(--border); border-radius: var(--radius-sm); color: #000;"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#rpt-file-input');
    const configArea = container.querySelector('#rpt-config-area');
    const previewArea = container.querySelector('#rpt-preview-area');
    const outputEl = container.querySelector('#rpt-table-output');
    const copyBtn = container.querySelector('#btn-copy-table-clip');
    const downloadBtn = container.querySelector('#btn-download-table-html');

    const generateTableHtml = () => {
      if (!this.state.raw) return;

      const title = container.querySelector('#rpt-title').value.trim();
      const unit = container.querySelector('#rpt-unit').value.trim();
      const addTotal = container.querySelector('#rpt-add-total').checked;

      const headers = this.state.raw.headers;
      const rows = this.state.raw.rows;

      // 숫자 컬럼 감지
      const colSums = new Array(headers.length).fill(0);
      const isNumCol = new Array(headers.length).fill(true);

      rows.forEach(r => {
        r.forEach((cell, ci) => {
          const num = CoreUtils.parseNumber(cell);
          if (isNaN(num) || cell.trim() === '') {
            if (cell.trim() !== '') isNumCol[ci] = false;
          } else {
            colSums[ci] += num;
          }
        });
      });

      let html = `
        <div style="font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; max-width: 100%; margin: 0 auto; color: #111;">
          <div style="text-align: center; font-size: 15pt; font-weight: bold; margin-bottom: 8px;">${CoreUtils.escapeHtml(title)}</div>
          <div style="text-align: right; font-size: 10pt; color: #555; margin-bottom: 8px;">${CoreUtils.escapeHtml(unit)}</div>
          <table style="width: 100%; border-collapse: collapse; border-top: 2px solid #000; border-bottom: 2px solid #000; font-size: 10.5pt; text-align: center;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #000; height: 36px;">
                <th style="border: 1px solid #ccc; width: 45px;">연번</th>
                ${headers.map(h => `<th style="border: 1px solid #ccc; padding: 6px 10px;">${CoreUtils.escapeHtml(h)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, i) => `
                <tr style="border-bottom: 1px solid #ddd; height: 32px;">
                  <td style="border: 1px solid #eee; color: #666;">${i + 1}</td>
                  ${r.map((c, ci) => {
                    const isNum = isNumCol[ci];
                    const formatted = isNum && c ? CoreUtils.formatNumber(c) : c;
                    return `<td style="border: 1px solid #eee; padding: 6px 10px; text-align: ${isNum ? 'right' : 'center'};">${CoreUtils.escapeHtml(formatted)}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
              ${addTotal ? `
                <tr style="background-color: #f8fafc; font-weight: bold; border-top: 1.5px solid #000; height: 36px;">
                  <td colspan="2" style="border: 1px solid #ccc; text-align: center; background-color: #e2e8f0;">합 계 (계)</td>
                  ${headers.slice(1).map((_, idx) => {
                    const ci = idx + 1;
                    return `<td style="border: 1px solid #ccc; padding: 6px 10px; text-align: ${isNumCol[ci] ? 'right' : 'center'}; color: #1e3a8a;">
                      ${isNumCol[ci] ? CoreUtils.formatNumber(colSums[ci]) : '-'}
                    </td>`;
                  }).join('')}
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      `;

      this.state.tableHtml = html;
      outputEl.innerHTML = html;
    };

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        configArea.style.display = 'block';
        previewArea.style.display = 'block';
        generateTableHtml();
        CoreUtils.showToast('보고서용 표가 생성되었습니다.', 'success');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    ['#rpt-title', '#rpt-unit', '#rpt-add-total'].forEach(sel => {
      container.querySelector(sel).addEventListener('input', generateTableHtml);
    });

    copyBtn.addEventListener('click', async () => {
      if (!this.state.tableHtml) return;
      try {
        const blobHtml = new Blob([this.state.tableHtml], { type: 'text/html' });
        const blobText = new Blob([outputEl.innerText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText
          })
        ]);
        CoreUtils.showToast('표 서식이 클립보드에 복사되었습니다! 한글이나 워드에서 Ctrl+V 하세요.', 'success');
      } catch (err) {
        // 폴백
        navigator.clipboard.writeText(outputEl.innerText);
        CoreUtils.showToast('텍스트 표가 복사되었습니다.', 'info');
      }
    });

    downloadBtn.addEventListener('click', () => {
      if (!this.state.tableHtml) return;
      const fullDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>보고서 표</title></head><body style="padding: 20px;">${this.state.tableHtml}</body></html>`;
      CoreUtils.downloadFile(fullDoc, '보고서용_표_서식.html', 'text/html;charset=utf-8;');
      CoreUtils.showToast('HTML 표 파일이 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   22. 체크리스트 생성
   ========================================================================== */
PortalModules['checklist'] = {
  id: 'checklist',
  title: '체크리스트 생성',
  subtitle: '시범사업 신청서 심사, 영농철 현장점검, 교육 준비 항목을 체크하고 브라우저에 안전하게 보관합니다.',
  category: '보고서·데이터 가공',

  state: {
    templates: {
      'project': [
        '신청서 및 개인정보 수집·이용 동의서 제출 여부',
        '주민등록등본 및 관내 실제 거주 확인',
        '농업경영체 등록 확인서 (경영체 등록 유효성)',
        '사업계획서 작성의 구체성 및 타당성',
        '자부담금 확보 가능 여부 (자부담 확약서)',
        '최근 3년 이내 유사 시범사업 수혜 여부 (중복지원 방지)',
        '청년농업인 또는 여성농업인 가점 대상 확인'
      ],
      'survey': [
        '현장 사진 촬영 (사업 전/후 비교 증빙)',
        '시설 규격 및 시공 상태 도면 일치 여부',
        '주요 자재 검수 및 납품서 확인',
        '농가 면담 및 애로사항 청취',
        '안전 수칙 준수 및 보호구 착용 안내'
      ],
      'education': [
        '강의장 대관 및 냉난방 상태 사전 점검',
        '빔프로젝터, 마이크, 음향 장비 테스트',
        '교재 및 교육용 필기구 비치',
        '출석부 및 명찰 인쇄 배치',
        '참석자 안내 문자 발송 완료',
        '다과 및 음료 준비'
      ]
    }
  },

  render(container) {
    const savedChecks = JSON.parse(localStorage.getItem('portal_checklist_data') || '{}');

    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>✅ 공무원 업무별 사전점검 체크리스트</h3>
            <p>시범사업 신청서 검토, 영농 현장점검, 농업인 교육 준비 등 누락 없는 행정 처리를 돕습니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">업무 템플릿 선택</label>
              <select class="form-select" id="chk-template-sel">
                <option value="project" selected>1. 시범사업 신청서류 사전 검토</option>
                <option value="survey">2. 영농 현장지도 및 시설점검</option>
                <option value="education">3. 새해농업인실용교육 준비</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">점검 대상자 / 사업명</label>
              <input type="text" class="form-control" id="chk-target-name" placeholder="예: 2026년 시설채소 스마트팜 시범사업 (홍길동 농가)">
            </div>
          </div>

          <div style="margin-top: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <label class="form-label" style="font-size: 15px; margin-bottom: 0;">점검 항목 목록</label>
              <button class="btn btn-sm btn-outline" id="btn-add-chk-item">+ 항목 직접 추가</button>
            </div>
            <div id="chk-items-list" style="background: var(--bg-main); padding: 18px; border-radius: var(--radius-sm); border: 1px solid var(--border);"></div>
          </div>

          <div class="btn-group">
            <button class="btn btn-primary" id="btn-save-checklist">
              <span>💾</span> 점검 결과 저장 (PC 내부 보관)
            </button>
            <button class="btn btn-secondary" id="btn-print-checklist">
              <span>🖨️</span> 체크리스트 인쇄 / PDF 출력
            </button>
            <button class="btn btn-outline" id="btn-reset-checklist">전체 체크 해제</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const tplSel = container.querySelector('#chk-template-sel');
    const targetInput = container.querySelector('#chk-target-name');
    const itemsList = container.querySelector('#chk-items-list');
    const addBtn = container.querySelector('#btn-add-chk-item');
    const saveBtn = container.querySelector('#btn-save-checklist');
    const printBtn = container.querySelector('#btn-print-checklist');
    const resetBtn = container.querySelector('#btn-reset-checklist');

    const renderItems = () => {
      const tplKey = tplSel.value;
      const items = this.state.templates[tplKey] || [];
      const saved = JSON.parse(localStorage.getItem(`portal_chk_${tplKey}`) || '[]');

      itemsList.innerHTML = items.map((item, idx) => {
        const isChecked = saved.includes(idx) ? 'checked' : '';
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <label class="form-check" style="flex: 1;">
              <input type="checkbox" class="chk-box" data-idx="${idx}" ${isChecked}>
              <span style="font-size: 14.5px;">${CoreUtils.escapeHtml(item)}</span>
            </label>
          </div>
        `;
      }).join('');
    };

    renderItems();

    tplSel.addEventListener('change', renderItems);

    addBtn.addEventListener('click', () => {
      const text = prompt('추가할 점검 항목을 입력하세요:');
      if (text && text.trim()) {
        const tplKey = tplSel.value;
        this.state.templates[tplKey].push(text.trim());
        renderItems();
      }
    });

    saveBtn.addEventListener('click', () => {
      const tplKey = tplSel.value;
      const checkedBoxes = Array.from(container.querySelectorAll('.chk-box:checked')).map(el => parseInt(el.getAttribute('data-idx'), 10));
      localStorage.setItem(`portal_chk_${tplKey}`, JSON.stringify(checkedBoxes));
      CoreUtils.showToast('체크리스트 상태가 브라우저 내부에 저장되었습니다.', 'success');
    });

    resetBtn.addEventListener('click', () => {
      container.querySelectorAll('.chk-box').forEach(cb => cb.checked = false);
      const tplKey = tplSel.value;
      localStorage.removeItem(`portal_chk_${tplKey}`);
      CoreUtils.showToast('체크 항목이 초기화되었습니다.', 'info');
    });

    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
};

/* ==========================================================================
   23. 데이터 비교 (Diff)
   ========================================================================== */
PortalModules['data-compare'] = {
  id: 'data-compare',
  title: '데이터 비교',
  subtitle: '두 개의 CSV 파일을 비교하여 신규 추가, 삭제, 변경, 동일 행을 정밀 추적합니다.',
  category: '보고서·데이터 가공',

  state: { fileA: null, fileB: null, diffRows: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>⚖️ 두 CSV 데이터 차이점(Diff) 비교</h3>
            <p>작년 명단 vs 올해 명단, 또는 수정 전후 CSV를 비교하여 신규자, 탈락자, 변경 정보를 찾아냅니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            <div class="drop-zone">
              <div class="drop-zone-icon">📄</div>
              <div class="drop-zone-title">기준 원본 파일 (이전 파일)</div>
              <input type="file" id="diff-file-a" accept=".csv,.txt" />
              <div id="diff-label-a" style="margin-top: 8px; font-weight: bold; color: var(--primary);"></div>
            </div>
            <div class="drop-zone">
              <div class="drop-zone-icon">📄</div>
              <div class="drop-zone-title">비교 대상 파일 (신규 파일)</div>
              <input type="file" id="diff-file-b" accept=".csv,.txt" />
              <div id="diff-label-b" style="margin-top: 8px; font-weight: bold; color: var(--secondary);"></div>
            </div>
          </div>

          <div id="diff-config-area" style="margin-top: 24px; display: none;">
            <div class="form-group" style="max-width: 320px;">
              <label class="form-label">비교 기준 고유 컬럼 (예: 성명, 전화번호, 농가번호)</label>
              <select class="form-select" id="diff-col-key"></select>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-diff">
                <span>🔍</span> 데이터 비교 대조 실행
              </button>
            </div>
          </div>

          <div id="diff-result-area" style="margin-top: 28px; display: none;">
            <div class="stats-grid" id="diff-stats-grid"></div>

            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>비교 분석 결과 목록</h3>
                <p>녹색: 신규 추가됨 | 빨간색: 삭제됨 | 노란색: 내용 변경됨 | 회색: 동일함</p>
              </div>
              <button class="btn btn-success" id="btn-download-diff-csv">
                <span>💾</span> 비교 결과 리포트 CSV 다운로드
              </button>
            </div>
            <div id="diff-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileAInput = container.querySelector('#diff-file-a');
    const fileBInput = container.querySelector('#diff-file-b');
    const labelA = container.querySelector('#diff-label-a');
    const labelB = container.querySelector('#diff-label-b');
    const configArea = container.querySelector('#diff-config-area');
    const keySel = container.querySelector('#diff-col-key');
    const runBtn = container.querySelector('#btn-run-diff');
    const resultArea = container.querySelector('#diff-result-area');
    const statsGrid = container.querySelector('#diff-stats-grid');
    const tableContainer = container.querySelector('#diff-table-container');

    const checkReady = () => {
      if (this.state.fileA && this.state.fileB) {
        const commonHeaders = this.state.fileA.headers.filter(h => this.state.fileB.headers.includes(h));
        keySel.innerHTML = commonHeaders.map(h => `<option value="${CoreUtils.escapeHtml(h)}">${CoreUtils.escapeHtml(h)}</option>`).join('');
        configArea.style.display = 'block';
      }
    };

    fileAInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const { text } = await CoreUtils.readFileAsText(file);
      this.state.fileA = CoreUtils.parseCSV(text);
      labelA.textContent = `기준: ${file.name} (${this.state.fileA.totalRows}행)`;
      checkReady();
    });

    fileBInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const { text } = await CoreUtils.readFileAsText(file);
      this.state.fileB = CoreUtils.parseCSV(text);
      labelB.textContent = `비교: ${file.name} (${this.state.fileB.totalRows}행)`;
      checkReady();
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.fileA || !this.state.fileB) return;

      const keyCol = keySel.value;
      const idxA = this.state.fileA.headers.indexOf(keyCol);
      const idxB = this.state.fileB.headers.indexOf(keyCol);

      const mapA = new Map();
      this.state.fileA.rows.forEach(r => {
        const k = (r[idxA] || '').trim();
        if (k) mapA.set(k, r);
      });

      const mapB = new Map();
      this.state.fileB.rows.forEach(r => {
        const k = (r[idxB] || '').trim();
        if (k) mapB.set(k, r);
      });

      let addedCount = 0;
      let removedCount = 0;
      let changedCount = 0;
      let sameCount = 0;

      const diffList = [];

      // 신규 및 변경/동일 검사
      mapB.forEach((rowB, key) => {
        if (!mapA.has(key)) {
          addedCount++;
          diffList.push({ status: '신규추가', class: 'row-missing', row: [key, '신규추가', ...rowB] });
        } else {
          const rowA = mapA.get(key);
          const isSame = rowA.join('|||') === rowB.join('|||');
          if (isSame) {
            sameCount++;
            diffList.push({ status: '동일', class: '', row: [key, '동일', ...rowB] });
          } else {
            changedCount++;
            diffList.push({ status: '변경됨', class: 'row-duplicate', row: [key, '변경됨', ...rowB] });
          }
        }
      });

      // 삭제 검사
      mapA.forEach((rowA, key) => {
        if (!mapB.has(key)) {
          removedCount++;
          diffList.push({ status: '삭제됨', class: 'row-invalid', row: [key, '삭제됨', ...rowA] });
        }
      });

      this.state.diffRows = diffList;

      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">신규 추가</div>
          <div class="stat-value" style="color: var(--success);">${addedCount}<span class="stat-unit">건</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">삭제/탈락</div>
          <div class="stat-value" style="color: var(--danger);">${removedCount}<span class="stat-unit">건</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">내용 변경</div>
          <div class="stat-value" style="color: var(--warning);">${changedCount}<span class="stat-unit">건</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">변동 없음</div>
          <div class="stat-value">${sameCount}<span class="stat-unit">건</span></div>
        </div>
      `;

      const headers = ['비교기준값', '변동구분', ...this.state.fileB.headers];
      const previewRows = diffList.slice(0, 100);

      tableContainer.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px;">No</th>
                ${headers.map(h => `<th>${CoreUtils.escapeHtml(h)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${previewRows.map((item, idx) => `
                <tr class="${item.class}">
                  <td class="text-center text-muted">${idx + 1}</td>
                  ${item.row.map(c => `<td>${CoreUtils.escapeHtml(c)}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      resultArea.style.display = 'block';
      CoreUtils.showToast('데이터 비교가 완료되었습니다.', 'success');
    });

    container.querySelector('#btn-download-diff-csv').addEventListener('click', () => {
      if (!this.state.diffRows.length) return;
      const headers = ['비교기준값', '변동구분', ...this.state.fileB.headers];
      const rows = this.state.diffRows.map(d => d.row);
      CoreUtils.downloadFile(CoreUtils.toCSV(headers, rows), '데이터비교_대조결과.csv');
      CoreUtils.showToast('비교 리포트 CSV가 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   24. 데이터 필터링
   ========================================================================== */
PortalModules['data-filter'] = {
  id: 'data-filter',
  title: '데이터 필터링',
  subtitle: '복수 조건식(AND)을 결합하여 원하는 농가나 사업 데이터만 정밀 추출합니다.',
  category: '보고서·데이터 가공',

  state: { raw: null, filteredRows: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🎯 복합 조건 데이터 필터링</h3>
            <p>'읍면 = ○○면 AND 재배면적 >= 1ha AND 작목 = 사과' 처럼 원하는 조건의 데이터만 추출합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">🔍</div>
            <div class="drop-zone-title">필터링할 CSV 파일을 선택하세요</div>
            <input type="file" id="filter-file-input" accept=".csv,.txt" />
          </div>

          <div id="filter-config-area" style="margin-top: 24px; display: none;">
            <div style="background: var(--bg-main); padding: 18px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <div style="font-weight: 700; margin-bottom: 12px;">조건 1 (필수)</div>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">컬럼</label>
                  <select class="form-select" id="filter-col-1"></select>
                </div>
                <div class="form-group">
                  <label class="form-label">조건</label>
                  <select class="form-select" id="filter-op-1">
                    <option value="contains" selected>포함함 (일부 일치)</option>
                    <option value="equals">정확히 일치 (=)</option>
                    <option value="gte">이상 (&gt;=)</option>
                    <option value="lte">이하 (&lt;=)</option>
                    <option value="not_empty">비어있지 않음</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">비교값</label>
                  <input type="text" class="form-control" id="filter-val-1" placeholder="검색할 값">
                </div>
              </div>

              <div style="font-weight: 700; margin-top: 16px; margin-bottom: 12px;">조건 2 (선택, AND 결합)</div>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">컬럼</label>
                  <select class="form-select" id="filter-col-2">
                    <option value="">(조건 2 사용 안 함)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">조건</label>
                  <select class="form-select" id="filter-op-2">
                    <option value="contains" selected>포함함 (일부 일치)</option>
                    <option value="equals">정확히 일치 (=)</option>
                    <option value="gte">이상 (&gt;=)</option>
                    <option value="lte">이하 (&lt;=)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">비교값</label>
                  <input type="text" class="form-control" id="filter-val-2" placeholder="검색할 값">
                </div>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-filter">
                <span>🔎</span> 조건 필터 실행
              </button>
            </div>
          </div>

          <div id="filter-result-area" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>필터링 결과 미리보기</h3>
              </div>
              <button class="btn btn-success" id="btn-download-filtered-csv">
                <span>💾</span> 필터링된 결과 CSV 다운로드
              </button>
            </div>
            <div id="filter-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#filter-file-input');
    const configArea = container.querySelector('#filter-config-area');
    const col1 = container.querySelector('#filter-col-1');
    const col2 = container.querySelector('#filter-col-2');
    const op1 = container.querySelector('#filter-op-1');
    const op2 = container.querySelector('#filter-op-2');
    const val1 = container.querySelector('#filter-val-1');
    const val2 = container.querySelector('#filter-val-2');
    const runBtn = container.querySelector('#btn-run-filter');
    const resultArea = container.querySelector('#filter-result-area');
    const tableContainer = container.querySelector('#filter-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;

        const opts = headers.map(h => `<option value="${CoreUtils.escapeHtml(h)}">${CoreUtils.escapeHtml(h)}</option>`).join('');
        col1.innerHTML = opts;
        col2.innerHTML = '<option value="">(조건 2 사용 안 함)</option>' + opts;

        configArea.style.display = 'block';
        CoreUtils.showToast(`파일 로드 완료 (${this.state.raw.totalRows}행)`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    const matchCond = (cellVal, op, targetVal) => {
      const cellStr = (cellVal || '').trim().toLowerCase();
      const targetStr = (targetVal || '').trim().toLowerCase();

      switch (op) {
        case 'contains': return cellStr.includes(targetStr);
        case 'equals': return cellStr === targetStr;
        case 'gte': return CoreUtils.parseNumber(cellVal) >= CoreUtils.parseNumber(targetVal);
        case 'lte': return CoreUtils.parseNumber(cellVal) <= CoreUtils.parseNumber(targetVal);
        case 'not_empty': return cellStr !== '';
        default: return true;
      }
    };

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const c1Name = col1.value;
      const c2Name = col2.value;
      const idx1 = this.state.raw.headers.indexOf(c1Name);
      const idx2 = c2Name ? this.state.raw.headers.indexOf(c2Name) : -1;

      const o1 = op1.value;
      const o2 = op2.value;
      const v1 = val1.value;
      const v2 = val2.value;

      const filtered = this.state.raw.rows.filter(r => {
        if (!matchCond(r[idx1], o1, v1)) return false;
        if (idx2 !== -1 && !matchCond(r[idx2], o2, v2)) return false;
        return true;
      });

      this.state.filteredRows = filtered;
      CoreUtils.renderPreviewTable(tableContainer, this.state.raw.headers, filtered);
      resultArea.style.display = 'block';
      CoreUtils.showToast(`조건 만족 데이터: ${filtered.length}건`, 'success');
    });

    container.querySelector('#btn-download-filtered-csv').addEventListener('click', () => {
      if (!this.state.filteredRows) return;
      const csv = CoreUtils.toCSV(this.state.raw.headers, this.state.filteredRows);
      CoreUtils.downloadFile(csv, '데이터필터링_결과.csv');
      CoreUtils.showToast('필터링 CSV 다운로드 완료!', 'success');
    });
  }
};

/* ==========================================================================
   25. 데이터 정렬
   ========================================================================== */
PortalModules['data-sort'] = {
  id: 'data-sort',
  title: '데이터 정렬',
  subtitle: '읍면별 → 농가명순 등 다중 컬럼 기준 오름차순/내림차순 정렬을 수행합니다.',
  category: '보고서·데이터 가공',

  state: { raw: null, sortedRows: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🔢 다중 컬럼 정밀 데이터 정렬</h3>
            <p>1차 기준(예: 읍면)으로 정렬한 뒤, 2차 기준(예: 농가 성명 또는 사업비)으로 연속 정렬합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">⇅</div>
            <div class="drop-zone-title">정렬할 CSV 파일을 선택하세요</div>
            <input type="file" id="sort-file-input" accept=".csv,.txt" />
          </div>

          <div id="sort-config-area" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">1차 정렬 기준 컬럼</label>
                <select class="form-select" id="sort-col-1"></select>
              </div>
              <div class="form-group">
                <label class="form-label">1차 정렬 방식</label>
                <select class="form-select" id="sort-dir-1">
                  <option value="asc" selected>오름차순 (가나다순 / 작은순)</option>
                  <option value="desc">내림차순 (큰순 / 역순)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">2차 정렬 기준 컬럼 (선택)</label>
                <select class="form-select" id="sort-col-2">
                  <option value="">(2차 정렬 없음)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">2차 정렬 방식</label>
                <select class="form-select" id="sort-dir-2">
                  <option value="asc" selected>오름차순</option>
                  <option value="desc">내림차순</option>
                </select>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-sort">
                <span>⇅</span> 데이터 정렬 실행
              </button>
            </div>
          </div>

          <div id="sort-result-area" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>정렬 완료 데이터</h3>
              </div>
              <button class="btn btn-success" id="btn-download-sorted-csv">
                <span>💾</span> 정렬된 CSV 다운로드
              </button>
            </div>
            <div id="sort-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#sort-file-input');
    const configArea = container.querySelector('#sort-config-area');
    const col1 = container.querySelector('#sort-col-1');
    const dir1 = container.querySelector('#sort-dir-1');
    const col2 = container.querySelector('#sort-col-2');
    const dir2 = container.querySelector('#sort-dir-2');
    const runBtn = container.querySelector('#btn-run-sort');
    const resultArea = container.querySelector('#sort-result-area');
    const tableContainer = container.querySelector('#sort-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;

        const opts = headers.map(h => `<option value="${CoreUtils.escapeHtml(h)}">${CoreUtils.escapeHtml(h)}</option>`).join('');
        col1.innerHTML = opts;
        col2.innerHTML = '<option value="">(2차 정렬 없음)</option>' + opts;

        configArea.style.display = 'block';
        CoreUtils.showToast(`파일 로드 완료 (${this.state.raw.totalRows}행)`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    const compareValues = (va, vb, dir) => {
      const na = CoreUtils.parseNumber(va);
      const nb = CoreUtils.parseNumber(vb);
      let res = 0;

      // 둘 다 유효한 숫자이고 일반 텍스트가 아닌 경우
      if (!isNaN(na) && !isNaN(nb) && typeof va === 'number' && typeof vb === 'number') {
        res = na - nb;
      } else {
        res = String(va || '').localeCompare(String(vb || ''), 'ko-KR', { numeric: true });
      }

      return dir === 'desc' ? -res : res;
    };

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const idx1 = this.state.raw.headers.indexOf(col1.value);
      const idx2 = col2.value ? this.state.raw.headers.indexOf(col2.value) : -1;
      const d1 = dir1.value;
      const d2 = dir2.value;

      const sorted = [...this.state.raw.rows].sort((a, b) => {
        const res1 = compareValues(a[idx1], b[idx1], d1);
        if (res1 !== 0 || idx2 === -1) return res1;
        return compareValues(a[idx2], b[idx2], d2);
      });

      this.state.sortedRows = sorted;
      CoreUtils.renderPreviewTable(tableContainer, this.state.raw.headers, sorted);
      resultArea.style.display = 'block';
      CoreUtils.showToast('데이터 정렬 완료!', 'success');
    });

    container.querySelector('#btn-download-sorted-csv').addEventListener('click', () => {
      if (!this.state.sortedRows) return;
      const csv = CoreUtils.toCSV(this.state.raw.headers, this.state.sortedRows);
      CoreUtils.downloadFile(csv, '데이터정렬_결과.csv');
      CoreUtils.showToast('정렬된 CSV 파일이 다운로드되었습니다.', 'success');
    });
  }
};
