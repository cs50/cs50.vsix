#!/usr/bin/env python3

import asyncio
import json
import os
import pathlib
import sys
import websockets

DEBUGGER_TIMEOUT = 5
SOCKET_URI = "ws://localhost:60001"
LAUNCH_CONFIG_C = "C"
LAUNCH_CONFIG_PYTHON = "Python"

LAUNCH_CONFIG = {
    "version": "0.2.0",
    "configurations": [
        {
            "name": LAUNCH_CONFIG_C,
            "type": "cppdbg",
            "request": "launch",
            "program": "",
            "args": [],
            "stopAtEntry": False,
            "cwd": "${fileDirname}",
            "environment": [],
            "externalConsole": False,
            "MIMode": "gdb",
            "setupCommands": [
                {
                    "description": "Enable pretty-printing for gdb",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": True
                }
            ]
        },
        {
            "name": LAUNCH_CONFIG_PYTHON,
            "type": "python",
            "request": "launch",
            "program": "",
            "args": [],
            "console": "integratedTerminal"
        },
        {
            "name": "Python: Current File",
            "type": "python",
            "request": "launch",
            "program": "${file}",
            "console": "integratedTerminal"
        }
    ]
}


async def launch():
    try:

        # Start python debugger
        if get_file_extension(sys.argv[1]) == ".py":
            await asyncio.wait_for(start_python_debug(os.path.abspath(sys.argv[1])), timeout=DEBUGGER_TIMEOUT)
        
        # Start c/cpp debugger
        else:
            source = sys.argv[1] + ".c"
            executable = sys.argv[1]
            if (verify_executable(source, executable)):
                await asyncio.wait_for(start_c_debug(os.path.abspath(source)), timeout=DEBUGGER_TIMEOUT)
        
        # Monitoring interactive debugger
        await monitor()

    except asyncio.TimeoutError:
        failed_to_start_debugger()
    
    except OSError as e:
        failed_to_connect_debug_service()


async def start_c_debug(full_path):
    generate_config(LAUNCH_CONFIG_C)
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
    generate_config(LAUNCH_CONFIG_PYTHON)
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


def generate_config(config_name):
    if len(sys.argv) > 1:
        for each in filter(lambda x: x["name"]==config_name, LAUNCH_CONFIG["configurations"]):
            each["program"] = "${workspaceFolder}/" + sys.argv[1]

            for i in range(2, len(sys.argv)):
                each["args"].append(sys.argv[i])
            
            each["args"].append("&&")
            each["args"].append("exit")

    file = open(".vscode/launch.json", "w")
    file.write(json.dumps(LAUNCH_CONFIG, sort_keys=False, indent=4))
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


def failed_to_connect_debug_service():
    message = "Debug service is not ready yet. Please try again."
    print(decorate(message, "WARNING"))


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