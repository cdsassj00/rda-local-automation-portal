/**
 * 농업기술센터 로컬 업무자동화 포털 - 데이터 도구 2 (메뉴 6~10)
 * 6. 만족도 조사 집계 (순수 Canvas 차트 & 보고서)
 * 7. 시범사업 신청자 정리 (규칙 기반 우선순위 점수제)
 * 8. 사업실적 집계 (국비/지방비/자부담, 완료율)
 * 9. 현장조사 데이터 정리 (지도/병해충 예찰 데이터)
 * 10. 출장기록 작성 (출장복명서 표준 행정양식 출력)
 */

window.PortalModules = window.PortalModules || {};

/* ==========================================================================
   6. 만족도 조사 집계
   ========================================================================== */
PortalModules['survey-analysis'] = {
  id: 'survey-analysis',
  title: '만족도 조사 집계',
  subtitle: '외부 차트 라이브러리 없이 순수 Canvas로 교육 만족도 설문을 분석하고 보고서를 생성합니다.',
  category: '사업·현장·출장',

  state: { raw: null, summary: null },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📊 교육/사업 만족도 조사 통계 분석</h3>
            <p>설문 응답 CSV를 불러와 문항별 평균, 최고/최저점, 긍정 응답률(4~5점), 차트를 자동 생성합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="survey-drop-zone">
            <div class="drop-zone-icon">📈</div>
            <div class="drop-zone-title">만족도 설문조사 CSV 파일을 선택하세요</div>
            <div class="drop-zone-sub">(샘플 폴더의 '만족도조사_샘플.csv'를 사용해보세요)</div>
            <input type="file" id="survey-file-input" accept=".csv,.txt" />
          </div>

          <div id="survey-result-area" style="margin-top: 24px; display: none;">
            <div class="stats-grid" id="survey-stats-grid"></div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
              <div class="work-card" style="margin-bottom: 0;">
                <div class="card-header"><h4>📊 문항별 만족도 점수 비교 (5점 만점)</h4></div>
                <div class="card-body" style="padding: 16px;">
                  <canvas id="survey-chart-items" width="460" height="260" style="width: 100%;"></canvas>
                </div>
              </div>
              <div class="work-card" style="margin-bottom: 0;">
                <div class="card-header"><h4>👍 긍정 응답 비율 (만족/매우만족 %)</h4></div>
                <div class="card-body" style="padding: 16px;">
                  <canvas id="survey-chart-pos" width="460" height="260" style="width: 100%;"></canvas>
                </div>
              </div>
            </div>

            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>📋 문항별 정밀 분석표</h3>
              </div>
              <div class="btn-group" style="margin-top: 0;">
                <button class="btn btn-primary" id="btn-print-survey-report">
                  <span>🖨️</span> 만족도 결과보고서 인쇄 / PDF 저장
                </button>
                <button class="btn btn-success" id="btn-download-survey-summary">
                  <span>💾</span> 집계 결과 CSV 다운로드
                </button>
              </div>
            </div>

            <div id="survey-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#survey-file-input');
    const resultArea = container.querySelector('#survey-result-area');
    const statsGrid = container.querySelector('#survey-stats-grid');
    const tableContainer = container.querySelector('#survey-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;
        const rows = this.state.raw.rows;

        // 점수형 문항(숫자 데이터가 있는 컬럼) 자동 추출
        const numericCols = [];
        headers.forEach((h, colIdx) => {
          const sampleVals = rows.slice(0, 20).map(r => CoreUtils.parseNumber(r[colIdx]));
          const validNumCount = sampleVals.filter(v => v > 0 && v <= 100).length;
          if (validNumCount >= 10 && !h.includes('번호') && !h.includes('연번') && !h.includes('연락처')) {
            numericCols.push({ name: h, index: colIdx });
          }
        });

        if (numericCols.length === 0) {
          CoreUtils.showToast('설문 점수(1~5점)가 포함된 숫자 컬럼을 찾을 수 없습니다.', 'warning');
          return;
        }

        const itemSummaries = numericCols.map(col => {
          const vals = rows.map(r => CoreUtils.parseNumber(r[col.index])).filter(v => v > 0);
          const count = vals.length;
          const sum = vals.reduce((a, b) => a + b, 0);
          const avg = count > 0 ? (sum / count) : 0;
          const max = count > 0 ? Math.max(...vals) : 0;
          const min = count > 0 ? Math.min(...vals) : 0;
          const posCount = vals.filter(v => v >= 4).length; // 4점(만족) 이상
          const posRate = count > 0 ? ((posCount / count) * 100) : 0;

          return {
            name: col.name,
            count,
            avg: avg.toFixed(2),
            max,
            min,
            posRate: posRate.toFixed(1)
          };
        });

        // 전체 평균 계산
        const overallAvg = (itemSummaries.reduce((acc, it) => acc + parseFloat(it.avg), 0) / itemSummaries.length).toFixed(2);
        const overallPosRate = (itemSummaries.reduce((acc, it) => acc + parseFloat(it.posRate), 0) / itemSummaries.length).toFixed(1);

        statsGrid.innerHTML = `
          <div class="stat-card">
            <div class="stat-label">총 설문 응답자</div>
            <div class="stat-value">${CoreUtils.formatNumber(rows.length)}<span class="stat-unit">명</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">종합 만족도 평균</div>
            <div class="stat-value" style="color: var(--primary);">${overallAvg}<span class="stat-unit">/ 5.0</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">종합 긍정 응답률</div>
            <div class="stat-value" style="color: var(--success);">${overallPosRate}<span class="stat-unit">%</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">분석 평가 문항</div>
            <div class="stat-value">${itemSummaries.length}<span class="stat-unit">개 항목</span></div>
          </div>
        `;

        // 차트 렌더링
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const canvasItems = container.querySelector('#survey-chart-items');
        const canvasPos = container.querySelector('#survey-chart-pos');

        const barItems = itemSummaries.map(it => ({ label: it.name.slice(0, 10), value: parseFloat(it.avg) }));
        const posItems = itemSummaries.map(it => ({ label: it.name.slice(0, 10), value: parseFloat(it.posRate), color: '#10b981' }));

        CoreUtils.drawBarChart(canvasItems, barItems, { unit: '점', isDark });
        CoreUtils.drawBarChart(canvasPos, posItems, { unit: '%', isDark });

        // 상세 테이블 렌더링
        const sumHeaders = ['설문 문항', '응답수', '평균점수(5점만점)', '최고점', '최저점', '긍정비율(4~5점)'];
        const sumRows = itemSummaries.map(it => [
          it.name,
          `${it.count}명`,
          `${it.avg}점`,
          `${it.max}점`,
          `${it.min}점`,
          `${it.posRate}%`
        ]);

        this.state.summary = { headers: sumHeaders, rows: sumRows };
        CoreUtils.renderPreviewTable(tableContainer, sumHeaders, sumRows);
        resultArea.style.display = 'block';
        CoreUtils.showToast(`만족도 조사 분석 완료 (응답자: ${rows.length}명)`, 'success');
      } catch (err) {
        CoreUtils.showToast('설문 분석 오류: ' + err.message, 'error');
      }
    });

    container.querySelector('#btn-download-survey-summary').addEventListener('click', () => {
      if (!this.state.summary) return;
      const csv = CoreUtils.toCSV(this.state.summary.headers, this.state.summary.rows);
      CoreUtils.downloadFile(csv, '만족도조사_집계결과.csv');
      CoreUtils.showToast('집계 결과 CSV가 다운로드되었습니다.', 'success');
    });

    container.querySelector('#btn-print-survey-report').addEventListener('click', () => {
      if (!this.state.summary) return;
      window.print();
    });
  }
};

