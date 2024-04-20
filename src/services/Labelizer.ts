import { dirname } from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

import { mkdirp } from 'mkdirp';
import { js2xml } from 'xml-js';
import CustomLabels from '../utils/CustomLabels';
import { getCategory } from '../utils/File';

export default class Labelizer {
    public static DEFAULT_FILE_PATH = './force-app/main/default/labels/CustomLabels.labels-meta.xml';
    public static DEFAULT_XML = '<?xml version="1.0" encoding="UTF-8"?><CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata"></CustomLabels>';

    private selection;
    private selectedText;
    private editor: vscode.TextEditor;

    // CONSTRUCTOR

    constructor() {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor found.');
        }
        this.editor = vscode.window.activeTextEditor;
        this.selection = this.editor.selection;
        this.selectedText = this.removeQuotes(this.editor.document.getText(this.selection));

        if (!this.selectedText) {
            throw new Error('No text selected.');
        }
    }


    // PUBLIC

    public async execute(labelPath: string) {
        const { apiName, category, currentFilePath } = await this.updateCustomLabelsXML(this.selectedText, labelPath);

        if (category === 'ApexClass') {
            this.editor.edit(editBuilder => editBuilder.replace(this.selection, `Label.${apiName}`));
        } else if (category === 'AuraDefinitionBundle' && currentFilePath.endsWith('.cmp')) {
            this.editor.edit(editBuilder => editBuilder.replace(this.selection, `{!$Label.c.${apiName}}`));
        } else if (category === 'AuraDefinitionBundle' && currentFilePath.endsWith('.js')) {
            this.editor.edit(editBuilder => editBuilder.replace(this.selection, `$A.get("Label.c.${apiName}")`));
        } else if (category === 'LightningComponentBundle' && currentFilePath.endsWith('.js')) {
            await this.addImportAndLabelObjectVariable(currentFilePath, apiName);
            await this.replaceStaticTextWithLabel(currentFilePath, `this.label.${apiName}`);
        } else if (category === 'LightningComponentBundle' && currentFilePath.endsWith('.html')) {
            const jsFileName = currentFilePath.replace('.html', '.js');
            await this.addImportAndLabelObjectVariable(jsFileName, apiName);

            this.editor.edit(editBuilder => editBuilder.replace(this.selection, `{label.${apiName}}`));
        }

        return { apiName, category, value: this.selectedText };
    }


    // PRIVATE

    private async updateCustomLabelsXML(text: string, labelPath: string): Promise<any> {
        const currentFilePath = this.editor.document.fileName;
        const category = getCategory(currentFilePath);

        // Note: Create directory if it doesn't exist
        if (!fs.existsSync(labelPath)) {
            const directory = dirname(labelPath);
            await mkdirp(directory);
        }

        const existingContent = fs.existsSync(labelPath) ? fs.readFileSync(labelPath, 'utf-8') : Labelizer.DEFAULT_XML;

        const customLabelsJSON = new CustomLabels(existingContent);
        const apiName = await customLabelsJSON.add(text, category);
        customLabelsJSON.sort();
        // NOTE: this step is needed to suppress empty categories
        const sanitizedJson = JSON.parse(JSON.stringify(customLabelsJSON));
        const updatedContent = js2xml(sanitizedJson, { compact: true, spaces: 4 });
        fs.writeFileSync(labelPath, updatedContent);

        return { apiName, category, currentFilePath };
    }


    private removeQuotes(text: string) {
        const result = text.replace(/^['"`]|['"`]$/g, '');

        return result.endsWith('`;') ? result.substring(0, result.length - 2) : result;
    }


    private async replaceStaticTextWithLabel(filePath: string, labelName: string) {
        const originalText = this.editor.document.getText(this.selection);
        const fileContents = await fs.promises.readFile(filePath, 'utf8');
        const modifiedContent = fileContents.replace(originalText, labelName);

        await fs.promises.writeFile(filePath, modifiedContent);
    }


    private async addImportAndLabelObjectVariable(filePath: string, labelNameToImport: string) {
        const fileContents = await fs.promises.readFile(filePath, 'utf8');
        let modifiedContents = this.addLabelImport(fileContents, labelNameToImport);

        const className = this.extractClassName(modifiedContents);

        if (className) {
            modifiedContents = this.updateLabelDeclaration(modifiedContents, labelNameToImport);
            await fs.promises.writeFile(filePath, modifiedContents);
        } else {
            throw new Error(`Class declaration not found in ${filePath}`);
        }
    }


    private updateLabelDeclaration(fileContents: string, labelNameToImport: string): string {
        const labelDeclaration = fileContents.match(/label = \{([^}]*)}/);

        if (labelDeclaration) {
            const labelVars: string[] = labelDeclaration[1].split(',');

            if (!labelVars.some(labelVar => labelVar.trim() === labelNameToImport)) {
                const updatedLabel = `label = {
        ${labelVars.map((label) => label.trim()).join(',\n\t\t')},
        ${labelNameToImport}
    }`;
                fileContents = fileContents.replace(labelDeclaration[0], updatedLabel);
            }
        } else {
            const classDeclarationEndIndex = fileContents.indexOf('{', fileContents.indexOf('export default class')) + 1;
            fileContents = `${fileContents.slice(0, classDeclarationEndIndex)}\n\tlabel = { ${labelNameToImport} };\n${fileContents.slice(classDeclarationEndIndex)}`;
        }

        return fileContents;
    }


    private extractClassName(modifiedContents: string) {
        const classDeclarationMatch = modifiedContents.match(/export default class (\w+)/);
        return classDeclarationMatch?.[1];
    }

    private addLabelImport(fileContents: string, labelNameToImport: string): string {
        const labelImportRegex = /import\s+[^;]+from\s+"@salesforce\/label\/c\.[^;]+";/g;
        const regularImportRegex = /import\s+[^;]+from\s+[^;]+;/g;

        const hasLabelImport = labelImportRegex.test(fileContents);
        const hasRegularImport = regularImportRegex.test(fileContents);

        if (hasLabelImport) {
            const lastLabelImport = fileContents.match(labelImportRegex)!.pop()!;
            return fileContents.replace(lastLabelImport, `${lastLabelImport}\nimport ${labelNameToImport} from "@salesforce/label/c.${labelNameToImport}";`);
        } else if (hasRegularImport) {
            const lastRegularImport = fileContents.match(regularImportRegex)!.pop()!;
            const lastIndex = fileContents.lastIndexOf(lastRegularImport) + lastRegularImport.length;
            return `${fileContents.slice(0, lastIndex)}\nimport ${labelNameToImport} from "@salesforce/label/c.${labelNameToImport}";${fileContents.slice(lastIndex)}`;
        } else {
            return `import ${labelNameToImport} from "@salesforce/label/c.${labelNameToImport}";\n${fileContents}`;
        }
    }
}