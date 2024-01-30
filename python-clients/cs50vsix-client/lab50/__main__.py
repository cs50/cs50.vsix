#!/usr/bin/env python3

import signal
import sys

signal.signal(signal.SIGINT, lambda signum, frame: sys.exit(1))

import asyncio
import json
import os
import websockets
from cs50vsixutils import get_vscode_shell_pid

DEFAULT_PORT = 1337
try:
    with open("/tmp/cs50_pid_port_mapping.json", "r") as f:
        data = json.load(f)
        DEFAULT_PORT = data[str(get_vscode_shell_pid())]
except Exception:
    pass
SOCKET_URI = f"ws://localhost:{DEFAULT_PORT}"

async def open_lab():
    websocket = await websockets.connect(SOCKET_URI)
    payload = {
        "command": "open_lab",
        "payload": {
            "fileUri": {
                "path": os.getcwd()
            }
        }
    }
    await websocket.send(json.dumps(payload))


def main():
    asyncio.get_event_loop().run_until_complete(open_lab())


if __name__ == "__main__":
    main()

