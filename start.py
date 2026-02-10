"""
Launch both backend and frontend servers with a single command.

Usage:
    python start.py

Press Ctrl+C to stop both servers.
"""

import subprocess
import sys
import signal
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT, "frontend")

processes = []


def shutdown(sig=None, frame=None):
    print("\n Shutting down...")
    for name, proc in processes:
        if proc.poll() is None:
            print(f"  Stopping {name}...")
            proc.terminate()
    for name, proc in processes:
        proc.wait()
    print("  All servers stopped.")
    sys.exit(0)


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)


def main():
    # --- Backend (FastAPI + Uvicorn) ---
    print("[backend]  Starting on http://localhost:8000")
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000"],
        cwd=ROOT,
    )
    processes.append(("backend", backend))

    # --- Frontend (Vite) ---
    # Use npm.cmd on Windows, npm elsewhere
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    print("[frontend] Starting on http://localhost:3000")
    frontend = subprocess.Popen(
        [npm, "run", "dev"],
        cwd=FRONTEND_DIR,
    )
    processes.append(("frontend", frontend))

    print("\nBoth servers running. Press Ctrl+C to stop.\n")

    # Wait for either process to exit
    while True:
        for name, proc in processes:
            ret = proc.poll()
            if ret is not None:
                print(f"\n[{name}] exited with code {ret}. Shutting down...")
                shutdown()

        # Avoid busy-waiting
        try:
            processes[0][1].wait(timeout=1)
        except subprocess.TimeoutExpired:
            pass


if __name__ == "__main__":
    main()
