#!/usr/bin/env python3

import asyncio
import json
import sys
import websockets

SOCKET_URI = "ws://localhost:60001"

async def execute(command):
    websocket = await websockets.connect(SOCKET_URI)
    payload = {
        "command": "execute_command",
        "payload": command
    }
    await websocket.send(json.dumps(payload))

def main():
    asyncio.get_event_loop().run_until_complete(execute(sys.argv[1]))

if __name__ == "__main__":
    main()