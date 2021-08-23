#!/usr/bin/env python3

import json
import os
import pathlib
import sys
import time

SOCKET = ".vscode/debug50/socket"

# Launch configuration
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


def verify_executable(source, executable):
    sourceMTime = pathlib.Path(source).stat().st_mtime_ns
    executableMTime = pathlib.Path(executable).stat().st_mtime_ns
    if (sourceMTime > executableMTime):
        message = "Looks like you've changed your code. Recompile and then re-run debug50!"
        print(decorate(message, "WARNING"))
        return False

    return True


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


def read_socket(socket):
    if os.path.isfile(socket):
        return open(socket).readline().strip()


def reset_socket(socket):
    with open(socket, "w") as f:
        f.write("")


def observe(socket):
    while True:
        time.sleep(0.5)
        f = open(socket)
        line = f.readline().strip()
        if line == "no_break_points":
            message = "Looks like you haven't set any breakpoints. "\
              "Set at least one breakpoint by clicking to the "\
              "left of a line number and then re-run debug50!"
            print(decorate(message, "WARNING"))
            reset_socket(SOCKET)
            sys.exit(1)

        if line == "debug_session_terminated":
            reset_socket(SOCKET)
            sys.exit(0)


def main():

    # Add arguments
    if len(sys.argv) > 1:
        for i in range(2, len(sys.argv)):
            launch_configuration["configurations"][0]["args"].append(sys.argv[i])
        launch_configuration["configurations"][0]["args"].append("&&")
        launch_configuration["configurations"][0]["args"].append("exit")

    # Generate launch configuration and start the debugger
    file = open(".vscode/launch.json", "w")
    file.write(json.dumps(launch_configuration))
    file.close()

    if ".py" in sys.argv[1]:
        os.system("touch .vscode/debug50/triggers/python")
        observe(SOCKET)

    else:
        source = sys.argv[1] + ".c"
        executable = sys.argv[1]
        if (verify_executable(source, executable)):
            os.system("touch .vscode/debug50/triggers/c")
            observe(SOCKET)

if __name__ == "__main__":
    main()
