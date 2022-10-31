import * as vscode from 'vscode';

function post_launch_tasks() {
    activateGitDoc();
}

/**
 * Forcefully activate GitDoc.
 */
function activateGitDoc() {
    setTimeout(() => {
        try {
            vscode.commands.executeCommand('gitdoc.enable');
        } catch (e) {
            console.log(e);
        }
    }, 120000);
}

export { post_launch_tasks };
