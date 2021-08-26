import * as vscode from 'vscode';
import WebSocket = require('ws');

const WORKSPACE_FOLDER = vscode.workspace.workspaceFolders[0];
const PORT = 60001;
const LAUNCH_CONFIG_C = "C";
const LAUNCH_CONFIG_PYTHON = "Python";

let wss: WebSocket.Server | null = null;
let ws: WebSocket | null = null;

const startWebsocketServer = async (port: number, fallbackPorts: number[]): Promise<void> => {

	wss = new WebSocket.Server({ port });

	wss.on('connection', (connection: any) => {
		ws = connection;
		if (ws) {
			ws.addEventListener('message', (event) => {
				if (event.data == "check_break_points") {
					ws.send(vscode.debug.breakpoints.length);
				}
				if (event.data == "start_c_debug") {
					vscode.debug.startDebugging(WORKSPACE_FOLDER, LAUNCH_CONFIG_C);
				}
				if (event.data == "start_python_debug") {
					vscode.debug.startDebugging(WORKSPACE_FOLDER, LAUNCH_CONFIG_PYTHON);
				}
			});
		}
	});

};

export function activate({ subscriptions }: vscode.ExtensionContext) {
	startWebsocketServer(PORT, [PORT + 1]);
	vscode.debug.onDidStartDebugSession((event) => {
		ws.send("started_debugger");
	});
	vscode.debug.onDidTerminateDebugSession((event) => {
		ws.send("terminated_debugger");
	});
}

// this method is called when your extension is deactivated
export function deactivate() {
	ws?.close();
	wss?.close();
}
