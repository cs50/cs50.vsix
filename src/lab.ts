import { execSync } from 'child_process';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { Liquid } from 'liquidjs';
import { decode } from 'html-entities';
import MarkdownIt = require('markdown-it');

export async function lab(context: vscode.ExtensionContext) {

    // Declare global variable to reference a webview
    let webViewGlobal : vscode.WebviewView;
    let currentLabFolderUri : any;

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
            console.log("cs50-lab view registered");
        }
    });

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

        // User attempts to open a folder as CS50 lab
        console.log('opening folder as cs50 lab...');
        console.log(`fileUri: ${fileUri}`);

        // Inspect folder structure and look for configuration file
        const configFileName = '.cs50.yml';
        const configFilePath = `${fileUri['path']}/${configFileName}`;
        console.log(`Looking for config file at: ${configFilePath}`);

        if (fs.existsSync(configFilePath)) {

            // Located config file, do whatever needs to be done
            console.log(`${configFileName} exists`);
            console.log(fileUri);

            // Load config file
            const configFile = yaml.load(fs.readFileSync(configFilePath, 'utf8'));

            // Read slug
            const slug = configFile['vscode']['slug'];

            // Generate GitHub raw base url
            const githubRawURL = `https://raw.githubusercontent.com/${slug}`;

            // Get a list of files that we wish to override
            const filesToUpdate = configFile['vscode']['filesToUpdate'];

            // Download the latest file (no spaces in path allow for now)
            for (let i = 0; i < filesToUpdate.length; i++) {
                const fileURL = `${fileUri['path']}/${filesToUpdate[i]}`;
                const command = `wget ${githubRawURL}/${filesToUpdate[i]} -O ${fileURL}`;
                const stdout = execSync(command).toString();
                console.log(stdout);
            }

            // Get a list of files that we wish to open for user
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            const filesToOpen = configFile['vscode']['starterFiles'];
            for (let i = 0; i < filesToOpen.length; i++) {
                const fileURL = `${fileUri['path']}/${filesToOpen[i]}`;
                vscode.window.showTextDocument(vscode.Uri.file(fileURL));
            }

            // Focus terminal and change working directory to lab folder
            await vscode.commands.executeCommand('workbench.action.terminal.focus');
            vscode.window.activeTerminal.sendText(`cd ${fileUri['path']} && clear`);

            // Load README.md and render in webview
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
                    this.url = tagToken.args.replace('"', ""); // name
                },
                render: async function(ctx) {
                    const htmlString = `<div class="ratio ratio-16x9"><iframe allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="border" src="${this.url}?modestbranding=0&rel=0&showinfo=0"></iframe></div>`;
                    return htmlString;
                }
            });

            const markdown = fs.readFileSync(`${fileUri['path']}/README.md`, {encoding: 'utf-8'});
            console.log(markdown);

            // Have liquidJS make the first pass to convert all tags to html equivalents
            engine.parseAndRender(markdown).then(parsedMarkdown => {

                console.log("parsed markdown: ");
                console.log(parsedMarkdown);

                // Have MarkDoc re-parse everything
                const md = new MarkdownIt();
                const html = md.render(parsedMarkdown);

                // HTML strings are encoded by MarkDoc, need to decode
                const decodedHtml = decode(html);
                const boiler = `
                <!DOCTYPE html>
                <html>
                    <head>
                    <meta charset="utf-8">
                    </head>
                    <body>${decodedHtml}</body>
                </html>`;

                console.log("html:");
                console.log(boiler);

                // Update lab view/layout
                webViewGlobal.webview.html = boiler;
                vscode.commands.executeCommand('cs50-lab.focus');
            });
        } else {
            vscode.window.showWarningMessage(`Unable to locate ${configFileName}`);
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
}
