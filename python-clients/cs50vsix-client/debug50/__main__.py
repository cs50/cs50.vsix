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

from debug50.colors import red, yellow


# https://web.mit.edu/rhel-doc/4/RH-DOCS/rhel-sg-en-4/ch-ports.html
DEFAULT_PORT = os.getenv("CS50_EXTENSION_PORT", 1337)
SOCKET_URI = f"ws://localhost:{DEFAULT_PORT}"
DEBUGGER_TIMEOUT = 10
LAUNCH_CONFIG_C = "C"
LAUNCH_CONFIG_PYTHON = "Python"
LAUNCH_CONFIG_JAVA = "Java"
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

            # https://github.com/microsoft/vscode-cpptools/issues/3298
            "miDebuggerArgs": "-q -ex quit; wait() { fg >/dev/null; }; /bin/gdb -q --interpreter=mi",

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
        },
        {
            "name": LAUNCH_CONFIG_JAVA,
            "type": "java",
            "request": "launch",
            "mainClass": "${file}"
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

        # Launch Java debug session (explicitly specified as Java program)
        if program == "java":

            # index 0 of arguments would be the main class name (e.g., the actual java program for debugging)
            program = arguments[0]

            # source file
            if get_file_extension(program) == ".java":
                mainClass = program
            else:
                mainClass = f"{program}.java"

            # the rest would be the arguments passed to the java program
            arguments = arguments[1:]

            # Launch java debug sessions, which would take longer to initialize than c/cpp and python
            #
            # Note:
            # Java language server and debugger extension would be responsible for setting up a java project and compiling at runtime.
            print(yellow("Starting Java debug session..."))
            await asyncio.wait_for(launch_debugger(LAUNCH_CONFIG_JAVA, mainClass, mainClass, arguments, java_debugging=True), timeout=30)

        # Launch Python debug session (infer Python program from file extension)
        elif program == "python" or program == "python3":
            python_script = arguments[0]
            arguments = arguments[1:]
            await asyncio.wait_for(launch_debugger(LAUNCH_CONFIG_PYTHON, python_script, python_script, arguments), timeout=DEBUGGER_TIMEOUT)

        # Launch C/Cpp debug session (no file extensions, assume it is an c/cpp executable)
        else:
            try:

                # Get the source file name using DW_AT_name (usually would be ${executable}.c or ${executable}.cpp )
                source = list(filter(lambda source_file: os.path.basename(program) in source_file, get_source_files(program)))[0]
            except:
                file_not_supported(program)

            executable = program
            if (verify_executable(source, executable)):
                source_files = get_source_files(program)
                await asyncio.wait_for(launch_debugger(LAUNCH_CONFIG_C, source, executable, arguments, source_files), timeout=DEBUGGER_TIMEOUT)

        # Monitoring interactive debugger
        await monitor()

    except asyncio.TimeoutError:
        failed_to_launch_debugger()

    except OSError as e:
        failed_to_connect_debug_service(DEFAULT_PORT)
        print(e)


async def launch_debugger(config_name, source, executable, arguments, source_files=None, java_debugging=False):
    websocket = await websockets.connect(SOCKET_URI)
    customDebugConfiguration = {
        "path": os.path.abspath(source),
        "launch_config": get_config(config_name, executable, arguments),
        "source_files": source_files,
        "java_debugging": java_debugging
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

        if (each["name"] == LAUNCH_CONFIG_JAVA):
            mainClass = program
            each["mainClass"] = f"{os.getcwd()}/{mainClass}"
        else:
            each["program"] = f"{os.getcwd()}/{program}"

        if arguments is not None:
            each["args"] = arguments

        return each


def get_file_extension(path):
    return pathlib.Path(path).suffix


def verify_executable(source, executable):
    supported_source_files = [".c", ".cpp"]
    if ((not os.path.isfile(source)) or (get_file_extension(source) not in supported_source_files)):
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
    message = f"Can't debug this program! Are you sure you're running debug50 on an executable, a Python script, or a Java program?\nUnsupported File: {filename}"
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
    message = f"Failed to connect extension server on port {port}.\nPlease visit cs50.dev/restart to restart your codespace."
    print(red(message))


def parse_args(args):
    parser = argparse.ArgumentParser(formatter_class=argparse.RawTextHelpFormatter)

    help_message = """
    C: debug50 HelloWorld\n
    Java: debug50 java HelloWorld\n
    Python: debug50 python HelloWorld.py
    """

    parser.add_argument(
        "PROGRAM",
        help=textwrap.dedent(help_message)
    )
    return parser.parse_known_args(args)


def get_source_files(executable):
    try:
        command = f"dwarfdump {executable} | grep DW_AT_decl_file"
        stdout = subprocess.check_output(command, stderr=subprocess.STDOUT, shell=True)
        source_files = set()
        for each in stdout.decode("utf-8").splitlines():
            source_files.add("/" + "/".join(each.strip().split("/")[1:]))

        return list(source_files)
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None


if __name__ == "__main__":
    main()
