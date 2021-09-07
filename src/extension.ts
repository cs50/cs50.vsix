import * as vscode from 'vscode';
import WebSocket = require('ws');
import { startDebugger } from './debug';
import { CS50ViewProvider } from './activity';
import { customDebugConfiguration } from './interfaces';

const PORT = 60001;
const WORKSPACE_FOLDER = vscode.workspace.workspaceFolders[0];

let wss: WebSocket.Server | null = null;
let ws: WebSocket | null = null;

const startWebsocketServer = async (port: number, fallbackPorts: number[]): Promise<void> => {
	wss = new WebSocket.Server({ port });
	wss.on('connection', (connection: any) => {
		ws = connection;
		if (ws) {
			ws.addEventListener('message', (event) => {
				const payload: customDebugConfiguration = JSON.parse(event.data);
				startDebugger(WORKSPACE_FOLDER, payload, ws);
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
};


export function activate(context: vscode.ExtensionContext) {

	// Start custom debug service
	startWebsocketServer(PORT, [PORT + 1]);
	
	// Load custom view
	const provider = new CS50ViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CS50ViewProvider.viewType, provider));
}

export function deactivate() {
	stopWebsocketServer();
}
