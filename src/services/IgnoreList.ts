import * as fs from 'fs';
import * as vscode from 'vscode';


export function addToIgnoreList(staticText: string) {
    if (!vscode.workspace.workspaceFolders) {
        return;
    }

    const vscodeConfigPath = vscode.workspace.workspaceFolders[0].uri.fsPath + '/.vscode/settings.json';
    try {
        const settingsJSON: any = fs.existsSync(vscodeConfigPath)
            ? JSON.parse(fs.readFileSync(vscodeConfigPath, 'utf8'))
            : {};
        if (!settingsJSON['Labelizer.ignoreList']) {
            settingsJSON['Labelizer.ignoreList'] = {};
        } else if (typeof settingsJSON['files.exclude'] !== 'object') {
            settingsJSON['files.exclude'] = {};
        }

        settingsJSON['Labelizer.ignoreList'][removeQuotes(staticText)] = true;

        fs.writeFileSync(vscodeConfigPath, JSON.stringify(settingsJSON, null, 4));

        vscode.window.showInformationMessage(`Added "${staticText}" to ignore list.`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error adding "${staticText}" to ignore list: ${error}`);
    }
}


export function getAllIgnoredText(): any {
    if (!vscode.workspace.workspaceFolders) {
        return {};
    }

    const vscodeConfigPath = vscode.workspace.workspaceFolders[0].uri.fsPath + '/.vscode/settings.json';
    const settingsJSON: any = fs.existsSync(vscodeConfigPath)
        ? JSON.parse(fs.readFileSync(vscodeConfigPath, 'utf8'))
        : {};

    return settingsJSON['Labelizer.ignoreList'] || {};
}


function removeQuotes(text: string) {
    return text.replace(/^['"]|['"]$/g, '');
}