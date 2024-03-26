import { xml2js } from "xml-js";

export default class {
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
            labels.map((label: any) => new Label(
                label.fullName._text,
                label.categories._text,
                label.value._text
            ))
        );
    }


    // PUBLIC

    add(text: string, category: string): string {
        const apiName = this.toApiName(text);

        try {
            if (!this.labelExists(apiName)) {
                this.CustomLabels?.labels?.push(new Label(apiName, category, text));
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
            .join('');
    }


}


// INNER

export class CustomLabels {
    labels?: Label[];

    constructor(labels: Label[] = []) {
        this.labels = labels;
    }
}


export class Label {
    fullName!: Property;
    categories!: Property;
    language!: Property;
    protected!: Property;
    shortDescription!: Property;
    value!: Property;


    constructor(fullName: string, categories: string, value: string) {
        this.fullName = new Property(fullName);
        this.categories = new Property(categories);
        this.language = new Property('en_us');
        this.protected = new Property('true');
        this.shortDescription = new Property(value);
        this.value = new Property(value);
    }
}


export class Property {
    _text!: string;

    constructor(text: string) {
        this._text = text;
    }
}