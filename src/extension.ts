import * as vscode from 'vscode';
import { TextEncoder } from 'util';

const CPP = "C";
const PYTHON = "Python";
const TRIGGER_PYTHON_DEBUG = ".vscode/debug50/triggers/python";
const TRIGGER_CPP_DEBUG = ".vscode/debug50/triggers/c";
const SOCKET = ".vscode/debug50/socket";
const WORKSPACE_FOLDER = vscode.workspace.workspaceFolders[0];
const WORKSPACE_FOLDER_PATH = WORKSPACE_FOLDER.uri.path;

export async function activate(context: vscode.ExtensionContext) {
	init();

	// Setup fileWatcher
	vscode.workspace.createFileSystemWatcher(
		new vscode.RelativePattern(WORKSPACE_FOLDER, TRIGGER_PYTHON_DEBUG)
	).onDidChange((uri) => {
		if (checkBreakPoints()) {
			vscode.debug.startDebugging(WORKSPACE_FOLDER, PYTHON);
		}
	});

	vscode.workspace.createFileSystemWatcher(
		new vscode.RelativePattern(WORKSPACE_FOLDER, TRIGGER_CPP_DEBUG)
	).onDidChange((uri) => {
		if (checkBreakPoints()) {
			vscode.debug.startDebugging(WORKSPACE_FOLDER, CPP);
		}
	});

	vscode.debug.onDidTerminateDebugSession((event) => {
		notify("debug_session_terminated");
	});

	notify("debug50_activated");
}

function init() {
	vscode.workspace.fs.writeFile(vscode.Uri.file(`${WORKSPACE_FOLDER_PATH}/${TRIGGER_PYTHON_DEBUG}`), new TextEncoder().encode());
	vscode.workspace.fs.writeFile(vscode.Uri.file(`${WORKSPACE_FOLDER_PATH}/${TRIGGER_CPP_DEBUG}`), new TextEncoder().encode());
	vscode.workspace.fs.writeFile(vscode.Uri.file(`${WORKSPACE_FOLDER_PATH}/${SOCKET}`), new TextEncoder().encode());
}

function checkBreakPoints() {
	if (vscode.debug.breakpoints.length === 0) {
		notify("no_break_points");
		return false;
	}
	return true;
}

function notify(message: string) {
	vscode.workspace.fs.writeFile(
		vscode.Uri.file(`${WORKSPACE_FOLDER_PATH}/${SOCKET}`), new TextEncoder().encode(message));
}
