import { xml2js } from "xml-js";

export default class {
    public _declaration!: Declaration;
    public CustomLabels!: CustomLabels;


    // CONSTRUCTOR

    constructor(xml: string) {
        const parsedObject: any = xml2js(xml, { compact: true });

        // Note: Ensure labels is always an array
        const labels = Array.isArray(parsedObject.CustomLabels.labels)
            ? parsedObject.CustomLabels.labels
            : parsedObject.CustomLabels.labels
                ? [parsedObject.CustomLabels.labels]
                : [];

        this.CustomLabels = new CustomLabels(
            parsedObject.CustomLabels._attributes.xmlns,
            labels.map((label: any) => new Label(label))
        );
        this._declaration = new Declaration(parsedObject?._declaration?._attributes);
    }


    // PUBLIC

    add(text: string, category: string): string {
        const apiName = this.toApiName(text);

        try {
            if (!this.labelExists(apiName)) {
                this.CustomLabels?.labels?.push(new Label({
                    fullName: {
                        _text: apiName
                    },
                    categories: {
                        _text: category
                    },
                    shortDescription: {
                        _text: text.substring(0, 80)
                    },
                    value: {
                        _text: text
                    }
                }));
            }
        } catch (error: any) {
            throw new Error('Error updating CustomLabels.labels-meta.xml: ' + error.message);
        }

        return apiName;
    }


    // PRIVATE

    private labelExists(apiName: string): boolean {
        return !!this.CustomLabels?.labels?.some((label: any) => label.fullName._text === apiName);
    }


    private toApiName(text: string): string {
        return text
            .replace(/[^\w\s]/gi, ' ')
            .trim()
            .split(/\s+/)
            .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('')
            .substring(0, 40);
    }


}


// INNER

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
        this.language = new Property(label.protected?.language || 'en_US');
        this.protected = new Property(label.protected?._text || 'true');
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