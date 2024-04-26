import { xml2js } from "xml-js";
import * as vscode from 'vscode';

const DEFAULT_LANGUAGE = vscode.workspace.getConfiguration('labelizer').get('language', 'en_US');
const promptForConfirmation = vscode.workspace.getConfiguration('labelizer').get('promptForConfirmation', false);

export default class {
    public _declaration!: Declaration;
    public CustomLabels!: CustomLabels;


    // CONSTRUCTOR

    constructor(xml: string) {
        const parsedObject: any = xml2js(xml, { compact: true });

        // Note: Ensure labels is always an array
        const labels = Array.isArray(parsedObject.CustomLabels.labels)
            ? parsedObject.CustomLabels.labels
            : (parsedObject.CustomLabels.labels ? [parsedObject.CustomLabels.labels] : []);

        this.CustomLabels = new CustomLabels(
            parsedObject.CustomLabels._attributes.xmlns,
            labels.map((label: any) => new Label(label))
        );
        this._declaration = new Declaration(parsedObject?._declaration?._attributes);
    }


    // PUBLIC

    async add(text: string, iCategory: string): Promise<string> {
        const newApiName = this.toApiName(text);

        if(this.labelExists(newApiName)) {
            return newApiName;
        }

        const { apiName, shortDescription, language, isProtected, category } = promptForConfirmation
            ? this.sanitizeUserInput(await this.confirmInput(this.getDefaultLabel(text, iCategory)))
            : this.sanitizeUserInput(this.getDefaultLabel(text, iCategory));
        try {
            if (!this.labelExists(apiName)) {
                this.CustomLabels?.labels?.push(new Label({
                    value: new Property(text),
                    fullName: new Property(apiName),
                    language: new Property(language),
                    categories: new Property(category),
                    protected: new Property(isProtected),
                    shortDescription: new Property(shortDescription)
                }));
            }
        } catch (error: any) {
            throw new Error('Error updating CustomLabels.labels-meta.xml: ' + error.message);
        }

        return apiName;
    }


    sort() {
        this.CustomLabels.labels = this.CustomLabels?.labels?.sort((a, b) => a.fullName._text.localeCompare(b.fullName._text));
    }


    // PRIVATE

    private getDefaultLabel(text: string, category: string): WebviewInput {
        return {
            text,
            category,
            isProtected: true,
            language: DEFAULT_LANGUAGE,
            apiName: this.toApiName(text),
            shortDescription: text.substring(0, 80),
        };
    }


    private sanitizeUserInput(input: WebviewInput) {
        return {
            isProtected: input.isProtected.toString(),
            apiName: this.toApiName(input.apiName),
            language: input.language.trim(),
            category: input.category.trim(),
            shortDescription: input.shortDescription.trim().substring(0, 80)
        };
    }


