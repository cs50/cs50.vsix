import * as vscode from 'vscode';
import * as tcpPorts from 'tcp-port-used';
import WebSocket = require('ws');
import { exec } from 'child_process';
import { clean_up } from './cleanup';
import { launchDebugger } from './debug';
import { checkForUpdates, detectInsiderVersion } from './updates';
import * as vnc from './vnc';
import { openPreviewLinkAsLocalhostUrl } from './link_provider';
import { registerCommand } from './commands';

const DEFAULT_PORT = 1337;
const WORKSPACE_FOLDER = vscode.workspace.workspaceFolders[0];

let ws: WebSocket | null = null;
let wss: WebSocket.Server | null = null;

interface payload {
    'command': string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    'payload': Object
}

async function startWebsocketServer(port: number, context: vscode.ExtensionContext): Promise < void > {
    try {
        let isInUse = await tcpPorts.check(port);
        while(isInUse) {
            port +=1;
            isInUse = await tcpPorts.check(port);
        }
        wss = new WebSocket.Server({ port });
        const evc = context.environmentVariableCollection;
        evc.replace('CS50_EXTENSION_PORT', `${port}`);
        vscode.commands.executeCommand('cs50.resetTerminal');
    } catch (error) {
        console.log(error);
    }
    wss.on('connection', (connection: any) => {
        ws = connection;
        if (ws) {
            ws.addEventListener('message', (event) => {
                const data: payload = JSON.parse(event.data as string);

                // Launch debugger
                if (data.command === 'start_debugger') {
                    launchDebugger(WORKSPACE_FOLDER, data.payload, ws);
                }

                // Terminate debugger
                if (data.command === 'stop_debugger') {
                    vscode.debug.stopDebugging();
                }

                // Execute commands
                if (data.command === 'execute_command') {
                    const command = JSON.stringify(data.payload['command']).replace(/['']+/g, '');
                    const args = data.payload['args'];
                    vscode.commands.executeCommand(command, args);
                }

                // Prompt a message then execute a command, if any
                if (data.command == 'prompt') {
                    if (data.payload['action'] == null) {
                        data.payload['action'] = '';
                    }
                    if (data.payload['title'] == null) {
                        vscode.window.showInformationMessage < vscode.MessageItem > (
                            data.payload['body'], {
                                modal: true
                            }).then(() => {
                            vscode.commands.executeCommand(data.payload['action']);
                        });
                    } else {
                        vscode.window.showInformationMessage < vscode.MessageItem > (
                            data.payload['title'], {
                                modal: true,
                                detail: data.payload['body']
                            }).then(() => {
                            vscode.commands.executeCommand(data.payload['action']);
                        });
                    }
                }
            });
        }
    });

    vscode.debug.onDidStartDebugSession(() => {
        ws.send('started_debugger');
        vscode.commands.executeCommand('workbench.view.debug');
    });

    // Terminate debug session if libc-start.c is stepped over/into
    vscode.window.onDidChangeActiveTextEditor((event) => {
        if (event == undefined) {
            return;
        }

        const skipFiles = ['libc-start.c', 'libc_start_call_main.h'];
        skipFiles.find(element => {
            if (event['document']['fileName'].includes(element)) {
                setTimeout(() => {
                    vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                    vscode.debug.stopDebugging();
                }, 100);
                return;
            }
        });
    });

    vscode.debug.onDidTerminateDebugSession(() => {

        // Close terminal after debug session ended
        // https://github.com/microsoft/vscode/issues/63813
        for (const terminal of vscode.window.terminals) {
            const terminal_name = terminal.name.toLowerCase();
            if (terminal_name.includes('debug') || terminal_name.includes('cppdbg')) {
                terminal.dispose();
            }
        }
        vscode.commands.executeCommand('workbench.explorer.fileView.focus');
        ws.send('terminated_debugger');
    });
}

const stopWebsocketServer = async (): Promise < void > => {
    ws?.close();
    wss?.close();
};

export function activate(context: vscode.ExtensionContext) {

    // Register Commands
    registerCommand(context);

    // Set CS50_GH_USER environment variable for submit50
    const evc = context.environmentVariableCollection;
    if (evc.get('CS50_GH_USER') == undefined) {
        console.log('Setting CS50_GH_USER environment variable and relaunching terminal');
        evc.append('CS50_GH_USER', process.env.GITHUB_USER);
        vscode.commands.executeCommand("cs50.resetTerminal");
    }
    evc.replace('CS50_GH_USER', process.env.GITHUB_USER);

    // Start WebSocket server
    startWebsocketServer(DEFAULT_PORT, context);

    // Create virtual display
    vnc.createVirtualDisplay();

    // Tidy UI
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    if (!workbenchConfig['activityBar']['visible']) {
        vscode.commands.executeCommand('workbench.action.toggleActivityBarVisibility');
    }
    if (workbenchConfig['statusBar']['visible']) {
        vscode.commands.executeCommand('workbench.action.toggleStatusbarVisibility');
    }

    // Create a terminal if no active terminal
    if (vscode.window.terminals.length != 0) {
        vscode.window.activeTerminal.show();
    } else {
        vscode.window.createTerminal('bash', 'bash', ['--login']).show();
    }

    // Parse GitHub preview links as localhost urls
    openPreviewLinkAsLocalhostUrl();

    // Perform clean-up
    clean_up();

    // Check for updates
    detectInsiderVersion();
    checkForUpdates();
}

export function deactivate() {
    stopWebsocketServer();
    vnc.shutdown();
}
