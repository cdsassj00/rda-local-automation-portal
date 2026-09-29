/**
 * 농업기술센터 로컬 업무자동화 포털 - 파일 및 사진 도구 (메뉴 11~15)
 * 11. 사진 파일명 일괄 변경 (ZIP 일괄 압축 다운로드)
 * 12. 사진 분류 (사업전/후, 교육, 병해충 등 업무별 분류)
 * 13. 파일 일괄 이름 변경 (접두어/접미어/치환/연번)
 * 14. 폴더 파일목록 생성 (webkitdirectory 지원, 크기/날짜 CSV 추출)
 * 15. CSV 변환 (구분자 변환, UTF-8 BOM 변환, 컬럼 추출)
 */

window.PortalModules = window.PortalModules || {};

/* ==========================================================================
   11. 사진 파일명 일괄 변경
   ========================================================================== */
PortalModules['photo-rename'] = {
  id: 'photo-rename',
  title: '사진 파일명 일괄 변경',
  subtitle: '현장 증빙 사진들을 [날짜_품목_업무구분_농가명_연번] 규칙으로 일괄 정리하여 ZIP으로 다운로드합니다.',
  category: '파일·사진 도구',

  state: { files: [] },

  render(container) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📷 현장 사진 파일명 일괄 표준화</h3>
            <p>스마트폰으로 촬영한 뒤죽박죽 파일명(IMG_1234.jpg 등)을 공공업무 표준 규격으로 일괄 변경합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="photo-drop-zone">
            <div class="drop-zone-icon">🖼️</div>
            <div class="drop-zone-title">변경할 사진 파일들을 다중 선택하세요</div>
            <div class="drop-zone-sub">(JPG, PNG, WEBP 등 여러 장을 동시에 선택할 수 있습니다)</div>
            <input type="file" id="photo-file-input" multiple accept="image/*" />
          </div>

          <div class="file-chip-container" id="photo-file-list"></div>

          <div style="margin-top: 24px; background: var(--bg-main); padding: 18px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
            <div style="font-weight: 700; margin-bottom: 12px;">🏷️ 파일명 명명 규칙 설정</div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">날짜 (YYYYMMDD)</label>
                <input type="text" class="form-control" id="rule-photo-date" value="${today}">
              </div>
              <div class="form-group">
                <label class="form-label">품목 (작목명)</label>
                <input type="text" class="form-control" id="rule-photo-crop" value="사과" placeholder="예: 벼, 사과, 딸기, 고추">
              </div>
              <div class="form-group">
                <label class="form-label">업무 구분</label>
                <select class="form-select" id="rule-photo-task">
                  <option value="병해충예찰">병해충예찰</option>
                  <option value="현장기술지도">현장기술지도</option>
                  <option value="시범사업점검">시범사업점검</option>
                  <option value="영농현장조사">영농현장조사</option>
                  <option value="기상재해피해">기상재해피해</option>
                  <option value="직접입력">직접 입력...</option>
                </select>
                <input type="text" class="form-control" id="rule-photo-custom-task" style="display: none; margin-top: 6px;" placeholder="업무명을 입력하세요">
              </div>
              <div class="form-group">
                <label class="form-label">농가 성명/지역</label>
                <input type="text" class="form-control" id="rule-photo-farmer" value="김○○농가" placeholder="예: 김○○농가, 평촌마을">
              </div>
            </div>

            <div style="margin-top: 10px; font-size: 13.5px; color: var(--primary); font-weight: 600;" id="photo-preview-example">
              예시: ${today}_사과_병해충예찰_김○○농가_001.jpg
            </div>
          </div>

          <div class="btn-group">
            <button class="btn btn-primary btn-lg" id="btn-run-photo-zip">
              <span>📦</span> 변경된 이름으로 압축(ZIP) 일괄 다운로드
            </button>
            <button class="btn btn-outline" id="btn-reset-photos">목록 초기화</button>
          </div>

          <div id="photo-table-container" style="margin-top: 24px;"></div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#photo-file-input');
    const fileListEl = container.querySelector('#photo-file-list');
    const taskSelect = container.querySelector('#rule-photo-task');
    const customTaskInput = container.querySelector('#rule-photo-custom-task');
    const runZipBtn = container.querySelector('#btn-run-photo-zip');
    const tableContainer = container.querySelector('#photo-table-container');
    const exampleEl = container.querySelector('#photo-preview-example');

    taskSelect.addEventListener('change', () => {
      customTaskInput.style.display = taskSelect.value === '직접입력' ? 'block' : 'none';
      updatePreview();
    });

    const getTaskValue = () => {
      return taskSelect.value === '직접입력' ? (customTaskInput.value.trim() || '현장') : taskSelect.value;
    };

    const updatePreview = () => {
      const date = container.querySelector('#rule-photo-date').value.trim() || '20260929';
      const crop = container.querySelector('#rule-photo-crop').value.trim() || '작목';
      const task = getTaskValue();
      const farmer = container.querySelector('#rule-photo-farmer').value.trim() || '농가명';
      exampleEl.textContent = `생성 파일명 예시: ${date}_${crop}_${task}_${farmer}_001.jpg`;

      if (this.state.files.length > 0) {
        renderTable();
      }
    };

    const renderTable = () => {
      const date = container.querySelector('#rule-photo-date').value.trim() || '20260929';
      const crop = container.querySelector('#rule-photo-crop').value.trim() || '작목';
      const task = getTaskValue();
      const farmer = container.querySelector('#rule-photo-farmer').value.trim() || '농가명';

      const rows = this.state.files.map((f, i) => {
        const ext = f.name.split('.').pop() || 'jpg';
        const newName = `${date}_${crop}_${task}_${farmer}_${String(i + 1).padStart(3, '0')}.${ext}`;
        return [f.name, newName, `${(f.size / 1024).toFixed(1)} KB`];
      });

      CoreUtils.renderPreviewTable(tableContainer, ['원본 파일명', '새로 변경될 파일명', '크기'], rows);
    };

    fileInput.addEventListener('change', (e) => {
      const selected = Array.from(e.target.files);
      if (selected.length === 0) return;
      this.state.files = selected;

      fileListEl.innerHTML = selected.map(f => `
        <div class="file-chip">
          <span class="file-chip-name">🖼️ ${CoreUtils.escapeHtml(f.name)}</span>
          <span class="file-chip-size">${(f.size / 1024).toFixed(0)}KB</span>
        </div>
      `).join('');

      renderTable();
      CoreUtils.showToast(`사진 ${selected.length}장이 추가되었습니다.`, 'success');
    });

    ['#rule-photo-date', '#rule-photo-crop', '#rule-photo-farmer', '#rule-photo-custom-task'].forEach(sel => {
      container.querySelector(sel).addEventListener('input', updatePreview);
    });

    runZipBtn.addEventListener('click', async () => {
      if (this.state.files.length === 0) {
        CoreUtils.showToast('먼저 변경할 사진 파일들을 선택해주세요.', 'warning');
        return;
      }

      CoreUtils.setLoading(true, '사진들을 새 이름으로 압축하고 있습니다...');
      try {
        const date = container.querySelector('#rule-photo-date').value.trim() || '20260929';
        const crop = container.querySelector('#rule-photo-crop').value.trim() || '작목';
        const task = getTaskValue();
        const farmer = container.querySelector('#rule-photo-farmer').value.trim() || '농가명';

        const zip = new window.SimpleZip();

        for (let i = 0; i < this.state.files.length; i++) {
          const file = this.state.files[i];
          const ext = file.name.split('.').pop() || 'jpg';
          const newName = `${date}_${crop}_${task}_${farmer}_${String(i + 1).padStart(3, '0')}.${ext}`;
          await zip.addFile(newName, file);
        }

        const zipBlob = zip.generateZipBlob();
        CoreUtils.downloadFile(zipBlob, `사진일괄정리_${date}_${crop}_${this.state.files.length}장.zip`, 'application/zip');
        CoreUtils.showToast(`사진 ${this.state.files.length}장이 ZIP 파일로 다운로드되었습니다!`, 'success');
      } catch (err) {
        CoreUtils.showToast('압축 중 오류 발생: ' + err.message, 'error');
      } finally {
        CoreUtils.setLoading(false);
      }
    });

    container.querySelector('#btn-reset-photos').addEventListener('click', () => {
      this.render(container);
    });
  }
};

