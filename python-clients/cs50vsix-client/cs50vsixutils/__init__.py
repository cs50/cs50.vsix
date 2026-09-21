import os
import psutil


def _is_vscode_node(process):
    """
    Whether process is VS Code's node, which hosts the terminals.

    psutil's name() reads /proc/<pid>/comm, which VS Code's node processes set to
    "MainThread", so also check the executable's basename.
    """
    names = set()
    try:
        names.add(process.name().lower())
        cmdline = process.cmdline()
        if cmdline:
            names.add(os.path.basename(cmdline[0]).lower())
        try:
            names.add(os.path.basename(process.exe()).lower())
        except (psutil.AccessDenied, psutil.ZombieProcess, FileNotFoundError, OSError):
            pass
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        return False
    return "node" in names


def get_vscode_shell_pid():
    """
    Return the PID of the shell VS Code spawned for this terminal (the nearest ancestor
    whose parent is VS Code's node), which is the key the CS50 extension uses in
    /tmp/cs50_pid_port_mapping.json. Return None if not running under VS Code.
    """
    current_process = psutil.Process(os.getpid())

    while True:
        try:
            parent_process = current_process.parent()
            if parent_process is None:
                # Reached the root of the process tree without finding VS Code's node.
                return None

            if _is_vscode_node(parent_process):
                return current_process.pid
            current_process = parent_process
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            # Process doesn't exist, access is denied, or it is a zombie process.
            return None
