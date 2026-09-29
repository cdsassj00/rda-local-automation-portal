/**
 * 농업기술센터 로컬 업무자동화 포털 - 로컬 고기능 도구 (메뉴 31~32)
 * 31. 현장 출장 음성 녹음 전사 (faster-whisper 로컬 STT)
 * 32. 종이서류/영수증 문자 인식 (EasyOCR 한글 OCR)
 */

window.PortalModules = window.PortalModules || {};

/* ==========================================================================
   31. 현장 출장 음성 녹음 전사 (faster-whisper)
   ========================================================================== */
PortalModules['whisper-stt'] = {
  id: 'whisper-stt',
  title: '현장 음성녹음 자동 전사',
  subtitle: '스마트폰으로 녹음한 현장 지도/출장 음성을 faster-whisper로 100% 로컬에서 전사하여 출장복명서로 변환합니다.',
  category: '로컬 고기능 도구',

  state: { transcription: '' },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>🎙️ 현장 출장 음성 녹음 자동 전사 (faster-whisper STT)</h3>
            <p>인터넷 없이 PC 내부의 faster-whisper 모델이 스마트폰 녹음 파일(m4a, mp3, wav)을 정밀한 한글 텍스트로 풀어냅니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="whisper-drop-zone">
            <div class="drop-zone-icon">🎙️</div>
            <div class="drop-zone-title">스마트폰 음성 녹음 파일(m4a, mp3, wav)을 선택하세요</div>
            <div class="drop-zone-sub">(농가 상담 내용, 현장 점검 구두 메모 등)</div>
            <input type="file" id="whisper-file-input" accept="audio/*,.m4a,.mp3,.wav,.ogg" />
          </div>

          <div id="whisper-file-info" style="margin-top: 14px; font-weight: 600; color: var(--primary);"></div>

          <div class="btn-group">
            <button class="btn btn-primary btn-lg" id="btn-run-whisper">
              <span>⚡</span> faster-whisper 음성 전사 시작
            </button>
          </div>

          <div id="whisper-result-area" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>전사된 녹취록 내용</h3>
              </div>
              <div class="btn-group" style="margin-top: 0;">
                <button class="btn btn-success" id="btn-send-to-trip">
                  <span>📑</span> 이 내용으로 출장복명서 작성하기
                </button>
                <button class="btn btn-outline" id="btn-copy-stt">클립보드 복사</button>
              </div>
            </div>

            <textarea class="form-control" id="whisper-output-text" rows="10" style="font-size: 14.5px; line-height: 1.8;"></textarea>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#whisper-file-input');
    const fileInfo = container.querySelector('#whisper-file-info');
    const runBtn = container.querySelector('#btn-run-whisper');
    const resultArea = container.querySelector('#whisper-result-area');
    const outputText = container.querySelector('#whisper-output-text');
    const sendBtn = container.querySelector('#btn-send-to-trip');
    const copyBtn = container.querySelector('#btn-copy-stt');

    let selectedAudio = null;

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      selectedAudio = file;
      fileInfo.textContent = `선택된 음성: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    });

    runBtn.addEventListener('click', async () => {
      if (!selectedAudio) {
        CoreUtils.showToast('전사할 음성 녹음 파일을 먼저 선택해주세요.', 'warning');
        return;
      }

      CoreUtils.setLoading(true, 'faster-whisper 모델이 음성을 텍스트로 변환하고 있습니다 (로컬 연산)...');
      try {
        const buffer = await selectedAudio.arrayBuffer();
        // 로컬 백엔드 서버(127.0.0.1:8765)로 전송
        const response = await window.origFetch('http://127.0.0.1:8765/api/whisper-transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: buffer
        });

        const data = await response.json();
        if (data.success) {
          outputText.value = data.full_text;
          this.state.transcription = data.full_text;
          resultArea.style.display = 'block';
          CoreUtils.showToast('faster-whisper 음성 전사 완료!', 'success');
        } else {
          throw new Error(data.error || '음성 전사 실패');
        }
      } catch (err) {
        // 서버 미실행 시 안내
        alert('로컬 고기능 서버(app_server.py)가 실행 중이지 않거나 연결할 수 없습니다.\n\n[포털실행.bat]을 통해 실행하시면 faster-whisper 엔진이 자동으로 함께 구동됩니다.');
      } finally {
        CoreUtils.setLoading(false);
      }
    });

    sendBtn.addEventListener('click', () => {
      if (!outputText.value) return;
      localStorage.setItem('portal_stt_memo', outputText.value);
      AppRouter.navigate('trip-record');
      CoreUtils.showToast('출장기록 작성 메뉴로 녹취 내용이 전달되었습니다.', 'success');
      setTimeout(() => {
        const findingsEl = document.getElementById('trip-findings');
        if (findingsEl) {
          findingsEl.value = outputText.value;
        }
      }, 100);
    });

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(outputText.value);
      CoreUtils.showToast('녹취록이 클립보드에 복사되었습니다.', 'info');
    });
  }
};

/* ==========================================================================
   32. 종이서류/영수증 문자 인식 (EasyOCR)
   ========================================================================== */
PortalModules['doc-ocr'] = {
  id: 'doc-ocr',
  title: '서류·영수증 문자 인식',
  subtitle: '종이 농지원부, 사업비 영수증 사진을 EasyOCR 한글 딥러닝 모델로 판독하여 텍스트/표로 자동 변환합니다.',
  category: '로컬 고기능 도구',

  state: { ocrText: '' },

  render(container) {
    container.innerHTML = `
      <div class="work-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3>📷 종이 서류 및 영수증 문자 인식 (EasyOCR)</h3>
            <p>농가에서 가져온 종이 영수증, 농지원부, 농업경영체 등록증 사진을 로컬 딥러닝 OCR로 자동 판독합니다.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="drop-zone" id="ocr-drop-zone">
            <div class="drop-zone-icon">📷</div>
            <div class="drop-zone-title">문자를 판독할 서류/영수증 사진(JPG, PNG)을 선택하세요</div>
            <input type="file" id="ocr-file-input" accept="image/*" />
          </div>

          <div id="ocr-file-info" style="margin-top: 14px; font-weight: 600; color: var(--primary);"></div>

          <div class="btn-group">
            <button class="btn btn-primary btn-lg" id="btn-run-ocr">
              <span>⚡</span> EasyOCR 한글 판독 시작
            </button>
          </div>

          <div id="ocr-result-area" style="margin-top: 28px; display: none;">
            <div class="card-header" style="background: none; padding-left: 0; padding-right: 0;">
              <div class="card-title-group">
                <h3>인식된 서류 텍스트 내용</h3>
              </div>
              <button class="btn btn-outline" id="btn-copy-ocr">클립보드 복사</button>
            </div>

            <textarea class="form-control" id="ocr-output-text" rows="10" style="font-size: 14px; line-height: 1.8;"></textarea>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const fileInput = container.querySelector('#ocr-file-input');
    const fileInfo = container.querySelector('#ocr-file-info');
    const runBtn = container.querySelector('#btn-run-ocr');
    const resultArea = container.querySelector('#ocr-result-area');
    const outputText = container.querySelector('#ocr-output-text');
    const copyBtn = container.querySelector('#btn-copy-ocr');

    let selectedImg = null;

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      selectedImg = file;
      fileInfo.textContent = `선택된 이미지: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    });

    runBtn.addEventListener('click', async () => {
      if (!selectedImg) {
        CoreUtils.showToast('판독할 서류 사진을 먼저 선택해주세요.', 'warning');
        return;
      }

      CoreUtils.setLoading(true, 'EasyOCR 딥러닝 모델이 한글과 숫자를 판독하고 있습니다...');
      try {
        const buffer = await selectedImg.arrayBuffer();
        const response = await window.origFetch('http://127.0.0.1:8765/api/ocr-recognize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: buffer
        });

        const data = await response.json();
        if (data.success) {
          outputText.value = data.full_text;
          this.state.ocrText = data.full_text;
          resultArea.style.display = 'block';
          CoreUtils.showToast('EasyOCR 서류 판독 완료!', 'success');
        } else {
          throw new Error(data.error || '문자 인식 실패');
        }
      } catch (err) {
        alert('로컬 고기능 서버(app_server.py)가 실행 중이지 않거나 연결할 수 없습니다.\n\n[포털실행.bat]을 통해 실행하시면 EasyOCR 엔진이 자동으로 함께 구동됩니다.');
      } finally {
        CoreUtils.setLoading(false);
      }
    });

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(outputText.value);
      CoreUtils.showToast('인식된 텍스트가 복사되었습니다.', 'info');
    });
  }
};
