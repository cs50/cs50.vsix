import * as vscode from 'vscode';
import * as tcpPorts from 'tcp-port-used';
import { exec } from 'child_process';

const NOVNC_PORT = 6081;
const VNC_SERVER_PORT = 5900;
const VNC_URL = `https://${process.env['CODESPACE_NAME']}-${NOVNC_PORT}.${process.env['GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN']}/vnc.html?autoconnect=true`;

export async function startVNC() {

    shutdown();
    vscode.window.showInformationMessage('Starting noVNC session...');

    console.log('Starting VNC server...');
    exec(`x11vnc -cursor arrow -display $DISPLAY -forever -loop -noxfixes -noxrecord -noxdamage -xkb -shared &>> /tmp/x11vnc.log &`, {
        'env': process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    console.log('Starting openbox session...');
    exec(`openbox-session &>>/tmp/noVNC.log &`, {
        'env': process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    console.log('Starting noVNC client...');
    exec(`/opt/noVNC/utils/novnc_proxy --vnc localhost:${VNC_SERVER_PORT} --listen localhost:${NOVNC_PORT}`, {
        'env': process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    // Open noVNC
    let retries = 10;
    while (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        const didStartVncServer = await tcpPorts.check(VNC_SERVER_PORT);
        const didStartVncClient = await tcpPorts.check(NOVNC_PORT);
        if (didStartVncServer && didStartVncClient) {
            vscode.window.showInformationMessage('A virtual display will be available in a separate browser window.');
            setTimeout(() => {
                vscode.env.openExternal(vscode.Uri.parse(VNC_URL));
                vscode.commands.executeCommand('workbench.explorer.fileView.focus');
            }, 2000);
            break;
        }
        retries--;
        if (retries == 0) {
            if (!didStartVncServer) {
                vscode.window.showInformationMessage(`Timed out before x11vnc was listening on port ${VNC_SERVER_PORT}. Please try again.`);
            }
            if (!didStartVncClient) {
                vscode.window.showInformationMessage(`Timed out before noVNC was listening on port ${NOVNC_PORT}. Please try again`);
            }
        }
    }
}

export function shutdown() {

    // Kill x11vnc VNC server
    exec(`pkill -f x11vnc`, {
        'env': process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    // Kill noVNC VNC client
    exec(`fuser -k ${NOVNC_PORT}/tcp`, {
        'env': process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    // Kill processes running on VNC server port
    exec(`fuser -k ${VNC_SERVER_PORT}/tcp`, {
        'env': process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });
}

export function createVirtualDisplay() {
    try {
        exec(`Xvfb $DISPLAY -screen 0 1280x720x16 -br &>> /tmp/xvfb.log &`, {
            'env': process.env
        });
    } catch (error) {
        console.log(error);
    }
}
