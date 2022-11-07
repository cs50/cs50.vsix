#!/usr/bin/env python3

import signal
import sys

signal.signal(signal.SIGINT, lambda signum, frame: sys.exit(1))

import argparse
import os
import subprocess
import termcolor
import time

BFG_VERSION = "1.14.0"
BFG = f"bfg-{BFG_VERSION}.jar"
INSTALL_DIR = "/opt/share"

def main():
    args = parse_args(sys.argv[1:])
    verbose = args.verbose

    stdout = None if bool(verbose) else subprocess.DEVNULL
    stderr = None if bool(verbose) else subprocess.STDOUT

    # Abort operation immediately if current working directory is not a valid git repository
    if not os.path.isfile("./.git/index"):
        sys.exit(red("Not a valid git repository, operation aborted."))

    confirmation = input(red("WARNING!! Please make sure you have a backup of your important files and proceed with caution.\nYour Codespace will restart automatically.\nContinue? (y/n): "))
    if not confirmation.strip().lower() in ("yes", "y"):
        sys.exit(red("Operation aborted."))

    try:

        # Check to see if BFG repo cleaner is already installed
        if not os.path.isfile(f"{INSTALL_DIR}/{BFG}"):
            print(yellow(f"BFG not found, downloading BFG to {INSTALL_DIR} ..."))
            subprocess.run(f"wget https://repo1.maven.org/maven2/com/madgag/bfg/{BFG_VERSION}/{BFG} -P {INSTALL_DIR}/",
                check=True, shell=True, stdout=stdout, stderr=stderr
            )

        print(yellow("Cleaning up unnecessary files and optimizing local repository..."))
        subprocess.run("git gc", check=True, shell=True, stdout=stdout, stderr=stderr)

        print(yellow("Running BFG repo cleaner to remove large files from commit history..."))
        commands = ";".join([
            f"java -jar {INSTALL_DIR}/{BFG} --no-blob-protection --strip-blobs-bigger-than 100M",
            "git reflog expire --expire=now --all",
            "git gc --prune=now --aggressive"
        ])
        subprocess.run(commands, check=True, shell=True, stdout=stdout, stderr=stderr)

        print(yellow("Unstaging all changes..."))
        subprocess.run("git reset .", check=True, shell=True, stdout=stdout, stderr=stderr)

        print(yellow("Add large files to gitignore..."))
        commands = ";".join([
            "find . -size +100M | cut -c 2- | cat >> .gitignore",
            "awk '!NF||$1~/^#/ {print; next} {$1=$1} !seen[$0]++' .gitignore > /tmp/.gitignore",
            "mv -f /tmp/.gitignore .gitignore"
        ])
        subprocess.run(commands, check=True, shell=True, stdout=stdout, stderr=stderr)
        print(green("Successfully cleaned up repository."))

        # Reload Codespace
        print(yellow("Reloading Codespace in 5 seconds..."))
        time.sleep(5)
        subprocess.run("command50 workbench.action.reloadWindow", check=True, shell=True, stdout=stdout, stderr=stderr)

    except subprocess.CalledProcessError as e:
        print(red("Something's wrong, clean50 ran into an error."))
        print(e)


def parse_args(args):
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--verbose",
        action="store_true"
    )
    return parser.parse_args(args)


def green(msg):
    return termcolor.colored(msg, 'green')


def red(msg):
    return termcolor.colored(msg, 'red')


def yellow(msg):
    return termcolor.colored(msg, 'yellow')


if __name__ == "__main__":
    main()
