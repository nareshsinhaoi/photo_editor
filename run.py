"""
run.py — Development launcher for the photo editor.

Usage:
    python run.py

Serves the FastAPI app at http://127.0.0.1:8000 with auto-reload
so edits to Python files are picked up without restarting.
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5005))
    reload = os.environ.get("RELOAD", "0") == "1"   # opt-in

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",           # listen on all interfaces
        port=port,
        reload=reload,            # off by default for network use
        log_level="info",
    )