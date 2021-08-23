import * as vscode from 'vscode';
import { TextEncoder } from 'util';

const CPP = "C";
const PYTHON = "Python";
const TRIGGER_PYTHON_DEBUG = ".vscode/debug50/triggers/python";
const TRIGGER_CPP_DEBUG = ".vscode/debug50/triggers/c";
const SOCKET = ".vscode/debug50/socket";

let wf = vscode.workspace.workspaceFolders[0].uri.path;

function init() {
	vscode.workspace.fs.writeFile(vscode.Uri.file(`${wf}/${TRIGGER_PYTHON_DEBUG}`), new TextEncoder().encode());
	vscode.workspace.fs.writeFile(vscode.Uri.file(`${wf}/${TRIGGER_CPP_DEBUG}`), new TextEncoder().encode());
	vscode.workspace.fs.writeFile(vscode.Uri.file(`${wf}/${SOCKET}`), new TextEncoder().encode());
}

function checkBreakPoints() {
	if (vscode.debug.breakpoints.length === 0) {
		relay("no_break_points");
		return false;
	}
	return true;
}

function relay(message: string) {
	var uint8array = new TextEncoder().encode(message);
	vscode.workspace.fs.writeFile(vscode.Uri.file(`${wf}/${SOCKET}`), uint8array);
}

export async function activate(context: vscode.ExtensionContext) {
	init();

	// Setup fileWatcher
	let folders = vscode.workspace.workspaceFolders;
	if (folders) {
		let initPythonDebug = vscode.workspace.createFileSystemWatcher(
			new vscode.RelativePattern(folders[0], TRIGGER_PYTHON_DEBUG));
		initPythonDebug.onDidChange((uri) => {
			if (folders !== undefined && checkBreakPoints()) {
				vscode.debug.startDebugging(folders[0], PYTHON);
			}
		});

		let initCPPDebug = vscode.workspace.createFileSystemWatcher(
			new vscode.RelativePattern(folders[0], TRIGGER_CPP_DEBUG));
		initCPPDebug.onDidChange((uri) => {
			if (folders !== undefined && checkBreakPoints()) {
				vscode.debug.startDebugging(folders[0], CPP);
			}
		});
	}

	vscode.debug.onDidTerminateDebugSession((event) => {
		relay("debug_session_terminated");
	});

	relay("debug50_activated");
}

// this method is called when your extension is deactivated
export function deactivate() {}
