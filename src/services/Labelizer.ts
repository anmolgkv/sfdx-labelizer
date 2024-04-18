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

        const existingContent = fs.existsSync(labelPath)
            ? fs.readFileSync(labelPath, 'utf-8')
            : Labelizer.DEFAULT_XML;

        const customLabelsJSON = new CustomLabels(existingContent);

        const apiName = customLabelsJSON.add(text, category);
        // NOTE: this step is needed to suppress empty categories
        const sanitizedJson = JSON.parse(JSON.stringify(customLabelsJSON));
        const updatedContent = js2xml(sanitizedJson, { compact: true, spaces: 4 });
        fs.writeFileSync(labelPath, updatedContent);

        return { apiName, category, currentFilePath };
    }


    private removeQuotes(text: string) {
        const result = text.replace(/^['"`]|['"`]$/g, '');

        return result.endsWith('`;') ? result.substring(0, result.length-2) : result;
    }


    private async replaceStaticTextWithLabel(filePath: string, labelName: string) {
        const originalText = this.editor.document.getText(this.selection);
        const fileContents = await fs.promises.readFile(filePath, 'utf8');
        const modifiedContent = fileContents.replace(originalText, labelName);

        await fs.promises.writeFile(filePath, modifiedContent);
    }


    private async addImportAndLabelObjectVariable(filePath: string, labelNameToImport: string) {
        const fileContents = await fs.promises.readFile(filePath, 'utf8');
        let modifiedContents = fileContents;
        // Check if import statement exists
        if (!modifiedContents.includes(`import ${labelNameToImport} from "@salesforce/label/c.${labelNameToImport}";`)) {
            // Insert import statement at the beginning
            modifiedContents = `import ${labelNameToImport} from "@salesforce/label/c.${labelNameToImport}";\n${fileContents}`;
        }

        // Find the class declaration
        const classDeclarationMatch = modifiedContents.match(/export default class (\w+)/);
        const className = classDeclarationMatch?.[1];

        if (className) {
            // Check for existing label object or create it
            const labelDeclaration = modifiedContents.match(/label = \{([^}]*)}/);

            if (labelDeclaration) {
                // Modify existing label object
                const labelVars = labelDeclaration[1].split(',');

                if (!labelVars.some(labelVar => labelVar.trim() === labelNameToImport)) {
                    const updatedLabel = `label = {
        ${labelVars.map((label) => label.trim()).join(',\n\t\t')},
        ${labelNameToImport}
    }`;
                    modifiedContents = modifiedContents.replace(labelDeclaration[0], updatedLabel);
                }
            } else {
                // Create new label object after class declaration
                const classDeclarationEndIndex = modifiedContents.indexOf('{', modifiedContents.indexOf(classDeclarationMatch[0])) + 1;
                modifiedContents = `${modifiedContents.slice(0, classDeclarationEndIndex)}\n\tlabel = { ${labelNameToImport} };\n${modifiedContents.slice(classDeclarationEndIndex)}`;
            }

            // Write the modified contents back to the file
            await fs.promises.writeFile(filePath, modifiedContents);
        } else {
            throw new Error(`Class declaration not found in ${filePath}`);
        }
    }
}