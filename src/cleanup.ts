import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

function clean_up() {
    reset_html_file_association();
};

/**
 * Remove file association for html files from jinja-html.
 */
function reset_html_file_association() {
    try {
        const workspace_settings = path.join(`/workspaces/${process.env.RepositoryName}`, '.vscode/settings.json');

        // Read current workspace settings
        let file = fs.readFileSync(workspace_settings,'utf8');

        // Remove comments
        file = file.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? '' : m);

        let settings = JSON.parse(file);
        if (settings.hasOwnProperty('files.associations')) {
            delete settings['files.associations']['*.html']
            fs.writeFileSync(workspace_settings, JSON.stringify(settings, null, 4));
        }
    } catch (error) {}
}

function uninstallExtensions() {
    let denyList = ['GitHub.copilot', 'GitHub.copilot-nightly', 'TabNine.tabnine-vscode']
    setTimeout(() => {
        try {
            for (let i = 0; i < denyList.length; i++) {
                if (vscode.extensions.all.find(e => e.id === denyList[i])) {
                    vscode.commands.executeCommand("workbench.extensions.uninstallExtension", denyList[i])
                }
            }
        } catch (error) {
            console.log(error);
        }
    }, 10000);
}

export { clean_up, uninstallExtensions }