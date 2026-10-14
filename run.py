"""
run.py — Development launcher for the photo editor.

Usage:
    python run.py

Serves the FastAPI app at http://127.0.0.1:8000 with auto-reload
so edits to Python files are picked up without restarting.
"""
# import os
# import uvicorn

# if __name__ == "__main__":
#     port = int(os.environ.get("PORT", 5005))
#     reload = os.environ.get("RELOAD", "0") == "1"   # opt-in

#     uvicorn.run(
#         "app.main:app",
#         host="0.0.0.0",           # listen on all interfaces
#         port=port,
#         reload=reload,            # off by default for network use
#         log_level="info",
#     )


"""
run.py — Launcher for Pixel Studio (FastAPI + Uvicorn).

Prints a Flask-style startup banner so the LAN URL is obvious.
"""

import os
import socket
import sys
import uvicorn


def get_lan_ip() -> str:
    """Best-effort LAN IP without needing an external service."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't actually send packets; just resolves the outbound interface.
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def main() -> None:
    port = int(os.environ.get("PORT", 8005))
    debug = os.environ.get("DEBUG", "1") == "1"
    lan_ip = get_lan_ip()

    banner = f"""
 * Pixel Studio (FastAPI)
 * Debug mode: {'on' if debug else 'off'}
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:{port}
 * Running on http://{lan_ip}:{port}
 * Press CTRL+C to quit
"""
    print(banner, flush=True)

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=debug,
        log_level="info",
        access_log=True,
    )


if __name__ == "__main__":
    main()