import { exec, execSync } from 'child_process';
import * as vscode from 'vscode';
import { startVNC } from './vnc';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { Liquid } from 'liquidjs';
import { decode } from 'html-entities';
import MarkdownIt = require('markdown-it');

export function registerCommand(context: vscode.ExtensionContext) {

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
}

