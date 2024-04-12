import * as vscode from 'vscode';
import Labelizer from './services/Labelizer';
import LabelScanner from './services/LabelScanner';
import ReplaceStaticTextAction from './services/ReplaceStaticTextAction';

let diagnosticCollection: vscode.DiagnosticCollection | undefined;

export async function activate(context: vscode.ExtensionContext) {

	const labelPath = vscode.workspace.getConfiguration('sfdx-labelizer').get('labelPath', Labelizer.DEFAULT_FILE_PATH);

	const command = vscode.commands
							.registerCommand('sfdxLabelizer.generateLabelFromSelection', async () => {
								await new Labelizer().execute(labelPath);
								vscode.window.showInformationMessage(`Label added to ${labelPath}`);
							});
	context.subscriptions.push(command);

	const documentSelector: vscode.DocumentSelector = { pattern: '**/*.{html,js,cls,cmp}', scheme: 'file' };
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(documentSelector, new ReplaceStaticTextAction())
    );

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
			if(vscode.window.activeTextEditor) {
				diagnosticCollection?.clear();
				diagnosticCollection = new LabelScanner(vscode.window.activeTextEditor).execute();
			}
		})
	);
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(() => {
			if(vscode.window.activeTextEditor) {
				diagnosticCollection?.clear();
				diagnosticCollection = new LabelScanner(vscode.window.activeTextEditor).execute();
			}
		})
	);
}

export function deactivate() { }
