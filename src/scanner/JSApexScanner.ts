import * as fs from 'fs';
import Violation from "./schema/Violation";

export default class JSApexScanner {
    private readonly STATIC_STRING_REGEX = /(['"`])(.*?)\1/g;
    private readonly AURA_STATIC_STRING_REGEX = /(['"])(?:(?!\$A\.get\(".*?"\)).)*?\1/g;
    private readonly FUNCTION_REGEX = /(?:function\s*\(.*\)\s*{(?:[^"'$A]*|(["'])(?:(?!\1).|\\[\s\S])*?\1)*\s*})/g;

    scan(filePath: string, category: string): Violation[] {
        const fileContent = this.readFile(filePath);
        if (!fileContent) {
            return [];
        }

        return (category === 'AuraDefinitionBundle')
                    ? this.scanAuraJs(fileContent, filePath)
                    : this.scanApex(fileContent, filePath);
    }


    private scanAuraJs(fileContent: string, filePath: string): Violation[] {
        const result: Violation[] = [];

        let outerMatch;
        while ((outerMatch = this.FUNCTION_REGEX.exec(fileContent)) !== null) {
            const match = outerMatch[0];

            let innerMatch;
            while (match && (innerMatch = this.AURA_STATIC_STRING_REGEX.exec(match)) !== null) {
                result.push(this.toViolation(fileContent, filePath, innerMatch, outerMatch.index));
            }
        }

        return result;
    }


    private scanApex(fileContent: string, filePath: string): Violation[] {
        const result: Violation[] = [];

        const classIndex = fileContent.indexOf(' class ');
        if (classIndex === -1) {
            return result;
        }

        let match;
        while ((match = this.STATIC_STRING_REGEX.exec(fileContent)) !== null) {
            const startPosition = match.index;
            if (startPosition > classIndex) {
                result.push(this.toViolation(fileContent, filePath, match));
            }
        }

        return result;
    }


    private toViolation(fileContent: string, filePath: string, match: RegExpExecArray, offset?: any,): Violation {
        const startPosition = match.index + (offset || 0);
        const stringValue = match[0];
        const { lineCount, columnCount } = this.getPositionInfo(fileContent, startPosition);

        return {
            filePath,
            startLine: lineCount,
            startColumn: columnCount,
            endLine: lineCount,
            endColumn: columnCount + match[0].length,
            stringValue
        };
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
