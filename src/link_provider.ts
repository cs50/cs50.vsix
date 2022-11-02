import { exec } from 'child_process';
import * as vscode from 'vscode';

const LOCAL_HOST = 'http://127.0.0.1';

function openPreviewLinkAsLocalhostUrl() {

    // https://code.visualstudio.com/updates/v1_49#_terminal-link-providers
    vscode.window.registerTerminalLinkProvider({

        provideTerminalLinks: (context, token) => {
            try {

                // Detect the GitHub preview link if it exists and linkify it
                const protocol = 'https://';
                const codespaceName = process.env.CODESPACE_NAME;
                const githubPreviewDomain = 'preview.app.github.dev';
                const startIndex = (context.line as string).indexOf(codespaceName) - protocol.length;
                const endIndex = (context.line as string).indexOf(githubPreviewDomain) + githubPreviewDomain.length;

                // Extract port number
                const port = (context.line as string).substring(startIndex + protocol.length + codespaceName.length + 1, endIndex - githubPreviewDomain.length - 1);

                if (startIndex > -1) {

                    // GitHub Preview link
                    const previewURL = `${protocol}${codespaceName}-${port}.${githubPreviewDomain}`;

                    exec("pgrep flask || pgrep http-server", (error, stdout, stderr) => {
                        if (error === null) {
                            const message = `GitHub Preview URL: ${previewURL}`;
                            vscode.window.showInformationMessage(
                                message, ...['Open URL', 'Cancel']).then((selection) => {
                                if (selection === 'Open URL') {
                                    vscode.env.openExternal(vscode.Uri.parse(`${LOCAL_HOST}:${port}`));
                                }
                            });
                        }
                    });

                    return [
                        {
                            startIndex: startIndex,
                            length: endIndex - startIndex,
                            tooltip: 'Follow link',
                            data: `${LOCAL_HOST}:${port}`
                        }
                    ];
                }

                return [];
            } catch (error) {
                return [];
            }
        },
        handleTerminalLink: async (link: any) => {
            const uri = await vscode.env.asExternalUri(
                vscode.Uri.parse(link.data)
            );
            vscode.env.openExternal(uri);
        }
    });
}

export { openPreviewLinkAsLocalhostUrl }
