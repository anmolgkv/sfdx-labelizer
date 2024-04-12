import * as vscode from 'vscode';
import Violation from '../scanner/schema/Violation';
import StaticTextScanner from '../scanner/StaticTextScanner';

export default class LabelScanner {
    editor: vscode.TextEditor;

    // CONSTRUCTOR

    constructor(editor: vscode.TextEditor) {
        this.editor = editor;
    }


    // PUBLIC

    execute() : vscode.DiagnosticCollection {
        const violations = new StaticTextScanner().scan(this.editor.document.fileName);
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('labelizer-diagnostics');

        diagnosticCollection.set(this.editor.document.uri, this.toDiagnostics(violations));

        return diagnosticCollection;
    }


    toDiagnostics(violations: Violation[]): vscode.Diagnostic[] {
        return violations.map((violation) => this.toDiagnostic(violation));
    }


    toDiagnostic(violation: Violation): vscode.Diagnostic {
        const { startLine, startColumn, endLine, endColumn, stringValue } = violation;

        // Convert start and end positions to VS Code Range
        const range = new vscode.Range(
            new vscode.Position(startLine - 1, startColumn - 1),
            new vscode.Position(endLine - 1, endColumn - 1)
        );

        // Create a Diagnostic object
        const diagnostic = new vscode.Diagnostic(
            range,
            `Static string found: ${stringValue}`,
            vscode.DiagnosticSeverity.Warning
        );

        diagnostic.source = 'SFDX Labelizer';

        return diagnostic;
    }
}