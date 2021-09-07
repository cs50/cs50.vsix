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
					<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-KyZXEAg3QhqLMpG8r+8fhAXLRk2vvoC2f3B09zVXn8CA5QIVfZOJ3BCsw2P0p/We" crossorigin="anonymous">
					<title>CS50</title>
				</head>
				
				<body class="bg-transparent">
				<button id="rebuild" type="button" class="h5 btn btn-danger">Rebuild Codespace</button>
				</body>

				<script>
				const vscode = acquireVsCodeApi();
				document.getElementById("rebuild").onclick = function hello() {
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