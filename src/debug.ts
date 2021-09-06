import * as vscode from 'vscode';
import WebSocket = require('ws');

// Initialization
vscode.debug.breakpoints

interface payload {
	"command": string,
	"path": string
	"config": {
		"name": string,
		"type": string,
		"request": string
	}
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

let wss: WebSocket.Server | null = null;
let ws: WebSocket | null = null;

const WORKSPACE_FOLDER = vscode.workspace.workspaceFolders[0];

const startDebugger = (workspace_folder, payload: payload) => {
	let didSetBreakpoints = false;
	let breakpoints = vscode.debug.breakpoints;
	for (var each in vscode.debug.breakpoints) {
		let breakpoint: breakpoint = JSON.parse(JSON.stringify(breakpoints[each]));
		if (breakpoint.location.uri.path === payload.path) {
			didSetBreakpoints = true;
			let config:vscode.DebugConfiguration = payload.config
			vscode.debug.startDebugging(workspace_folder, config)
		}
	}
	if (!didSetBreakpoints) {
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
				startDebugger(WORKSPACE_FOLDER, payload)
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