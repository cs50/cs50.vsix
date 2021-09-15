import * as vscode from 'vscode';
import {breakpoint} from './interfaces';
require('ws');

// Initialization
vscode.debug.breakpoints;

function startDebugger(workspace_folder, config, ws) {
	const breakpoints = vscode.debug.breakpoints;
	for (const each in breakpoints) {
		console.log(each);
		const breakpoint: breakpoint = JSON.parse(JSON.stringify(breakpoints[each]));
		if (breakpoint.location.uri.path === config.path) {
			const debugConfiguration: vscode.DebugConfiguration = config.launch_config;
			vscode.debug.startDebugging(workspace_folder, debugConfiguration);
			return;
		}
	}
	ws.send("no_break_points");
}

export {startDebugger};