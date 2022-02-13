#!/usr/bin/env python3

import argparse
import asyncio
import json
import os
import pathlib
import sys
import websockets

from debug50.colors import red, yellow

# https://web.mit.edu/rhel-doc/4/RH-DOCS/rhel-sg-en-4/ch-ports.html
DEFAULT_PORT = 1337
SOCKET_URI = f"ws://localhost:{DEFAULT_PORT}"
DEBUGGER_TIMEOUT = 10
LAUNCH_CONFIG_C = "c"
LAUNCH_CONFIG_PYTHON = "python"
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
            "cwd": f"{os.getcwd()}",
            "environment": [],
            "externalConsole": False,
            "MIMode": "gdb",
            "MIDebuggerPath": "gdb",
            "miDebuggerArgs": "-q",
            "sourceFileMap": {
                "/build/glibc-eX1tMB/": f"vscode-remote://{os.getenv('CODESPACE_NAME')}/opt/cs50/src/glibc-eX1tMB/"
            },
            "setupCommands": [
                {
                    "description": "Enable pretty-printing for gdb",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": True
                },
                {
                    "description": "Skip glibc",
                    "text": "-interpreter-exec console \"skip -gfi **/glibc*/**/*.c\""
                }
            ]
        },
        {
            "name": LAUNCH_CONFIG_PYTHON,
            "type": "python",
            "request": "launch",
            "program": "",
            "args": [],
            "cwd": f"{os.getcwd()}",
            "console": "integratedTerminal"
        }
    ]
}

def main():
    args, extra_args = parse_args(sys.argv[1:])
    try:
        asyncio.get_event_loop().run_until_complete(launch(args.PROGRAM, extra_args))
    except KeyboardInterrupt:
        asyncio.get_event_loop().run_until_complete(stop_debugger())


async def launch(program, arguments):
    try:

        if (not os.path.isfile(program)):
            file_not_found(program)

        # Start python debugger
        if get_file_extension(program) == ".py":
            await asyncio.wait_for(launch_debugger(LAUNCH_CONFIG_PYTHON, program, program, arguments), timeout=DEBUGGER_TIMEOUT)

        # Start c/cpp debugger
        else:
            source = program + ".c"
            executable = program
            if (verify_executable(source, executable)):
                await asyncio.wait_for(launch_debugger(LAUNCH_CONFIG_C, source, executable, arguments), timeout=DEBUGGER_TIMEOUT)

        # Monitoring interactive debugger
        await monitor()

    except asyncio.TimeoutError:
        failed_to_launch_debugger()

    except OSError as e:
        failed_to_connect_debug_service(DEFAULT_PORT)


async def launch_debugger(config_name, source, executable, arguments):
    websocket = await websockets.connect(SOCKET_URI)
    customDebugConfiguration = {
        "path": os.path.abspath(source),
        "launch_config": get_config(config_name, executable, arguments)
    }
    payload = {
        "command": "start_debugger",
        "payload": customDebugConfiguration
    }
    await websocket.send(json.dumps(payload))
    response = await websocket.recv()
    if response == "no_break_points":
        no_break_points()


async def stop_debugger():
    websocket = await websockets.connect(SOCKET_URI)
    payload = {
        "command": "stop_debugger"
    }
    await websocket.send(json.dumps(payload))


async def monitor():
    async with websockets.connect(SOCKET_URI) as websocket:
        response = await websocket.recv()
        if response == "terminated_debugger":
            return


def get_config(config_name, program, arguments):
    for each in filter(lambda x: x["name"]==config_name, LAUNCH_CONFIG["configurations"]):
        each["program"] = f"{os.getcwd()}/{program}"
        if arguments is not None:
            each["args"] = arguments

        return each


def get_file_extension(path):
    return pathlib.Path(path).suffix


def verify_executable(source, executable):
    if ((not os.path.isfile(source)) or (get_file_extension(source) != ".c")):
        file_not_supported(executable)

    if (not os.path.isfile(executable)):
        executable_not_found()

    sourceMTime = pathlib.Path(source).stat().st_mtime_ns
    executableMTime = pathlib.Path(executable).stat().st_mtime_ns
    if (sourceMTime > executableMTime):
        message = "Looks like you've changed your code. Recompile and then re-run debug50!"
        print(yellow(message))
        sys.exit(1)

    return True


def file_not_supported(filename):
    message = f"Can't debug this program! Are you sure you're running debug50 on an executable or a Python script?\nUnsupported File: {filename}"
    print(yellow(message))
    sys.exit(1)


def file_not_found(filename):
    message = f"Unable to locate file: {filename}\nPlease make sure the filename is correct."
    print(yellow(message))
    sys.exit(1)


def executable_not_found():
    message = "Executable not found! Did you compile your code?"
    print(yellow(message))
    sys.exit(1)


def no_break_points():
    message = "Looks like you haven't set any breakpoints. "\
                "Set at least one breakpoint by clicking to the "\
                "left of a line number and then re-run debug50!"
    print(yellow(message))
    sys.exit(1)


def failed_to_launch_debugger():
    message = "Unable to launch debugger."
    print(red(message))
    sys.exit(1)


def failed_to_connect_debug_service(port):
    message = f"Failed to connect extension server on port {port}.\nPlease refresh the page and try again."
    print(red(message))


def parse_args(args):
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "PROGRAM"
    )
    return parser.parse_known_args(args)


if __name__ == "__main__":
    main()