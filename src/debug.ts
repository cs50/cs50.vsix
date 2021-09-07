import * as vscode from 'vscode';
import WebSocket = require('ws');
import {customDebugConfiguration, breakpoint} from './interfaces';

// Initialization
vscode.debug.breakpoints;

const startDebugger = (workspace_folder, config: customDebugConfiguration, ws) => {
	let didSetBreakpoints = false;
	const breakpoints = vscode.debug.breakpoints;
	for (const each in vscode.debug.breakpoints) {
		const breakpoint: breakpoint = JSON.parse(JSON.stringify(breakpoints[each]));
		if (breakpoint.location.uri.path === config.path) {
			didSetBreakpoints = true;
			const debugConfiguration:vscode.DebugConfiguration = config.launch_config;
			vscode.debug.startDebugging(workspace_folder, debugConfiguration);
		}
	}
	if (!didSetBreakpoints) {
		ws.send("no_break_points");
	}
};

export {startDebugger};
