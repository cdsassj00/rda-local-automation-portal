# -*- coding: utf-8 -*-
"""
농업기술센터 로컬 업무자동화 포털 - 데스크톱 런처 (버전 B)
pywebview가 설치된 환경에서는 단독 윈도우 창으로 실행되며,
미설치 환경에서는 기본 웹 브라우저로 안전하게 실행됩니다.
"""

import os
import sys
import webbrowser

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(base_dir, "index.html")

    if not os.path.exists(html_path):
        print(f"[오류] index.html 파일을 찾을 수 없습니다: {html_path}")
        sys.exit(1)

    # 1. pywebview 시도
    try:
        import webview
        print("[안내] pywebview 데스크톱 모드로 포털을 실행합니다...")
        window = webview.create_window(
            title="농업기술센터 로컬 업무자동화 포털 (오프라인 전용)",
            url=html_path,
            width=1400,
            height=900,
            min_size=(1024, 700),
            resizable=True
        )
        webview.start()
        return
    except ImportError:
        pass
    except Exception as e:
        print(f"[알림] webview 실행 중 대체 모드로 전환: {e}")

    # 2. 브라우저 모드 폴백
    print("[안내] 기본 웹 브라우저로 농업기술센터 포털을 실행합니다...")
    url = f"file:///{html_path.replace(os.sep, '/')}"
    webbrowser.open(url)

if __name__ == "__main__":
    main()
