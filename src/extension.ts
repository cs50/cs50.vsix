import * as vscode from 'vscode';
import WebSocket = require('ws');
import { startDebugger } from './debug';
import { CS50ViewProvider } from './activity';

const PORT = 3889;
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
				if (data.command === "start_debugger") {
					const payload = data.payload;
					startDebugger(WORKSPACE_FOLDER, payload, ws);
				}
				if (data.command === "execute_command") {
					vscode.commands.executeCommand(
						JSON.stringify(data.payload["command"]).replace(/['"]+/g, "",),
						data.payload["args"]);
				}
			});
		}
	});
	
	vscode.debug.onDidStartDebugSession(() => {
		ws.send("started_debugger");
	});

	// Terminate debug session if libc-start.c is stepped over/into
	vscode.window.onDidChangeActiveTextEditor((event) => {
		if (event == undefined) {
			return;
		}
		
		if (event["document"]["fileName"].includes("libc-start.c")) {
			setTimeout(() => {
				vscode.commands.executeCommand("workbench.action.closeActiveEditor");
				vscode.debug.stopDebugging();
			}, 100);
		}
	});

	vscode.debug.onDidTerminateDebugSession(() => {

		// Close terminal after debug session ended
		// https://github.com/microsoft/vscode/issues/63813
		setTimeout(() => {
			vscode.window.activeTerminal?.sendText("kill -9 $(echo $$)");
			vscode.commands.executeCommand("workbench.explorer.fileView.focus");
		}, 100);
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
