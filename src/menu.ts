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
                    case "launch_gui":
                        startVNC();
                        return;
                    case "rebuild_codespace":
                        vscode.commands.executeCommand("github.codespaces.rebuildEnvironment");
                        return;
                    case "update_codespace":
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

    private _getHtmlForWebview(webView: vscode.Webview) {
        const styleVSCodeUri = webView.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'static', 'vscode.css'));
		const styleMainUri = webView.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'static', 'main.css'));
        return `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link href="${styleVSCodeUri}" rel="stylesheet">
				</head>

				<body class="bg-transparent">
					<div class="btn-group-vertical">
                        <br/>
                        <button id="btn-gui" type="button" class="menu-button">Launch GUI</button>
                        <br/>
						<button id="btn-update" type="button" class="menu-button">Update Codespace</button>
						<br/>
                        <button id="btn-rebuild" type="button" class="menu-button">Rebuild Codespace</button>
					</div>
				</body>

				<script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById("btn-gui").onclick = () => {
                        vscode.postMessage({command: "launch_gui"})
                    }
                    document.getElementById("btn-update").onclick = () => {
                        vscode.postMessage({command: "update_codespace"})
                    }
                    document.getElementById("btn-rebuild").onclick = () => {
                        vscode.postMessage({command: "rebuild_codespace"})
                    }
			    </script>
			</html>
		`;
    }
}

export { CS50ViewProvider };