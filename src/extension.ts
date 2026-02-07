// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ReadmeTreeProvider, ReadmeTreeItem } from './ReadmeTreeProvider';
import { ReadmePreviewPanel } from './ReadmePreviewPanel';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('README Preview extension is now active!');

	// Create tree provider for README files
	const readmeTreeProvider = new ReadmeTreeProvider();
	
	// Register tree view
	vscode.window.registerTreeDataProvider('readmeExplorer', readmeTreeProvider);

	// Register refresh command
	const refreshCommand = vscode.commands.registerCommand('readme-preview.refresh', () => {
		readmeTreeProvider.refresh();
	});

	// Register preview command
	const previewCommand = vscode.commands.registerCommand('readme-preview.preview', (uri: vscode.Uri) => {
		if (uri) {
			ReadmePreviewPanel.createOrShow(context.extensionUri, uri);
		}
	});

	// Register all commands
	context.subscriptions.push(refreshCommand, previewCommand);

	// Watch for file changes to refresh the tree
	const fileWatcher = vscode.workspace.createFileSystemWatcher('**/README*');
	
	fileWatcher.onDidCreate(() => {
		readmeTreeProvider.refresh();
	});
	
	fileWatcher.onDidDelete(() => {
		readmeTreeProvider.refresh();
	});
	
	fileWatcher.onDidChange(() => {
		// Refresh preview panel if it's open and watching the changed file
		if (ReadmePreviewPanel.currentPanel) {
			// The panel will auto-refresh every 5 seconds, but we can trigger immediate refresh
			readmeTreeProvider.refresh();
		}
	});

	context.subscriptions.push(fileWatcher);

	// Initial refresh
	readmeTreeProvider.refresh();
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (ReadmePreviewPanel.currentPanel) {
		ReadmePreviewPanel.currentPanel.dispose();
	}
}
