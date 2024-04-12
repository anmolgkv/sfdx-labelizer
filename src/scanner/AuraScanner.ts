import * as fs from 'fs';
import Violation from "./schema/Violation";

export default class AuraScanner {
    private readonly REGEX = /(?<=>)\s*([^<>{}\s]+(?:\s+[^<>{}\s]+)*)\s*(?=<)/g;

    scan(filePath: string): Violation[] {
        const fileContent = this.readFile(filePath);
        if (!fileContent) {
            return [];
        }

        const staticStrings: Violation[] = [];
        let match;
        let position = 0;
        while ((match = this.REGEX.exec(fileContent)) !== null) {
            const stringValue = match[0].trim();
            const startPosition = fileContent.indexOf(stringValue, position);

            const { lineCount, columnCount } = this.getPositionInfo(fileContent, startPosition);

            staticStrings.push({
                filePath,
                startLine: lineCount,
                startColumn: columnCount,
                endLine: lineCount,
                endColumn: columnCount + match[0].length,
                stringValue
            });
        }

        return staticStrings;
    }

    private readFile(filePath: string): string | null {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            return null;
        }
    }

    private getPositionInfo(fileContent: string, startPosition: number): { lineCount: number, columnCount: number } {
        const lineCount = fileContent.substring(0, startPosition).split('\n').length;
        const columnCount = startPosition - fileContent.lastIndexOf('\n', startPosition) - 1;

        return { lineCount, columnCount };
    }

}