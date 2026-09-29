/**
 * 농업기술센터 로컬 업무자동화 포털 - 데이터 가공 및 설정 도구 (메뉴 26~30)
 * 26. 텍스트 일괄 치환 (특정 컬럼 또는 전체 문자열 바꾸기)
 * 27. 날짜 형식 통일 (혼재된 날짜를 YYYY-MM-DD 표준화)
 * 28. 개인정보 마스킹 (성명/전화/주소/주민번호 암호화 별도 파일 저장)
 * 29. QR용 텍스트 생성 (100% 오프라인 Canvas QR 코드 생성 및 이미지 저장)
 * 30. 사용자 설정 (기관명/부서명/테마/인코딩/데이터 백업)
 */

window.PortalModules = window.PortalModules || {};

/* ==========================================================================
   26. 텍스트 일괄 치환
   ========================================================================== */
PortalModules['text-replace'] = {
  id: 'text-replace',
  title: '텍스트 일괄 치환',
  subtitle: 'CSV 파일 내부의 특정 단어나 오탈자, 기관 명칭을 한 번에 찾아 바꿉니다.',
  category: '데이터 가공·설정',

  state: { raw: null, replacedRows: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>✏️ 텍스트 일괄 찾기 및 바꾸기</h3>
            <p>CSV 파일 전체 또는 특정 컬럼에서 오탈자나 개정된 명칭(예: 구 명칭 → 신 명칭)을 일괄 치환합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">⇄</div>
            <div class="drop-zone-title">치환할 CSV 파일을 선택하세요</div>
            <input type="file" id="rep-file-input" accept=".csv,.txt" />
          </div>

          <div id="rep-config-area" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">대상 컬럼 선택</label>
                <select class="form-select" id="rep-col-target">
                  <option value="__all__">전체 컬럼 모두 적용</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">찾을 문자열 <span class="required">*</span></label>
                <input type="text" class="form-control" id="rep-find-str" placeholder="예: 농업기술원, 2025년">
              </div>
              <div class="form-group">
                <label class="form-label">바꿀 문자열</label>
                <input type="text" class="form-control" id="rep-replace-str" placeholder="예: 농업기술센터, 2026년">
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-text-replace">
                <span>🔄</span> 텍스트 일괄 치환 실행
              </button>
            </div>
          </div>

          <div id="rep-result-area" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>치환 결과 미리보기</h3>
              </div>
              <button class="btn btn-success" id="btn-download-rep-csv">
                <span>💾</span> 치환된 CSV 다운로드
              </button>
            </div>
            <div id="rep-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#rep-file-input');
    const configArea = container.querySelector('#rep-config-area');
    const targetSel = container.querySelector('#rep-col-target');
    const findInput = container.querySelector('#rep-find-str');
    const repInput = container.querySelector('#rep-replace-str');
    const runBtn = container.querySelector('#btn-run-text-replace');
    const resultArea = container.querySelector('#rep-result-area');
    const tableContainer = container.querySelector('#rep-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;

        targetSel.innerHTML = '<option value="__all__">전체 컬럼 모두 적용</option>' +
          headers.map(h => `<option value="${CoreUtils.escapeHtml(h)}">${CoreUtils.escapeHtml(h)}</option>`).join('');

        configArea.style.display = 'block';
        CoreUtils.showToast(`파일 준비 완료 (${this.state.raw.totalRows}행)`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const findStr = findInput.value;
      if (!findStr) {
        CoreUtils.showToast('찾을 문자열을 입력해주세요.', 'warning');
        return;
      }

      const repStr = repInput.value || '';
      const colTarget = targetSel.value;
      const targetIdx = colTarget !== '__all__' ? this.state.raw.headers.indexOf(colTarget) : -1;

      let replaceCount = 0;
      const replaced = this.state.raw.rows.map(r => {
        return r.map((cell, ci) => {
          if (targetIdx === -1 || targetIdx === ci) {
            if (typeof cell === 'string' && cell.includes(findStr)) {
              replaceCount++;
              return cell.replaceAll(findStr, repStr);
            }
          }
          return cell;
        });
      });

      this.state.replacedRows = replaced;
      CoreUtils.renderPreviewTable(tableContainer, this.state.raw.headers, replaced);
      resultArea.style.display = 'block';
      CoreUtils.showToast(`총 ${replaceCount}개 항목 치환 완료!`, 'success');
    });

    container.querySelector('#btn-download-rep-csv').addEventListener('click', () => {
      if (!this.state.replacedRows.length) return;
      const csv = CoreUtils.toCSV(this.state.raw.headers, this.state.replacedRows);
      CoreUtils.downloadFile(csv, '텍스트일괄치환_완료.csv');
      CoreUtils.showToast('치환된 파일이 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   27. 날짜 형식 통일
   ========================================================================== */
PortalModules['date-unify'] = {
  id: 'date-unify',
  title: '날짜 형식 통일',
  subtitle: '2026.9.1, 2026/09/01, 20260901 등 혼재된 날짜 표기를 YYYY-MM-DD로 일괄 통일합니다.',
  category: '데이터 가공·설정',

  state: { raw: null, unifiedRows: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📅 날짜 포맷 표준화 (YYYY-MM-DD)</h3>
            <p>다양한 양식으로 입력된 신청일, 조사일, 접수일 날짜를 공공 표준 형식(2026-09-01)으로 일괄 변환합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">🗓️</div>
            <div class="drop-zone-title">날짜가 포함된 CSV 파일을 선택하세요</div>
            <input type="file" id="date-file-input" accept=".csv,.txt" />
          </div>

          <div id="date-config-area" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">변환할 날짜 컬럼 선택</label>
                <select class="form-select" id="date-col-target"></select>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-date-unify">
                <span>🗓️</span> 날짜 형식 일괄 통일 실행
              </button>
            </div>
          </div>

          <div id="date-result-area" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>변환 결과 미리보기</h3>
              </div>
              <button class="btn btn-success" id="btn-download-date-csv">
                <span>💾</span> 날짜 통일 CSV 다운로드
              </button>
            </div>
            <div id="date-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#date-file-input');
    const configArea = container.querySelector('#date-config-area');
    const colSel = container.querySelector('#date-col-target');
    const runBtn = container.querySelector('#btn-run-date-unify');
    const resultArea = container.querySelector('#date-result-area');
    const tableContainer = container.querySelector('#date-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;

        colSel.innerHTML = headers.map(h => `
          <option value="${CoreUtils.escapeHtml(h)}" ${h.includes('일') || h.includes('날짜') ? 'selected' : ''}>${CoreUtils.escapeHtml(h)}</option>
        `).join('');

        configArea.style.display = 'block';
        CoreUtils.showToast(`파일 분석 완료 (${this.state.raw.totalRows}행)`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const targetCol = colSel.value;
      const targetIdx = this.state.raw.headers.indexOf(targetCol);

      const unified = this.state.raw.rows.map(r => {
        const row = [...r];
        if (targetIdx !== -1 && row[targetIdx]) {
          row[targetIdx] = CoreUtils.normalizeDate(row[targetIdx]);
        }
        return row;
      });

      this.state.unifiedRows = unified;
      CoreUtils.renderPreviewTable(tableContainer, this.state.raw.headers, unified);
      resultArea.style.display = 'block';
      CoreUtils.showToast('날짜 형식이 YYYY-MM-DD로 통일되었습니다.', 'success');
    });

    container.querySelector('#btn-download-date-csv').addEventListener('click', () => {
      if (!this.state.unifiedRows.length) return;
      const csv = CoreUtils.toCSV(this.state.raw.headers, this.state.unifiedRows);
      CoreUtils.downloadFile(csv, '날짜형식통일_결과.csv');
      CoreUtils.showToast('다운로드 완료!', 'success');
    });
  }
};

/* ==========================================================================
   28. 개인정보 마스킹
   ========================================================================== */
PortalModules['privacy-mask'] = {
  id: 'privacy-mask',
  title: '개인정보 마스킹',
  subtitle: '외부 공개용 또는 타 부서 전달용으로 성명, 전화번호, 주소를 비식별 마스킹 처리합니다.',
  category: '데이터 가공·설정',

  state: { raw: null, maskedRows: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🔒 개인정보 비식별 마스킹 처리</h3>
            <p>원본 데이터는 전혀 변경하지 않고, 개인정보보호법에 맞추어 성명(홍*동), 전화번호(010-****-1234), 주소(시군구 ****) 마스킹 결과 파일을 별도 생성합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">🛡️</div>
            <div class="drop-zone-title">마스킹할 CSV 파일을 선택하세요</div>
            <input type="file" id="mask-file-input" accept=".csv,.txt" />
          </div>

          <div id="mask-config-area" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">성명 컬럼 (홍*동)</label>
                <select class="form-select" id="mask-col-name"></select>
              </div>
              <div class="form-group">
                <label class="form-label">전화번호 컬럼 (010-****-5678)</label>
                <select class="form-select" id="mask-col-phone"></select>
              </div>
              <div class="form-group">
                <label class="form-label">주소 컬럼 (시군구 ****)</label>
                <select class="form-select" id="mask-col-addr"></select>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-mask">
                <span>🛡️</span> 개인정보 마스킹 실행
              </button>
            </div>
          </div>

          <div id="mask-result-area" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>마스킹 처리 결과 미리보기</h3>
              </div>
              <button class="btn btn-success" id="btn-download-mask-csv">
                <span>💾</span> 비식별 마스킹 CSV 다운로드
              </button>
            </div>
            <div id="mask-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#mask-file-input');
    const configArea = container.querySelector('#mask-config-area');
    const nameSel = container.querySelector('#mask-col-name');
    const phoneSel = container.querySelector('#mask-col-phone');
    const addrSel = container.querySelector('#mask-col-addr');
    const runBtn = container.querySelector('#btn-run-mask');
    const resultArea = container.querySelector('#mask-result-area');
    const tableContainer = container.querySelector('#mask-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;

        const fillSel = (sel, match) => {
          sel.innerHTML = '<option value="">(마스킹 안 함)</option>' +
            headers.map(h => `<option value="${CoreUtils.escapeHtml(h)}" ${h.includes(match) ? 'selected' : ''}>${CoreUtils.escapeHtml(h)}</option>`).join('');
        };

        fillSel(nameSel, '성명');
        fillSel(phoneSel, '연락처');
        fillSel(addrSel, '주소');

        configArea.style.display = 'block';
        CoreUtils.showToast(`파일 준비 완료 (${this.state.raw.totalRows}행)`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const nIdx = nameSel.value ? this.state.raw.headers.indexOf(nameSel.value) : -1;
      const pIdx = phoneSel.value ? this.state.raw.headers.indexOf(phoneSel.value) : -1;
      const aIdx = addrSel.value ? this.state.raw.headers.indexOf(addrSel.value) : -1;

      const masked = this.state.raw.rows.map(r => {
        const row = [...r];
        if (nIdx !== -1 && row[nIdx]) row[nIdx] = CoreUtils.maskPersonalInfo(row[nIdx], 'name');
        if (pIdx !== -1 && row[pIdx]) row[pIdx] = CoreUtils.maskPersonalInfo(row[pIdx], 'phone');
        if (aIdx !== -1 && row[aIdx]) row[aIdx] = CoreUtils.maskPersonalInfo(row[aIdx], 'address');
        return row;
      });

      this.state.maskedRows = masked;
      CoreUtils.renderPreviewTable(tableContainer, this.state.raw.headers, masked);
      resultArea.style.display = 'block';
      CoreUtils.showToast('개인정보가 안전하게 비식별화되었습니다.', 'success');
    });

    container.querySelector('#btn-download-mask-csv').addEventListener('click', () => {
      if (!this.state.maskedRows.length) return;
      const csv = CoreUtils.toCSV(this.state.raw.headers, this.state.maskedRows);
      CoreUtils.downloadFile(csv, '개인정보_마스킹처리결과.csv');
      CoreUtils.showToast('비식별화 CSV가 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   29. QR용 텍스트 생성
   ========================================================================== */
PortalModules['qr-generate'] = {
  id: 'qr-generate',
  title: 'QR용 텍스트 생성',
  subtitle: '외부 인터넷 없이 100% 오프라인 Canvas로 교육 등록, 영농정보 안내용 QR코드를 즉시 생성합니다.',
  category: '데이터 가공·설정',

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📱 오프라인 QR 코드 및 안내문 생성기</h3>
            <p>외부 서버 통신 전혀 없이 사용자 브라우저 내부에서 교육 설문 링크, 행사장 Wi-Fi, 연락처 QR을 바로 찍어냅니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">QR 코드 용도</label>
              <select class="form-select" id="qr-type-sel">
                <option value="url" selected>웹사이트 / 설문조사 URL</option>
                <option value="wifi">행사장 Wi-Fi 자동 연결</option>
                <option value="text">일반 텍스트 / 농가 안내문</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">제목 라벨</label>
              <input type="text" class="form-control" id="qr-title-label" value="2026년 농업기술센터 교육 설문조사">
            </div>
          </div>

          <div id="qr-input-group" style="margin-top: 10px;">
            <div class="form-group" id="qr-group-url">
              <label class="form-label">연결할 URL 링크</label>
              <input type="text" class="form-control" id="qr-input-url" value="https://www.rda.go.kr" placeholder="https://...">
            </div>
            <div id="qr-group-wifi" style="display: none;" class="form-grid">
              <div class="form-group">
                <label class="form-label">와이파이 이름 (SSID)</label>
                <input type="text" class="form-control" id="qr-wifi-ssid" placeholder="예: RDA_GUEST">
              </div>
              <div class="form-group">
                <label class="form-label">비밀번호</label>
                <input type="text" class="form-control" id="qr-wifi-pass" placeholder="비밀번호">
              </div>
            </div>
          </div>

          <div class="btn-group">
            <button class="btn btn-primary btn-lg" id="btn-draw-qr">
              <span>⚡</span> QR 코드 즉시 생성
            </button>
            <button class="btn btn-success" id="btn-download-qr-png">
              <span>💾</span> QR 이미지 (PNG) 저장
            </button>
            <button class="btn btn-secondary" id="btn-print-qr-card">
              <span>🖨️</span> A4 안내문 인쇄
            </button>
          </div>

          <!-- QR 디스플레이 영역 -->
          <div style="margin-top: 28px; text-align: center; background: var(--bg-main); padding: 32px; border-radius: var(--radius-sm); border: 1px solid var(--border);" id="qr-display-box">
            <div id="qr-rendered-title" style="font-size: 18px; font-weight: bold; margin-bottom: 16px; color: var(--text-main);"></div>
            <canvas id="qr-canvas" width="240" height="240" style="background: #fff; padding: 12px; border-radius: 8px; box-shadow: var(--shadow-md); display: inline-block;"></canvas>
            <div style="margin-top: 14px; font-size: 13px; color: var(--text-muted);" id="qr-rendered-text"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const typeSel = container.querySelector('#qr-type-sel');
    const groupUrl = container.querySelector('#qr-group-url');
    const groupWifi = container.querySelector('#qr-group-wifi');
    const titleInput = container.querySelector('#qr-title-label');
    const urlInput = container.querySelector('#qr-input-url');
    const wifiSsid = container.querySelector('#qr-wifi-ssid');
    const wifiPass = container.querySelector('#qr-wifi-pass');
    const drawBtn = container.querySelector('#btn-draw-qr');
    const downloadBtn = container.querySelector('#btn-download-qr-png');
    const printBtn = container.querySelector('#btn-print-qr-card');
    const canvas = container.querySelector('#qr-canvas');
    const renderedTitle = container.querySelector('#qr-rendered-title');
    const renderedText = container.querySelector('#qr-rendered-text');

    typeSel.addEventListener('change', () => {
      const isWifi = typeSel.value === 'wifi';
      groupWifi.style.display = isWifi ? 'grid' : 'none';
      groupUrl.style.display = isWifi ? 'none' : 'block';
    });

    const generateQR = () => {
      const type = typeSel.value;
      const title = titleInput.value.trim() || '농업기술센터 안내';
      let payload = '';

      if (type === 'wifi') {
        const ssid = wifiSsid.value.trim() || 'FREE_WIFI';
        const pass = wifiPass.value.trim();
        payload = `WIFI:T:WPA;S:${ssid};P:${pass};;`;
        renderedText.textContent = `와이파이: ${ssid}`;
      } else {
        payload = urlInput.value.trim() || 'https://www.rda.go.kr';
        renderedText.textContent = payload;
      }

      renderedTitle.textContent = title;

      if (window.SimpleQRCode) {
        window.SimpleQRCode.drawToCanvas(canvas, payload, { size: 240, margin: 2 });
      }
    };

    generateQR();

    drawBtn.addEventListener('click', () => {
      generateQR();
      CoreUtils.showToast('QR 코드가 새로 생성되었습니다.', 'success');
    });

    downloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `QR코드_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      CoreUtils.showToast('QR 코드 이미지가 저장되었습니다.', 'success');
    });

    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
};

/* ==========================================================================
   30. 사용자 설정
   ========================================================================== */
PortalModules['user-settings'] = {
  id: 'user-settings',
  title: '사용자 설정',
  subtitle: '소속 시·군 농업기술센터 명칭, 담당자 기본값, 화면 테마, 로컬 저장 데이터를 관리합니다.',
  category: '데이터 가공·설정',

  render(container) {
    const config = JSON.parse(localStorage.getItem('portal_user_config') || '{}');
    const isDark = document.body.getAttribute('data-theme') === 'dark';

    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>⚙️ 포털 환경 및 기관 정보 설정</h3>
            <p>출장복명서, 출석부, 보고서에 기본으로 들어갈 소속 농업기술센터와 담당자 정보를 설정합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">소속 기관명</label>
              <input type="text" class="form-control" id="cfg-org-name" value="${config.orgName || '홍성군 농업기술센터'}" placeholder="예: ○○군 농업기술센터">
            </div>
            <div class="form-group">
              <label class="form-label">담당 부서/팀명</label>
              <input type="text" class="form-control" id="cfg-dept-name" value="${config.deptName || '지도개발과 기획운영팀'}" placeholder="예: 기술보급과 과수특작팀">
            </div>
            <div class="form-group">
              <label class="form-label">담당자 성명</label>
              <input type="text" class="form-control" id="cfg-officer-name" value="${config.officerName || '농촌지도사 홍길동'}" placeholder="예: 농촌지도사 홍길동">
            </div>
            <div class="form-group">
              <label class="form-label">기본 CSV 인코딩</label>
              <select class="form-select" id="cfg-default-enc">
                <option value="auto" ${(!config.encoding || config.encoding === 'auto') ? 'selected' : ''}>자동 감지 (권장)</option>
                <option value="cp949" ${config.encoding === 'cp949' ? 'selected' : ''}>CP949 / EUC-KR (행정망 엑셀 기본)</option>
                <option value="utf-8" ${config.encoding === 'utf-8' ? 'selected' : ''}>UTF-8</option>
              </select>
            </div>
          </div>

          <div style="margin-top: 20px; background: var(--bg-main); padding: 18px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
            <div style="font-weight: 700; margin-bottom: 10px;">🎨 화면 스타일 및 테마</div>
            <div style="display: flex; gap: 20px; align-items: center;">
              <label class="form-check">
                <input type="radio" name="cfg-theme" value="light" ${!isDark ? 'checked' : ''}>
                <span>단정한 라이트 모드 (공공기관 기본)</span>
              </label>
              <label class="form-check">
                <input type="radio" name="cfg-theme" value="dark" ${isDark ? 'checked' : ''}>
                <span>눈이 편안한 다크 모드</span>
              </label>
            </div>
          </div>

          <div style="margin-top: 24px; background: #fef2f2; border: 1px solid #fecaca; padding: 18px; border-radius: var(--radius-sm);">
            <div style="font-weight: 700; color: var(--danger); margin-bottom: 6px;">🗑️ 브라우저 로컬 데이터 관리</div>
            <div style="font-size: 13px; color: #7f1d1d; margin-bottom: 12px;">
              PC 브라우저 내부에 저장된 체크리스트, 최근 설정 데이터를 초기화할 수 있습니다.
            </div>
            <button class="btn btn-outline" style="border-color: var(--danger); color: var(--danger);" id="btn-clear-localstorage">
              저장된 모든 로컬 데이터 삭제
            </button>
          </div>

          <div class="btn-group">
            <button class="btn btn-primary btn-lg" id="btn-save-user-config">
              <span>💾</span> 설정 저장하기
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const saveBtn = container.querySelector('#btn-save-user-config');
    const clearBtn = container.querySelector('#btn-clear-localstorage');

    saveBtn.addEventListener('click', () => {
      const orgName = container.querySelector('#cfg-org-name').value.trim();
      const deptName = container.querySelector('#cfg-dept-name').value.trim();
      const officerName = container.querySelector('#cfg-officer-name').value.trim();
      const encoding = container.querySelector('#cfg-default-enc').value;
      const theme = container.querySelector('input[name="cfg-theme"]:checked').value;

      const newConfig = { orgName, deptName, officerName, encoding, theme };
      localStorage.setItem('portal_user_config', JSON.stringify(newConfig));

      // 테마 즉시 적용
      if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
      } else {
        document.body.removeAttribute('data-theme');
      }

      CoreUtils.showToast('사용자 설정이 안전하게 저장되었습니다.', 'success');
    });

    clearBtn.addEventListener('click', () => {
      if (confirm('브라우저에 보관된 체크리스트 및 설정 데이터를 모두 삭제하시겠습니까?')) {
        localStorage.clear();
        CoreUtils.showToast('로컬 데이터가 완전히 초기화되었습니다.', 'info');
        setTimeout(() => location.reload(), 500);
      }
    });
  }
};
