import * as vscode from 'vscode';
import Labelizer from './Labelizer';


export async function activate(context: vscode.ExtensionContext) {
	const labelPath = vscode.workspace.getConfiguration('sfdx-labelizer').get('labelPath', Labelizer.DEFAULT_FILE_PATH);

	try {
		const command = vscode.commands
			.registerCommand('sfdxLabelizer.generateLabelFromSelection', () => {
				new Labelizer().execute(labelPath);
			});
		context.subscriptions.push(command);
		vscode.window.showInformationMessage(`Label added to ${labelPath}`);
	} catch (error: any) {
		vscode.window.showErrorMessage(`Error updating ${labelPath}: ${error.message}`);
	}
}

export function deactivate() { }
