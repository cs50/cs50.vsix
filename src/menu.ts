import * as vscode from 'vscode';
import { startVNC } from './vnc';

class CS50ViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'cs50.activityView';

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {}

    public resolveWebviewView(
        panel: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        panel.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        panel.webview.html = this._getHtmlForWebview(panel.webview);
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case "gui":
                        startVNC();
                        return;
                    case "rebuild":
                        vscode.commands.executeCommand("github.codespaces.rebuildEnvironment");
                        return;
                    case "update":
                        if (vscode.window.activeTerminal == undefined) {
                            vscode.window.createTerminal();
                            vscode.commands.executeCommand("workbench.action.terminal.toggleTerminal");
                            setTimeout(() => {
                                vscode.window.activeTerminal?.sendText("update50");
                            }, 1000);
                            return;
                        }
                        vscode.window.activeTerminal?.sendText("update50");
                        return;
                }
            }
        );
    }

    private _getHtmlForWebview(panel: vscode.Webview) {
        return `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-KyZXEAg3QhqLMpG8r+8fhAXLRk2vvoC2f3B09zVXn8CA5QIVfZOJ3BCsw2P0p/We" crossorigin="anonymous">
					<title>CS50</title>
				</head>

				<body class="bg-transparent">
					<div class="btn-group-vertical">
                        <button id="btn-gui" type="button" class="h5 btn btn-primary">GUI</button>
						<button id="btn-update" type="button" class="h5 btn btn-success">Update Codespace</button>
						<button id="btn-rebuild" type="button" class="h5 btn btn-danger">Rebuild Codespace</button>
					</div>
				</body>

				<script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById("btn-gui").onclick = () => {
                        vscode.postMessage({command: "gui"})
                    }
                    document.getElementById("btn-update").onclick = () => {
                        vscode.postMessage({command: "update"})
                    }
                    document.getElementById("btn-rebuild").onclick = () => {
                        vscode.postMessage({command: "rebuild"})
                    }
			    </script>
			</html>
		`;
    }
}

export { CS50ViewProvider };