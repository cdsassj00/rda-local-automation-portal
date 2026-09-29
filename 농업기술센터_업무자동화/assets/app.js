/**
 * 농업기술센터 로컬 업무자동화 포털 - 메인 애플리케이션 프레임워크 (app.js)
 * 100% 브라우저 로컬 작동, 외부 통신 전면 차단 가드, 30개 메뉴 라우팅 및 사이드바 제어
 */

// ==========================================================================
// 1. 외부 통신 차단 및 로컬 내부 통신(127.0.0.1)만 허용 가드
// ==========================================================================
window.origFetch = window.fetch;
(function enforceStrictZeroNetwork() {
  const blockNotice = (apiName) => {
    console.warn(`[보안 정책] ${apiName} 외부 호출이 차단되었습니다. 모든 처리는 로컬 브라우저 및 로컬 PC 내부에서만 수행됩니다.`);
  };

  // 로컬 127.0.0.1 외의 외부 fetch 전면 차단
  window.fetch = function (url, options) {
    const urlStr = String(url);
    if (urlStr.startsWith('http://127.0.0.1:') || urlStr.startsWith('http://localhost:') || urlStr.startsWith('sample/')) {
      return window.origFetch(url, options);
    }
    blockNotice('fetch (' + urlStr + ')');
    return Promise.reject(new Error('오프라인 보안 정책에 의해 외부 인터넷 호출이 차단되어 있습니다.'));
  };

  // 외부 WebSocket 차단
  window.WebSocket = function () {
    blockNotice('WebSocket');
    throw new Error('외부 WebSocket 연결이 금지되어 있습니다.');
  };
})();