/* ==========================================================================
   12. 사진 분류
   ========================================================================== */
PortalModules['photo-classify'] = {
  id: 'photo-classify',
  title: '사진 분류',
  subtitle: '사업전/사업후/교육/병해충/시설 등 행정 목적별로 사진을 그룹 분류하여 다운로드합니다.',
  category: '파일·사진 도구',

  state: { files: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🗂️ 업무 목적별 사진 일괄 분류</h3>
            <p>보조사업 정산용(사업전/사업후), 교육행사, 시설점검 등 원하는 분류 태그를 파일명 앞에 일괄 부착합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">📷</div>
            <div class="drop-zone-title">분류할 사진 파일들을 선택하세요</div>
            <input type="file" id="classify-file-input" multiple accept="image/*" />
          </div>

          <div style="margin-top: 24px;">
            <label class="form-label" style="font-size: 15px;">부여할 분류 카테고리 선택</label>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px;" id="classify-tag-group">
              <button type="button" class="btn btn-outline classify-tag-btn active" data-tag="사업전">【사업전】</button>
              <button type="button" class="btn btn-outline classify-tag-btn" data-tag="사업후">【사업후】</button>
              <button type="button" class="btn btn-outline classify-tag-btn" data-tag="교육행사">【교육행사】</button>
              <button type="button" class="btn btn-outline classify-tag-btn" data-tag="현장지도">【현장지도】</button>
              <button type="button" class="btn btn-outline classify-tag-btn" data-tag="병해충">【병해충】</button>
              <button type="button" class="btn btn-outline classify-tag-btn" data-tag="시설농기계">【시설농기계】</button>
            </div>
            <div style="margin-top: 12px; max-width: 320px;">
              <input type="text" class="form-control" id="classify-custom-tag" placeholder="직접 분류명 입력 시 여기에 작성">
            </div>
          </div>

          <div class="btn-group">
            <button class="btn btn-primary btn-lg" id="btn-run-classify-zip">
              <span>📦</span> 선택한 분류명 적용하여 ZIP 다운로드
            </button>
          </div>

          <div id="classify-table-container" style="margin-top: 24px;"></div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#classify-file-input');
    const tagBtns = container.querySelectorAll('.classify-tag-btn');
    const customTagInput = container.querySelector('#classify-custom-tag');
    const runZipBtn = container.querySelector('#btn-run-classify-zip');
    const tableContainer = container.querySelector('#classify-table-container');

    let currentTag = '사업전';

    tagBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tagBtns.forEach(b => b.classList.remove('active', 'btn-primary'));
        btn.classList.add('active', 'btn-primary');
        currentTag = btn.getAttribute('data-tag');
        customTagInput.value = '';
        renderTable();
      });
    });

    customTagInput.addEventListener('input', () => {
      if (customTagInput.value.trim()) {
        tagBtns.forEach(b => b.classList.remove('active', 'btn-primary'));
        currentTag = customTagInput.value.trim();
        renderTable();
      }
    });

    const renderTable = () => {
      if (this.state.files.length === 0) return;
      const rows = this.state.files.map(f => [
        f.name,
        `[${currentTag}]_${f.name}`,
        `${(f.size / 1024).toFixed(1)} KB`
      ]);
      CoreUtils.renderPreviewTable(tableContainer, ['원본 파일명', '분류 적용 파일명', '크기'], rows);
    };

    fileInput.addEventListener('change', (e) => {
      this.state.files = Array.from(e.target.files);
      renderTable();
      CoreUtils.showToast(`사진 ${this.state.files.length}장이 선택되었습니다.`, 'success');
    });

    runZipBtn.addEventListener('click', async () => {
      if (this.state.files.length === 0) {
        CoreUtils.showToast('사진 파일을 먼저 선택해주세요.', 'warning');
        return;
      }

      CoreUtils.setLoading(true, '분류 태그를 적용하여 압축하고 있습니다...');
      try {
        const zip = new window.SimpleZip();
        for (const file of this.state.files) {
          const newName = `[${currentTag}]_${file.name}`;
          await zip.addFile(newName, file);
        }
        const blob = zip.generateZipBlob();
        CoreUtils.downloadFile(blob, `사진분류_${currentTag}_${this.state.files.length}장.zip`, 'application/zip');
        CoreUtils.showToast(`[${currentTag}] 분류 사진 압축 다운로드 완료!`, 'success');
      } catch (err) {
        CoreUtils.showToast('오류 발생: ' + err.message, 'error');
      } finally {
        CoreUtils.setLoading(false);
      }
    });
  }
};

