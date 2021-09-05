#!/usr/bin/env python3

import asyncio
import json
import os
import pathlib
import sys
import time
import websockets

SOCKET_URI = "ws://localhost:60001"

launch_configuration = {
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python",
            "type": "python",
            "request": "launch",
            "program": "${workspaceFolder}/" + sys.argv[1],
            "args": [],
            "console": "integratedTerminal"
        },
        {
            "name": "C",
            "type": "cppdbg",
            "request": "launch",
            "program": "${workspaceFolder}/" + sys.argv[1],
            "args": [],
            "stopAtEntry": "false",
            "cwd": "${fileDirname}",
            "environment": [],
            "externalConsole": "false",
            "MIMode": "gdb",
            "setupCommands": [
                {
                    "description": "Enable pretty-printing for gdb",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": "true"
                }
            ]
        }
    ]
}

async def check_break_points():
    async with websockets.connect(SOCKET_URI) as websocket:
        await websocket.send("check_break_points")
        response = await websocket.recv()
        if not int(response) > 0:
            no_break_points()


async def start_c_debug():
    async with websockets.connect(SOCKET_URI) as websocket:
        await websocket.send("start_c_debug")


async def start_python_debug():
    async with websockets.connect(SOCKET_URI) as websocket:
        await websocket.send("start_python_debug")


async def monitor():
    async with websockets.connect(SOCKET_URI) as websocket:
        while True:
            time.sleep(0.5)
            response = await websocket.recv()
            if response == "terminated_debugger":
                break


def generate_config():
    if len(sys.argv) > 1:
        for i in range(2, len(sys.argv)):
            launch_configuration["configurations"][0]["args"].append(sys.argv[i])
        launch_configuration["configurations"][0]["args"].append("&&")
        launch_configuration["configurations"][0]["args"].append("exit")

    file = open(".vscode/launch.json", "w")
    file.write(json.dumps(launch_configuration))
    file.close()


def verify_executable(source, executable):
    sourceMTime = pathlib.Path(source).stat().st_mtime_ns
    executableMTime = pathlib.Path(executable).stat().st_mtime_ns
    if (sourceMTime > executableMTime):
        message = "Looks like you've changed your code. Recompile and then re-run debug50!"
        print(decorate(message, "WARNING"))
        sys.exit(1)
        return False

    return True


def no_break_points():
    message = "Looks like you haven't set any breakpoints. "\
                "Set at least one breakpoint by clicking to the "\
                "left of a line number and then re-run debug50!"
    print(decorate(message, "WARNING"))
    sys.exit(1)


def decorate(message, level):
    bcolors = {
        "HEADER": '\033[95m',
        "OKBLUE": '\033[94m',
        "OKCYAN": '\033[96m',
        "OKGREEN": '\033[92m',
        "WARNING": '\033[93m',
        "FAIL": '\033[91m',
        "ENDC": '\033[0m',
        "BOLD": '\033[1m',
        "UNDERLINE": '\033[4m'
    }
    return bcolors[level] + message + bcolors[level]


def main():
    generate_config()
    asyncio.get_event_loop().run_until_complete(check_break_points())
    if ".py" in sys.argv[1]:
        asyncio.get_event_loop().run_until_complete(start_python_debug())

    else:
        source = sys.argv[1] + ".c"
        executable = sys.argv[1]
        if (verify_executable(source, executable)):
            asyncio.get_event_loop().run_until_complete(start_c_debug())


if __name__ == "__main__":
    main()
    asyncio.get_event_loop().run_until_complete(monitor())
