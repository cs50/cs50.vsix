import * as vscode from 'vscode';
import * as debug from './debug';

const PORT = 60001;

export function activate({ subscriptions }: vscode.ExtensionContext) {
	debug.startWebsocketServer(PORT, [PORT + 1]);
}

export function deactivate() {
	debug.stopWebsocketServer();
}
