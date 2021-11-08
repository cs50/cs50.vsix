import * as vscode from 'vscode';
import { breakpoint } from './interfaces';
import ws = require('ws');

// Initialization
vscode.debug.breakpoints;

function launchDebugger(workspace_folder, config, ws: ws) {
    const breakpoints = vscode.debug.breakpoints;
    for (const index in breakpoints) {
        const breakpoint: breakpoint = JSON.parse(JSON.stringify(breakpoints[index]));
        if (breakpoint.location.uri.path === config.path) {
            const debugConfiguration: vscode.DebugConfiguration = config.launch_config;
            vscode.debug.startDebugging(workspace_folder, debugConfiguration);
            return;
        }
    }
    ws.send("no_break_points");
}

export {
    launchDebugger
};