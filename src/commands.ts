import { exec } from 'child_process';
import * as vscode from 'vscode';
import { startVNC } from './vnc';

export function registerCommand(context: vscode.ExtensionContext) {

    // Register VNC launch command
    let command = "cs50.launchGUI";
    let commandHandler = () => {
        startVNC();
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));

    // Register Update Codespace command
    command = "cs50.updateCodespace";
    commandHandler = () => {
        exec(`/opt/cs50/bin/update50 --force`, {
            "env": process.env
        }, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
        });
    }
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
}
