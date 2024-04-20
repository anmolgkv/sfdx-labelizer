import * as vscode from 'vscode';
import Labelizer from './services/Labelizer';
import LabelScanner from './services/LabelScanner';
import { addToIgnoreList } from './services/IgnoreList';
import ReplaceStaticTextAction from './services/ReplaceStaticTextAction';
import LabelDefinitionProvider from './services/LabelDefinitionProvider';
import LabelReferenceProvider from './services/LabelReferenceProvider';

let diagnosticCollection: vscode.DiagnosticCollection | undefined;

export async function activate(context: vscode.ExtensionContext) {

	const labelPath = vscode.workspace.getConfiguration('labelizer').get('labelPath', Labelizer.DEFAULT_FILE_PATH);
	let enableScan = vscode.workspace.getConfiguration('labelizer').get('enableScan', true);

	const fixCommand = vscode.commands
		.registerCommand('Labelizer.generateLabelFromSelection', async () => {
			const { apiName, category, value } = await new Labelizer().execute(labelPath);
			vscode.window.showInformationMessage(`Label added to ${labelPath} \n\r API Name: "${apiName}" \n\r category: "${category}"`);
			if(value.length > 80) {
				vscode.window.showWarningMessage('The API name and short description has been truncated to ensure compatibility and readability. If you find that this truncated name doesn\'t fully capture the essence of your label, you can modify it manually.');
			}
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

	context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(documentSelector, new LabelDefinitionProvider())
	);

	const xmlSelector: vscode.DocumentSelector = { pattern: '**/*.{labels-meta.xml}', scheme: 'file' };

	context.subscriptions.push(
        vscode.languages.registerReferenceProvider(xmlSelector, new LabelReferenceProvider())
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
