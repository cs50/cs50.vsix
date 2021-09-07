import * as vscode from 'vscode';
import WebSocket = require('ws');
import { startDebugger } from './debug';
import { CS50ViewProvider } from './activity';

const PORT = 60001;
const WORKSPACE_FOLDER = vscode.workspace.workspaceFolders[0];

let wss: WebSocket.Server | null = null;
let ws: WebSocket | null = null;

interface payload {
	"command": string,
	// eslint-disable-next-line @typescript-eslint/ban-types
	"payload": Object
}

const startWebsocketServer = async (port: number, fallbackPorts: number[]): Promise<void> => {
	wss = new WebSocket.Server({ port });
	wss.on('connection', (connection: any) => {
		ws = connection;
		if (ws) {
			ws.addEventListener('message', (event) => {
				const data: payload = JSON.parse(event.data);
				console.log(data);
				if (data.command === "start_debugger") {
					const payload = data.payload;
					startDebugger(WORKSPACE_FOLDER, payload, ws);
				}
				if (data.command === "execute_command") {
					vscode.commands.executeCommand(JSON.stringify(data.payload).replace(/['"]+/g, ""));
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
