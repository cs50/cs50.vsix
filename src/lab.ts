
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';
import { decode } from 'html-entities';
import { Liquid } from 'liquidjs';
import MarkdownIt = require('markdown-it');

export async function lab(context: vscode.ExtensionContext) {

    const CONFIG_FILE_NAME = '.cs50.yml';     // Default config yml file name

    let webViewGlobal : vscode.WebviewView;   // Global reference to a webview
    let currentLabFolderUri : any;            // Current opened lab folder
    let saveOpenedTextEditors : any;          // Saved text editors before lab is opened
    let labDidOpen = false;                   // Current state of the lab

    // Register webview view provider
    vscode.window.registerWebviewViewProvider('cs50-lab', {
        resolveWebviewView: (webView) => {
            const workspaceFolder = vscode.workspace.workspaceFolders![0];
            webView.webview.options = {
                enableCommandUris: true,
                enableScripts: true,
                localResourceRoots: [workspaceFolder.uri]
            };
            webViewGlobal = webView;
        }
    });

    function yt_parser(url){
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match&&match[7].length==11)? match[7] : false;
    }

    async function labViewHandler(fileUri: any) {
        currentLabFolderUri = fileUri;

        // First-time open a webview
        if (webViewGlobal == undefined) {
            vscode.commands.executeCommand('cs50-lab.focus');
            setTimeout(() => {
                labViewHandler(fileUri);
            }, 500);
            return;
        }

        // Inspect folder structure and look for configuration file
        const configFilePath = `${fileUri['path']}/${CONFIG_FILE_NAME}`;
        if (fs.existsSync(configFilePath)) {

            // Load config file
            const configFile = yaml.load(fs.readFileSync(configFilePath, 'utf8'));

            // Read slug
            const slug = configFile['vscode']['slug'];

            // Generate GitHub raw base url
            const githubRawURL = `https://raw.githubusercontent.com/${slug}`;

            // Get a list of files that we wish to update then
            // download them (no spaces in path allow for now)
            const filesToUpdate = configFile['vscode']['filesToUpdate'];
            for (let i = 0; i < filesToUpdate.length; i++) {
                const fileURL = `${fileUri['path']}/${filesToUpdate[i]}`;
                const command = `wget ${githubRawURL}/${filesToUpdate[i]} -O ${fileURL}`;
                try {
                    const stdout = execSync(command, {timeout: 5000}).toString();
                    console.log(stdout);
                } catch (e) {
                    console.log(e);
                }
            }

            // Backup current opened text editors
            if (!labDidOpen) {
                saveOpenedTextEditors = vscode.window.visibleTextEditors;
            }
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            const filesToOpen = configFile['vscode']['starterFiles'];
            for (let i = 0; i < filesToOpen.length; i++) {
                const fileURL = `${fileUri['path']}/${filesToOpen[i]}`;
                vscode.window.showTextDocument(vscode.Uri.file(fileURL));
            }

            // Focus terminal and change working directory to lab folder
            await vscode.commands.executeCommand('workbench.action.terminal.focus');
            vscode.window.activeTerminal.sendText(`cd ${fileUri['path']} && clear`);

            // Parse and render README.md
            const engine = new Liquid();

            // Register a next tag
            engine.registerTag('next', {
                parse: function(tagToken, remainTokens) {
                    // TODO
                    return;
                },
                render: async function(ctx) {
                    const htmlString = `<button>A button</button>`;
                    return htmlString;
                }
            });

            // Register an spoiler tag (with open/close tag)
            engine.registerTag('spoiler', {
                parse(tagToken, remainTokens) {
                this.tpls = [];
                this.args = tagToken.args;
                let closed = false;
                while(remainTokens.length) {
                    let token = remainTokens.shift();

                    // we got the end tag! stop taking tokens
                    if (token.getText() === '{% endspoiler %}') {
                        closed = true;
                        break;
                    }

                    // parse token into template
                    // parseToken() may consume more than 1 tokens
                    // e.g. {% if %}...{% endif %}
                    let tpl = this.liquid.parser.parseToken(token, remainTokens);
                    this.tpls.push(tpl);
                }
                    if (!closed) throw new Error(`tag ${tagToken.getText()} not closed`);
                },
                * render(context, emitter) {
                emitter.write(`<div class='spoiler'>`);
                yield this.liquid.renderer.renderTemplates(this.tpls, context, emitter);
                emitter.write("</div>");
                }
            });

            // Register a video tag
            engine.registerTag('video', {
                parse: function(tagToken, remainTokens) {
                    this.url = tagToken.args.replace('"', "");
                },
                render: async function(ctx) {
                    const ytEmbedLink = `https://www.youtube.com/embed/${yt_parser(this.url)}`;
                    const htmlString = `<div class="ratio ratio-16x9"><iframe sandbox="allow-forms allow-scripts allow-pointer-lock allow-same-origin allow-top-navigation allow-presentation" width="560" height="315" src="${ytEmbedLink}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
                    return htmlString;
                }
            });

            const readmePath = `${fileUri['path']}/README.md`
            const markdown = fs.readFileSync(readmePath, {encoding: 'utf-8'});

            // Have liquidJS make the first pass to convert all tags to html equivalents
            engine.parseAndRender(markdown).then(async parsedMarkdown => {

                // Have MarkDoc re-parse everything
                const md = new MarkdownIt();
                const parsedHtml = md.render(parsedMarkdown);

                // HTML strings are encoded by MarkDoc, need to decode
                const decodedHtml = decode(parsedHtml);

                // Prepare final HTML for rendering
                const html = `
                <!DOCTYPE html>
                <html>
                    <head>
                    <meta charset="utf-8">
                    <base href="${webViewGlobal.webview.asWebviewUri(vscode.Uri.file(readmePath))}">
                    </head>
                    <body>${decodedHtml}</body>
                </html>`;

                // Render webview
                webViewGlobal.webview.html = html;

                // Focus labview
                await vscode.commands.executeCommand('cs50-lab.focus');
                labDidOpen = true;
            });
        } else {
            vscode.window.showWarningMessage(`Unable to locate ${CONFIG_FILE_NAME}`);
        }
    }

    // Command: Open Folder as CS50 Lab
    context.subscriptions.push(
        vscode.commands.registerCommand('cs50.openAsLab', labViewHandler)
    );

    // Command: Reset Lab View
    context.subscriptions.push(
        vscode.commands.registerCommand('cs50.reloadLab', () => {
            labViewHandler(currentLabFolderUri);
        })
    );

    // Command: Close Lab
    context.subscriptions.push(
        vscode.commands.registerCommand('cs50.closeLab', async () => {
            for (let i = 0; i < saveOpenedTextEditors.length; i++) {
                await vscode.window.showTextDocument(
                    vscode.Uri.file(saveOpenedTextEditors[i]['document']['uri']['path']),
                    { viewColumn: i + 1 }
                );
            }
            await vscode.commands.executeCommand('workbench.explorer.fileView.focus');
            await vscode.commands.executeCommand('workbench.action.terminal.focus');
            vscode.window.activeTerminal.sendText(`cd ${vscode.workspace.workspaceFolders[0]['uri']['path']} && clear`);

            // Reset global variables
            webViewGlobal.webview.html = "Please open a lab.";
            saveOpenedTextEditors = undefined;
            labDidOpen = false;
        })
    );
}
