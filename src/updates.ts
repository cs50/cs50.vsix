import * as vscode from 'vscode';
import { exec } from 'child_process';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios').default;

function checkForUpdates() {
    try {
        exec(`tail -1 /etc/issue`, (error, stdout, stderr) => {
            const currentVersion = stdout.trim();
            const url = 'https://api.github.com/repos/cs50/codespace/git/matching-refs/tags/latest';
            const headers = {
                'Authorization': `token ${process.env['GITHUB_TOKEN']}`,
                'Accept': 'application/vnd.github.v3+json'
            };
            axios.get(url, {headers: headers}).then((response) => {
                const latestVersion = response.data[0]['object']['sha'].trim();
                if (currentVersion != latestVersion) {
                    promptUpdate();
                }
            }).catch((error) => {
                console.log(error);
            });
        });
    } catch (error) {
        console.log(error);
    }
}

function checkCS50TokenExpiry() {
    try {
        const url = 'https://api.github.com/user/codespaces/secrets';
        const headers = {
            'Accept': 'application/vnd.github+jso',
            'Authorization': `Bearer ${process.env['CS50_TOKEN']}`,
            'X-GitHub-Api-Version': '2022-11-28'
        };
        axios.get(url, {headers: headers}).then((response) => {
            const cs50Token = response.data['secrets'].filter((secret: any) => {
                return secret['name'] === 'CS50_TOKEN';
            });

            // If no CS50_TOKEN, prompt user to login again
            if (cs50Token.length === 0) {
                promptRelogin();
                return;
            }

            // If CS50_TOKEN is older than 24 hours, prompt user to login again
            const updatedDate = new Date(cs50Token[0]['updated_at']).getTime();
            const diff = new Date().getTime() - updatedDate;
            const diffInHours = diff / (1000 * 3600);
            if (diffInHours > 24) {
                promptRelogin();
            }
        }).catch((error) => {
            console.log(error);
        });
    } catch (error) {
        console.log(error);
    }
}

function promptRelogin() {
    const message = 'Please visit https://cs50.dev and log in again.';
    vscode.window.showErrorMessage(
        message, ...['OK']).then(() => {
            vscode.env.openExternal(vscode.Uri.parse('https://cs50.dev'));
    });
}

function promptUpdate() {
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

function detectInsiderVersion() {
    try {
        if (process.env['VSCODE_CWD'].includes('insider')) {
            const message = 'You seem to be running the Insiders version of VS Code, which might not be compatible with some of CS50\'s own features. Best to switch back to the Stable version of VS Code, as via "Switch to Stable Version..." under VS Code\'s gear icon.';
            vscode.window.showWarningMessage(message);
        }
    } catch (error) {
        console.log(error);
    }
}

export { checkForUpdates, checkCS50TokenExpiry, detectInsiderVersion };
