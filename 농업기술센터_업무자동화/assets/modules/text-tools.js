/**
 * 농업기술센터 로컬 업무자동화 포털 - 텍스트 및 통계 도구 (메뉴 16~20)
 * 16. 문자 발송용 명단 생성 (대량 SMS 발송기 전용 포맷, 중복 제거)
 * 17. 주소·전화번호 정리 (연속공백 제거, 전화번호 유효성 검사)
 * 18. 농가별 통계 (농가별 사업비/면적/참여건수 합계 및 평균)
 * 19. 읍면별 통계 (관내 읍·면별 농가수, 재배면적, 지원사업 통계)
 * 20. 월간/분기 실적 집계 (날짜 기반 월별/분기별/반기별 피벗 집계)
 */

window.PortalModules = window.PortalModules || {};

/* ==========================================================================
   16. 문자 발송용 명단 생성
   ========================================================================== */
PortalModules['sms-list'] = {
  id: 'sms-list',
  title: '문자 발송용 명단 생성',
  subtitle: '농가 명단에서 성명과 휴대폰번호만 추출하고, 010-XXXX-XXXX 표준화 및 중복 번호를 자동 제거합니다.',
  category: '통계·보고서',

  state: { raw: null, smsRows: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📱 대량 문자(SMS) 발송용 명단 추출</h3>
            <p>영농기술 정보, 긴급 병해충 방제, 교육 안내 문자 발송 시스템에 바로 업로드할 수 있는 깨끗한 명단을 생성합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">💬</div>
            <div class="drop-zone-title">농가 또는 교육생 CSV 파일을 선택하세요</div>
            <input type="file" id="sms-file-input" accept=".csv,.txt" />
          </div>

          <div id="sms-config-area" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">성명 컬럼</label>
                <select class="form-select" id="sms-col-name"></select>
              </div>
              <div class="form-group">
                <label class="form-label">전화번호 컬럼</label>
                <select class="form-select" id="sms-col-phone"></select>
              </div>
              <div class="form-group">
                <label class="form-label">중복 번호 처리</label>
                <div style="margin-top: 10px;">
                  <label class="form-check">
                    <input type="checkbox" id="sms-dedup" checked>
                    <span>동일 번호는 1건만 남기고 중복 제거</span>
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">번호 형식</label>
                <select class="form-select" id="sms-format">
                  <option value="hyphen" selected>하이픈 포함 (010-1234-5678)</option>
                  <option value="raw">숫자만 (01012345678)</option>
                </select>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-sms">
                <span>📱</span> 문자 발송용 명단 생성 실행
              </button>
            </div>
          </div>

          <div id="sms-result-area" style="margin-top: 28px; display: none;">
            <div class="stats-grid" id="sms-stats-grid"></div>

            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>발송 대상 명단 미리보기</h3>
              </div>
              <button class="btn btn-success" id="btn-download-sms-csv">
                <span>💾</span> 문자발송용 CSV 다운로드
              </button>
            </div>

            <div id="sms-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#sms-file-input');
    const configArea = container.querySelector('#sms-config-area');
    const colNameSel = container.querySelector('#sms-col-name');
    const colPhoneSel = container.querySelector('#sms-col-phone');
    const runBtn = container.querySelector('#btn-run-sms');
    const resultArea = container.querySelector('#sms-result-area');
    const statsGrid = container.querySelector('#sms-stats-grid');
    const tableContainer = container.querySelector('#sms-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;

        const fillSel = (sel, match) => {
          sel.innerHTML = headers.map(h => `
            <option value="${CoreUtils.escapeHtml(h)}" ${h.includes(match) ? 'selected' : ''}>${CoreUtils.escapeHtml(h)}</option>
          `).join('');
        };

        fillSel(colNameSel, '성명');
        fillSel(colPhoneSel, '연락처');

        configArea.style.display = 'block';
        CoreUtils.showToast(`파일 로드 완료 (${this.state.raw.totalRows}행)`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const nameCol = colNameSel.value;
      const phoneCol = colPhoneSel.value;
      const nameIdx = this.state.raw.headers.indexOf(nameCol);
      const phoneIdx = this.state.raw.headers.indexOf(phoneCol);

      const doDedup = container.querySelector('#sms-dedup').checked;
      const formatOpt = container.querySelector('#sms-format').value;

      const seenPhones = new Set();
      const validRows = [];
      let invalidCount = 0;
      let dupCount = 0;

      this.state.raw.rows.forEach((r, idx) => {
        const name = (r[nameIdx] || '').trim();
        const rawPhone = (r[phoneIdx] || '').trim();
        const digits = rawPhone.replace(/[^0-9]/g, '');

        if (!digits || digits.length < 9 || digits.length > 11 || !digits.startsWith('0')) {
          invalidCount++;
          return;
        }

        const normPhone = CoreUtils.normalizePhone(digits);
        const finalPhone = formatOpt === 'raw' ? digits : normPhone;

        if (doDedup) {
          if (seenPhones.has(normPhone)) {
            dupCount++;
            return;
          }
          seenPhones.add(normPhone);
        }

        validRows.push([validRows.length + 1, name, finalPhone]);
      });

      this.state.smsRows = validRows;

      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">유효 발송 대상</div>
          <div class="stat-value" style="color: var(--primary);">${CoreUtils.formatNumber(validRows.length)}<span class="stat-unit">명</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">제거된 중복 번호</div>
          <div class="stat-value" style="color: var(--warning);">${CoreUtils.formatNumber(dupCount)}<span class="stat-unit">건</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">오류 번호 제외</div>
          <div class="stat-value" style="color: var(--danger);">${CoreUtils.formatNumber(invalidCount)}<span class="stat-unit">건</span></div>
        </div>
      `;

      CoreUtils.renderPreviewTable(tableContainer, ['연번', '성명', '수신번호'], validRows);
      resultArea.style.display = 'block';
      CoreUtils.showToast(`문자 발송 명단 ${validRows.length}명 생성 완료!`, 'success');
    });

    container.querySelector('#btn-download-sms-csv').addEventListener('click', () => {
      if (!this.state.smsRows || this.state.smsRows.length === 0) return;
      const csv = CoreUtils.toCSV(['연번', '성명', '수신번호'], this.state.smsRows);
      CoreUtils.downloadFile(csv, '문자발송_정리명단.csv');
      CoreUtils.showToast('문자 발송용 CSV가 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   17. 주소·전화번호 정리
   ========================================================================== */
PortalModules['address-phone'] = {
  id: 'address-phone',
  title: '주소·전화번호 정리',
  subtitle: '주소의 연속 공백/특수문자 정리, 전화번호 숫자 추출 및 하이픈 표준화를 수행합니다.',
  category: '통계·보고서',

  state: { raw: null, cleanedRows: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🏠 주소 및 연락처 데이터 전처리</h3>
            <p>공공데이터의 가장 흔한 오류인 불필요한 연속 공백, 비표준 전화번호 기호를 일괄 정제합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">📮</div>
            <div class="drop-zone-title">정리할 CSV 파일을 선택하세요</div>
            <input type="file" id="addr-file-input" accept=".csv,.txt" />
          </div>

          <div id="addr-config-area" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">주소 컬럼</label>
                <select class="form-select" id="addr-col-addr"></select>
              </div>
              <div class="form-group">
                <label class="form-label">전화번호 컬럼</label>
                <select class="form-select" id="addr-col-phone"></select>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-addr-clean">
                <span>✨</span> 주소 및 전화번호 표준화 실행
              </button>
            </div>
          </div>

          <div id="addr-result-area" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>정리 결과 미리보기</h3>
              </div>
              <button class="btn btn-success" id="btn-download-addr-csv">
                <span>💾</span> 정제된 데이터 CSV 다운로드
              </button>
            </div>

            <div id="addr-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#addr-file-input');
    const configArea = container.querySelector('#addr-config-area');
    const colAddrSel = container.querySelector('#addr-col-addr');
    const colPhoneSel = container.querySelector('#addr-col-phone');
    const runBtn = container.querySelector('#btn-run-addr-clean');
    const resultArea = container.querySelector('#addr-result-area');
    const tableContainer = container.querySelector('#addr-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;

        const fillSel = (sel, match) => {
          sel.innerHTML = headers.map(h => `
            <option value="${CoreUtils.escapeHtml(h)}" ${h.includes(match) ? 'selected' : ''}>${CoreUtils.escapeHtml(h)}</option>
          `).join('');
        };

        fillSel(colAddrSel, '주소');
        fillSel(colPhoneSel, '연락처');

        configArea.style.display = 'block';
        CoreUtils.showToast(`파일 준비 완료 (${this.state.raw.totalRows}행)`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const addrCol = colAddrSel.value;
      const phoneCol = colPhoneSel.value;
      const addrIdx = this.state.raw.headers.indexOf(addrCol);
      const phoneIdx = this.state.raw.headers.indexOf(phoneCol);

      const cleaned = this.state.raw.rows.map(r => {
        const row = [...r];
        if (addrIdx !== -1 && row[addrIdx]) {
          row[addrIdx] = row[addrIdx].trim().replace(/\s{2,}/g, ' ');
        }
        if (phoneIdx !== -1 && row[phoneIdx]) {
          row[phoneIdx] = CoreUtils.normalizePhone(row[phoneIdx]);
        }
        return row;
      });

      this.state.cleanedRows = cleaned;
      CoreUtils.renderPreviewTable(tableContainer, this.state.raw.headers, cleaned);
      resultArea.style.display = 'block';
      CoreUtils.showToast('주소 및 전화번호가 표준화되었습니다.', 'success');
    });

    container.querySelector('#btn-download-addr-csv').addEventListener('click', () => {
      if (!this.state.cleanedRows.length) return;
      const csv = CoreUtils.toCSV(this.state.raw.headers, this.state.cleanedRows);
      CoreUtils.downloadFile(csv, '주소전화번호_정리완료.csv');
      CoreUtils.showToast('정리 완료 파일이 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   18. 농가별 통계
   ========================================================================== */
PortalModules['farmer-stats'] = {
  id: 'farmer-stats',
  title: '농가별 통계',
  subtitle: '농가별 사업비 합계, 참여사업 수, 교육참여 횟수, 재배면적 합계를 자동 집계합니다.',
  category: '통계·보고서',

  state: { raw: null, stats: null },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🌾 농가별 다차원 실적 집계</h3>
            <p>사업실적 또는 농가 데이터를 기반으로 농가별 총 지원금, 사업 참여 건수, 재배면적을 집계합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">📊</div>
            <div class="drop-zone-title">집계할 CSV 파일을 선택하세요</div>
            <input type="file" id="farmer-stat-file" accept=".csv,.txt" />
          </div>

          <div id="farmer-stat-config" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">농가 식별 컬럼 (기준)</label>
                <select class="form-select" id="fstat-col-group"></select>
              </div>
              <div class="form-group">
                <label class="form-label">합산할 숫자 컬럼 (예: 사업비, 면적)</label>
                <select class="form-select" id="fstat-col-val"></select>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-fstat">
                <span>📈</span> 농가별 실적 집계 실행
              </button>
            </div>
          </div>

          <div id="farmer-stat-result" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>농가별 집계 리포트</h3>
              </div>
              <button class="btn btn-success" id="btn-download-fstat-csv">
                <span>💾</span> 집계 결과 CSV 다운로드
              </button>
            </div>
            <div id="farmer-stat-table"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#farmer-stat-file');
    const configArea = container.querySelector('#farmer-stat-config');
    const groupSel = container.querySelector('#fstat-col-group');
    const valSel = container.querySelector('#fstat-col-val');
    const runBtn = container.querySelector('#btn-run-fstat');
    const resultArea = container.querySelector('#farmer-stat-result');
    const tableContainer = container.querySelector('#farmer-stat-table');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;

        groupSel.innerHTML = headers.map(h => `
          <option value="${CoreUtils.escapeHtml(h)}" ${h.includes('농가') || h.includes('성명') ? 'selected' : ''}>${CoreUtils.escapeHtml(h)}</option>
        `).join('');

        valSel.innerHTML = headers.map(h => `
          <option value="${CoreUtils.escapeHtml(h)}" ${h.includes('사업비') || h.includes('면적') ? 'selected' : ''}>${CoreUtils.escapeHtml(h)}</option>
        `).join('');

        configArea.style.display = 'block';
        CoreUtils.showToast(`파일 준비 완료 (${this.state.raw.totalRows}행)`, 'info');
      } catch (err) {
        CoreUtils.showToast('오류 발생: ' + err.message, 'error');
      }
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const groupCol = groupSel.value;
      const valCol = valSel.value;
      const gIdx = this.state.raw.headers.indexOf(groupCol);
      const vIdx = this.state.raw.headers.indexOf(valCol);

      const map = new Map(); // key -> { count, sum }
      this.state.raw.rows.forEach(r => {
        const key = (r[gIdx] || '').trim();
        if (!key) return;
        const val = CoreUtils.parseNumber(r[vIdx]);

        if (!map.has(key)) {
          map.set(key, { count: 0, sum: 0 });
        }
        const item = map.get(key);
        item.count++;
        item.sum += val;
      });

      const sorted = Array.from(map.entries()).sort((a, b) => b[1].sum - a[1].sum);
      const headers = ['연번', groupCol, '참여/등록건수', `${valCol} 합계`, `${valCol} 평균`];
      const rows = sorted.map(([k, stat], idx) => [
        idx + 1,
        k,
        `${stat.count}건`,
        CoreUtils.formatNumber(stat.sum),
        CoreUtils.formatNumber(stat.count > 0 ? stat.sum / stat.count : 0, 1)
      ]);

      this.state.stats = { headers, rows };
      CoreUtils.renderPreviewTable(tableContainer, headers, rows);
      resultArea.style.display = 'block';
      CoreUtils.showToast(`총 ${sorted.length}개 농가 집계 완료!`, 'success');
    });

    container.querySelector('#btn-download-fstat-csv').addEventListener('click', () => {
      if (!this.state.stats) return;
      const csv = CoreUtils.toCSV(this.state.stats.headers, this.state.stats.rows);
      CoreUtils.downloadFile(csv, '농가별_실적통계집계.csv');
      CoreUtils.showToast('농가별 통계 CSV가 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   19. 읍면별 통계
   ========================================================================== */
PortalModules['town-stats'] = {
  id: 'town-stats',
  title: '읍면별 통계',
  subtitle: '관내 읍·면을 기준으로 농가 수, 총 재배면적, 지원 사업비, 참여 건수를 한눈에 비교합니다.',
  category: '통계·보고서',

  state: { raw: null, stats: null },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🏛️ 읍·면별 농업 행정 통계 집계</h3>
            <p>관내 읍·면 행정구역별로 농가 분포, 총 면적, 사업비 예산 투입액을 비교 차트와 표로 정리합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">🗺️</div>
            <div class="drop-zone-title">읍면 정보가 포함된 CSV 파일을 선택하세요</div>
            <input type="file" id="town-stat-file" accept=".csv,.txt" />
          </div>

          <div id="town-stat-result" style="margin-top: 24px; display: none;">
            <div class="work-card" style="margin-bottom: 24px;">
              <div class="card-header"><h4>📊 읍·면별 실적 비교 그래프</h4></div>
              <div class="card-body" style="padding: 16px;">
                <canvas id="town-chart" width="500" height="260" style="width: 100%;"></canvas>
              </div>
            </div>

            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>읍·면별 총괄 집계표</h3>
              </div>
              <button class="btn btn-success" id="btn-download-town-csv">
                <span>💾</span> 읍면별 집계표 CSV 다운로드
              </button>
            </div>
            <div id="town-stat-table"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#town-stat-file');
    const resultArea = container.querySelector('#town-stat-result');
    const tableContainer = container.querySelector('#town-stat-table');
    const canvas = container.querySelector('#town-chart');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;
        const rows = this.state.raw.rows;

        const townIdx = headers.findIndex(h => h.includes('읍면') || h.includes('소속') || h.includes('지역'));
        const valIdx = headers.findIndex(h => h.includes('사업비') || h.includes('면적'));

        if (townIdx === -1) {
          CoreUtils.showToast('읍·면 행정구역 컬럼을 찾을 수 없습니다.', 'warning');
          return;
        }

        const map = new Map();
        rows.forEach(r => {
          const town = (r[townIdx] || '').trim();
          if (!town) return;
          const val = valIdx !== -1 ? CoreUtils.parseNumber(r[valIdx]) : 1;

          if (!map.has(town)) {
            map.set(town, { count: 0, sum: 0 });
          }
          const item = map.get(town);
          item.count++;
          item.sum += val;
        });

        const sorted = Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const chartItems = sorted.slice(0, 10).map(([k, v]) => ({ label: k, value: v.count }));
        CoreUtils.drawBarChart(canvas, chartItems, { unit: '건', isDark, title: '읍·면별 총 등록/참여 건수' });

        const valName = valIdx !== -1 ? headers[valIdx] : '건수';
        const outHeaders = ['연번', '읍·면명', '등록/참여 농가수', `${valName} 합계`];
        const outRows = sorted.map(([k, v], idx) => [
          idx + 1,
          k,
          `${CoreUtils.formatNumber(v.count)}건`,
          CoreUtils.formatNumber(v.sum)
        ]);

        this.state.stats = { headers: outHeaders, rows: outRows };
        CoreUtils.renderPreviewTable(tableContainer, outHeaders, outRows);
        resultArea.style.display = 'block';
        CoreUtils.showToast(`읍·면 ${sorted.length}곳 분석 완료!`, 'success');
      } catch (err) {
        CoreUtils.showToast('오류 발생: ' + err.message, 'error');
      }
    });

    container.querySelector('#btn-download-town-csv').addEventListener('click', () => {
      if (!this.state.stats) return;
      const csv = CoreUtils.toCSV(this.state.stats.headers, this.state.stats.rows);
      CoreUtils.downloadFile(csv, '읍면별_농업행정통계.csv');
      CoreUtils.showToast('읍면별 통계가 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   20. 월간/분기 실적 집계
   ========================================================================== */
PortalModules['period-stats'] = {
  id: 'period-stats',
  title: '월간/분기 실적 집계',
  subtitle: '날짜 컬럼을 분석하여 월별, 분기별(1~4분기), 반기별, 연간 추진 실적과 예산을 자동 피벗 집계합니다.',
  category: '통계·보고서',

  state: { raw: null, periodRows: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📅 기간별(월별·분기별) 실적 피벗 집계</h3>
            <p>일자별로 작성된 사업실적, 출장기록, 영농상담 내역을 월별/분기별로 자동 그룹화합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone">
            <div class="drop-zone-icon">🗓️</div>
            <div class="drop-zone-title">날짜가 포함된 CSV 파일을 선택하세요</div>
            <input type="file" id="period-stat-file" accept=".csv,.txt" />
          </div>

          <div id="period-stat-config" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">날짜 컬럼</label>
                <select class="form-select" id="period-col-date"></select>
              </div>
              <div class="form-group">
                <label class="form-label">집계 단위</label>
                <select class="form-select" id="period-group-unit">
                  <option value="month" selected>월별 (1월~12월)</option>
                  <option value="quarter">분기별 (1분기~4분기)</option>
                  <option value="half">반기별 (상반기 / 하반기)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">금액/수치 컬럼 (선택)</label>
                <select class="form-select" id="period-col-val">
                  <option value="">(건수만 집계)</option>
                </select>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-period">
                <span>📊</span> 기간별 피벗 집계 실행
              </button>
            </div>
          </div>

          <div id="period-stat-result" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>기간별 실적 집계표</h3>
              </div>
              <button class="btn btn-success" id="btn-download-period-csv">
                <span>💾</span> 피벗 집계 결과 CSV 다운로드
              </button>
            </div>
            <div id="period-stat-table"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#period-stat-file');
    const configArea = container.querySelector('#period-stat-config');
    const dateSel = container.querySelector('#period-col-date');
    const unitSel = container.querySelector('#period-group-unit');
    const valSel = container.querySelector('#period-col-val');
    const runBtn = container.querySelector('#btn-run-period');
    const resultArea = container.querySelector('#period-stat-result');
    const tableContainer = container.querySelector('#period-stat-table');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;

        dateSel.innerHTML = headers.map(h => `
          <option value="${CoreUtils.escapeHtml(h)}" ${h.includes('일') || h.includes('날짜') || h.includes('연도') ? 'selected' : ''}>${CoreUtils.escapeHtml(h)}</option>
        `).join('');

        valSel.innerHTML = '<option value="">(건수만 집계)</option>' +
          headers.map(h => `<option value="${CoreUtils.escapeHtml(h)}">${CoreUtils.escapeHtml(h)}</option>`).join('');

        configArea.style.display = 'block';
        CoreUtils.showToast(`파일 분석 완료 (${this.state.raw.totalRows}행)`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const dateCol = dateSel.value;
      const unit = unitSel.value;
      const valCol = valSel.value;

      const dIdx = this.state.raw.headers.indexOf(dateCol);
      const vIdx = valCol ? this.state.raw.headers.indexOf(valCol) : -1;

      const periodMap = new Map();

      this.state.raw.rows.forEach(r => {
        const rawDate = (r[dIdx] || '').trim();
        const normDate = CoreUtils.normalizeDate(rawDate);
        if (!normDate || normDate.length < 7) return;

        const year = normDate.slice(0, 4);
        const month = parseInt(normDate.slice(5, 7), 10);
        let periodKey = '';

        if (unit === 'month') {
          periodKey = `${year}년 ${month}월`;
        } else if (unit === 'quarter') {
          const q = Math.ceil(month / 3);
          periodKey = `${year}년 ${q}분기`;
        } else {
          const h = month <= 6 ? '상반기' : '하반기';
          periodKey = `${year}년 ${h}`;
        }

        const val = vIdx !== -1 ? CoreUtils.parseNumber(r[vIdx]) : 0;
        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, { count: 0, sum: 0 });
        }
        const item = periodMap.get(periodKey);
        item.count++;
        item.sum += val;
      });

      const sorted = Array.from(periodMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const outHeaders = ['구분 기간', '건수', ...(valCol ? [`${valCol} 합계`] : [])];
      const outRows = sorted.map(([k, v]) => [
        k,
        `${v.count}건`,
        ...(valCol ? [CoreUtils.formatNumber(v.sum)] : [])
      ]);

      this.state.periodRows = { headers: outHeaders, rows: outRows };
      CoreUtils.renderPreviewTable(tableContainer, outHeaders, outRows);
      resultArea.style.display = 'block';
      CoreUtils.showToast('기간별 실적 집계 완료!', 'success');
    });

    container.querySelector('#btn-download-period-csv').addEventListener('click', () => {
      if (!this.state.periodRows) return;
      const csv = CoreUtils.toCSV(this.state.periodRows.headers, this.state.periodRows.rows);
      CoreUtils.downloadFile(csv, '기간별_실적피벗집계.csv');
      CoreUtils.showToast('집계 결과가 다운로드되었습니다.', 'success');
    });
  }
};
