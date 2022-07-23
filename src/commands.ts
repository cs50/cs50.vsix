import { exec } from 'child_process';
import * as vscode from 'vscode';
import { startVNC } from './vnc';

export function registerCommand(context: vscode.ExtensionContext) {

    // Command: Launch VNC
    let command = "cs50.launchGUI";
    let commandHandler = () => {
        startVNC();
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));

    // Command: Update Codespace
    command = "cs50.updateCodespace";
    commandHandler = () => {
        exec(`/opt/cs50/bin/update50 --force`, {
            "env": process.env
        }, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
        });
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));

    // Command: Return to workspace home
    command = "cs50.returnHome";
    commandHandler = async () => {
        if (process.env["CODESPACE_NAME"] !== undefined) {
            const homeDir = `/workspaces/${process.env["RepositoryName"]}`;
            if (vscode.workspace.workspaceFolders[0]["uri"]["path"] !== homeDir) {
                const uri = vscode.Uri.file(homeDir);
                await vscode.commands.executeCommand('vscode.openFolder', uri, false);
            } else {
                const message = "Currently at workspace home directory.";
                vscode.window.showInformationMessage(message);
            }
        }
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
}
