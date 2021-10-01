#!/usr/bin/env python3

import asyncio
import json
import os
import sys
import websockets

SOCKET_URI = f"ws://localhost:{os.getenv('CS50_EXTENSION_PORT', 3050)}"

async def execute(command):
    websocket = await websockets.connect(SOCKET_URI)

    payload = {
        "command": "prompt",
        "payload": {
            "title": sys.argv[1],
            "body": sys.argv[2]
        }
    }
    await websocket.send(json.dumps(payload))


def rebuild():
    command = "github.codespaces.rebuildEnvironment"
    asyncio.get_event_loop().run_until_complete(execute(command))


def main():
    try:
        asyncio.get_event_loop().run_until_complete(execute(sys.argv[1]))
    except:
        print("Usage: prompt50 TITLE BODY")


if __name__ == "__main__":
    main()