/* ==========================================================================
   13. 파일 일괄 이름 변경
   ========================================================================== */
PortalModules['batch-rename'] = {
  id: 'batch-rename',
  title: '파일 일괄 이름 변경',
  subtitle: '여러 파일에 접두어/접미어 추가, 문자열 치환, 연번 부여 후 ZIP으로 한 번에 내려받습니다.',
  category: '파일·사진 도구',

  state: { files: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>✏️ 일반 파일 일괄 이름 변경 (Batch Renamer)</h3>
            <p>공문서, 보고서, 사진, 도면 등 여러 파일의 이름을 규칙에 따라 일괄 변환합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">📁</div>
            <div class="drop-zone-title">이름을 변경할 파일들을 다중 선택하세요</div>
            <input type="file" id="batch-file-input" multiple />
          </div>

          <div style="margin-top: 24px; background: var(--bg-main); padding: 18px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">맨 앞에 추가 (접두어)</label>
                <input type="text" class="form-control" id="rename-prefix" placeholder="예: [농업기술센터]_">
              </div>
              <div class="form-group">
                <label class="form-label">맨 뒤에 추가 (접미어)</label>
                <input type="text" class="form-control" id="rename-suffix" placeholder="예: _최종본">
              </div>
              <div class="form-group">
                <label class="form-label">찾을 문자열 (삭제/치환)</label>
                <input type="text" class="form-control" id="rename-find" placeholder="예: (1), 복사본">
              </div>
              <div class="form-group">
                <label class="form-label">바꿀 문자열</label>
                <input type="text" class="form-control" id="rename-replace" placeholder="공란 시 삭제됨">
              </div>
            </div>

            <div style="display: flex; gap: 20px; margin-top: 10px;">
              <label class="form-check">
                <input type="checkbox" id="rename-add-seq">
                <span>파일 끝에 연번 붙이기 (_001, _002...)</span>
              </label>
            </div>
          </div>

          <div class="btn-group">
            <button class="btn btn-primary btn-lg" id="btn-run-batch-rename">
              <span>📦</span> 변경된 이름으로 ZIP 일괄 다운로드
            </button>
          </div>

          <div id="batch-rename-table-container" style="margin-top: 24px;"></div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#batch-file-input');
    const prefixInput = container.querySelector('#rename-prefix');
    const suffixInput = container.querySelector('#rename-suffix');
    const findInput = container.querySelector('#rename-find');
    const replaceInput = container.querySelector('#rename-replace');
    const seqCheck = container.querySelector('#rename-add-seq');
    const runBtn = container.querySelector('#btn-run-batch-rename');
    const tableContainer = container.querySelector('#batch-rename-table-container');

    const computeNewNames = () => {
      const prefix = prefixInput.value;
      const suffix = suffixInput.value;
      const findStr = findInput.value;
      const repStr = replaceInput.value;
      const useSeq = seqCheck.checked;

      return this.state.files.map((f, i) => {
        const lastDot = f.name.lastIndexOf('.');
        let baseName = lastDot !== -1 ? f.name.slice(0, lastDot) : f.name;
        const ext = lastDot !== -1 ? f.name.slice(lastDot) : '';

        if (findStr) {
          baseName = baseName.replaceAll(findStr, repStr);
        }

        let newName = prefix + baseName + suffix;
        if (useSeq) {
          newName += `_${String(i + 1).padStart(3, '0')}`;
        }
        newName += ext;

        return { original: f, newName };
      });
    };

    const renderTable = () => {
      if (this.state.files.length === 0) return;
      const list = computeNewNames();
      const rows = list.map(item => [item.original.name, item.newName]);
      CoreUtils.renderPreviewTable(tableContainer, ['원본 파일명', '새 파일명'], rows);
    };

    fileInput.addEventListener('change', (e) => {
      this.state.files = Array.from(e.target.files);
      renderTable();
      CoreUtils.showToast(`파일 ${this.state.files.length}개가 선택되었습니다.`, 'info');
    });

    [prefixInput, suffixInput, findInput, replaceInput, seqCheck].forEach(el => {
      el.addEventListener('input', renderTable);
    });

    runBtn.addEventListener('click', async () => {
      if (this.state.files.length === 0) {
        CoreUtils.showToast('파일을 먼저 선택해주세요.', 'warning');
        return;
      }

      CoreUtils.setLoading(true, '파일들을 압축하고 있습니다...');
      try {
        const list = computeNewNames();
        const zip = new window.SimpleZip();
        for (const item of list) {
          await zip.addFile(item.newName, item.original);
        }
        const blob = zip.generateZipBlob();
        CoreUtils.downloadFile(blob, `파일명변경_${this.state.files.length}개.zip`, 'application/zip');
        CoreUtils.showToast('이름 변경 ZIP 다운로드 완료!', 'success');
      } catch (err) {
        CoreUtils.showToast('압축 오류: ' + err.message, 'error');
      } finally {
        CoreUtils.setLoading(false);
      }
    });
  }
};

