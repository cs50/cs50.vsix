import os
import psutil

def get_vscode_shell_pid():
    current_pid = os.getpid()
    current_process = psutil.Process(current_pid)

    while True:
        try:
            parent_process = current_process.parent()
            if parent_process is None:
                # Reached the root of the process tree without finding a 'node' parent.
                return None

            if parent_process.name().lower() == "node":
                return current_process.pid  # Return the PID of the current process
            else:
                current_process = parent_process
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            # Process doesn't exist, access is denied, or it is a zombie process.
            return None