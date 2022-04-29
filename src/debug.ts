import * as vscode from 'vscode';
import { breakpoint } from './interfaces';
import ws = require('ws');

// Initialization
vscode.debug.breakpoints;

function launchDebugger(workspace_folder, config, ws: ws) {

    // Get all breakpoints
    const breakpoints = vscode.debug.breakpoints;

    let source_files;
    config.source_files == null ? source_files = [] : source_files = config.source_files;

    // Iterate each breakpoints' URI and see if it matches any URI found in the source files (c/cpp) or current python file
    for (const index in breakpoints) {
        const breakpoint: breakpoint = JSON.parse(JSON.stringify(breakpoints[index]));
        if (config.path == breakpoint.location.uri.path || source_files.includes(breakpoint.location.uri.path)) {
            const debugConfiguration: vscode.DebugConfiguration = config.launch_config;
            prepareUI();
            vscode.debug.startDebugging(workspace_folder, debugConfiguration);
            return;
        }
    }
    ws.send("no_break_points");
}

function prepareUI() {

    // Maintain focus on current active terminal
    let current_terminal = vscode.window.activeTerminal;
    const overrideFocusIntervalID = setInterval(() => {
        current_terminal.show();
    }, 50)

    // Delay focusing on debug terminal
    setTimeout(() => {
        clearInterval(overrideFocusIntervalID);
        for (const terminal of vscode.window.terminals) {
            const terminal_name = terminal.name.toLowerCase()
            if (terminal_name.includes("cppdbg") || terminal_name.includes("debug")) {
                terminal.show();
                vscode.commands.executeCommand("workbench.view.debug");
                vscode.commands.executeCommand("workbench.action.terminal.focus");
                break;
            }
        }
    }, 5000)
}

function disposeDebugTerminals() {

    // Close debug terminals after debug session ended
    // https://github.com/microsoft/vscode/issues/63813
    for (const terminal of vscode.window.terminals) {
        const terminal_name = terminal.name.toLowerCase()
        if (terminal_name.includes("debug") || terminal_name.includes("cppdbg")) {
            terminal.dispose();
        }
    }

    // Focus file explorer
    vscode.commands.executeCommand("workbench.explorer.fileView.focus");
}

export {
    disposeDebugTerminals, launchDebugger
};