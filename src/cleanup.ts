import * as fs from 'fs';
import * as path from 'path';

function clean_up() {
    reset_html_file_association();
}

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

        const settings = JSON.parse(file);
        // eslint-disable-next-line no-prototype-builtins
        if (settings.hasOwnProperty('files.associations')) {
            delete settings['files.associations']['*.html']
            fs.writeFileSync(workspace_settings, JSON.stringify(settings, null, 4));
        }
    // eslint-disable-next-line no-empty
    } catch (error) {}
}

export { clean_up }
