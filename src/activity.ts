import * as vscode from 'vscode';

class CS50ViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'cs50.activityView';
	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) {}

	public resolveWebviewView(
		panel: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = panel;
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};
		panel.webview.html = this._getHtmlForWebview(panel.webview);
		panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case "rebuild":
						vscode.commands.executeCommand("github.codespaces.rebuildEnvironment");
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
					<title>CS50</title>
				</head>
				
				<body>
                	<button id="button">REBUILD CODESPACE</button>
				</body>

				<script>
				const vscode = acquireVsCodeApi();
				document.getElementById("button").onclick = function hello() {
					vscode.postMessage({
						command: "rebuild"
					})
				}
			</script>
			</html>
		`;
	}
}

export { CS50ViewProvider };