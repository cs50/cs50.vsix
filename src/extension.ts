import * as vscode from 'vscode';
import * as tcpPorts from 'tcp-port-used';
import WebSocket = require('ws');
import { post_launch_tasks } from './post_launch_tasks';
import { launchDebugger } from './debug';
import { checkForUpdates, checkCS50TokenExpiry, detectInsiderVersion } from './updates';
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

        // check if we need to update CS50_EXTENSION_PORT environment variable
        const evc = context.environmentVariableCollection;
        const cs50ExtensionPort = evc.get('CS50_EXTENSION_PORT');
        if ((cs50ExtensionPort && cs50ExtensionPort.value !== `${port}`) || !cs50ExtensionPort) {
            evc.replace('CS50_EXTENSION_PORT', `${port}`);
            vscode.commands.executeCommand('cs50.resetTerminal');
        }
    } catch (error) {
        console.log(error);
    }
    wss.on('connection', (connection: any) => {
        ws = connection;
        if (ws) {
            ws.addEventListener('message', (event) => {
                const data: payload = JSON.parse(event.data as string);

                // Open lab
                if (data.command == 'open_lab') {
                    const currentFolderPath = data.payload["fileUri"];
                    try {
                        const labExtension = vscode.extensions.getExtension('cs50.lab50');
                        const api = labExtension.exports;
                        api.openLab(currentFolderPath);
                    } catch (error) {
                        console.log(error);
                    }
                }

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
                    const command = JSON.stringify(data.payload['command']).replaceAll('"', '');
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

        const disposeDebugTerminals = vscode.workspace.getConfiguration("debug50").get("disposeDebugTerminals");
        if (disposeDebugTerminals) {

            // Close terminal after debug session ended
            // https://github.com/microsoft/vscode/issues/63813
            for (const terminal of vscode.window.terminals) {
                const terminal_name = terminal.name.toLowerCase();
                if (terminal_name.includes('debug') || terminal_name.includes('cppdbg')) {
                    terminal.dispose();
                }
            }
            vscode.commands.executeCommand('workbench.explorer.fileView.focus');
        }

        // If a user is in a lab session, focus on lab view
        try {
            const labExtension = vscode.extensions.getExtension('cs50.lab50');
            const api = labExtension.exports;
            if (api.didOpenLab()) {
                vscode.commands.executeCommand('lab50.focus');
            } else {
                vscode.commands.executeCommand('workbench.explorer.fileView.focus');
            }
        } catch (error) {}
        ws.send('terminated_debugger');
    });
}

const stopWebsocketServer = async (): Promise < void > => {
    ws?.close();
    wss?.close();
};

export async function activate(context: vscode.ExtensionContext) {

    // Register Commands
    registerCommand(context);

    // Start WebSocket server
    startWebsocketServer(DEFAULT_PORT, context);

    // Create virtual display
    vnc.createVirtualDisplay();

    // Tidy UI
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    await vscode.commands.executeCommand("workbench.files.action.focusFilesExplorer");
    if (workbenchConfig['statusBar']['visible']) {
        await vscode.commands.executeCommand('workbench.action.toggleStatusbarVisibility');
    }
    if (!workbenchConfig['activityBar']['visible']) {

        // Use activityBar focus when fixed
        await vscode.commands.executeCommand("workbench.action.activityBarLocation.side");
    }

    // Create a terminal if no active terminal
    if (vscode.window.terminals.length != 0) {
        try {
            vscode.window.activeTerminal.show();
        } catch (e) {
            console.log(e);
        }
    } else {
        vscode.window.createTerminal('bash', 'bash', ['--login']).show();
    }

    // Parse GitHub preview links as localhost urls
    openPreviewLinkAsLocalhostUrl();

    // Perform clean-up
    post_launch_tasks();

    // Check for updates
    detectInsiderVersion();
    checkForUpdates();
    checkCS50TokenExpiry();
}

function getWorkspaceConfig(config: string) {
    try {
        return JSON.parse(JSON.stringify(vscode.workspace.getConfiguration(config, null)));
    } catch (e) {
        console.log(e);
        return undefined;
    }
}

export function deactivate() {
    stopWebsocketServer();
    vnc.shutdown();
}
