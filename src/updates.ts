import * as vscode from 'vscode';
import { exec } from "child_process";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios').default;

function checkForUpdates() {
    exec(`tail -1 /etc/issue`, (error, stdout, stderr) => {
        const issue = stdout.trim();
        const url = 'https://api.github.com/repos/cs50/codespace/commits/main';
        const headers = {
            'Authorization': `token ${process.env['GITHUB_TOKEN']}`,
            'Accept': 'application/vnd.github.v3+json'
        };
        axios.get(url, {headers: headers}).then((response) => {
            const latest = response.data['sha'].trim();
            const commit_time = new Date(response.data['commit']['committer']['date']).getTime();
            const delta = (Date.now() - commit_time) / 1000;

            // Wait 20 minutes to ensure the image is built
            if (issue != latest && delta > 1200) {
                const message = `Updates Available`;
                vscode.window.showInformationMessage(
                    message, ...['Update Now', 'Remind Me Later']).then((selection) => {
                    if (selection === 'Update Now') {
                        exec('/opt/cs50/bin/update50', (stdin, stdout, stderr) => {
                            console.log(stderr);
                        });
                    }
                });
            }
        }).catch((error) => {
            console.log(error);
        });
    });
}

function detectInsiderVersion() {
    try {
        if (process.env["VSCODE_CWD"].includes("insider")) {
            const message = 'You seem to be running the Insiders version of VS Code, which might not be compatible with some of CS50\'s own features. Best to switch back to the Stable version of VS Code, as via "Switch to Stable Version..." under VS Code\'s gear icon.';
            vscode.window.showWarningMessage(message);
        }
    } catch (error) {
        console.log(error);
    }
}

export { checkForUpdates, detectInsiderVersion };
