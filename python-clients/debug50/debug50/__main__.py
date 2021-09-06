#!/usr/bin/env python3

import asyncio
import json
import os
import pathlib
import sys
import websockets

SOCKET_URI = "ws://localhost:60001"

LAUNCH_CONFIG = {
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

async def launch():

    generate_config()
    
    try:

        # Start python debugger
        if get_file_extension(sys.argv[1]) == ".py":
            await asyncio.wait_for(start_python_debug(os.path.abspath(sys.argv[1])), timeout=2)
        
        # Start c/cpp debugger
        else:
            source = sys.argv[1] + ".c"
            executable = sys.argv[1]
            if (verify_executable(source, executable)):
                await asyncio.wait_for(start_c_debug(os.path.abspath(source)), timeout=2)
        
        # Monitoring interactive debugger
        await monitor()
    except asyncio.TimeoutError:
        failed_to_start_debugger()


async def start_c_debug(full_path):
    websocket = await websockets.connect(SOCKET_URI)
    payload = {
        "command": "start_c_debug",
        "path": full_path
    }
    await websocket.send(json.dumps(payload))
    response = await websocket.recv()
    if response == "no_break_points":
        no_break_points()


async def start_python_debug(full_path):
    websocket = await websockets.connect(SOCKET_URI)
    payload = {
        "command": "start_python_debug",
        "path": full_path
    }
    await websocket.send(json.dumps(payload))
    response = await websocket.recv()
    if response == "no_break_points":
        no_break_points()


async def monitor():
    async with websockets.connect(SOCKET_URI) as websocket:
        response = await websocket.recv()
        if response == "terminated_debugger":
            return


def generate_config():
    if len(sys.argv) > 1:
        for i in range(2, len(sys.argv)):
            LAUNCH_CONFIG["configurations"][0]["args"].append(sys.argv[i])
        LAUNCH_CONFIG["configurations"][0]["args"].append("&&")
        LAUNCH_CONFIG["configurations"][0]["args"].append("exit")

    file = open(".vscode/launch.json", "w")
    file.write(json.dumps(LAUNCH_CONFIG))
    file.close()


def get_file_extension(path):
    return pathlib.Path(path).suffix


def verify_executable(source, executable):
    if (not os.path.isfile(source)) or (get_file_extension(source) != ".c"):
        file_not_supported()

    sourceMTime = pathlib.Path(source).stat().st_mtime_ns
    executableMTime = pathlib.Path(executable).stat().st_mtime_ns
    if (sourceMTime > executableMTime):
        message = "Looks like you've changed your code. Recompile and then re-run debug50!"
        print(decorate(message, "WARNING"))
        sys.exit(1)

    return True


def file_not_supported():
    message = "Can't debug this program! Are you sure you're running debug50 on an executable or a Python script?"
    print(decorate(message, "WARNING"))
    sys.exit(1)


def no_break_points():
    message = "Looks like you haven't set any breakpoints. "\
                "Set at least one breakpoint by clicking to the "\
                "left of a line number and then re-run debug50!"
    print(decorate(message, "WARNING"))
    sys.exit(1)


def failed_to_start_debugger():
    message = "Could not start debugger"
    print(decorate(message, "FAIL"))
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
    asyncio.get_event_loop().run_until_complete(launch())


if __name__ == "__main__":
    main()