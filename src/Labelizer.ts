import path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

import { mkdirp } from 'mkdirp';
import { js2xml } from 'xml-js';
import CustomLabels from './CustomLabels';
import { MetadataResolver, SourceComponent } from '@salesforce/source-deploy-retrieve';

export default class Labelizer {
    public static DEFAULT_FILE_PATH = './force-app/main/default/labels/CustomLabels.labels-meta.xml';
    public static DEFAULT_XML = '<?xml version="1.0" encoding="UTF-8"?><CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata"></CustomLabels>';

    private editor: vscode.TextEditor;
    private selection;

    // CONSTRUCTOR

    constructor() {
        if (!vscode.window.activeTextEditor) {
            throw new Error('No active text editor found.');
        }
        this.editor = vscode.window.activeTextEditor;
        this.selection = this.editor.selection;
    }


    // PUBLIC

    public async execute(labelPath: string) {
        const selectedText = this.editor.document.getText(this.selection);
        if (!selectedText) {
            throw new Error('No text selected.');
        }

        const labelApiName = await this.updateCustomLabelsXML(this.removeQuotes(selectedText), labelPath);

        this.editor.edit(editBuilder => editBuilder.replace(this.selection, `Label.${labelApiName}`));
    }


    // PRIVATE

    private async updateCustomLabelsXML(text: string, labelPath: string): Promise<string> {
        const currentFilePath = this.editor.document.fileName;
        const category = this.getCategory(currentFilePath);

        // Note: Create directory if it doesn't exist
        if (!fs.existsSync(labelPath)) {
            const directory = path.dirname(labelPath);
            await mkdirp(directory);
        }

        const existingContent = fs.existsSync(labelPath)
            ? fs.readFileSync(labelPath, 'utf-8')
            : Labelizer.DEFAULT_XML;

        const customLabelsJSON = new CustomLabels(existingContent);

        const apiName = customLabelsJSON.add(text, category);
        const updatedContent = js2xml(customLabelsJSON, { compact: true, spaces: 4 });
        fs.writeFileSync(labelPath, updatedContent);

        return apiName;
    }


    private getCategory(currentFilePath: string): string {

        try {
            const metadata: SourceComponent[] = new MetadataResolver().getComponentsFromPath(currentFilePath);

            return metadata[0].type.name;
        } catch (error) {
            return 'Auto Generated label';
        }
    }


    private removeQuotes(text: string) {
        return text.replace(/^['"]|['"]$/g, '');
    }
}