import * as vscode from 'vscode';
import * as tcpPorts from 'tcp-port-used';
import { exec } from 'child_process';

export async function startVNC() {
    const vncPort = 6081;
    const vncServerPort = 5900;
    const vncPassword = Math.random().toString(36).slice(-8);
    const vncHost = `${process.env.CODESPACE_NAME}-${vncPort}.githubpreview.dev`;
    const githubPreviewLink = `https://${vncHost}`;
    const vncUrl = `${githubPreviewLink}/vnc.html?autoconnect=true&host=${vncHost}&port=443&password=${vncPassword}`;

    vncShutdown(vncPort);
    
    console.log("Creating virtual screen...");
    exec(`Xvfb $DISPLAY -screen 0 1280x720x16 -br &>> /tmp/xvfb.log &`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    console.log("Starting VNC server...");
    exec(`x11vnc -cursor arrow -display $DISPLAY -forever -loop -noxfixes -noxrecord -noxdamage -passwd ${vncPassword} -xkb -shared &>> /tmp/x11vnc.log &`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    console.log("Starting openbox session...");
    exec(`openbox-session &>>/tmp/noVNC.log &`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    console.log("Starting noVNC client...");
    exec(`/opt/noVNC/utils/novnc_proxy --vnc localhost:${vncServerPort} --listen localhost:${vncPort}`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    // Open noVNC
    let retries = 5;
    while (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        const didStartVncServer = await tcpPorts.check(vncServerPort);
        const didStartVncClient = await tcpPorts.check(vncPort);
        if (didStartVncServer && didStartVncClient) {
            vscode.env.openExternal(vscode.Uri.parse(vncUrl));
            break;
        }
        retries--;
        if (retries == 0) {
            if (!didStartVncServer) {
                vscode.window.showInformationMessage(`Timed out before x11vnc was listening on port ${vncServerPort}`);
            }
            if (!didStartVncClient) {
                vscode.window.showInformationMessage(`Timed out before noVNC was listening on port ${vncPort}`);
            }
        }
    }
}

export function vncShutdown(vncPort) {
    exec(`pkill -f x11vnc && fuser -k ${vncPort}/tcp`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });
}