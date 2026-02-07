import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ReadmePreviewPanel {
    public static currentPanel: ReadmePreviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, readmeUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ReadmePreviewPanel.currentPanel) {
            ReadmePreviewPanel.currentPanel._panel.reveal(column);
            ReadmePreviewPanel.currentPanel._update(readmeUri);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'readmePreview',
            `README Preview - ${path.basename(readmeUri.fsPath)}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.file(path.dirname(readmeUri.fsPath))
                ]
            }
        );

        ReadmePreviewPanel.currentPanel = new ReadmePreviewPanel(panel, extensionUri, readmeUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, private readmeUri: vscode.Uri) {
        this._panel = panel;
        this._update(readmeUri);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update(this.readmeUri);
                }
            },
            null,
            this._disposables
        );

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'refresh':
                        this._update(this.readmeUri);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        ReadmePreviewPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _update(readmeUri: vscode.Uri) {
        this.readmeUri = readmeUri;
        const content = await this._getHtmlForWebview(this._panel.webview);
        this._panel.title = `README Preview - ${path.basename(readmeUri.fsPath)}`;
        this._panel.webview.html = content;
    }

    private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
        try {
            const readmeContent = fs.readFileSync(this.readmeUri.fsPath, 'utf8');
            const htmlContent = this._convertMarkdownToHtml(readmeContent);
            
            const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(
                vscode.Uri.file(path.dirname(__filename)),
                '..',
                'media',
                'github.css'
            ));

            return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>README Preview</title>
                    <link rel="stylesheet" href="${styleUri}">
                    <style>
                        :root {
                            --vscode-editor-background: var(--vscode-editor-background, #ffffff);
                            --vscode-editor-foreground: var(--vscode-editor-foreground, #333333);
                            --vscode-sidebar-background: var(--vscode-sidebar-background, #f3f3f3);
                            --vscode-button-background: var(--vscode-button-background, #007acc);
                            --vscode-button-hoverBackground: var(--vscode-button-hoverBackground, #0062a3);
                            --vscode-descriptionForeground: var(--vscode-descriptionForeground, #717171);
                        }
                        
                        body {
                            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif);
                            font-size: var(--vscode-font-size, 16px);
                            line-height: 1.5;
                            word-wrap: break-word;
                            color: var(--vscode-editor-foreground);
                            background-color: var(--vscode-editor-background);
                            margin: 0;
                            padding: 20px;
                        }
                        
                        .container {
                            max-width: 100%;
                            margin: 0 auto;
                        }
                        
                        .header {
                            border-bottom: 1px solid var(--vscode-panel-border, #e1e1e1);
                            padding-bottom: 16px;
                            margin-bottom: 24px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }
                        
                        .readme-name {
                            font-size: 18px;
                            font-weight: 600;
                            color: var(--vscode-editor-foreground);
                        }
                        
                        .refresh-btn {
                            background-color: var(--vscode-button-background);
                            color: var(--vscode-button-foreground, white);
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        }
                        
                        .refresh-btn:hover {
                            background-color: var(--vscode-button-hoverBackground);
                        }
                        
                        .file-path {
                            font-size: 14px;
                            color: var(--vscode-descriptionForeground);
                            margin-bottom: 16px;
                            text-align: center;
                        }
                        
                        .content img {
                            max-width: 100%;
                            height: auto;
                            border-radius: 6px;
                            margin: 16px 0;
                        }
                        
                        .content {
                            background-color: var(--vscode-editor-background);
                            color: var(--vscode-editor-foreground);
                        }
                        
                        .content h1,
                        .content h2,
                        .content h3,
                        .content h4,
                        .content h5,
                        .content h6 {
                            color: var(--vscode-editor-foreground);
                            border-color: var(--vscode-panel-border);
                        }
                        
                        .content a {
                            color: var(--vscode-textLink-foreground);
                        }
                        
                        .content a:hover {
                            color: var(--vscode-textLink-activeForeground);
                        }
                        
                        .content code {
                            background-color: var(--vscode-textCodeBlock-background);
                            color: var(--vscode-editor-foreground);
                        }
                        
                        .content pre {
                            background-color: var(--vscode-textCodeBlock-background);
                            border: 1px solid var(--vscode-panel-border);
                        }
                        
                        .content blockquote {
                            color: var(--vscode-descriptionForeground);
                            border-left-color: var(--vscode-panel-border);
                        }
                        
                        .content table {
                            border-color: var(--vscode-panel-border);
                        }
                        
                        .content table th,
                        .content table td {
                            border-color: var(--vscode-panel-border);
                        }
                        
                        .content table tr:nth-child(2n) {
                            background-color: var(--vscode-textBlockQuote-background);
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                        <div class="readme-name">${path.basename(this.readmeUri.fsPath)}</div>
                        <button class="refresh-btn" onclick="refreshPreview()">Refresh</button>
                    </div>
                    <div class="file-path">${this.readmeUri.fsPath}</div>
                        <div class="content">
                            ${htmlContent}
                        </div>
                    </div>
                    <script>
                        const vscode = acquireVsCodeApi();
                        
                        function refreshPreview() {
                            vscode.postMessage({
                                command: 'refresh'
                            });
                        }
                        
                        // Auto-refresh when file changes (reduced frequency for performance)
                        setInterval(() => {
                            vscode.postMessage({
                                command: 'refresh'
                            });
                        }, 10000);
                    </script>
                </body>
                </html>
            `;
        } catch (error) {
            return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>README Preview - Error</title>
                </head>
                <body>
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Error loading README</h2>
                        <p>Could not read the README file: ${error}</p>
                    </div>
                </body>
                </html>
            `;
        }
    }

    private _convertMarkdownToHtml(markdown: string): string {
        // Basic markdown to HTML conversion
        let html = markdown;
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.+?)_/g, '<em>$1</em>');
        
        // Code blocks
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        
        // Images - convert relative paths to webview URIs
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
            if (src.startsWith('http://') || src.startsWith('https://')) {
                return `<img alt="${alt}" src="${src}" />`;
            } else {
                // Convert relative path to absolute file URI
                const readmeDir = path.dirname(this.readmeUri.fsPath);
                const imagePath = path.resolve(readmeDir, src);
                const imageUri = vscode.Uri.file(imagePath);
                const webviewUri = this._panel.webview.asWebviewUri(imageUri);
                return `<img alt="${alt}" src="${webviewUri}" />`;
            }
        });
        
        // Line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        // Lists
        html = html.replace(/^\* (.+)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Blockquotes
        html = html.replace(/^> (.+)/gim, '<blockquote>$1</blockquote>');
        
        // Horizontal rules
        html = html.replace(/^---$/gim, '<hr>');
        
        return html;
    }
}
