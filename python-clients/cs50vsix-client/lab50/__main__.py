#!/usr/bin/env python3

import signal
import sys

signal.signal(signal.SIGINT, lambda signum, frame: sys.exit(1))

import argparse
import asyncio
import json
import os
import pathlib
import subprocess
import textwrap
import websockets

DEFAULT_PORT = os.getenv("CS50_EXTENSION_PORT", 1337)
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

