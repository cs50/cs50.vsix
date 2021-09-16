import * as vscode from 'vscode';
import * as tcpPorts from 'tcp-port-used';
import { launchDebugger } from './debug';
import { CS50ViewProvider } from './activity';
import WebSocket = require('ws');

const DEFAULT_PORT = 3050;
const PORT_ENV = "CS50_EXTENSION_PORT";
const WORKSPACE_FOLDER = vscode.workspace.workspaceFolders[0];

let ws: WebSocket | null = null;
let wss: WebSocket.Server | null = null;

interface payload {
	"command": string,
	// eslint-disable-next-line @typescript-eslint/ban-types
	"payload": Object
}

const startWebsocketServer = async (port: number, context: vscode.ExtensionContext): Promise<boolean> => {
	let isInUse = await tcpPorts.check(port);
	while(isInUse) {
		port += 1;
		isInUse = await tcpPorts.check(port);
	}
	context.environmentVariableCollection.replace(PORT_ENV, `${port}`);
	wss = new WebSocket.Server({ port });
	wss.on('connection', (connection: any) => {
		ws = connection;
		if (ws) {
			ws.addEventListener('message', (event) => {
				const data: payload = JSON.parse(event.data);

				// Launch debugger
				if (data.command === "start_debugger") {
					launchDebugger(WORKSPACE_FOLDER, data.payload, ws);
				}

				// Execute commands
				if (data.command === "execute_command") {
					const command = JSON.stringify(data.payload["command"]).replace(/['"]+/g, "",);
					const args = data.payload["args"];
					vscode.commands.executeCommand(command, args);
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
	
	return true;
};

const stopWebsocketServer = async(): Promise<void> => {
	ws?.close();
	wss?.close();
};


export function activate(context: vscode.ExtensionContext) {

	// Start custom debug service
	startWebsocketServer(DEFAULT_PORT, context);
	
	// Load custom view
	const provider = new CS50ViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CS50ViewProvider.viewType, provider));
}

export function deactivate() {
	stopWebsocketServer();
}
