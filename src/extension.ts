import * as vscode from 'vscode';
import * as debug from './debug';
import { CS50ViewProvider } from './activity';

const PORT = 60001;

export function activate(context: vscode.ExtensionContext) {

	// Start custom debug service
	debug.startWebsocketServer(PORT, [PORT + 1]);
	
	// Load custom view
	const provider = new CS50ViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CS50ViewProvider.viewType, provider));
}

export function deactivate() {
	debug.stopWebsocketServer();
}
