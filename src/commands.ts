import { exec } from 'child_process';
import * as vscode from 'vscode';
import { startVNC } from './vnc';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export function registerCommand(context: vscode.ExtensionContext) {

    // Declare global variable to reference a webview
    let webViewGlobal;
    vscode.window.registerWebviewViewProvider('cs50-lab', {
        resolveWebviewView: (webView) => {
            const workspaceFolder = vscode.workspace.workspaceFolders![0];
            webView.webview.options = {
                enableCommandUris: true,
                enableScripts: true,
                localResourceRoots: [workspaceFolder.uri]
            };
            webView.webview.html = `
            <!DOCTYPE html>
            <html>
                <head>
                <meta charset="utf-8">
                </head>
                <body>No lab opened.</body>
            </html>`;
            webViewGlobal = webView;
        }
    });

    async function labViewHandler(fileUri: any) {

        // User attempt to open a folder as CS50 lab
        console.log('opening folder as cs50 lab...');
        console.log(`fileUri: ${fileUri}`);

        // Inspect folder structure and look for configuration file
        const configFileName = '.cs50.yml';
        const configFilePath = `${fileUri['path']}/${configFileName}`;

        console.log(`Looking for config file at: ${configFilePath}`);
        if (fs.existsSync(configFilePath)) {

            // Located config file, do whatever needs to be done
            console.log(`${configFileName} exists`);

            // Load config file
            const configFile = yaml.load(fs.readFileSync(configFilePath, 'utf8'));

            // Read slug
            const slug = configFile['vscode']['slug'];

            // Generate GitHub raw base url
            const githubRawURL = `https://raw.githubusercontent.com/${slug}`;

            // Get a list of files that we wish to override
            const fileToUpdates = configFile['vscode']['filesToUpdate'];

            // Download the latest file
            for (let i = 0; i < fileToUpdates.length; i++) {
                console.log(`${githubRawURL}/${fileToUpdates[i]}`);
            }

            // Update lab view/layout
            webViewGlobal.webview.html = `${fileUri}`;
            vscode.commands.executeCommand('cs50-lab.focus');

        } else {
            vscode.window.showWarningMessage(`Unable to locate ${configFileName}`);
        }
    }

    // Command: Launch VNC
    let command = 'cs50.launchGUI';
    let commandHandler = () => {
        startVNC();
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));

    // Command: Update Codespace
    command = 'cs50.updateCodespace';
    commandHandler = () => {
        exec(`/opt/cs50/bin/update50 --force`, {
            'env': process.env
        }, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
        });
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));

    // Command: Cleanup Workspace Repository
    command = 'cs50.cleanupRepository';
    commandHandler = () => {
        vscode.commands.executeCommand('workbench.action.terminal.focus');
        vscode.window.activeTerminal.sendText('cd $CODESPACE_VSCODE_FOLDER && clean50');
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));

    // Command: Reset Terminal
    command = 'cs50.resetTerminal';
    commandHandler = async () => {
        // Force create terminal with login profile
        for (let i = 0; i < vscode.window.terminals.length; i++) {
            vscode.window.terminals[i].dispose();
        }
        vscode.window.createTerminal('bash', 'bash', ['--login']).show();
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));

    // Command: Return to workspace home
    command = 'cs50.returnHome';
    commandHandler = async () => {
        if (process.env['CODESPACE_NAME'] !== undefined) {
            const homeDir = `/workspaces/${process.env['RepositoryName']}`;
            if (vscode.workspace.workspaceFolders[0]['uri']['path'] !== homeDir) {
                const uri = vscode.Uri.file(homeDir);
                await vscode.commands.executeCommand('vscode.openFolder', uri, false);
            } else {
                const message = 'Currently at workspace home directory.';
                vscode.window.showInformationMessage(message);
            }
        }
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));

    // Command: Open Folder as CS50 Lab
    context.subscriptions.push(
        vscode.commands.registerCommand(`cs50.openAsLab`, labViewHandler)
    );
}


