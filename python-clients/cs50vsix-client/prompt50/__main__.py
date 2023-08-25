#!/usr/bin/env python3

import argparse
import asyncio
import json
import os
import sys
from typing import DefaultDict
import websockets

DEFAULT_PORT = os.getenv("CS50_EXTENSION_PORT", 1337)
SOCKET_URI = f"ws://localhost:{DEFAULT_PORT}"

def main():
    try:
        args = parse_args(sys.argv[1:])
        asyncio.get_event_loop().run_until_complete(prompt(args.title, args.body, args.action))
    except OSError as e:
        message = f"Failed to connect extension server on port {DEFAULT_PORT}.\nPlease visit cs50.dev/restart to restart your codespace."
        print(message)
    except Exception:
        print("prompt50 ran into error")


async def prompt(title, body, action):
    websocket = await websockets.connect(SOCKET_URI)
    payload = {
        "command": "prompt",
        "payload": {
            "title": title,
            "body": body,
            'action': action
        }
    }
    await websocket.send(json.dumps(payload))


def parse_args(args):
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "body"
    )
    parser.add_argument(
        "-t",
        "--title",
        nargs='?',
        const=""
    )
    parser.add_argument(
        "-a",
        "--action",
        nargs='?',
        const=""
    )
    return parser.parse_args(args)


if __name__ == "__main__":
    main()
