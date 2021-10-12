import * as vscode from 'vscode';
import { launchDebugger } from './debug';
import { CS50ViewProvider } from './activity';
import WebSocket = require('ws');

const DEFAULT_PORT = 1337;
const WORKSPACE_FOLDER = vscode.workspace.workspaceFolders[0];

let ws: WebSocket | null = null;
let wss: WebSocket.Server | null = null;

interface payload {
	"command": string,
	// eslint-disable-next-line @typescript-eslint/ban-types
	"payload": Object
}

async function startWebsocketServer(port: number, context: vscode.ExtensionContext, temrinal: vscode.Terminal): Promise<void> {
	try {
		wss = new WebSocket.Server({ port });
		temrinal.dispose(); // Dispose helper terminal once the WebSocket server is launched
	} catch (error) {
		console.log(error);
	}
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
					const command = JSON.stringify(data.payload["command"]).replace(/['"]+/g, "");
					const args = data.payload["args"];
					vscode.commands.executeCommand(command, args);
				}

				// Prompt a message then execute a command, if any
				if (data.command == "prompt") {
					if (data.payload["action"] == null) {
						data.payload["action"] = "";
					}
					if (data.payload["title"] == null) {
						vscode.window.showInformationMessage<vscode.MessageItem>(
							data.payload["body"], { modal: true }).then(() => {
								vscode.commands.executeCommand(data.payload["action"]);
							});
					} else {
						vscode.window.showInformationMessage<vscode.MessageItem>(
							data.payload["title"], { modal: true, detail: data.payload["body"] }).then(() => {
								vscode.commands.executeCommand(data.payload["action"]);
							});
					}
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
}

const stopWebsocketServer = async(): Promise<void> => {
	ws?.close();
	wss?.close();
};


export function activate(context: vscode.ExtensionContext) {

	// Create a new terminal
	const terminal = vscode.window.createTerminal("extension_initialization");
	terminal.sendText(`fuser -k ${DEFAULT_PORT}/tcp`);

	// Start WebSocket server, with 1 second delay
	setTimeout(() => {
		startWebsocketServer(DEFAULT_PORT, context, terminal);
	}, 1000);

	// Load custom view
	const provider = new CS50ViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CS50ViewProvider.viewType, provider));

	// Tidy UI
	const workbenchConfig = vscode.workspace.getConfiguration("workbench");
	if (!workbenchConfig["activityBar"]["visible"]) {vscode.commands.executeCommand("workbench.action.toggleActivityBarVisibility");}
	if (workbenchConfig["statusBar"]["visible"]) {vscode.commands.executeCommand("workbench.action.toggleStatusbarVisibility");}
}

export function deactivate() {
	stopWebsocketServer();
}
