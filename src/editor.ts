import * as vscode from 'vscode';

export class SimpleTextEditor implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new SimpleTextEditor();
        const providerRegistration = vscode.window.registerCustomEditorProvider(SimpleTextEditor.viewType, provider);
        return providerRegistration;
    }

    private static readonly viewType = 'cs50.vsixEditor';

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() {}

    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        webviewPanel.webview.html = this.getHtmlForWebview('Unsupported Document');
    }

    // create an html page for the webview with text in the center
    private getHtmlForWebview(text: string): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <body>
            <p>${text}</p>
        </body>
        </html>`;
    }
}
