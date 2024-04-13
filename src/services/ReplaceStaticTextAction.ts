import * as vscode from 'vscode';

export default class ReplaceStaticTextAction implements vscode.CodeActionProvider {
    provideCodeActions(_document: vscode.TextDocument, _range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, _token: vscode.CancellationToken): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.message.startsWith('Static string found:')) {
                const quickFixAction = new vscode.CodeAction('Convert to label', vscode.CodeActionKind.QuickFix);
                quickFixAction.diagnostics = [diagnostic];
                quickFixAction.isPreferred = true;
                quickFixAction.command = { command: 'Labelizer.generateLabelFromSelection', title: 'Convert to label', tooltip: 'This will replace this static text into a reusable label.' };
                actions.push(quickFixAction);

                const ignoreAction = new vscode.CodeAction('Add to ignore list', vscode.CodeActionKind.QuickFix);
                ignoreAction.diagnostics = [diagnostic];
                ignoreAction.command = { command: 'Labelizer.addToIgnoreList', title: 'Add to ignore list', tooltip: 'This will add the static text to ignore list.' };
                actions.push(ignoreAction);
            }
        }

        return actions;
    }

    resolveCodeAction(codeAction: vscode.CodeAction, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeAction> {
        const command = codeAction.command?.command;
        if((command === 'Labelizer.generateLabelFromSelection' || command === 'Labelizer.addToIgnoreList' )&& codeAction.diagnostics?.length) {
            const diagnostic = codeAction.diagnostics[0];
            this.selectText(diagnostic.range.start.line + 1, diagnostic.range.start.character + 2, diagnostic.range.end.line + 1, diagnostic.range.end.character + 2);
        }

        return null;
    }

    selectText(startLine: number, startColumn: number, endLine: number, endColumn: number): void {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const startPosition = new vscode.Position(startLine - 1, startColumn - 1); // Convert 1-based to 0-based index
            const endPosition = new vscode.Position(endLine - 1, endColumn - 1); // Convert 1-based to 0-based index
            const newSelection = new vscode.Selection(startPosition, endPosition);
            activeEditor.selection = newSelection;
        } else {
            vscode.window.showErrorMessage('No active text editor');
        }
    }
}