/* ==========================================================================
   14. 폴더 파일목록 생성
   ========================================================================== */
PortalModules['folder-inventory'] = {
  id: 'folder-inventory',
  title: '폴더 파일목록 생성',
  subtitle: '지정한 폴더 내부의 모든 파일명, 확장자, 크기, 수정일 목록을 추출하여 엑셀/CSV로 생성합니다.',
  category: '파일·사진 도구',

  state: { inventory: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📁 폴더 파일 목록 대장 생성기</h3>
            <p>폴더째 선택하여 내부 파일들의 명칭, 확장자, 크기(KB/MB), 수정일시를 일괄 조사하여 엑셀(CSV) 대장을 만듭니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="folder-drop-zone">
            <div class="drop-zone-icon">📂</div>
            <div class="drop-zone-title">조사할 폴더를 선택하거나 파일들을 선택하세요</div>
            <div class="drop-zone-sub">(Edge/Chrome 환경에서는 폴더를 직접 통째로 선택할 수 있습니다)</div>
            <input type="file" id="folder-file-input" webkitdirectory directory multiple />
          </div>

          <div id="folder-result-area" style="margin-top: 24px; display: none;">
            <div class="stats-grid" id="folder-stats-grid"></div>

            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>폴더 파일 인벤토리 목록</h3>
              </div>
              <button class="btn btn-success" id="btn-download-folder-csv">
                <span>💾</span> 파일목록 대장 CSV 다운로드
              </button>
            </div>

            <div id="folder-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#folder-file-input');
    const resultArea = container.querySelector('#folder-result-area');
    const statsGrid = container.querySelector('#folder-stats-grid');
    const tableContainer = container.querySelector('#folder-table-container');
    const downloadBtn = container.querySelector('#btn-download-folder-csv');

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      CoreUtils.setLoading(true, '파일 목록을 정리하고 있습니다...');
      setTimeout(() => {
        let totalBytes = 0;
        const extMap = new Map();

        const inventory = files.map((f, i) => {
          totalBytes += f.size;
          const ext = f.name.includes('.') ? f.name.split('.').pop().toLowerCase() : '확장자없음';
          extMap.set(ext, (extMap.get(ext) || 0) + 1);

          const dateStr = f.lastModified ? new Date(f.lastModified).toISOString().slice(0, 19).replace('T', ' ') : '';
          const sizeKb = (f.size / 1024).toFixed(1);
          const relPath = f.webkitRelativePath || f.name;

          return [i + 1, f.name, ext, `${sizeKb} KB`, f.size, dateStr, relPath];
        });

        this.state.inventory = inventory;

        const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

        statsGrid.innerHTML = `
          <div class="stat-card">
            <div class="stat-label">총 파일 개수</div>
            <div class="stat-value">${CoreUtils.formatNumber(files.length)}<span class="stat-unit">개</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">총 파일 용량</div>
            <div class="stat-value" style="color: var(--primary);">${totalMb}<span class="stat-unit">MB</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">확장자 종류</div>
            <div class="stat-value" style="color: var(--success);">${extMap.size}<span class="stat-unit">종</span></div>
          </div>
        `;

        const headers = ['연번', '파일명', '확장자', '파일크기', '바이트수', '최종수정일', '상대경로'];
        CoreUtils.renderPreviewTable(tableContainer, headers, inventory);
        resultArea.style.display = 'block';
        CoreUtils.setLoading(false);
        CoreUtils.showToast(`총 ${files.length}개 파일 목록 추출 완료!`, 'success');
      }, 50);
    });

    downloadBtn.addEventListener('click', () => {
      if (this.state.inventory.length === 0) return;
      const headers = ['연번', '파일명', '확장자', '파일크기', '바이트수', '최종수정일', '상대경로'];
      const csv = CoreUtils.toCSV(headers, this.state.inventory);
      CoreUtils.downloadFile(csv, '폴더파일목록_대장.csv');
      CoreUtils.showToast('파일목록 대장이 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   15. CSV 변환
   ========================================================================== */
PortalModules['csv-convert'] = {
  id: 'csv-convert',
  title: 'CSV 변환',
  subtitle: '탭(TSV)·세미콜론 구분자 변환, UTF-8 BOM 변환, 특정 컬럼 추출 및 순서 변경을 지원합니다.',
  category: '파일·사진 도구',

  state: { raw: null, selectedCols: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🔄 CSV 및 텍스트 데이터 형식 변환</h3>
            <p>탭 구분 TXT, 세미콜론(;) 파일 변환, 엑셀용 UTF-8 BOM 인코딩 변환, 필요한 컬럼만 추출합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">⇄</div>
            <div class="drop-zone-title">변환할 CSV 또는 텍스트(.txt) 파일을 선택하세요</div>
            <input type="file" id="convert-file-input" accept=".csv,.txt,.tsv" />
          </div>

          <div id="convert-config-area" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">내보낼 구분자</label>
                <select class="form-select" id="convert-out-delimiter">
                  <option value="," selected>쉼표 (표준 CSV)</option>
                  <option value="\\t">탭 (Tab, TSV/메모장용)</option>
                  <option value=";">세미콜론 (;)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">엑셀 호환 UTF-8 BOM</label>
                <div style="margin-top: 10px;">
                  <label class="form-check">
                    <input type="checkbox" id="convert-use-bom" checked>
                    <span>UTF-8 BOM 포함 (Excel에서 한글 깨짐 방지)</span>
                  </label>
                </div>
              </div>
            </div>

            <div style="margin-top: 16px;">
              <label class="form-label">추출할 컬럼 선택 (체크 해제 시 해당 컬럼 제외)</label>
              <div id="convert-col-checkboxes" style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; background: var(--bg-main); padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-sm);"></div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-convert">
                <span>💾</span> 변환된 파일 다운로드
              </button>
            </div>

            <div id="convert-table-container" style="margin-top: 24px;"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#convert-file-input');
    const configArea = container.querySelector('#convert-config-area');
    const colBoxesContainer = container.querySelector('#convert-col-checkboxes');
    const runBtn = container.querySelector('#btn-run-convert');
    const tableContainer = container.querySelector('#convert-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;

        colBoxesContainer.innerHTML = headers.map((h, i) => `
          <label class="form-check">
            <input type="checkbox" class="convert-col-check" value="${i}" checked>
            <span>${CoreUtils.escapeHtml(h)}</span>
          </label>
        `).join('');

        configArea.style.display = 'block';
        CoreUtils.renderPreviewTable(tableContainer, headers, this.state.raw.rows);
        CoreUtils.showToast(`파일 분석 완료 (${headers.length}개 컬럼)`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const checkedIndices = Array.from(container.querySelectorAll('.convert-col-check:checked')).map(el => parseInt(el.value, 10));
      if (checkedIndices.length === 0) {
        CoreUtils.showToast('최소 하나 이상의 컬럼을 선택해주세요.', 'warning');
        return;
      }

      const delimVal = container.querySelector('#convert-out-delimiter').value;
      const delimiter = delimVal === '\\t' ? '\t' : delimVal;
      const useBom = container.querySelector('#convert-use-bom').checked;

      const outHeaders = checkedIndices.map(i => this.state.raw.headers[i]);
      const outRows = this.state.raw.rows.map(r => checkedIndices.map(i => r[i] || ''));

      let csvStr = CoreUtils.toCSV(outHeaders, outRows, delimiter);
      if (!useBom && csvStr.charCodeAt(0) === 0xFEFF) {
        csvStr = csvStr.slice(1);
      }

      const ext = delimiter === '\t' ? 'tsv' : 'csv';
      CoreUtils.downloadFile(csvStr, `데이터_변환결과.${ext}`);
      CoreUtils.showToast('변환된 파일이 다운로드되었습니다.', 'success');
    });
  }
};
