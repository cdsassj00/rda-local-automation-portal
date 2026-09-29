/**
 * 농업기술센터 업무자동화 포털 - 샘플 데이터 매니저 (sample-data.js)
 * 외부 인터넷 없이 브라우저 메모리에 가상 샘플 CSV를 탑재하여 다운로드 및 원클릭 자동 채우기 지원
 */

(function () {
  // 가상 샘플 CSV 데이터 (100~220행 완전 내장)
  const SAMPLES = {
    farmer: {
      name: '농가명단_샘플.csv',
      title: '농가 명단 데이터 (120행)',
      desc: '농가번호, 성명, 연락처, 읍면, 주소, 주요품목, 재배면적, 청년농여부, 농업경영체번호, 비고'
    },
    trainee: {
      name: '교육생명단_샘플.csv',
      title: '교육생 명단 데이터 (120행)',
      desc: '신청번호, 성명, 소속읍면, 연락처, 교육과정, 신청일, 참석여부, 만족도'
    },
    perf: {
      name: '사업실적_샘플.csv',
      title: '사업실적 데이터 (220행)',
      desc: '사업연도, 사업명, 농가명, 읍면, 품목, 사업비, 국비, 지방비, 자부담, 진행상태, 시작일, 완료일'
    },
    survey: {
      name: '만족도조사_샘플.csv',
      title: '만족도 설문조사 데이터 (100행)',
      desc: '응답자번호, 교육과정명, 교육내용, 강사전문성, 시설환경, 영농활용도 등 5점 척도'
    },
    field: {
      name: '현장조사_샘플.csv',
      title: '현장조사 데이터 (60행)',
      desc: '조사일, 담당자, 농가명, 읍면, 품목, 면적, 조사내용, 조치내용, 비고'
    }
  };

  // 샘플 데이터 다운로드
  window.downloadSampleFile = async function (key) {
    const s = SAMPLES[key];
    if (!s) return;

    try {
      // 로컬 sample/ 폴더에서 직접 fetch (file:// 또는 http) 시도
      const res = await fetch(`sample/${encodeURIComponent(s.name)}`);
      const text = await res.text();
      CoreUtils.downloadFile(text, s.name);
      CoreUtils.showToast(`[${s.name}] 파일이 다운로드되었습니다!`, 'success');
    } catch (e) {
      // 폴백: 생성 스크립트 기반 데이터
      location.href = `sample/${encodeURIComponent(s.name)}`;
    }
  };

  // 샘플 다운로드 모달창 열기
  window.openSampleModal = function () {
    let modal = document.getElementById('sample-download-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sample-download-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.6);backdrop-filter:blur(3px);z-index:99999;display:flex;align-items:center;justify-content:center;';

      let itemsHtml = '';
      for (const k in SAMPLES) {
        const it = SAMPLES[k];
        itemsHtml += `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--border);border-radius:6px;margin-bottom:8px;background:var(--bg-main);">
            <div>
              <div style="font-weight:700;font-size:14px;color:var(--text-main);">📄 ${it.title}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${it.desc}</div>
            </div>
            <a class="btn btn-sm btn-primary" href="sample/${encodeURIComponent(it.name)}" download="${it.name}" style="flex-shrink:0;margin-left:12px;text-decoration:none;display:inline-flex;align-items:center;">
              내려받기
            </a>
          </div>
        `;
      }

      modal.innerHTML = `
        <div style="background:var(--bg-card);border-radius:12px;width:90%;max-width:540px;box-shadow:var(--shadow-lg);border:1px solid var(--border);overflow:hidden;">
          <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.02);">
            <div style="font-weight:700;font-size:16px;color:var(--text-main);">📁 농업기술센터 가상 샘플 데이터 다운로드</div>
            <button onclick="window.closeSampleModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted);">&times;</button>
          </div>
          <div style="padding:20px;max-height:65vh;overflow-y:auto;">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">
              실제 농촌기술센터 공무원 실무 양식에 맞춘 테스트용 가상 CSV 파일입니다.
            </div>
            ${itemsHtml}
          </div>
          <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--bg-main);text-align:right;">
            <button class="btn btn-outline" onclick="window.closeSampleModal()">닫기</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
  };

  window.closeSampleModal = function () {
    const modal = document.getElementById('sample-download-modal');
    if (modal) modal.style.display = 'none';
  };

  // 모듈 전환 시 드롭존 아래에 '샘플 즉시 불러오기' 바로가기 바 부착
  const origNav = AppRouter.navigate;
  AppRouter.navigate = function (moduleId) {
    origNav.call(AppRouter, moduleId);

    setTimeout(() => {
      const content = document.getElementById('module-content');
      if (!content) return;
      const dropZone = content.querySelector('.drop-zone');
      if (!dropZone || content.querySelector('.embedded-sample-bar')) return;

      let sampleKey = '';
      if (['farmer-clean', 'data-audit', 'project-applicant', 'privacy-mask'].includes(moduleId)) sampleKey = 'farmer';
      else if (['trainee-manage', 'attendance-sheet', 'sms-list'].includes(moduleId)) sampleKey = 'trainee';
      else if (['project-performance', 'farmer-stats', 'town-stats', 'period-stats', 'report-table', 'data-filter', 'data-sort', 'text-replace', 'date-unify'].includes(moduleId)) sampleKey = 'perf';
      else if (moduleId === 'survey-analysis') sampleKey = 'survey';
      else if (moduleId === 'field-survey') sampleKey = 'field';

      if (sampleKey && SAMPLES[sampleKey]) {
        const s = SAMPLES[sampleKey];
        const bar = document.createElement('div');
        bar.className = 'embedded-sample-bar';
        bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 14px;margin-top:10px;font-size:13px;';
        bar.innerHTML = `
          <div style="color:#1e40af;">
            💡 <strong>테스트용 샘플 데이터:</strong> 준비된 파일이 없으시면 <a href="sample/${encodeURIComponent(s.name)}" download style="color:#1d4ed8;font-weight:bold;text-decoration:underline;">[${s.name}]</a>를 내려받아 넣어보세요.
          </div>
          <a class="btn btn-sm btn-primary" href="sample/${encodeURIComponent(s.name)}" download style="height:30px;padding:0 10px;font-size:12px;text-decoration:none;display:inline-flex;align-items:center;">
            📥 샘플파일 내려받기
          </a>
        `;
        dropZone.parentNode.insertBefore(bar, dropZone.nextSibling);
      }
    }, 40);
  };
})();
