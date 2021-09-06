import * as vscode from 'vscode';
import WebSocket = require('ws');

interface payload {
	"command": string,
	"path": string
}

interface breakpoint {
	"enabled": boolean,
	"location": {
		"uri": {
			"external": string,
			"path": string,
			"scheme": "file"
		}
	}
}

const WORKSPACE_FOLDER = vscode.workspace.workspaceFolders[0];
const LAUNCH_CONFIG_C = "C";
const LAUNCH_CONFIG_PYTHON = "Python";

let wss: WebSocket.Server | null = null;
let ws: WebSocket | null = null;

// Initialization
vscode.debug.breakpoints

const startDebugger = (workspace_folder, launch_config, path) => {
	let didSetBreakpoints = false;
	let breakpoints = vscode.debug.breakpoints;
	for (var each in vscode.debug.breakpoints) {
		let breakpoint: breakpoint = JSON.parse(JSON.stringify(breakpoints[each]));
		if (breakpoint.location.uri.path === path) {
			didSetBreakpoints = true;
			vscode.debug.startDebugging(workspace_folder, launch_config)
		}
	}
	if (!didSetBreakpoints) {
		console.log("no break points")
		ws.send("no_break_points")
	}
}

const startWebsocketServer = async (port: number, fallbackPorts: number[]): Promise<void> => {
	wss = new WebSocket.Server({ port });
	wss.on('connection', (connection: any) => {
		ws = connection;
		if (ws) {
			ws.addEventListener('message', (event) => {
				let payload: payload = JSON.parse(event.data)
				if (payload.command === "start_c_debug") {
					startDebugger(WORKSPACE_FOLDER, LAUNCH_CONFIG_C, payload.path)
				}
				if (payload.command === "start_python_debug") {
					startDebugger(WORKSPACE_FOLDER, LAUNCH_CONFIG_PYTHON, payload.path)
				}
			});
		}
	});
	
	vscode.debug.onDidStartDebugSession((event) => {
		ws.send("started_debugger");
	});

	vscode.debug.onDidTerminateDebugSession((event) => {
		ws.send("terminated_debugger");
	});
};

const stopWebsocketServer = async(): Promise<void> => {
	ws?.close();
	wss?.close();
}

export {startWebsocketServer}
export {stopWebsocketServer}