// ==========================================================================
// 2. 포털 라우터 및 상태 관리
// ==========================================================================
const AppRouter = {
  currentModuleId: 'file-merge',

  menuStructure: [
    {
      category: '🧠 로컬 고기능 엔진 (오프라인)',
      items: [
        { id: 'whisper-stt', num: '31', title: '현장 음성녹음 전사 (faster-whisper)', icon: '🎙️' },
        { id: 'doc-ocr', num: '32', title: '서류·영수증 문자 인식 (EasyOCR)', icon: '📷' }
      ]
    },
    {
      category: '📊 데이터 통합·정리',
      items: [
        { id: 'file-merge', num: '01', title: '엑셀/CSV 파일 통합', icon: '📑' },
        { id: 'farmer-clean', num: '02', title: '농가 명단 정리', icon: '🌾' },
        { id: 'data-audit', num: '03', title: '중복·누락 데이터 검사', icon: '🔍' }
      ]
    },
    {
      category: '👥 농가·교육생 관리',
      items: [
        { id: 'trainee-manage', num: '04', title: '교육생 명단 관리', icon: '🎓' },
        { id: 'attendance-sheet', num: '05', title: '출석부 생성 (A4)', icon: '📋' },
        { id: 'sms-list', num: '16', title: '문자 발송용 명단 생성', icon: '📱' },
        { id: 'address-phone', num: '17', title: '주소·전화번호 정리', icon: '📮' }
      ]
    },
    {
      category: '📋 사업·현장·출장',
      items: [
        { id: 'survey-analysis', num: '06', title: '만족도 조사 집계', icon: '📊' },
        { id: 'project-applicant', num: '07', title: '시범사업 신청자 정리', icon: '🌱' },
        { id: 'project-performance', num: '08', title: '사업실적 집계', icon: '💼' },
        { id: 'field-survey', num: '09', title: '현장조사 데이터 정리', icon: '🔍' },
        { id: 'trip-record', num: '10', title: '출장기록 작성 (복명서)', icon: '📑' }
      ]
    },
    {
      category: '📁 파일·사진 도구',
      items: [
        { id: 'photo-rename', num: '11', title: '사진 파일명 일괄 변경', icon: '📷' },
        { id: 'photo-classify', num: '12', title: '사진 업무별 분류', icon: '🗂️' },
        { id: 'batch-rename', num: '13', title: '파일 일괄 이름 변경', icon: '✏️' },
        { id: 'folder-inventory', num: '14', title: '폴더 파일목록 대장', icon: '📂' },
        { id: 'csv-convert', num: '15', title: 'CSV 변환 및 추출', icon: '🔄' }
      ]
    },
    {
      category: '📈 통계·보고서',
      items: [
        { id: 'farmer-stats', num: '18', title: '농가별 통계', icon: '🌾' },
        { id: 'town-stats', num: '19', title: '읍면별 통계', icon: '🏛️' },
        { id: 'period-stats', num: '20', title: '월간/분기 실적 집계', icon: '📅' },
        { id: 'report-table', num: '21', title: '보고서용 표 생성 (HWP)', icon: '📑' },
        { id: 'checklist', num: '22', title: '업무 체크리스트', icon: '✅' }
      ]
    },
    {
      category: '⚙️ 데이터 가공·비교·설정',
      items: [
        { id: 'data-compare', num: '23', title: '데이터 비교 (Diff)', icon: '⚖️' },
        { id: 'data-filter', num: '24', title: '데이터 필터링 (조건검색)', icon: '🎯' },
        { id: 'data-sort', num: '25', title: '데이터 정렬 (다중기준)', icon: '🔢' },
        { id: 'text-replace', num: '26', title: '텍스트 일괄 치환', icon: '✏️' },
        { id: 'date-unify', num: '27', title: '날짜 형식 통일', icon: '🗓️' },
        { id: 'privacy-mask', num: '28', title: '개인정보 마스킹', icon: '🛡️' },
        { id: 'qr-generate', num: '29', title: 'QR용 텍스트/코드 생성', icon: '📱' },
        { id: 'user-settings', num: '30', title: '사용자 설정', icon: '⚙️' }
      ]
    }
  ],

  init() {
    this.renderSidebar();
    this.bindGlobalEvents();
    this.loadUserTheme();

    // 초기 화면
    this.navigate('file-merge');
  },

  renderSidebar() {
    const navEl = document.getElementById('sidebar-nav');
    if (!navEl) return;

    let html = '';
    this.menuStructure.forEach(cat => {
      html += `<div class="menu-category-title">${cat.category}</div>`;
      cat.items.forEach(item => {
        html += `
          <div class="nav-item ${item.id === this.currentModuleId ? 'active' : ''}" data-id="${item.id}" onclick="AppRouter.navigate('${item.id}')">
            <span class="nav-item-icon">${item.icon}</span>
            <span class="nav-item-text">${item.title}</span>
            <span class="nav-item-num">${item.num}</span>
          </div>
        `;
      });
    });

    navEl.innerHTML = html;
  },

  navigate(moduleId) {
    const mod = window.PortalModules && window.PortalModules[moduleId];
    if (!mod) {
      CoreUtils.showToast(`[${moduleId}] 기능을 찾을 수 없습니다.`, 'error');
      return;
    }

    this.currentModuleId = moduleId;

    // 사이드바 활성 클래스 갱신
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-id') === moduleId) {
        el.classList.add('active');
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        el.classList.remove('active');
      }
    });

    // 헤더 타이틀 및 설명 갱신
    const titleEl = document.getElementById('header-title');
    const subtitleEl = document.getElementById('header-subtitle');
    if (titleEl) titleEl.textContent = mod.title;
    if (subtitleEl) subtitleEl.textContent = mod.subtitle || '안전한 PC 내부 오프라인 데이터 처리';

    // 메인 콘텐츠 컨테이너 비우고 렌더링
    const contentEl = document.getElementById('module-content');
    if (contentEl) {
      contentEl.innerHTML = '';
      mod.render(contentEl);
    }

    // 스크롤 상단 이동
    const scrollContainer = document.querySelector('.content-area');
    if (scrollContainer) scrollContainer.scrollTop = 0;
  },

  bindGlobalEvents() {
    // 1. 사이드바 메뉴 실시간 검색
    const searchInput = document.getElementById('menu-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        const navItems = document.querySelectorAll('.nav-item');
        const catTitles = document.querySelectorAll('.menu-category-title');

        if (!query) {
          navItems.forEach(el => el.style.display = 'flex');
          catTitles.forEach(el => el.style.display = 'block');
          return;
        }

        catTitles.forEach(el => el.style.display = 'none');
        navItems.forEach(el => {
          const text = el.textContent.toLowerCase();
          el.style.display = text.includes(query) ? 'flex' : 'none';
        });
      });
    }

    // 2. 다크모드 토글 버튼
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
          document.body.removeAttribute('data-theme');
          themeBtn.textContent = '🌙';
          themeBtn.title = '다크 모드로 전환';
          this.saveTheme('light');
        } else {
          document.body.setAttribute('data-theme', 'dark');
          themeBtn.textContent = '☀️';
          themeBtn.title = '라이트 모드로 전환';
          this.saveTheme('dark');
        }
      });
    }
  },

  loadUserTheme() {
    const cfg = JSON.parse(localStorage.getItem('portal_user_config') || '{}');
    const savedTheme = cfg.theme || localStorage.getItem('portal_theme') || 'light';
    const themeBtn = document.getElementById('btn-toggle-theme');

    if (savedTheme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
      if (themeBtn) {
        themeBtn.textContent = '☀️';
        themeBtn.title = '라이트 모드로 전환';
      }
    } else {
      document.body.removeAttribute('data-theme');
      if (themeBtn) {
        themeBtn.textContent = '🌙';
        themeBtn.title = '다크 모드로 전환';
      }
    }
  },

  saveTheme(theme) {
    localStorage.setItem('portal_theme', theme);
    const cfg = JSON.parse(localStorage.getItem('portal_user_config') || '{}');
    cfg.theme = theme;
    localStorage.setItem('portal_user_config', JSON.stringify(cfg));
  }
};

window.AppRouter = AppRouter;

// DOM 로드 완료 시 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
  AppRouter.init();
});
