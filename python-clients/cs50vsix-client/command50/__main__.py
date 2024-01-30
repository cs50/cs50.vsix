#!/usr/bin/env python3

import asyncio
import json
import sys
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

async def execute(command):
    websocket = await websockets.connect(SOCKET_URI)

    args = ""
    if len(sys.argv) > 2:
        args = sys.argv[2:]

    payload = {
        "command": "execute_command",
        "payload": {
            "command": command,
            "args": args
        }
    }
    await websocket.send(json.dumps(payload))


def rebuild():
    command = "github.codespaces.rebuildEnvironment"
    asyncio.get_event_loop().run_until_complete(execute(command))


def main():
    try:
        asyncio.get_event_loop().run_until_complete(execute(sys.argv[1]))
    except OSError as e:
        message = f"Failed to connect extension server on port {DEFAULT_PORT}.\nPlease visit cs50.dev/restart to restart your codespace."
        print(message)
    except Exception:
        print("command50 ran into error")


if __name__ == "__main__":
    main()