/* ==========================================================================
   7. 시범사업 신청자 정리 (규칙 기반 우선순위 산정)
   ========================================================================== */
PortalModules['project-applicant'] = {
  id: 'project-applicant',
  title: '시범사업 신청자 정리',
  subtitle: '농업기술보급 시범사업 신청 농가를 자동 집계하고, 사용자가 설정한 점수 기준에 따라 우선 검토 순위를 산정합니다.',
  category: '사업·현장·출장',

  state: { raw: null, evaluatedRows: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🌱 시범사업 신청자 정리 및 우선순위 평가</h3>
            <p>AI의 자의적 판단이 아닌, 농촌지도사업 평가 규정에 따른 규칙 기반 배점 방식으로 우선 검토 대상을 계산합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="proj-app-drop-zone">
            <div class="drop-zone-icon">📝</div>
            <div class="drop-zone-title">시범사업 신청자 CSV 파일을 선택하세요</div>
            <div class="drop-zone-sub">(샘플 폴더의 '농가명단_샘플.csv' 또는 신청자 명단을 사용할 수 있습니다)</div>
            <input type="file" id="proj-app-file-input" accept=".csv,.txt" />
          </div>

          <div id="proj-app-config-area" style="margin-top: 24px; display: none;">
            <div style="background: var(--bg-main); padding: 18px; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 20px;">
              <div style="font-weight: 700; margin-bottom: 12px; font-size: 15px;">⚖️ 우선 검토 대상 규칙 및 배점 기준 설정</div>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">청년농업인 가점</label>
                  <select class="form-select" id="rule-score-youth">
                    <option value="15" selected>15점 부여</option>
                    <option value="10">10점 부여</option>
                    <option value="20">20점 부여</option>
                    <option value="0">가점 없음</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">재배면적 기준 점수</label>
                  <select class="form-select" id="rule-score-area">
                    <option value="1.0" selected>1.0ha (10,000㎡) 이상 시 20점</option>
                    <option value="0.5">0.5ha 이상 시 20점</option>
                    <option value="1.5">1.5ha 이상 시 20점</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">농업경영체 등록 확인</label>
                  <select class="form-select" id="rule-score-reg">
                    <option value="10" selected>등록번호 보유 시 10점</option>
                    <option value="0">배점 미반영</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">기존 수혜 감점 (선택)</label>
                  <select class="form-select" id="rule-score-prev">
                    <option value="-10" selected>최근 3년 내 지원 이력 시 -10점 감점</option>
                    <option value="0">감점 없음</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary btn-lg" id="btn-run-applicant-eval">
                <span>🎯</span> 신청자 자동 집계 및 우선순위 점수 산정
              </button>
            </div>
          </div>

          <div id="proj-app-result-area" style="margin-top: 28px; display: none;">
            <div class="stats-grid" id="proj-app-stats-grid"></div>

            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>🏆 신청자 우선순위 산정 결과</h3>
              </div>
              <button class="btn btn-success" id="btn-download-applicants">
                <span>💾</span> 우선순위 점수 포함 CSV 다운로드
              </button>
            </div>
            <div id="proj-app-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#proj-app-file-input');
    const configArea = container.querySelector('#proj-app-config-area');
    const runBtn = container.querySelector('#btn-run-applicant-eval');
    const resultArea = container.querySelector('#proj-app-result-area');
    const statsGrid = container.querySelector('#proj-app-stats-grid');
    const tableContainer = container.querySelector('#proj-app-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        configArea.style.display = 'block';
        CoreUtils.showToast(`신청자 파일 준비 완료 (${CoreUtils.formatNumber(this.state.raw.totalRows)}행)`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    runBtn.addEventListener('click', () => {
      if (!this.state.raw) return;

      const headers = this.state.raw.headers;
      const rows = this.state.raw.rows;

      const youthIdx = headers.findIndex(h => h.includes('청년'));
      const areaIdx = headers.findIndex(h => h.includes('면적'));
      const regIdx = headers.findIndex(h => h.includes('경영체'));
      const noteIdx = headers.findIndex(h => h.includes('비고') || h.includes('지원'));

      const youthPts = parseInt(container.querySelector('#rule-score-youth').value, 10);
      const areaThreshold = parseFloat(container.querySelector('#rule-score-area').value);
      const regPts = parseInt(container.querySelector('#rule-score-reg').value, 10);
      const prevPenalty = parseInt(container.querySelector('#rule-score-prev').value, 10);

      let totalYouth = 0;
      let totalOverArea = 0;

      const scoredRows = rows.map((r, i) => {
        let score = 50; // 기본점수 50점
        const scoreDetails = [];

        // 청년농 체크
        if (youthIdx !== -1 && r[youthIdx] && (r[youthIdx].includes('Y') || r[youthIdx].includes('청년') || r[youthIdx].includes('예'))) {
          score += youthPts;
          totalYouth++;
          scoreDetails.push(`청년농(+${youthPts})`);
        }

        // 재배면적 체크
        if (areaIdx !== -1 && r[areaIdx]) {
          const areaVal = CoreUtils.parseNumber(r[areaIdx]);
          if (areaVal >= areaThreshold) {
            score += 20;
            totalOverArea++;
            scoreDetails.push(`면적충족(+20)`);
          }
        }

        // 경영체 등록번호
        if (regIdx !== -1 && r[regIdx] && r[regIdx].trim().length >= 6) {
          score += regPts;
          scoreDetails.push(`경영체(+${regPts})`);
        }

        // 기존 수혜 여부 감점
        if (noteIdx !== -1 && r[noteIdx] && (r[noteIdx].includes('지원받음') || r[noteIdx].includes('기존수혜'))) {
          score += prevPenalty;
          scoreDetails.push(`수혜이력(${prevPenalty})`);
        }

        return {
          score,
          scoreDetails: scoreDetails.join(', ') || '기본배점',
          data: r
        };
      });

      // 점수 내림차순 정렬
      scoredRows.sort((a, b) => b.score - a.score);

      // 통계 카드
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">총 신청 농가수</div>
          <div class="stat-value">${CoreUtils.formatNumber(rows.length)}<span class="stat-unit">농가</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">청년농업인 신청</div>
          <div class="stat-value" style="color: var(--primary);">${totalYouth}<span class="stat-unit">명</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">면적 기준 충족</div>
          <div class="stat-value" style="color: var(--success);">${totalOverArea}<span class="stat-unit">농가</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">최고 평가 점수</div>
          <div class="stat-value" style="color: #7c3aed;">${scoredRows[0]?.score || 0}<span class="stat-unit">점</span></div>
        </div>
      `;

      const outHeaders = ['우선순위', '평가총점', '산출내역', ...headers];
      const outRows = scoredRows.map((item, idx) => [
        idx + 1,
        item.score,
        item.scoreDetails,
        ...item.data
      ]);

      this.state.evaluatedRows = { headers: outHeaders, rows: outRows };
      CoreUtils.renderPreviewTable(tableContainer, outHeaders, outRows);
      resultArea.style.display = 'block';
      CoreUtils.showToast('우선순위 평가 및 정렬이 완료되었습니다.', 'success');
    });

    container.querySelector('#btn-download-applicants').addEventListener('click', () => {
      if (!this.state.evaluatedRows) return;
      const csv = CoreUtils.toCSV(this.state.evaluatedRows.headers, this.state.evaluatedRows.rows);
      CoreUtils.downloadFile(csv, '시범사업_신청자_우선순위결과.csv');
      CoreUtils.showToast('우선순위 결과 CSV가 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   8. 사업실적 집계
   ========================================================================== */
PortalModules['project-performance'] = {
  id: 'project-performance',
  title: '사업실적 집계',
  subtitle: '국비/지방비/자부담 예산 집계, 진행상태별 사업 건수, 사업 완료율(%)을 일괄 산출합니다.',
  category: '사업·현장·출장',

  state: { raw: null, stats: null },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📈 농촌지도사업 실적 종합 집계</h3>
            <p>시범사업 및 보조사업 실적 CSV에서 총예산(국비, 지방비, 자부담)과 공정 완료율을 집계합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="perf-drop-zone">
            <div class="drop-zone-icon">💼</div>
            <div class="drop-zone-title">사업실적 CSV 파일을 선택하세요</div>
            <div class="drop-zone-sub">(샘플 폴더의 '사업실적_샘플.csv'를 사용해보세요)</div>
            <input type="file" id="perf-file-input" accept=".csv,.txt" />
          </div>

          <div id="perf-result-area" style="margin-top: 24px; display: none;">
            <div class="stats-grid" id="perf-stats-grid"></div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
              <div class="work-card" style="margin-bottom: 0;">
                <div class="card-header"><h4>💰 사업비 재원별 구성 비율</h4></div>
                <div class="card-body" style="padding: 16px;">
                  <canvas id="perf-chart-budget" width="460" height="240" style="width: 100%;"></canvas>
                </div>
              </div>
              <div class="work-card" style="margin-bottom: 0;">
                <div class="card-header"><h4>📊 사업 진행상태별 현황</h4></div>
                <div class="card-body" style="padding: 16px;">
                  <canvas id="perf-chart-status" width="460" height="240" style="width: 100%;"></canvas>
                </div>
              </div>
            </div>

            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>사업실적 상세 데이터</h3>
              </div>
              <button class="btn btn-success" id="btn-download-perf-summary">
                <span>💾</span> 재정 집계 리포트 CSV 다운로드
              </button>
            </div>
            <div id="perf-table-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#perf-file-input');
    const resultArea = container.querySelector('#perf-result-area');
    const statsGrid = container.querySelector('#perf-stats-grid');
    const tableContainer = container.querySelector('#perf-table-container');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;
        const rows = this.state.raw.rows;

        // 인덱스 찾기
        const totalIdx = headers.findIndex(h => h.includes('총액') || h.includes('사업비'));
        const nationalIdx = headers.findIndex(h => h.includes('국비'));
        const localIdx = headers.findIndex(h => h.includes('지방비') || h.includes('도비') || h.includes('군비'));
        const selfIdx = headers.findIndex(h => h.includes('자부담'));
        const statusIdx = headers.findIndex(h => h.includes('진행') || h.includes('상태'));

        let sumTotal = 0;
        let sumNational = 0;
        let sumLocal = 0;
        let sumSelf = 0;

        let completeCount = 0;
        let ongoingCount = 0;
        let pendingCount = 0;

        rows.forEach(r => {
          if (totalIdx !== -1) sumTotal += CoreUtils.parseNumber(r[totalIdx]);
          if (nationalIdx !== -1) sumNational += CoreUtils.parseNumber(r[nationalIdx]);
          if (localIdx !== -1) sumLocal += CoreUtils.parseNumber(r[localIdx]);
          if (selfIdx !== -1) sumSelf += CoreUtils.parseNumber(r[selfIdx]);

          if (statusIdx !== -1) {
            const st = (r[statusIdx] || '').trim();
            if (st.includes('완료')) completeCount++;
            else if (st.includes('진행') || st.includes('추진')) ongoingCount++;
            else pendingCount++;
          }
        });

        const totalProjects = rows.length;
        const completeRate = totalProjects > 0 ? ((completeCount / totalProjects) * 100).toFixed(1) : 0;

        statsGrid.innerHTML = `
          <div class="stat-card">
            <div class="stat-label">총 사업 수</div>
            <div class="stat-value">${CoreUtils.formatNumber(totalProjects)}<span class="stat-unit">개</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">총 사업비 규모</div>
            <div class="stat-value" style="color: var(--primary);">${CoreUtils.formatNumber(Math.round(sumTotal / 10000))}<span class="stat-unit">만원</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">사업 완료율</div>
            <div class="stat-value" style="color: var(--success);">${completeRate}<span class="stat-unit">%</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">진행 중 / 준비 중</div>
            <div class="stat-value" style="color: var(--warning);">${ongoingCount} / ${pendingCount}<span class="stat-unit">개</span></div>
          </div>
        `;

        // 차트 렌더링
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const canvasBudget = container.querySelector('#perf-chart-budget');
        const canvasStatus = container.querySelector('#perf-chart-status');

        const budgetItems = [
          { label: '국비', value: Math.round(sumNational / 10000), color: '#3b82f6' },
          { label: '지방비', value: Math.round(sumLocal / 10000), color: '#10b981' },
          { label: '자부담', value: Math.round(sumSelf / 10000), color: '#f59e0b' }
        ];

        const statusItems = [
          { label: '완료 사업', value: completeCount, color: '#10b981' },
          { label: '진행 중 사업', value: ongoingCount, color: '#3b82f6' },
          { label: '준비/미착수', value: pendingCount, color: '#ef4444' }
        ];

        CoreUtils.drawBarChart(canvasBudget, budgetItems, { unit: '만원', isDark });
        CoreUtils.drawBarChart(canvasStatus, statusItems, { unit: '건', isDark });

        this.state.stats = {
          totalProjects, sumTotal, sumNational, sumLocal, sumSelf, completeCount, ongoingCount, pendingCount, completeRate
        };

        CoreUtils.renderPreviewTable(tableContainer, headers, rows);
        resultArea.style.display = 'block';
        CoreUtils.showToast(`사업실적 ${totalProjects}건 집계 완료!`, 'success');
      } catch (err) {
        CoreUtils.showToast('실적 집계 오류: ' + err.message, 'error');
      }
    });

    container.querySelector('#btn-download-perf-summary').addEventListener('click', () => {
      if (!this.state.stats) return;
      const s = this.state.stats;
      const summaryRows = [
        ['총 사업건수', s.totalProjects, '건'],
        ['총 사업비', s.sumTotal, '원'],
        ['국비', s.sumNational, '원'],
        ['지방비', s.sumLocal, '원'],
        ['자부담', s.sumSelf, '원'],
        ['완료 건수', s.completeCount, '건'],
        ['진행 건수', s.ongoingCount, '건'],
        ['준비 건수', s.pendingCount, '건'],
        ['사업 완료율', s.completeRate, '%']
      ];
      const csv = CoreUtils.toCSV(['구분항목', '금액/건수', '단위'], summaryRows);
      CoreUtils.downloadFile(csv, '농촌지도사업_재정및추진실적집계.csv');
      CoreUtils.showToast('재정 실적 집계 리포트가 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   9. 현장조사 데이터 정리
   ========================================================================== */
PortalModules['field-survey'] = {
  id: 'field-survey',
  title: '현장조사 데이터 정리',
  subtitle: '영농 현장 방문, 병해충 예찰, 피해 조사 CSV 데이터를 담당자/품목/읍면별로 필터링하고 분석합니다.',
  category: '사업·현장·출장',

  state: { raw: null, filteredRows: [] },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🔍 현장조사 및 병해충 예찰 데이터 정리</h3>
            <p>지도사들이 현장에서 수집한 조사일지 CSV를 불러와 날짜, 담당자, 품목, 읍면별로 정밀 분석합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="survey-drop-zone">
            <div class="drop-zone-icon">🌾</div>
            <div class="drop-zone-title">현장조사 CSV 파일을 선택하세요</div>
            <input type="file" id="field-file-input" accept=".csv,.txt" />
          </div>

          <div id="field-filter-area" style="margin-top: 24px; display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">품목 필터</label>
                <select class="form-select" id="field-filter-crop">
                  <option value="">전체 품목</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">담당자 필터</label>
                <select class="form-select" id="field-filter-officer">
                  <option value="">전체 담당자</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">조사내용 검색</label>
                <input type="text" class="form-control" id="field-search-keyword" placeholder="예: 탄저병, 과수화상병, 개화상태">
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-primary" id="btn-apply-field-filter">
                <span>🔍</span> 조건 검색 및 필터링
              </button>
              <button class="btn btn-outline" id="btn-reset-field-filter">조건 초기화</button>
              <button class="btn btn-success" id="btn-download-field-filtered">
                <span>💾</span> 필터링된 결과 CSV 다운로드
              </button>
            </div>

            <div id="field-table-container" style="margin-top: 24px;"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#field-file-input');
    const filterArea = container.querySelector('#field-filter-area');
    const cropSel = container.querySelector('#field-filter-crop');
    const officerSel = container.querySelector('#field-filter-officer');
    const searchKw = container.querySelector('#field-search-keyword');
    const applyBtn = container.querySelector('#btn-apply-field-filter');
    const resetBtn = container.querySelector('#btn-reset-field-filter');
    const downloadBtn = container.querySelector('#btn-download-field-filtered');
    const tableContainer = container.querySelector('#field-table-container');

    let cropIdx = -1;
    let officerIdx = -1;

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { text } = await CoreUtils.readFileAsText(file);
        this.state.raw = CoreUtils.parseCSV(text);
        const headers = this.state.raw.headers;
        const rows = this.state.raw.rows;

        cropIdx = headers.findIndex(h => h.includes('품목') || h.includes('작목'));
        officerIdx = headers.findIndex(h => h.includes('담당') || h.includes('조사자'));

        // 필터 옵션 채우기
        const crops = new Set();
        const officers = new Set();
        rows.forEach(r => {
          if (cropIdx !== -1 && r[cropIdx]) crops.add(r[cropIdx].trim());
          if (officerIdx !== -1 && r[officerIdx]) officers.add(r[officerIdx].trim());
        });

        cropSel.innerHTML = '<option value="">전체 품목</option>' +
          Array.from(crops).map(c => `<option value="${CoreUtils.escapeHtml(c)}">${CoreUtils.escapeHtml(c)}</option>`).join('');

        officerSel.innerHTML = '<option value="">전체 담당자</option>' +
          Array.from(officers).map(o => `<option value="${CoreUtils.escapeHtml(o)}">${CoreUtils.escapeHtml(o)}</option>`).join('');

        filterArea.style.display = 'block';
        this.state.filteredRows = rows;
        CoreUtils.renderPreviewTable(tableContainer, headers, rows);
        CoreUtils.showToast(`현장조사 데이터 ${rows.length}건 로드 완료!`, 'info');
      } catch (err) {
        CoreUtils.showToast('파일 읽기 오류: ' + err.message, 'error');
      }
    });

    const doFilter = () => {
      if (!this.state.raw) return;
      const targetCrop = cropSel.value;
      const targetOfficer = officerSel.value;
      const kw = searchKw.value.trim().toLowerCase();

      const filtered = this.state.raw.rows.filter(r => {
        if (targetCrop && cropIdx !== -1 && (r[cropIdx] || '').trim() !== targetCrop) return false;
        if (targetOfficer && officerIdx !== -1 && (r[officerIdx] || '').trim() !== targetOfficer) return false;
        if (kw) {
          const rowText = r.join(' ').toLowerCase();
          if (!rowText.includes(kw)) return false;
        }
        return true;
      });

      this.state.filteredRows = filtered;
      CoreUtils.renderPreviewTable(tableContainer, this.state.raw.headers, filtered);
      CoreUtils.showToast(`필터링 결과: 총 ${filtered.length}건`, 'success');
    };

    applyBtn.addEventListener('click', doFilter);
    resetBtn.addEventListener('click', () => {
      cropSel.value = '';
      officerSel.value = '';
      searchKw.value = '';
      doFilter();
    });

    downloadBtn.addEventListener('click', () => {
      if (!this.state.filteredRows || !this.state.raw) return;
      const csv = CoreUtils.toCSV(this.state.raw.headers, this.state.filteredRows);
      CoreUtils.downloadFile(csv, '현장조사_정리결과.csv');
      CoreUtils.showToast('조사 데이터가 다운로드되었습니다.', 'success');
    });
  }
};

/* ==========================================================================
   10. 출장기록 작성 (출장복명서 표준 행정문서 양식)
   ========================================================================== */
PortalModules['trip-record'] = {
  id: 'trip-record',
  title: '출장기록 작성',
  subtitle: '농가 기술지도 및 현장 점검 후 관공서 표준 출장복명서를 자동 서식화하여 인쇄/PDF로 출력합니다.',
  category: '사업·현장·출장',

  render(container) {
    const today = new Date().toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📑 출장복명서 작성 및 출력</h3>
            <p>공무원 현장 출장 기록을 표준 행정 양식에 자동 배치하여 즉시 결재 및 인쇄가 가능하게 만듭니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">출장일자 <span class="required">*</span></label>
              <input type="date" class="form-control" id="trip-date" value="${today}">
            </div>
            <div class="form-group">
              <label class="form-label">출장자 (직급/성명) <span class="required">*</span></label>
              <input type="text" class="form-control" id="trip-officer" value="농촌지도사 홍길동">
            </div>
            <div class="form-group">
              <label class="form-label">출장지 (지역 및 농가명) <span class="required">*</span></label>
              <input type="text" class="form-control" id="trip-place" value="○○면 평촌리 123 김○○ 농가 외 2개소">
            </div>
            <div class="form-group">
              <label class="form-label">출장목적 <span class="required">*</span></label>
              <input type="text" class="form-control" id="trip-purpose" value="과수화상병 정밀예찰 및 동계 전정 기술지도">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label">현장 확인사항 및 생육 상황</label>
            <textarea class="form-control" id="trip-findings" rows="3">- 사과 과수원 궤양 증상 정밀 예찰 (의심 증상 미발견)
- 최근 기온 상승에 따른 발아기 병해충 방제 상태 점검</textarea>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label">지도 내용 (농가 상담 및 전달사항)</label>
            <textarea class="form-control" id="trip-guidance" rows="3">- 궤양 부위 발견 즉시 70% 알코올 소독 가위 사용 후 소각 조치 당부
- 개화 전 적기 방제약제 살포 일정 및 살포요령 지도</textarea>
          </div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label">향후 조치계획</label>
            <textarea class="form-control" id="trip-action" rows="2">- 관내 과수 농가 대상 적기 방제 문자 메시지 발송
- 2주 후 2차 정밀 예찰 실시 예정</textarea>
          </div>

          <div class="btn-group">
            <button class="btn btn-primary btn-lg" id="btn-print-trip">
              <span>🖨️</span> 출장복명서 인쇄 / PDF 저장
            </button>
            <button class="btn btn-outline" id="btn-copy-trip-text">
              클립보드에 본문 복사
            </button>
          </div>

          <!-- A4 인쇄 미리보기 영역 -->
          <div id="trip-report-preview" style="margin-top: 32px;">
            <!-- 실시간 렌더링 됨 -->
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const previewEl = container.querySelector('#trip-report-preview');

    const updatePreview = () => {
      const date = container.querySelector('#trip-date').value;
      const officer = container.querySelector('#trip-officer').value;
      const place = container.querySelector('#trip-place').value;
      const purpose = container.querySelector('#trip-purpose').value;
      const findings = container.querySelector('#trip-findings').value;
      const guidance = container.querySelector('#trip-guidance').value;
      const action = container.querySelector('#trip-action').value;

      previewEl.innerHTML = `
        <div class="print-page" style="background: #ffffff; color: #000000; box-shadow: var(--shadow-md); padding: 25mm 20mm; font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="font-size: 24pt; font-weight: bold; letter-spacing: 4px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 6px;">
              출 장 복 명 서
            </h2>
          </div>

          <table class="print-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 20px; font-size: 11pt;">
            <tr>
              <th style="border: 1px solid #000; width: 120px; background-color: #f1f5f9; padding: 10px;">출 장 일 자</th>
              <td style="border: 1px solid #000; padding: 10px;">${CoreUtils.escapeHtml(date)}</td>
              <th style="border: 1px solid #000; width: 120px; background-color: #f1f5f9; padding: 10px;">복 명 자</th>
              <td style="border: 1px solid #000; padding: 10px;">${CoreUtils.escapeHtml(officer)}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background-color: #f1f5f9; padding: 10px;">출 장 지</th>
              <td colspan="3" style="border: 1px solid #000; padding: 10px;">${CoreUtils.escapeHtml(place)}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #000; background-color: #f1f5f9; padding: 10px;">출 장 목 적</th>
              <td colspan="3" style="border: 1px solid #000; padding: 10px; font-weight: bold;">${CoreUtils.escapeHtml(purpose)}</td>
            </tr>
          </table>

          <div style="margin-top: 24px;">
            <h3 style="font-size: 13pt; font-weight: bold; margin-bottom: 8px;">1. 현장 확인사항 및 생육상황</h3>
            <div style="border: 1px solid #ccc; padding: 14px; min-height: 80px; white-space: pre-wrap; font-size: 10.5pt; line-height: 1.7; background: #fafafa;">${CoreUtils.escapeHtml(findings)}</div>
          </div>

          <div style="margin-top: 20px;">
            <h3 style="font-size: 13pt; font-weight: bold; margin-bottom: 8px;">2. 기술지도 내용 (농가 상담 및 전달사항)</h3>
            <div style="border: 1px solid #ccc; padding: 14px; min-height: 80px; white-space: pre-wrap; font-size: 10.5pt; line-height: 1.7; background: #fafafa;">${CoreUtils.escapeHtml(guidance)}</div>
          </div>

          <div style="margin-top: 20px;">
            <h3 style="font-size: 13pt; font-weight: bold; margin-bottom: 8px;">3. 향후 조치계획</h3>
            <div style="border: 1px solid #ccc; padding: 14px; min-height: 60px; white-space: pre-wrap; font-size: 10.5pt; line-height: 1.7; background: #fafafa;">${CoreUtils.escapeHtml(action)}</div>
          </div>

          <div style="margin-top: 40px; text-align: center; font-size: 12pt;">
            위와 같이 출장 결과를 복명합니다.<br><br>
            <strong>${date.slice(0, 4)}년 ${parseInt(date.slice(5, 7), 10)}월 ${parseInt(date.slice(8, 10), 10)}일</strong><br><br>
            <div style="text-align: right; padding-right: 50px;">
              복명자: <strong>${CoreUtils.escapeHtml(officer)}</strong> (인)
            </div>
          </div>
        </div>
      `;
    };

    updatePreview();

    ['#trip-date', '#trip-officer', '#trip-place', '#trip-purpose', '#trip-findings', '#trip-guidance', '#trip-action'].forEach(sel => {
      container.querySelector(sel).addEventListener('input', updatePreview);
    });

    container.querySelector('#btn-print-trip').addEventListener('click', () => {
      window.print();
    });

    container.querySelector('#btn-copy-trip-text').addEventListener('click', () => {
      const purpose = container.querySelector('#trip-purpose').value;
      const findings = container.querySelector('#trip-findings').value;
      const guidance = container.querySelector('#trip-guidance').value;
      const action = container.querySelector('#trip-action').value;

      const txt = `[출장복명서]\n- 목적: ${purpose}\n\n1. 확인사항:\n${findings}\n\n2. 지도내용:\n${guidance}\n\n3. 조치계획:\n${action}`;
      navigator.clipboard.writeText(txt).then(() => {
        CoreUtils.showToast('출장복명서 내용이 클립보드에 복사되었습니다.', 'success');
      });
    });
  }
};
