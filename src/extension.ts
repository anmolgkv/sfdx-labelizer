import * as vscode from 'vscode';
import Labelizer from './services/Labelizer';
import LabelScanner from './services/LabelScanner';
import ReplaceStaticTextAction from './services/ReplaceStaticTextAction';
import { addToIgnoreList } from './services/IgnoreList';

let diagnosticCollection: vscode.DiagnosticCollection | undefined;

export async function activate(context: vscode.ExtensionContext) {

	const labelPath = vscode.workspace.getConfiguration('labelizer').get('labelPath', Labelizer.DEFAULT_FILE_PATH);
	let enableScan = vscode.workspace.getConfiguration('labelizer').get('enableScan', true);

	const fixCommand = vscode.commands
		.registerCommand('Labelizer.generateLabelFromSelection', async () => {
			await new Labelizer().execute(labelPath);
			vscode.window.showInformationMessage(`Label added to ${labelPath}`);
		});
	context.subscriptions.push(fixCommand);


	const ignoreCommand = vscode.commands
		.registerCommand('Labelizer.addToIgnoreList', async () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				addToIgnoreList(editor.document.getText(editor.selection));

				if (enableScan) {
					// Note: diagnostics needs recalculation
					diagnosticCollection?.clear();
					diagnosticCollection = new LabelScanner(editor).execute();
				}
			}
		});
	context.subscriptions.push(ignoreCommand);


	const documentSelector: vscode.DocumentSelector = { pattern: '**/*.{html,js,cls,cmp}', scheme: 'file' };
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(documentSelector, new ReplaceStaticTextAction())
	);

	vscode.workspace.onDidChangeConfiguration(async (event) => {
		let affected = event.affectsConfiguration("labelizer.enableScan");
		if (affected) {
			await vscode.commands.executeCommand('workbench.action.restartExtensionHost');
		}
	});

	if (enableScan) {
		context.subscriptions.push(
			vscode.window.onDidChangeActiveTextEditor(editor => {
				if (editor) {
					diagnosticCollection?.clear();
					diagnosticCollection = new LabelScanner(editor).execute();
				}
			})
		);

		context.subscriptions.push(
			vscode.workspace.onDidChangeTextDocument(() => {
				if (vscode.window.activeTextEditor) {
					diagnosticCollection?.clear();
					diagnosticCollection = new LabelScanner(vscode.window.activeTextEditor).execute();
				}
			})
		);

		context.subscriptions.push(
			vscode.workspace.onDidOpenTextDocument(() => {
				if (vscode.window.activeTextEditor) {
					diagnosticCollection?.clear();
					diagnosticCollection = new LabelScanner(vscode.window.activeTextEditor).execute();
				}
			})
		);
	}
}

export function deactivate() { }
