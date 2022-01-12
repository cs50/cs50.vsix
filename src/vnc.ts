import * as vscode from 'vscode';
import { exec } from 'child_process';

export function startVNC() {
    const novncPort = 6081;
    const novncPassword = Math.random().toString(36).slice(-8);
    const novncHost = `${process.env.CODESPACE_NAME}-${novncPort}.githubpreview.dev`;
    const githubPreviewLink = `https://${novncHost}`;
    const vncUrl = `${githubPreviewLink}/vnc.html?autoconnect=true&host=${novncHost}&port=443&password=${novncPassword}`;

    // Kill all x11vnc and noVNC processes
    exec(`pkill -f x11vnc && fuser -k ${novncPort}/tcp`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });
    
    console.log("Creating virtual screen");
    exec(`Xvfb $DISPLAY -screen 0 1280x720x16 -br &>> /tmp/xvfb.log &`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    console.log("Starting VNC server");
    exec(`x11vnc -cursor arrow -display $DISPLAY -forever -loop -noxfixes -noxrecord -noxdamage -passwd ${novncPassword} -xkb -shared &>> /tmp/x11vnc.log &`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    console.log("Starting openbox session");
    exec(`openbox-session &>>/tmp/noVNC.log &`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    console.log("Starting noVNC client");
    exec(`/opt/noVNC/utils/novnc_proxy --vnc localhost:5900 --listen localhost:${novncPort}`, {
        "env": process.env
    }, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
    });

    vscode.env.openExternal(vscode.Uri.parse(vncUrl));
}