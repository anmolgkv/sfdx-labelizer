import * as fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import Labelizer from './Labelizer';

export default class LabelReferenceProvider implements vscode.ReferenceProvider {
    private static workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

    // PUBLIC

    public provideReferences(document: vscode.TextDocument, position: vscode.Position, _options: { includeDeclaration: boolean }, _token: vscode.CancellationToken): vscode.Location[] | null {
        const wordRange = document.getWordRangeAtPosition(position, /\b[\w.]+\b/);
        const selectedWord = wordRange ? document.getText(wordRange) : '';
        if (!selectedWord || !vscode.workspace.workspaceFolders?.length) {
            return null;
        }

        const labelPath = vscode.workspace.getConfiguration('labelizer').get('labelPath', Labelizer.DEFAULT_FILE_PATH);
        const directoryPath = labelPath.split("/").slice(0, 2).join("/");

        return this.scanDirectory(directoryPath, selectedWord);
    }

    // PRIVATE

    private scanDirectory(directoryPath: string, selectedWord: string): vscode.Location[] {
        let locations: vscode.Location[] = [];

        const files = fs.readdirSync(directoryPath);
        files.forEach(file => {
            const filePath = path.join(directoryPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                locations = locations.concat(this.scanDirectory(filePath, selectedWord));
            } else if (filePath.endsWith('.app') || filePath.endsWith('.cmp')) {
                const searchString = `{!$Label.c.${selectedWord}}`;
                locations = locations.concat(this.findMatchesInFile(filePath, searchString));
            } else if (filePath.endsWith('.cls')) {
                const searchString = `Label.${selectedWord}`;
                locations = locations.concat(this.findMatchesInFile(filePath, searchString));
            } else if (filePath.includes('aura') && filePath.endsWith('.js')) {
                const searchString = `$A.get("Label.c.${selectedWord}")`;
                locations = locations.concat(this.findMatchesInFile(filePath, searchString));
            } else if (filePath.includes('lwc') && filePath.endsWith('.js')) {
                const searchString = `import ${selectedWord} from "@salesforce/label/c.${selectedWord}";`;
                locations = locations.concat(this.findMatchesInFile(filePath, searchString));
            }
        });

        return locations;
    }


    private findMatchesInFile(filePath: string, searchString: string): vscode.Location[] {
        const locations: vscode.Location[] = [];
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const escapedString = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const lines = fileContents.split('\n');

        lines.forEach((line, lineNumber) => {
            let match;
            const regex = new RegExp(escapedString, 'g');
            while ((match = regex.exec(line)) !== null) {
                const startPosition = new vscode.Position(lineNumber, match.index);
                const endPosition = new vscode.Position(lineNumber, match.index + match[0].length);
                const range = new vscode.Range(startPosition, endPosition);
                const location = new vscode.Location(vscode.Uri.file(`${LabelReferenceProvider.workspaceRoot}/${filePath}`), range);
                locations.push(location);
            }
        });

        return locations;
    }
}