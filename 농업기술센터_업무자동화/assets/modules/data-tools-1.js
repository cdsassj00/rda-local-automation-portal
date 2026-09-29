/**
 * 농업기술센터 로컬 업무자동화 포털 - 데이터 도구 1 (메뉴 1~5)
 * 1. 엑셀/CSV 파일 통합
 * 2. 농가 명단 정리
 * 3. 중복·누락 데이터 검사
 * 4. 교육생 명단 관리
 * 5. 출석부 생성
 */

window.PortalModules = window.PortalModules || {};

/* ==========================================================================
   1. 엑셀/CSV 파일 통합
   ========================================================================== */
PortalModules['file-merge'] = {
  id: 'file-merge',
  title: '엑셀/CSV 파일 통합',
  subtitle: '여러 읍·면 또는 담당자별 CSV 파일을 하나의 파일로 병합하고 중복을 제거합니다.',
  category: '데이터 통합·정리',

  state: {
    files: [],       // { file, parsed: { headers, rows } }
    mergedHeaders: [],
    mergedRows: []
  },

  render(container) {
    this.state = { files: [], mergedHeaders: [], mergedRows: [] };

    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📑 엑셀/CSV 파일 통합</h3>
            <p>동일한 서식의 여러 CSV 파일을 컬럼 기준으로 자동 매핑하여 하나로 합칩니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="step-tracker">
            <div class="step-item active"><span class="step-num">1</span> CSV 파일 다중 선택</div>
            <span class="step-arrow">▶</span>
            <div class="step-item"><span class="step-num">2</span> 통합 옵션 설정</div>
            <span class="step-arrow">▶</span>
            <div class="step-item"><span class="step-num">3</span> 파일 합치기 및 다운로드</div>
          </div>

          <!-- 파일 드롭존 -->
          <div class="drop-zone" id="merge-drop-zone">
            <div class="drop-zone-icon">📂</div>
            <div class="drop-zone-title">통합할 CSV 파일들을 드래그하거나 클릭하여 선택하세요</div>
            <div class="drop-zone-sub">(Ctrl 또는 Shift 키를 누르고 여러 개의 .csv 파일을 동시에 선택할 수 있습니다)</div>
            <input type="file" id="merge-file-input" multiple accept=".csv,.txt" />
          </div>

          <div class="file-chip-container" id="merge-file-list"></div>

          <!-- 옵션 영역 -->
          <div class="form-grid" style="margin-top: 20px;">
            <div class="form-group">
              <label class="form-label">중복 제거 기준 컬럼</label>
              <select class="form-select" id="merge-dedup-col">
                <option value="__none__">중복 제거 안 함 (모두 포함)</option>
                <option value="__all__">모든 컬럼이 일치하는 행 제거</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">출처 파일명 컬럼 추가</label>
              <div style="margin-top: 10px;">
                <label class="form-check">
                  <input type="checkbox" id="merge-add-filename" checked>
                  <span>'원본파일명' 컬럼을 추가하여 출처 기록</span>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">빈 행 처리</label>
              <div style="margin-top: 10px;">
                <label class="form-check">
                  <input type="checkbox" id="merge-remove-empty" checked>
                  <span>데이터가 전혀 없는 빈 행 자동 제거</span>
                </label>
              </div>
            </div>
          </div>

          <div class="btn-group">
            <button class="btn btn-primary btn-lg" id="btn-run-merge">
              <span>⚡</span> 파일 합치기 실행
            </button>
            <button class="btn btn-outline" id="btn-reset-merge">새로 시작</button>
          </div>

          <!-- 결과 영역 -->
          <div id="merge-result-area" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>📊 통합 결과 미리보기</h3>
              </div>
              <button class="btn btn-success" id="btn-download-merged">
                <span>💾</span> 전체 통합 CSV 내려받기
              </button>
            </div>
            <div id="merge-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#merge-file-input');
    const fileListEl = container.querySelector('#merge-file-list');
    const dedupSelect = container.querySelector('#merge-dedup-col');
    const runBtn = container.querySelector('#btn-run-merge');
    const resetBtn = container.querySelector('#btn-reset-merge');
    const resultArea = container.querySelector('#merge-result-area');
    const tableContainer = container.querySelector('#merge-table-container');
    const downloadBtn = container.querySelector('#btn-download-merged');

    fileInput.addEventListener('change', async (e) => {
      const selected = Array.from(e.target.files);
      if (selected.length === 0) return;

      CoreUtils.setLoading(true, '파일을 읽어들이고 있습니다...');
      try {
        for (const file of selected) {
          const { text } = await CoreUtils.readFileAsText(file);
          const parsed = CoreUtils.parseCSV(text);
          this.state.files.push({ name: file.name, parsed });
        }
        this.renderFileList(fileListEl, dedupSelect);
        CoreUtils.showToast(`${selected.length}개 파일이 추가되었습니다.`, 'success');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      } finally {
        CoreUtils.setLoading(false);
      }
    });

    runBtn.addEventListener('click', () => {
      if (this.state.files.length === 0) {
        CoreUtils.showToast('통합할 CSV 파일을 먼저 1개 이상 추가해주세요.', 'warning');
        return;
      }

      CoreUtils.setLoading(true, '파일들을 통합하고 있습니다...');
      setTimeout(() => {
        try {
          const addFilename = container.querySelector('#merge-add-filename').checked;
          const removeEmpty = container.querySelector('#merge-remove-empty').checked;
          const dedupTarget = dedupSelect.value;

          // 1. 유니온 컬럼 목록 산출
          const headerSet = new Set();
          this.state.files.forEach(f => {
            f.parsed.headers.forEach(h => headerSet.add(h));
          });
          const mergedHeaders = Array.from(headerSet);
          if (addFilename) {
            mergedHeaders.unshift('원본파일명');
          }

          // 2. 행 데이터 정렬 및 매핑
          let mergedRows = [];
          this.state.files.forEach(f => {
            const fileHeaders = f.parsed.headers;
            f.parsed.rows.forEach(row => {
              if (removeEmpty && row.every(cell => !cell || cell.trim() === '')) {
                return;
              }
              const newRow = mergedHeaders.map(targetCol => {
                if (addFilename && targetCol === '원본파일명') return f.name;
                const idx = fileHeaders.indexOf(targetCol);
                return idx !== -1 ? (row[idx] || '') : '';
              });
              mergedRows.push(newRow);
            });
          });

          // 3. 중복 제거
          if (dedupTarget === '__all__') {
            const seen = new Set();
            mergedRows = mergedRows.filter(r => {
              const key = r.join('|||');
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          } else if (dedupTarget !== '__none__') {
            const colIdx = mergedHeaders.indexOf(dedupTarget);
            if (colIdx !== -1) {
              const seen = new Set();
              mergedRows = mergedRows.filter(r => {
                const val = (r[colIdx] || '').trim();
                if (!val) return true;
                if (seen.has(val)) return false;
                seen.add(val);
                return true;
              });
            }
          }

          this.state.mergedHeaders = mergedHeaders;
          this.state.mergedRows = mergedRows;

          resultArea.style.display = 'block';
          CoreUtils.renderPreviewTable(tableContainer, mergedHeaders, mergedRows);
          CoreUtils.showToast(`통합 완료! 총 ${CoreUtils.formatNumber(mergedRows.length)}행`, 'success');
        } catch (err) {
          CoreUtils.showToast('통합 중 오류 발생: ' + err.message, 'error');
        } finally {
          CoreUtils.setLoading(false);
        }
      }, 50);
    });

    downloadBtn.addEventListener('click', () => {
      if (!this.state.mergedRows || this.state.mergedRows.length === 0) return;
      const csvStr = CoreUtils.toCSV(this.state.mergedHeaders, this.state.mergedRows);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      CoreUtils.downloadFile(csvStr, `농업기술센터_파일통합결과_${dateStr}.csv`);
      CoreUtils.showToast('통합 CSV 파일이 다운로드되었습니다.', 'success');
    });

    resetBtn.addEventListener('click', () => {
      this.render(container);
    });
  },

  renderFileList(fileListEl, dedupSelect) {
    fileListEl.innerHTML = this.state.files.map((f, i) => `
      <div class="file-chip">
        <span class="file-chip-name">📄 ${CoreUtils.escapeHtml(f.name)} (${CoreUtils.formatNumber(f.parsed.totalRows)}행)</span>
        <button class="file-chip-remove" onclick="PortalModules['file-merge'].removeFile(${i})">&times;</button>
      </div>
    `).join('');

    // 컬럼 중복 제거 옵션 업데이트
    const allHeaders = new Set();
    this.state.files.forEach(f => f.parsed.headers.forEach(h => allHeaders.add(h)));
    
    let opts = '<option value="__none__">중복 제거 안 함 (모두 포함)</option><option value="__all__">모든 컬럼이 일치하는 행 제거</option>';
    allHeaders.forEach(h => {
      opts += `<option value="${CoreUtils.escapeHtml(h)}">'${CoreUtils.escapeHtml(h)}' 컬럼 기준 중복 제거</option>`;
    });
    dedupSelect.innerHTML = opts;
  },

  removeFile(index) {
    this.state.files.splice(index, 1);
    const container = document.getElementById('module-content');
    const fileListEl = container.querySelector('#merge-file-list');
    const dedupSelect = container.querySelector('#merge-dedup-col');
    this.renderFileList(fileListEl, dedupSelect);
  }
};

/* ==========================================================================
   2. 농가 명단 정리
   ========================================================================== */
PortalModules['farmer-clean'] = {
  id: 'farmer-clean',
  title: '농가 명단 정리',
  subtitle: '공백 제거, 전화번호 포맷 통일, 고유번호 생성, 가나다순 정렬 등 농가 DB를 표준화합니다.',
  category: '데이터 통합·정리',

  state: {
    raw: null,
    cleaned: null
  },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🌾 농가 명단 데이터 정리</h3>
            <p>불규칙하게 작성된 농가 명단의 공백, 전화번호, 주소, 숫자를 한 번에 표준화합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="farmer-drop-zone">
            <div class="drop-zone-icon">📄</div>
            <div class="drop-zone-title">정리할 농가명단 CSV 파일을 선택하세요</div>
            <div class="drop-zone-sub">(샘플 폴더의 '농가명단_샘플.csv'를 사용해보세요)</div>
            <input type="file" id="farmer-file-input" accept=".csv,.txt" />
          </div>

          <div id="farmer-config-area" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">성명 컬럼 선택</label>
                <select class="form-select" id="farmer-col-name"></select>
              </div>
              <div class="form-group">
                <label class="form-label">연락처 컬럼 선택</label>
                <select class="form-select" id="farmer-col-phone"></select>
              </div>
              <div class="form-group">
                <label class="form-label">주소 컬럼 선택</label>
                <select class="form-select" id="farmer-col-addr"></select>
              </div>
              <div class="form-group">
                <label class="form-label">정렬 기준</label>
                <select class="form-select" id="farmer-sort-opt">
                  <option value="name_asc">농가 성명 (가나다순)</option>
                  <option value="none">원본 순서 유지</option>
                </select>
              </div>
            </div>

            <div style="background: var(--bg-main); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 20px;">
              <div style="font-weight: 700; margin-bottom: 10px;">적용할 정리 규칙 (모두 자동 적용)</div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; font-size: 13.5px;">
                <label class="form-check"><input type="checkbox" id="clean-trim" checked> <span>이름 및 주소 앞뒤 공백 제거</span></label>
                <label class="form-check"><input type="checkbox" id="clean-phone" checked> <span>전화번호 010-XXXX-XXXX 통일</span></label>
                <label class="form-check"><input type="checkbox" id="clean-comma" checked> <span>숫자 컬럼의 쉼표/문자 정리</span></label>
                <label class="form-check"><input type="checkbox" id="clean-gen-id" checked> <span>농가 고유식별번호 자동 생성 (F-0001)</span></label>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-farmer-clean">
                <span>✨</span> 농가 명단 일괄 정리 실행
              </button>
            </div>
          </div>

          <div id="farmer-result-area" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>📊 정리된 농가 데이터 미리보기</h3>
              </div>
              <button class="btn btn-success" id="btn-download-farmer-clean">
                <span>💾</span> 정리된 CSV 내려받기
              </button>
            </div>
            <div id="farmer-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#farmer-file-input');
    const configArea = container.querySelector('#farmer-config-area');
    const colNameSel = container.querySelector('#farmer-col-name');
    const colPhoneSel = container.querySelector('#farmer-col-phone');
    const colAddrSel = container.querySelector('#farmer-col-addr');
    const runBtn = container.querySelector('#btn-run-farmer-clean');
    const resultArea = container.querySelector('#farmer-result-area');
    const tableContainer = container.querySelector('#farmer-table-container');
    const downloadBtn = container.querySelector('#btn-download-farmer-clean');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      CoreUtils.setLoading(true, '파일을 읽어들이고 있습니다...');
      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);

        // 컬럼 셀렉트 채우기
        const fillOptions = (sel, defaultMatch) => {
          sel.innerHTML = '<option value="">(선택 안 함)</option>' +
            this.state.raw.headers.map(h => {
              const selected = h.includes(defaultMatch) ? 'selected' : '';
              return `<option value="${CoreUtils.escapeHtml(h)}" ${selected}>${CoreUtils.escapeHtml(h)}</option>`;
            }).join('');
        };

        fillOptions(colNameSel, '성명');
        fillOptions(colPhoneSel, '연락처');
        fillOptions(colAddrSel, '주소');

        configArea.style.display = 'block';
        CoreUtils.showToast(`파일을 불러왔습니다. 총 ${CoreUtils.formatNumber(this.state.raw.totalRows)}행`, 'info');
      } catch (err) {
        CoreUtils.showToast('오류 발생: ' + err.message, 'error');
      } finally {
        CoreUtils.setLoading(false);
      }
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      CoreUtils.setLoading(true, '데이터를 표준화하고 있습니다...');
      setTimeout(() => {
        try {
          const nameCol = colNameSel.value;
          const phoneCol = colPhoneSel.value;
          const addrCol = colAddrSel.value;
          const sortOpt = container.querySelector('#farmer-sort-opt').value;

          const doTrim = container.querySelector('#clean-trim').checked;
          const doPhone = container.querySelector('#clean-phone').checked;
          const doGenId = container.querySelector('#clean-gen-id').checked;

          const nameIdx = this.state.raw.headers.indexOf(nameCol);
          const phoneIdx = this.state.raw.headers.indexOf(phoneCol);
          const addrIdx = this.state.raw.headers.indexOf(addrCol);

          let headers = [...this.state.raw.headers];
          if (doGenId && !headers.includes('농가고유번호')) {
            headers.unshift('농가고유번호');
          }

          let cleanedRows = this.state.raw.rows.map((row, idx) => {
            const newRow = [...row];

            if (doTrim) {
              for (let c = 0; c < newRow.length; c++) {
                if (typeof newRow[c] === 'string') newRow[c] = newRow[c].trim();
              }
            }

            if (nameIdx !== -1 && doTrim && newRow[nameIdx]) {
              newRow[nameIdx] = newRow[nameIdx].replace(/\s+/g, '');
            }

            if (phoneIdx !== -1 && doPhone && newRow[phoneIdx]) {
              newRow[phoneIdx] = CoreUtils.normalizePhone(newRow[phoneIdx]);
            }

            if (addrIdx !== -1 && doTrim && newRow[addrIdx]) {
              newRow[addrIdx] = newRow[addrIdx].replace(/\s{2,}/g, ' ');
            }

            if (doGenId) {
              const code = `F-${String(idx + 1).padStart(4, '0')}`;
              newRow.unshift(code);
            }

            return newRow;
          });

          // 정렬
          if (sortOpt === 'name_asc') {
            const effectiveNameIdx = doGenId ? nameIdx + 1 : nameIdx;
            if (effectiveNameIdx !== -1) {
              cleanedRows.sort((a, b) => (a[effectiveNameIdx] || '').localeCompare(b[effectiveNameIdx] || '', 'ko-KR'));
            }
          }

          this.state.cleaned = { headers, rows: cleanedRows };
          resultArea.style.display = 'block';
          CoreUtils.renderPreviewTable(tableContainer, headers, cleanedRows);
          CoreUtils.showToast(`정리 완료! 총 ${CoreUtils.formatNumber(cleanedRows.length)}행`, 'success');
        } catch (err) {
          CoreUtils.showToast('정리 중 오류 발생: ' + err.message, 'error');
        } finally {
          CoreUtils.setLoading(false);
        }
      }, 50);
    });

    downloadBtn.addEventListener('click', () => {
      if (!this.state.cleaned) return;
      const csvStr = CoreUtils.toCSV(this.state.cleaned.headers, this.state.cleaned.rows);
      CoreUtils.downloadFile(csvStr, '농가명단_정리완료.csv');
      CoreUtils.showToast('정리된 농가명단이 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   3. 중복·누락 데이터 검사
   ========================================================================== */
PortalModules['data-audit'] = {
  id: 'data-audit',
  title: '중복·누락 데이터 검사',
  subtitle: '필수 항목 누락, 동일 전화번호/주소 중복, 형식 오류를 색상으로 식별하고 검증 리포트를 생성합니다.',
  category: '데이터 통합·정리',

  state: {
    raw: null,
    auditRows: []
  },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🔍 중복 및 누락 데이터 정밀 검사</h3>
            <p>공공사업 신청자 또는 교육생 명단에서 중복 접수자나 필수 정보 누락을 즉시 찾아냅니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="audit-drop-zone">
            <div class="drop-zone-icon">📋</div>
            <div class="drop-zone-title">검사할 CSV 파일을 선택하세요</div>
            <input type="file" id="audit-file-input" accept=".csv,.txt" />
          </div>

          <div id="audit-config-area" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">중복 검사 기준 1 (예: 연락처)</label>
                <select class="form-select" id="audit-col-dup1"></select>
              </div>
              <div class="form-group">
                <label class="form-label">중복 검사 기준 2 (선택, 예: 성명+주소)</label>
                <select class="form-select" id="audit-col-dup2">
                  <option value="">(단일 기준만 적용)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">필수 누락 검사 컬럼</label>
                <select class="form-select" id="audit-col-required"></select>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-audit">
                <span>🔎</span> 데이터 정밀 검사 시작
              </button>
            </div>
          </div>

          <div id="audit-result-area" style="margin-top: 28px; display: none;">
            <div class="stats-grid" id="audit-stats-grid"></div>

            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>검사 결과 목록</h3>
                <p>빨간색: 필수값 누락 | 주황색: 중복 데이터 | 보라색: 형식 오류</p>
              </div>
              <div class="btn-group" style="margin-top: 0;">
                <button class="btn btn-success" id="btn-download-audit-all">
                  <span>💾</span> 검사 상태 포함 전체 다운로드
                </button>
                <button class="btn btn-outline" id="btn-download-audit-errors">
                  오류/중복 건만 추출 다운로드
                </button>
              </div>
            </div>

            <div id="audit-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#audit-file-input');
    const configArea = container.querySelector('#audit-config-area');
    const colDup1 = container.querySelector('#audit-col-dup1');
    const colDup2 = container.querySelector('#audit-col-dup2');
    const colReq = container.querySelector('#audit-col-required');
    const runBtn = container.querySelector('#btn-run-audit');
    const resultArea = container.querySelector('#audit-result-area');
    const statsGrid = container.querySelector('#audit-stats-grid');
    const tableContainer = container.querySelector('#audit-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);

        const buildOptions = (sel, matchKey) => {
          sel.innerHTML = this.state.raw.headers.map(h => {
            const isMatch = matchKey && h.includes(matchKey);
            return `<option value="${CoreUtils.escapeHtml(h)}" ${isMatch ? 'selected' : ''}>${CoreUtils.escapeHtml(h)}</option>`;
          }).join('');
        };

        buildOptions(colDup1, '연락처');
        buildOptions(colDup2, '');
        colDup2.insertAdjacentHTML('afterbegin', '<option value="">(단일 기준만 적용)</option>');
        buildOptions(colReq, '성명');

        configArea.style.display = 'block';
        CoreUtils.showToast(`파일 준비 완료 (${CoreUtils.formatNumber(this.state.raw.totalRows)}행)`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const c1 = colDup1.value;
      const c2 = colDup2.value;
      const cReq = colReq.value;

      const idx1 = this.state.raw.headers.indexOf(c1);
      const idx2 = c2 ? this.state.raw.headers.indexOf(c2) : -1;
      const idxReq = this.state.raw.headers.indexOf(cReq);

      // 카운트 맵 구성
      const keyCount = new Map();
      this.state.raw.rows.forEach(r => {
        const v1 = (r[idx1] || '').trim();
        const v2 = idx2 !== -1 ? (r[idx2] || '').trim() : '';
        const compositeKey = v1 ? `${v1}___${v2}` : '';
        if (compositeKey) {
          keyCount.set(compositeKey, (keyCount.get(compositeKey) || 0) + 1);
        }
      });

      let normalCount = 0;
      let missingCount = 0;
      let dupCount = 0;
      let formatErrCount = 0;

      const auditedRows = this.state.raw.rows.map(row => {
        let status = '정상';
        let statusClass = '';

        const reqVal = (row[idxReq] || '').trim();
        const v1 = (row[idx1] || '').trim();
        const v2 = idx2 !== -1 ? (row[idx2] || '').trim() : '';
        const compositeKey = v1 ? `${v1}___${v2}` : '';

        // 1. 필수 누락 체크
        if (!reqVal) {
          status = '필수누락';
          statusClass = 'row-missing';
          missingCount++;
        }
        // 2. 중복 체크
        else if (compositeKey && (keyCount.get(compositeKey) || 0) > 1) {
          status = '중복데이터';
          statusClass = 'row-duplicate';
          dupCount++;
        }
        // 3. 연락처 형식 체크 (선택 컬럼이 연락처인 경우)
        else if (c1.includes('연락처') || c1.includes('전화')) {
          if (v1 && !CoreUtils.isValidPhone(v1)) {
            status = '형식오류';
            statusClass = 'row-invalid';
            formatErrCount++;
          } else {
            normalCount++;
          }
        } else {
          normalCount++;
        }

        return {
          status,
          statusClass,
          data: [status, ...row]
        };
      });

      this.state.auditRows = auditedRows;

      // 통계 카드 렌더링
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">전체 데이터</div>
          <div class="stat-value">${CoreUtils.formatNumber(auditedRows.length)}<span class="stat-unit">건</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">정상 데이터</div>
          <div class="stat-value" style="color: var(--success);">${CoreUtils.formatNumber(normalCount)}<span class="stat-unit">건</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">필수값 누락</div>
          <div class="stat-value" style="color: var(--danger);">${CoreUtils.formatNumber(missingCount)}<span class="stat-unit">건</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">중복 의심 건</div>
          <div class="stat-value" style="color: var(--warning);">${CoreUtils.formatNumber(dupCount)}<span class="stat-unit">건</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">형식 오류</div>
          <div class="stat-value" style="color: #7c3aed;">${CoreUtils.formatNumber(formatErrCount)}<span class="stat-unit">건</span></div>
        </div>
      `;

      // 테이블 렌더링 (커스텀 클래스 적용)
      const auditHeaders = ['검사결과', ...this.state.raw.headers];
      const previewRows = auditedRows.slice(0, 100);

      tableContainer.innerHTML = `
        <div class="table-meta-bar">
          <span class="badge badge-info">총 <strong>${CoreUtils.formatNumber(auditedRows.length)}</strong>건 검사 완료</span>
          ${auditedRows.length > 100 ? '<span class="badge badge-warning">상위 100건 표시 중</span>' : ''}
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px;">No</th>
                ${auditHeaders.map(h => `<th>${CoreUtils.escapeHtml(h)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${previewRows.map((item, idx) => `
                <tr class="${item.statusClass}">
                  <td class="text-center text-muted">${idx + 1}</td>
                  ${item.data.map(val => `<td>${CoreUtils.escapeHtml(val)}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      resultArea.style.display = 'block';
      CoreUtils.showToast('데이터 검사가 완료되었습니다.', 'success');
    });

    container.querySelector('#btn-download-audit-all').addEventListener('click', () => {
      if (!this.state.auditRows.length) return;
      const headers = ['검사상태', ...this.state.raw.headers];
      const rows = this.state.auditRows.map(r => r.data);
      CoreUtils.downloadFile(CoreUtils.toCSV(headers, rows), '데이터검사_전체결과.csv');
      CoreUtils.showToast('전체 검사 결과가 다운로드되었습니다.', 'success');
    });

    container.querySelector('#btn-download-audit-errors').addEventListener('click', () => {
      if (!this.state.auditRows.length) return;
      const headers = ['검사상태', ...this.state.raw.headers];
      const errRows = this.state.auditRows.filter(r => r.status !== '정상').map(r => r.data);
      if (errRows.length === 0) {
        CoreUtils.showToast('오류나 중복 건이 없습니다! 모든 데이터가 정상입니다.', 'info');
        return;
      }
      CoreUtils.downloadFile(CoreUtils.toCSV(headers, errRows), '데이터검사_오류중복추출.csv');
      CoreUtils.showToast(`오류/중복 ${errRows.length}건이 다운로드되었습니다.`, 'success');
    });
  }
};

/* ==========================================================================
   4. 교육생 명단 관리
   ========================================================================== */
PortalModules['trainee-manage'] = {
  id: 'trainee-manage',
  title: '교육생 명단 관리',
  subtitle: '농업인 교육 신청자 집계, 성별/소속읍면/과정별 통계, 명찰용 및 출석부용 데이터 추출을 지원합니다.',
  category: '농가·교육생 관리',

  state: { raw: null },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🎓 교육생 명단 관리 및 다차원 통계</h3>
            <p>새해농업인실용교육, 품목별 상설교육 등 교육생 접수 명단을 신속하게 집계합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="trainee-drop-zone">
            <div class="drop-zone-icon">👨‍🌾</div>
            <div class="drop-zone-title">교육생 명단 CSV 파일을 선택하세요</div>
            <div class="drop-zone-sub">(샘플 폴더의 '교육생명단_샘플.csv'를 사용해보세요)</div>
            <input type="file" id="trainee-file-input" accept=".csv,.txt" />
          </div>

          <div id="trainee-content-area" style="margin-top: 24px; display: none;">
            <div class="stats-grid" id="trainee-stats-grid"></div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
              <div class="work-card" style="margin-bottom: 0;">
                <div class="card-header"><h4>🏛️ 읍·면별 신청 현황</h4></div>
                <div class="card-body" style="padding: 16px;">
                  <canvas id="trainee-chart-region" width="400" height="260" style="width: 100%; max-width: 100%;"></canvas>
                </div>
              </div>
              <div class="work-card" style="margin-bottom: 0;">
                <div class="card-header"><h4>📚 교육 과정별 신청 현황</h4></div>
                <div class="card-body" style="padding: 16px;">
                  <canvas id="trainee-chart-course" width="400" height="260" style="width: 100%; max-width: 100%;"></canvas>
                </div>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary" id="btn-export-badges">
                <span>🏷️</span> 명찰 출력용 데이터 다운로드 (CSV)
              </button>
              <button class="btn btn-secondary" id="btn-go-attendance">
                <span>📋</span> 이 명단으로 출석부 만들기
              </button>
              <button class="btn btn-outline" id="btn-export-trainee-clean">
                표준화된 전체 교육생 목록 다운로드
              </button>
            </div>

            <div id="trainee-table-container" style="margin-top: 24px;"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#trainee-file-input');
    const contentArea = container.querySelector('#trainee-content-area');
    const statsGrid = container.querySelector('#trainee-stats-grid');
    const tableContainer = container.querySelector('#trainee-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;
        const rows = this.state.raw.rows;

        // 주요 컬럼 인덱스 찾기
        const regionIdx = headers.findIndex(h => h.includes('읍면') || h.includes('지역') || h.includes('소속'));
        const courseIdx = headers.findIndex(h => h.includes('과정') || h.includes('과목') || h.includes('교육명'));
        const phoneIdx = headers.findIndex(h => h.includes('연락처') || h.includes('전화'));

        // 통계 계산
        const regionMap = new Map();
        const courseMap = new Map();
        const phoneSet = new Set();
        let dupPhoneCount = 0;

        rows.forEach(r => {
          if (regionIdx !== -1 && r[regionIdx]) {
            const reg = r[regionIdx].trim();
            regionMap.set(reg, (regionMap.get(reg) || 0) + 1);
          }
          if (courseIdx !== -1 && r[courseIdx]) {
            const crs = r[courseIdx].trim();
            courseMap.set(crs, (courseMap.get(crs) || 0) + 1);
          }
          if (phoneIdx !== -1 && r[phoneIdx]) {
            const normP = CoreUtils.normalizePhone(r[phoneIdx]);
            if (phoneSet.has(normP)) dupPhoneCount++;
            else phoneSet.add(normP);
          }
        });

        statsGrid.innerHTML = `
          <div class="stat-card">
            <div class="stat-label">총 교육 신청자</div>
            <div class="stat-value">${CoreUtils.formatNumber(rows.length)}<span class="stat-unit">명</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">개설 교육과정</div>
            <div class="stat-value">${courseMap.size}<span class="stat-unit">개 과정</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">참여 읍·면 수</div>
            <div class="stat-value">${regionMap.size}<span class="stat-unit">개 읍면</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">중복 접수 의심</div>
            <div class="stat-value" style="color: ${dupPhoneCount > 0 ? 'var(--warning)' : 'var(--success)'};">${dupPhoneCount}<span class="stat-unit">건</span></div>
          </div>
        `;

        contentArea.style.display = 'block';

        // 차트 그리기
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const regionItems = Array.from(regionMap.entries()).map(([k, v]) => ({ label: k, value: v }));
        const courseItems = Array.from(courseMap.entries()).map(([k, v]) => ({ label: k, value: v }));

        const regionCanvas = container.querySelector('#trainee-chart-region');
        const courseCanvas = container.querySelector('#trainee-chart-course');

        CoreUtils.drawBarChart(regionCanvas, regionItems.slice(0, 6), { unit: '명', isDark });
        CoreUtils.drawBarChart(courseCanvas, courseItems.slice(0, 6), { unit: '명', isDark });

        CoreUtils.renderPreviewTable(tableContainer, headers, rows);
        CoreUtils.showToast(`교육생 ${CoreUtils.formatNumber(rows.length)}명 데이터 분석 완료!`, 'success');
      } catch (err) {
        CoreUtils.showToast('데이터 처리 오류: ' + err.message, 'error');
      }
    });

    // 명찰용 데이터 추출 (성명, 소속, 번호)
    container.querySelector('#btn-export-badges').addEventListener('click', () => {
      if (!this.state.raw) return;
      const headers = this.state.raw.headers;
      const nameIdx = headers.findIndex(h => h.includes('성명') || h.includes('이름'));
      const orgIdx = headers.findIndex(h => h.includes('읍면') || h.includes('소속'));
      const courseIdx = headers.findIndex(h => h.includes('과정') || h.includes('교육'));

      const badgeRows = this.state.raw.rows.map((r, i) => [
        i + 1,
        nameIdx !== -1 ? r[nameIdx] : '',
        orgIdx !== -1 ? r[orgIdx] : '',
        courseIdx !== -1 ? r[courseIdx] : ''
      ]);

      const csv = CoreUtils.toCSV(['명찰번호', '성명', '소속읍면', '교육과정'], badgeRows);
      CoreUtils.downloadFile(csv, '교육생_명찰출력용_데이터.csv');
      CoreUtils.showToast('명찰용 CSV 데이터가 다운로드되었습니다.', 'success');
    });

    // 출석부 생성 메뉴로 연결
    container.querySelector('#btn-go-attendance').addEventListener('click', () => {
      window.AppRouter.navigate('attendance-sheet');
      CoreUtils.showToast('출석부 생성 메뉴로 이동했습니다. 이전 데이터를 활용하실 수 있습니다.', 'info');
    });

    // 전체 다운로드
    container.querySelector('#btn-export-trainee-clean').addEventListener('click', () => {
      if (!this.state.raw) return;
      const csv = CoreUtils.toCSV(this.state.raw.headers, this.state.raw.rows);
      CoreUtils.downloadFile(csv, '교육생명단_전체.csv');
    });
  }
};

/* ==========================================================================
   5. 출석부 생성
   ========================================================================== */
PortalModules['attendance-sheet'] = {
  id: 'attendance-sheet',
  title: '출석부 생성',
  subtitle: 'A4 규격 인쇄에 최적화된 관공서 표준 교육 출석부(서명란 포함)를 생성하고 출력합니다.',
  category: '농가·교육생 관리',

  state: {
    raw: null
  },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📑 농업인 교육 출석부 자동 생성</h3>
            <p>교육생 명단을 바탕으로 번호, 성명, 소속, 연락처, 서명란이 갖춰진 A4 인쇄용 출석부를 만듭니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="att-drop-zone">
            <div class="drop-zone-icon">📋</div>
            <div class="drop-zone-title">교육생 명단 CSV 파일을 선택하세요</div>
            <input type="file" id="att-file-input" accept=".csv,.txt" />
          </div>

          <div style="margin-top: 20px;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">교육과정명</label>
                <input type="text" class="form-control" id="att-title" value="2026년 새해농업인실용교육 (고품질 사과재배)">
              </div>
              <div class="form-group">
                <label class="form-label">교육 일시</label>
                <input type="text" class="form-control" id="att-date" value="2026년 10월 15일 14:00~18:00">
              </div>
              <div class="form-group">
                <label class="form-label">교육 장소</label>
                <input type="text" class="form-control" id="att-place" value="농업기술센터 2층 대강당">
              </div>
              <div class="form-group">
                <label class="form-label">페이지당 인원수</label>
                <select class="form-select" id="att-page-limit">
                  <option value="20">20명씩 (여유 있는 서명란)</option>
                  <option value="25" selected>25명씩 (A4 한 장에 쏙)</option>
                  <option value="30">30명씩 (조밀한 레이아웃)</option>
                </select>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-print-att">
                <span>🖨️</span> A4 규격 출석부 인쇄 / PDF 저장
              </button>
              <button class="btn btn-success" id="btn-export-att-csv">
                <span>💾</span> 출석부 서식 CSV 다운로드
              </button>
            </div>
          </div>

          <!-- 미리보기 영역 (A4 종이 느낌) -->
          <div id="att-sheet-preview" style="margin-top: 28px;">
            <div style="background: var(--bg-main); padding: 30px; border: 1px solid var(--border); border-radius: var(--radius-sm);">
              <div style="text-align: center; color: var(--text-muted);">
                교육생 CSV 파일을 선택하시면 이곳에 실시간 인쇄용 출석부 서식이 펼쳐집니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#att-file-input');
    const previewContainer = container.querySelector('#att-sheet-preview');
    const printBtn = container.querySelector('#btn-print-att');
    const csvBtn = container.querySelector('#btn-export-att-csv');

    const updatePreview = () => {
      if (!this.state.raw || this.state.raw.rows.length === 0) return;

      const title = container.querySelector('#att-title').value;
      const date = container.querySelector('#att-date').value;
      const place = container.querySelector('#att-place').value;
      const limit = parseInt(container.querySelector('#att-page-limit').value, 10);

      const headers = this.state.raw.headers;
      const nameIdx = headers.findIndex(h => h.includes('성명') || h.includes('이름'));
      const orgIdx = headers.findIndex(h => h.includes('읍면') || h.includes('소속') || h.includes('지역'));
      const phoneIdx = headers.findIndex(h => h.includes('연락처') || h.includes('전화'));

      const rows = this.state.raw.rows;
      const totalPages = Math.ceil(rows.length / limit);

      let html = '';
      for (let p = 0; p < totalPages; p++) {
        const pageRows = rows.slice(p * limit, (p + 1) * limit);
        html += `
          <div class="print-page" style="background: #ffffff; color: #000000; box-shadow: var(--shadow-md); margin-bottom: 24px; padding: 25mm 20mm; font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="font-size: 22pt; font-weight: bold; letter-spacing: 2px; margin-bottom: 12px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 6px;">
                교 육 출 석 부
              </h2>
            </div>
            <table style="width: 100%; margin-bottom: 14px; font-size: 11pt; border-collapse: collapse;">
              <tr>
                <td style="width: 60%; padding: 4px 0;"><strong>■ 교육과정:</strong> ${CoreUtils.escapeHtml(title)}</td>
                <td style="width: 40%; text-align: right; padding: 4px 0;"><strong>페이지:</strong> ${p + 1} / ${totalPages}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>■ 일시/장소:</strong> ${CoreUtils.escapeHtml(date)} (${CoreUtils.escapeHtml(place)})</td>
                <td style="text-align: right; padding: 4px 0;"><strong>총 참석대상:</strong> ${rows.length}명</td>
              </tr>
            </table>

            <table class="print-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; text-align: center; font-size: 10.5pt;">
              <thead>
                <tr style="background-color: #f1f5f9; height: 36px;">
                  <th style="border: 1px solid #000; width: 45px;">연번</th>
                  <th style="border: 1px solid #000; width: 100px;">성 명</th>
                  <th style="border: 1px solid #000; width: 120px;">소속 (읍·면)</th>
                  <th style="border: 1px solid #000; width: 150px;">연 락 처</th>
                  <th style="border: 1px solid #000;">서 명 (확인)</th>
                </tr>
              </thead>
              <tbody>
                ${pageRows.map((r, i) => {
                  const globalIdx = p * limit + i + 1;
                  const name = nameIdx !== -1 ? r[nameIdx] : '';
                  const org = orgIdx !== -1 ? r[orgIdx] : '';
                  const phone = phoneIdx !== -1 ? CoreUtils.normalizePhone(r[phoneIdx]) : '';
                  return `
                    <tr style="height: 38px;">
                      <td style="border: 1px solid #000;">${globalIdx}</td>
                      <td style="border: 1px solid #000; font-weight: bold;">${CoreUtils.escapeHtml(name)}</td>
                      <td style="border: 1px solid #000;">${CoreUtils.escapeHtml(org)}</td>
                      <td style="border: 1px solid #000;">${CoreUtils.escapeHtml(phone)}</td>
                      <td style="border: 1px solid #000;"></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div style="margin-top: 20px; text-align: right; font-size: 10pt; color: #555;">
              농업기술센터 교육운영팀
            </div>
          </div>
        `;
      }

      previewContainer.innerHTML = html;
    };

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        updatePreview();
        CoreUtils.showToast(`출석부 명단(${this.state.raw.rows.length}명)이 생성되었습니다.`, 'success');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    ['#att-title', '#att-date', '#att-place', '#att-page-limit'].forEach(sel => {
      container.querySelector(sel).addEventListener('input', updatePreview);
    });

    printBtn.addEventListener('click', () => {
      if (!this.state.raw) {
        CoreUtils.showToast('출석부를 생성할 교육생 명단 CSV를 먼저 선택하세요.', 'warning');
        return;
      }
      window.print();
    });

    csvBtn.addEventListener('click', () => {
      if (!this.state.raw) return;
      const headers = this.state.raw.headers;
      const nameIdx = headers.findIndex(h => h.includes('성명') || h.includes('이름'));
      const orgIdx = headers.findIndex(h => h.includes('읍면') || h.includes('소속') || h.includes('지역'));
      const phoneIdx = headers.findIndex(h => h.includes('연락처') || h.includes('전화'));

      const outRows = this.state.raw.rows.map((r, i) => [
        i + 1,
        nameIdx !== -1 ? r[nameIdx] : '',
        orgIdx !== -1 ? r[orgIdx] : '',
        phoneIdx !== -1 ? CoreUtils.normalizePhone(r[phoneIdx]) : '',
        '' // 서명란
      ]);

      const csv = CoreUtils.toCSV(['연번', '성명', '소속읍면', '연락처', '서명'], outRows);
      CoreUtils.downloadFile(csv, '교육출석부_서명서식.csv');
      CoreUtils.showToast('출석부 서식 CSV가 다운로드되었습니다.', 'success');
    });
  }
};
