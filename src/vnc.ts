import * as vscode from 'vscode';
import { exec } from 'child_process';

export function startVNC() {
    const vncPort = 6081;
    const vncPassword = Math.random().toString(36).slice(-8);
    const vncHost = `${process.env.CODESPACE_NAME}-${vncPort}.githubpreview.dev`;
    const githubPreviewLink = `https://${vncHost}`;
    const vncUrl = `${githubPreviewLink}/vnc.html?autoconnect=true&host=${vncHost}&port=443&password=${vncPassword}`;

    // Kill all x11vnc and noVNC processes
    exec(`pkill -f x11vnc && fuser -k ${vncPort}/tcp`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });
    
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
    exec(`/opt/noVNC/utils/novnc_proxy --vnc localhost:5900 --listen localhost:${vncPort}`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    // Open noVNC
    setTimeout(() => {
        vscode.env.openExternal(vscode.Uri.parse(vncUrl));
    }, 1000);
}