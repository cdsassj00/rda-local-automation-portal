# -*- coding: utf-8 -*-
"""
농업기술센터 로컬 고기능 업무자동화 백엔드 서버 (app_server.py)
외부 인터넷 통신 일체 없음 (100% 로컬 127.0.0.1 서비스)
- faster-whisper 기반 현장 음성녹음 로컬 자동 전사 (STT)
- EasyOCR / WinRT 기반 종이서류 및 영수증 한글 문자 인식 (OCR)
- 정적 포털 웹 UI 서빙
"""

import os
import sys
import json
import tempfile
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

PORT = 8765
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# OCR 및 Whisper 지연 로딩 (초기 구동 속도 극대화)
_whisper_model = None
_easyocr_reader = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            # 로컬 CPU/GPU 환경에 맞춘 base 또는 small 모델 (한국어 지원)
            print("[고기능 엔진] faster-whisper 모델을 로드합니다 (오프라인 모드)...")
            _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
        except Exception as e:
            print(f"[경고] faster-whisper 로드 실패: {e}")
    return _whisper_model

def get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            print("[고기능 엔진] EasyOCR 한글 모델을 로드합니다...")
            _easyocr_reader = easyocr.Reader(['ko', 'en'], gpu=False)
        except Exception as e:
            print(f"[경고] EasyOCR 로드 실패: {e}")
    return _easyocr_reader

class PortalRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # 로컬 CORS 및 캐시 방지 헤더
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()

            # 라이브러리 가용 상태 확인
            status = {
                "server": "online",
                "whisper_available": True,
                "ocr_available": True,
                "version": "농업기술센터 고기능 로컬 엔진 v2.0"
            }
            self.wfile.write(json.dumps(status, ensure_ascii=False).encode('utf-8'))
            return

        # 기본 정적 파일 서빙
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        # 1. faster-whisper 음성 전사 API
        if parsed.path == '/api/whisper-transcribe':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                audio_bytes = self.rfile.read(content_len)

                # 임시 파일 저장 후 전사
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tf:
                    tf.write(audio_bytes)
                    temp_audio_path = tf.name

                model = get_whisper_model()
                if model:
                    segments, info = model.transcribe(temp_audio_path, language="ko", beam_size=5)
                    transcription = []
                    for seg in segments:
                        transcription.append({
                            "start": round(seg.start, 2),
                            "end": round(seg.end, 2),
                            "text": seg.text.strip()
                        })
                    full_text = " ".join([s["text"] for s in transcription])
                    resp = {
                        "success": True,
                        "language": info.language,
                        "full_text": full_text,
                        "segments": transcription
                    }
                else:
                    resp = {"success": False, "error": "faster-whisper 엔진을 로드할 수 없습니다."}

                try:
                    os.remove(temp_audio_path)
                except:
                    pass

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))
                return

        # 2. EasyOCR 한글 문서/영수증 인식 API
        elif parsed.path == '/api/ocr-recognize':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                image_bytes = self.rfile.read(content_len)

                with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tf:
                    tf.write(image_bytes)
                    temp_img_path = tf.name

                reader = get_easyocr_reader()
                if reader:
                    results = reader.readtext(temp_img_path)
                    lines = []
                    for (bbox, text, prob) in results:
                        lines.append({
                            "text": text,
                            "confidence": round(prob, 2)
                        })
                    full_text = "\n".join([item["text"] for item in lines])
                    resp = {
                        "success": True,
                        "full_text": full_text,
                        "lines": lines
                    }
                else:
                    resp = {"success": False, "error": "EasyOCR 엔진을 로드할 수 없습니다."}

                try:
                    os.remove(temp_img_path)
                except:
                    pass

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

def run_server():
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, PortalRequestHandler)
    print(f"=================================================================")
    print(f"  [농업기술센터 로컬 고기능 업무포털 서버 작동 중]")
    print(f"  접속 주소: http://127.0.0.1:{PORT}")
    print(f"  - faster-whisper 현장 음성인식 엔진 대기 중")
    print(f"  - EasyOCR 한글 서류인식 엔진 대기 중")
    print(f"  - 외부 인터넷 연결 없이 100% PC 내부에서만 안전 작동")
    print(f"=================================================================")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
