/**
 * 농업기술센터 로컬 업무자동화 포털 - 핵심 유틸리티 (CoreUtils)
 * 외부 인터넷 및 통신 일체 차단, 100% 브라우저 로컬 작동
 * 인코딩(CP949/EUC-KR/UTF-8), RFC4180 CSV, 다운로드, 개인정보 마스킹, Canvas 차트 등
 */

const CoreUtils = {
  /**
   * RFC 4180 호환 견고한 CSV 파서
   * 따옴표 내 줄바꿈, 쉼표, 이스케이프 쌍따옴표("") 완벽 지원
   * @param {string} text CSV 텍스트
   * @param {string} [delimiter] 구분자 (미지정 시 자동 감지)
   * @returns {{ headers: string[], rows: string[][], totalRows: number }}
   */
  parseCSV(text, delimiter) {
    if (!text || !text.trim()) {
      return { headers: [], rows: [], totalRows: 0 };
    }

    // 앞부분 BOM 제거
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    // 구분자 자동 감지 (미지정 시)
    if (!delimiter) {
      const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
      const commaCount = (firstLine.match(/,/g) || []).length;
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const semiCount = (firstLine.match(/;/g) || []).length;

      if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';
      else if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
      else delimiter = ',';
    }

    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuote = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          // 이스케이프된 쌍따옴표
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // 따옴표 모드 토글
          insideQuote = !insideQuote;
          i++;
          continue;
        }
      }

      if (!insideQuote && char === delimiter) {
        currentRow.push(currentCell);
        currentCell = '';
        i++;
        continue;
      }

      if (!insideQuote && (char === '\r' || char === '\n')) {
        currentRow.push(currentCell);
        currentCell = '';
        if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0].trim() === '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        if (char === '\r' && nextChar === '\n') {
          i += 2;
        } else {
          i++;
        }
        continue;
      }

      currentCell += char;
      i++;
    }

    // 마지막 셀 및 행 처리
    if (currentCell !== '' || currentRow.length > 0) {
      currentRow.push(currentCell);
      if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0].trim() === '')) {
        rows.push(currentRow);
      }
    }

    if (rows.length === 0) {
      return { headers: [], rows: [], totalRows: 0 };
    }

    const headers = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1);

    return {
      headers: headers,
      rows: dataRows,
      totalRows: dataRows.length,
      delimiter: delimiter
    };
  },

  /**
   * 행 배열을 CSV 텍스트로 변환 (UTF-8 BOM 포함으로 엑셀 한글 깨짐 방지)
   * @param {string[]} headers 컬럼명 배열
   * @param {Array<Array<any>>} rows 행 데이터 배열
   * @param {string} [delimiter=','] 구분자
   * @returns {string} CSV 문자열 (\uFEFF 포함)
   */
  toCSV(headers, rows, delimiter = ',') {
    const escapeCell = (val) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (str.includes('"') || str.includes(delimiter) || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const lines = [];
    if (headers && headers.length > 0) {
      lines.push(headers.map(escapeCell).join(delimiter));
    }

    for (let i = 0; i < rows.length; i++) {
      lines.push(rows[i].map(escapeCell).join(delimiter));
    }

    return '\uFEFF' + lines.join('\r\n');
  },

  /**
   * 한글 인코딩(CP949/EUC-KR 및 UTF-8) 자동 판별 및 파일 읽기
   * @param {File} file 파일 객체
   * @param {string} [forceEncoding] 강제 인코딩 ('auto', 'utf-8', 'euc-kr')
   * @returns {Promise<{ text: string, encoding: string }>}
   */
  async readFileAsText(file, forceEncoding = 'auto') {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. 강제 지정된 경우
    if (forceEncoding && forceEncoding !== 'auto') {
      const decoder = new TextDecoder(forceEncoding);
      return { text: decoder.decode(bytes), encoding: forceEncoding };
    }

    // 2. UTF-8 BOM (EF BB BF) 확인
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      const decoder = new TextDecoder('utf-8');
      return { text: decoder.decode(bytes), encoding: 'utf-8-bom' };
    }

    // 3. UTF-8 유효성 검사
    let isValidUtf8 = true;
    try {
      const utfDecoder = new TextDecoder('utf-8', { fatal: true });
      const decoded = utfDecoder.decode(bytes);
      // 추가 검증: 한글 깨짐 특수문자(Replacement character) 확인
      return { text: decoded, encoding: 'utf-8' };
    } catch (e) {
      isValidUtf8 = false;
    }

    // 4. EUC-KR / CP949 디코딩
    try {
      const krDecoder = new TextDecoder('euc-kr');
      const decoded = krDecoder.decode(bytes);
      return { text: decoded, encoding: 'cp949' };
    } catch (e) {
      // 최후 수단: 관대한 UTF-8
      const fallbackDecoder = new TextDecoder('utf-8');
      return { text: fallbackDecoder.decode(bytes), encoding: 'utf-8' };
    }
  },

  /**
   * 파일 브라우저 다운로드 실행
   * @param {string|Blob} content 다운로드할 데이터
   * @param {string} filename 파일명
   * @param {string} [mimeType='text/csv;charset=utf-8;'] 마임타입
   */
  downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8;') {
    let blob;
    if (content instanceof Blob) {
      blob = content;
    } else {
      blob = new Blob([content], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  },

  /**
   * 전화번호 포맷 정규화 (010-XXXX-XXXX)
   * @param {string} phone 원본 전화번호 문자열
   * @returns {string} 정규화된 전화번호 또는 원본
   */
  normalizePhone(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/[^0-9]/g, '');

    // 휴대폰 010, 011, 016 등 (10~11자리)
    if (digits.length === 11 && digits.startsWith('01')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10 && digits.startsWith('01')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 10 && digits.startsWith('02')) { // 서울 02
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 9 && digits.startsWith('02')) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    } else if (digits.length >= 10 && digits.startsWith('0')) { // 일반 지역번호 (031, 041, 054, 063 등)
      return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(digits.length - 4)}`;
    }
    return phone.trim();
  },

  /**
   * 전화번호 유효성 검사
   * @param {string} phone
   * @returns {boolean}
   */
  isValidPhone(phone) {
    if (!phone) return false;
    const digits = String(phone).replace(/[^0-9]/g, '');
    return digits.length >= 9 && digits.length <= 11 && digits.startsWith('0');
  },

  /**
   * 날짜 포맷 통일 (YYYY-MM-DD)
   * @param {string} dateStr 다양한 날짜 포맷
   * @returns {string} YYYY-MM-DD
   */
  normalizeDate(dateStr) {
    if (!dateStr) return '';
    let str = String(dateStr).trim();

    // 8자리 연속 숫자 (예: 20260929)
    if (/^\d{8}$/.test(str)) {
      return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
    }

    // 구분자가 있는 경우 (., /, -, 공백 등)
    const match = str.match(/^(\d{2,4})[\.\/\-\s]+(\d{1,2})[\.\/\-\s]+(\d{1,2})/);
    if (match) {
      let year = match[1];
      if (year.length === 2) {
        year = parseInt(year, 10) > 50 ? '19' + year : '20' + year;
      }
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return str;
  },

  /**
   * 숫자 변환 (쉼표, 원, 통화기호 등 제거)
   * @param {any} val
   * @returns {number}
   */
  parseNumber(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const clean = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  },

  /**
   * 천 단위 콤마 포맷팅
   * @param {number|string} num
   * @param {number} [decimals=0] 소수점 자리수
   * @returns {string}
   */
  formatNumber(num, decimals = 0) {
    const val = CoreUtils.parseNumber(num);
    return val.toLocaleString('ko-KR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  /**
   * 개인정보 마스킹 처리
   * @param {string} val 값
   * @param {'name'|'phone'|'address'|'ssn'} type 마스킹 유형
   * @returns {string} 마스킹된 문자열
   */
  maskPersonalInfo(val, type) {
    if (!val) return '';
    const str = String(val).trim();

    switch (type) {
      case 'name':
        if (str.length <= 1) return str;
        if (str.length === 2) return str[0] + '*';
        if (str.length === 3) return str[0] + '*' + str[2];
        if (str.length >= 4) {
          const midLen = str.length - 2;
          return str[0] + '*'.repeat(midLen) + str[str.length - 1];
        }
        return str;

      case 'phone':
        const norm = CoreUtils.normalizePhone(str);
        const parts = norm.split('-');
        if (parts.length === 3) {
          return `${parts[0]}-****-${parts[2]}`;
        }
        return str.replace(/\d(?=\d{4})/g, '*');

      case 'address':
        // 예: "충청남도 홍성군 홍북읍 충남대로 100" -> "충청남도 홍성군 홍북읍 ****"
        const words = str.split(/\s+/);
        if (words.length <= 2) return str + ' ****';
        return words.slice(0, 3).join(' ') + ' ****';

      case 'ssn':
        // 주민번호 또는 생년월일 (YYMMDD-G******)
        return str.replace(/(\d{6})[-_\s]?([1-8])\d{6}/, '$1-$2******');

      default:
        return str;
    }
  },

  /**
   * 토스트 알림 표시 (성공/오류/정보)
   * @param {string} message 메시지
   * @param {'success'|'error'|'info'|'warning'} [type='info'] 알림 종류
   * @param {number} [duration=3500] 노출 시간(ms)
   */
  showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span class="toast-icon">${iconMap[type] || 'ℹ'}</span>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },

  /**
   * 진행상태 로더 표시/숨김
   * @param {boolean} show 표시 여부
   * @param {string} [text='데이터를 처리하고 있습니다...'] 안내 문구
   */
  setLoading(show, text = '데이터를 처리하고 있습니다...') {
    let loader = document.getElementById('global-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.className = 'global-loader-backdrop';
      loader.innerHTML = `
        <div class="loader-box">
          <div class="loader-spinner"></div>
          <div class="loader-text" id="global-loader-text">${text}</div>
          <div class="loader-sub">모든 연산은 사용자 PC 내부에서만 안전하게 실행됩니다.</div>
        </div>
      `;
      document.body.appendChild(loader);
    }

    const textEl = document.getElementById('global-loader-text');
    if (textEl) textEl.textContent = text;

    if (show) {
      loader.style.display = 'flex';
    } else {
      loader.style.display = 'none';
    }
  },

  /**
   * 데이터 테이블 미리보기 렌더링
   * @param {HTMLElement} targetEl 테이블 삽입 컨테이너
   * @param {string[]} headers 컬럼명 배열
   * @param {Array<Array<any>>} rows 데이터 행 배열
   * @param {number} [maxPreview=100] 최대 미리보기 행 수
   */
  renderPreviewTable(targetEl, headers, rows, maxPreview = 100) {
    if (!targetEl) return;
    if (!headers || headers.length === 0) {
      targetEl.innerHTML = '<div class="empty-state">표시할 데이터가 없습니다.</div>';
      return;
    }

    const previewRows = rows.slice(0, maxPreview);
    const hasMore = rows.length > maxPreview;

    let html = `
      <div class="table-meta-bar">
        <span class="badge badge-info">총 <strong>${CoreUtils.formatNumber(rows.length)}</strong>개 행</span>
        <span class="badge badge-secondary">컬럼 <strong>${headers.length}</strong>개</span>
        ${hasMore ? `<span class="badge badge-warning">화면에는 상위 ${maxPreview}개 행만 표시 중 (다운로드 시 전체 적용)</span>` : ''}
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 50px;">No</th>
              ${headers.map(h => `<th>${CoreUtils.escapeHtml(h)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${previewRows.map((row, idx) => `
              <tr>
                <td class="text-center text-muted">${idx + 1}</td>
                ${headers.map((_, colIdx) => `<td>${CoreUtils.escapeHtml(row[colIdx] !== undefined ? String(row[colIdx]) : '')}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    targetEl.innerHTML = html;
  },

  /**
   * HTML 특수문자 이스케이프
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * 순수 Canvas 가로 막대 차트 렌더러
   * 외부 라이브러리 없이 순수 HTML5 Canvas로 공공기관 스타일 차트 생성
   * @param {HTMLCanvasElement} canvas
   * @param {Array<{ label: string, value: number, color?: string }>} items
   * @param {object} [options]
   */
  drawBarChart(canvas, items, options = {}) {
    if (!canvas || !items || items.length === 0) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const title = options.title || '';
    const unit = options.unit || '건';
    const paddingLeft = 140;
    const paddingRight = 80;
    const paddingTop = title ? 45 : 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...items.map(it => it.value), 1);
    const barHeight = Math.min(32, Math.max(16, (chartHeight / items.length) * 0.65));
    const stepY = chartHeight / items.length;

    // 제목
    if (title) {
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = options.isDark ? '#e2e8f0' : '#1e293b';
      ctx.textAlign = 'left';
      ctx.fillText(title, 20, 25);
    }

    const defaultColors = ['#2563eb', '#3b82f6', '#0284c7', '#0d9488', '#16a34a', '#ca8a04', '#ea580c', '#e11d48'];

    items.forEach((item, idx) => {
      const y = paddingTop + idx * stepY + (stepY - barHeight) / 2;
      const barW = (item.value / maxVal) * chartWidth;
      const color = item.color || defaultColors[idx % defaultColors.length];

      // 배경 그리드 바
      ctx.fillStyle = options.isDark ? '#334155' : '#f1f5f9';
      ctx.fillRect(paddingLeft, y, chartWidth, barHeight);

      // 실제 값 바
      ctx.fillStyle = color;
      ctx.fillRect(paddingLeft, y, Math.max(3, barW), barHeight);

      // 레이블 (좌측)
      ctx.font = '13px sans-serif';
      ctx.fillStyle = options.isDark ? '#cbd5e1' : '#334155';
      ctx.textAlign = 'right';
      ctx.fillText(item.label, paddingLeft - 10, y + barHeight / 2 + 4);

      // 수치 (우측)
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = options.isDark ? '#f8fafc' : '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText(`${CoreUtils.formatNumber(item.value)} ${unit}`, paddingLeft + barW + 8, y + barHeight / 2 + 4);
    });
  }
};

window.CoreUtils = CoreUtils;
