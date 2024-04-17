import * as fs from 'fs';
import * as vscode from 'vscode';
import Labelizer from './Labelizer';
import CustomLabels from '../utils/CustomLabels';

export default class LabelDefinitionProvider implements vscode.DefinitionProvider {
    static absoluteXMLPath: string;

    static {
        const xmlFilePath = vscode.workspace.getConfiguration('labelizer').get('labelPath', Labelizer.DEFAULT_FILE_PATH);
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        LabelDefinitionProvider.absoluteXMLPath = xmlFilePath.startsWith('.')
            ? `${workspaceRoot}/${xmlFilePath.substring(1)}`
            : xmlFilePath;
    }

    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.Location | null {
        const wordRange = document.getWordRangeAtPosition(position, /\b[\w.]+\b/);
        const selectedWord = wordRange ? document.getText(wordRange) : '';
        const labelName = this.extractVariableName(selectedWord);
        if(!labelName) {
            return null;
        }
        const xmlFilePath = vscode.workspace.getConfiguration('labelizer').get('labelPath', Labelizer.DEFAULT_FILE_PATH);


        const existingContent = fs.existsSync(LabelDefinitionProvider.absoluteXMLPath)
            ? fs.readFileSync(LabelDefinitionProvider.absoluteXMLPath, 'utf-8')
            : Labelizer.DEFAULT_XML;
        const customLabelsJSON = new CustomLabels(existingContent);
        const isRelevant = customLabelsJSON?.CustomLabels?.labels?.find((label) => label.fullName._text === labelName);

        if (isRelevant) {
            const lineNumber = this.findLineNumberInXML(xmlFilePath, labelName);
            if (lineNumber !== -1) {
                return new vscode.Location(vscode.Uri.file(LabelDefinitionProvider.absoluteXMLPath), new vscode.Position(lineNumber, 0));
            }
        }

        return null;
    }

    private extractVariableName(input: string) {
        const regex = /\.(\w+)$/;
        const match = input.match(regex);

        return (match && match[1]) ? match[1] : null;
    }

    private findLineNumberInXML(xmlFilePath: string, labelName: string): number {
        const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8');
        const lines = xmlContent.split('\n');

        return lines.findIndex(line => line.includes(`<fullName>${labelName}</fullName>`));
    }
}