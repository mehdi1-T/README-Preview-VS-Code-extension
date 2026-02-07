import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ReadmeTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri?: vscode.Uri,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label;
        this.description = this.resourceUri ? path.basename(this.resourceUri.fsPath) : undefined;
    }
}

export class ReadmeTreeProvider implements vscode.TreeDataProvider<ReadmeTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ReadmeTreeItem | undefined | null | void> = new vscode.EventEmitter<ReadmeTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ReadmeTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private workspaceRoot: string | undefined;

    constructor() {
        if (vscode.workspace.workspaceFolders) {
            this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ReadmeTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ReadmeTreeItem): Thenable<ReadmeTreeItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }

        if (element) {
            // If it's a directory, get README files inside it
            if (element.resourceUri && fs.statSync(element.resourceUri.fsPath).isDirectory()) {
                return this.getReadmeFilesInDirectory(element.resourceUri.fsPath);
            }
            return Promise.resolve([]);
        } else {
            // Get all README files in the workspace
            return this.getAllReadmeFiles();
        }
    }

    private async getAllReadmeFiles(): Promise<ReadmeTreeItem[]> {
        if (!this.workspaceRoot) {
            return [];
        }

        const readmeFiles: ReadmeTreeItem[] = [];
        const readmePatterns = ['README.md', 'readme.md', 'README.markdown', 'README.txt'];

        // Search for README files in the workspace
        const files = await vscode.workspace.findFiles('**/README*', '**/node_modules/**');
        
        const fileMap = new Map<string, vscode.Uri>();
        
        files.forEach(file => {
            const fileName = path.basename(file.fsPath).toLowerCase();
            if (fileName.includes('readme')) {
                const dirPath = path.dirname(file.fsPath);
                if (!fileMap.has(dirPath) || this.isBetterReadme(file.fsPath, fileMap.get(dirPath)?.fsPath)) {
                    fileMap.set(dirPath, file);
                }
            }
        });

        fileMap.forEach((uri, dirPath) => {
            const relativePath = path.relative(this.workspaceRoot!, dirPath);
            const label = relativePath === '' ? 'README' : relativePath;
            
            readmeFiles.push(new ReadmeTreeItem(
                label,
                vscode.TreeItemCollapsibleState.None,
                uri,
                {
                    command: 'readme-preview.preview',
                    title: 'Preview README',
                    arguments: [uri]
                }
            ));
        });

        return readmeFiles.sort((a, b) => a.label.localeCompare(b.label));
    }

    private async getReadmeFilesInDirectory(dirPath: string): Promise<ReadmeTreeItem[]> {
        const readmeFiles: ReadmeTreeItem[] = [];
        const readmePatterns = ['README.md', 'readme.md', 'README.markdown', 'README.txt'];

        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                    // Check if directory contains README files
                    const subDirReadmes = await this.getReadmeFilesInDirectory(itemPath);
                    if (subDirReadmes.length > 0) {
                        readmeFiles.push(new ReadmeTreeItem(
                            item,
                            vscode.TreeItemCollapsibleState.Collapsed,
                            vscode.Uri.file(itemPath)
                        ));
                    }
                } else if (item.toLowerCase().includes('readme')) {
                    readmeFiles.push(new ReadmeTreeItem(
                        item,
                        vscode.TreeItemCollapsibleState.None,
                        vscode.Uri.file(itemPath),
                        {
                            command: 'readme-preview.preview',
                            title: 'Preview README',
                            arguments: [vscode.Uri.file(itemPath)]
                        }
                    ));
                }
            }
        } catch (error) {
            console.error('Error reading directory:', error);
        }

        return readmeFiles;
    }

    private isBetterReadme(file1: string, file2?: string): boolean {
        if (!file2) return true;
        
        const priority = ['README.md', 'readme.md', 'README.markdown', 'README.txt', 'README'];
        const name1 = path.basename(file1);
        const name2 = path.basename(file2);
        
        const index1 = priority.indexOf(name1);
        const index2 = priority.indexOf(name2);
        
        if (index1 === -1 && index2 === -1) return name1 <= name2;
        if (index1 === -1) return false;
        if (index2 === -1) return true;
        
        return index1 < index2;
    }
}