    private confirmInput(input: WebviewInput): Promise<WebviewInput> {
        const labels = JSON.stringify(this.CustomLabels.labels);

        return new Promise((resolve) => {
            const panel = vscode.window.createWebviewPanel(
                'inputModal',
                `Confirm Label`,
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            const css = `
                body {
                    background-color: var(--vscode-background);
                }

                .form-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-top: 50px;
                }

                .input-group {
                    width: 85vw;
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .input-group label {
                    width: 100px;
                    margin-right: 10px;
                    font-weight: bold;
                    text-align: right;
                }

                .input-group .input-container {
                    flex: 1;
                    padding: 5px;
                }

                .input-group .input-container input {
                    border-radius: 3px;
                    width: 85%;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: var(--vscode-input-border);
                }

                .button {
                    padding: 8px 16px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    width: 20vw;
                    transition: background-color 0.3s;
                }

                .button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }

                .hide {
                    display:none;
                }

                .error {
                    color: red;
                }
            `;

            const script = `
                const vscode = acquireVsCodeApi();

                function submitInputs() {
                    const value = "${input.text}";
                    const labels = JSON.parse('${labels}');

                    const apiName = document.getElementById('apiName').value;
                    const category = document.getElementById('category').value;
                    const language = document.getElementById('language').value;
                    const shortDescription = document.getElementById('shortDescription').value;
                    const isProtected = document.getElementById('isProtected').checked;
                    const apiNameMessage = document.getElementById('apiNameMessage');
                    const isDuplicate = labels.some((existingLabel) => existingLabel.fullName._text === apiName && existingLabel.value._text !== value);

                    if(isDuplicate) {
                        apiNameMessage.innerText = 'Duplicate Full Name';
                        apiNameMessage.className = 'error';
                    } else {
                        apiNameMessage.className = 'hide';
                        vscode.postMessage({ command: 'submitInputs', inputs: { apiName, category, language, shortDescription, isProtected } });
                    }
                }
            `;

            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Confirm Label</title>
                    <style>${css}</style>
                    <script>${script}</script>
                </head>
                <body>
                    <div class="form-container">
                        <div class="input-group">
                            <label for="apiName">Full Name</label>
                            <div class="input-container">
                                <input id="apiName" type="text" placeholder="Full Name" value="${input.apiName}" /><br>
                                <div class="hide" id="apiNameMessage"></div>
                            </div>
                        </div>

                        <div class="input-group">
                            <label for="category">Category</label>
                            <div class="input-container">
                                <input id="category" type="text" placeholder="Category" value="${input.category}" /><br>
                            </div>
                        </div>

                        <div class="input-group">
                            <label for="language">Language</label>
                            <div class="input-container">
                                <input id="language" type="text" placeholder="Language" value="${input.language}" /><br>
                            </div>
                        </div>

                        <div class="input-group">
                            <label for="shortDescription">Description</label>
                            <div class="input-container">
                                <input id="shortDescription" type="text" placeholder="Description" value="${input.shortDescription}" /><br>
                            </div>
                        </div>

                        <div class="input-group">
                            <label for="isProtected">Protected</label>
                            <div class="input-container">
                                <input id="isProtected" type="checkbox" placeholder="Protected" checked=${input.isProtected} /><br>
                            </div>
                        </div>

                        <button class="button" onclick="submitInputs()">Confirm</button>
                    </div>
                </body>
                </html>
            `;

            panel.webview.html = html;

            panel.webview.onDidReceiveMessage(message => {
                if (message.command === 'submitInputs') {
                    resolve(message.inputs);
                    panel.dispose();
                }
            });
        });
    }


    private labelExists(apiName: string): boolean {
        return !!this.CustomLabels?.labels?.some((label: any) => label.fullName._text === apiName);
    }


    private toApiName(text: string = ''): string {
        return text
            .trim()
            // Replace non-alphanumeric characters with underscores
            .replace(/[^a-zA-Z0-9]+/g, '_')
            // Remove consecutive underscores
            .replace(/_+/g, '_')
            // Remove leading underscores
            .replace(/^_+/g, '')
            // Remove trailing underscores
            .replace(/_+$/g, '')
            // Ensure the API name begins with a letter
            .replace(/^[^a-zA-Z]/, 'a_$&')
            // Ensure the API name is not empty
            .replace(/^$/, 'default_name')
            // Ensure the API name does not end with an underscore
            .replace(/_$/, '')
            .substring(0, 40);
    }
}


// INNER

interface WebviewInput {
    text: string;
    apiName: string;
    category: string;
    shortDescription: string;
    language: string;
    isProtected: boolean;
}


export class Declaration {
    _attributes?: Attribute;

    constructor(_attributes: any) {
        this._attributes = new Attribute(_attributes.version, _attributes.encoding);
    }
}

export class Attribute {
    version?: string;
    encoding?: string;

    constructor(version?: string, encoding?: string) {
        this.version = version;
        this.encoding = encoding;
    }

}


export class CustomLabels {
    labels?: Label[];
    _attributes?: LabelAttribute;

    constructor(xmlns: string, labels: Label[] = []) {
        this._attributes = new LabelAttribute(xmlns);
        this.labels = labels;
    }
}

export class LabelAttribute {
    xmlns?: string;

    constructor(xmlns: string) {
        this.xmlns = xmlns;
    }
}


export class Label {
    fullName!: Property;
    categories?: Property;
    language!: Property;
    protected!: Property;
    shortDescription?: Property;
    value!: Property;

    constructor(label: any) {
        this.fullName = new Property(label.fullName?._text);
        this.categories = label.categories?._text ? new Property(label.categories?._text) : undefined;
        this.language = new Property(label.language?._text || DEFAULT_LANGUAGE);
        this.protected = new Property(label.protected?._text);
        this.shortDescription = label.shortDescription?._text ? new Property(label.shortDescription?._text) : undefined;
        this.value = new Property(label.value?._text);
    }
}


export class Property {
    _text!: string;

    constructor(text: string) {
        this._text = text || '';
    }
}