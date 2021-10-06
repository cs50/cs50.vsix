#!/usr/bin/env python3

import argparse
import asyncio
import json
import os
import sys
import websockets

SOCKET_URI = f"ws://localhost:{os.getenv('CS50_EXTENSION_PORT', 3050)}"

def main():
    args = parse_args(sys.argv[1:])
    asyncio.get_event_loop().run_until_complete(prompt(args.title, args.body, args.action))


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
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument(
        'title'
    )
    parser.add_argument(
        'body'
    )
    parser.add_argument(
        'action',
        nargs='?',
        const=None
    )
    return parser.parse_args(args)


if __name__ == "__main__":
    main()