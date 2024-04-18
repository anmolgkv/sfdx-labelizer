import * as fs from 'fs';
import * as vscode from 'vscode';
import Violation from "./schema/Violation";
import { getAllIgnoredText } from '../services/IgnoreList';

export default class JSApexScanner {
    private readonly STATIC_STRING_REGEX = /(?:^|(?<!\/\/.*?))(['"`])([\s\S]*?)(?<!\\)\1/gm;
    private readonly AURA_STATIC_STRING_REGEX = /(['"])(?:(?!\$A\.get\("[\s\S]*?"\)).)*?\1/gm;
    private readonly FUNCTION_REGEX = /(?:function\s*\(.*\)\s*{(?:[^"'$A]*|(["'])(?:(?!\1).|\\[\s\S])*?\1)*\s*})/gm;

    private readonly ignoredTexts = getAllIgnoredText();
    private readonly ignoredRegexps: string[] = vscode.workspace.getConfiguration('labelizer').get('ignoreList') || [];

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
            while (match && (innerMatch = this.AURA_STATIC_STRING_REGEX.exec(match)) !== null && innerMatch[0] && !this.isIgnored(innerMatch[0])) {
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
            if (startPosition > classIndex && match[0] && !this.isIgnored(match[0])) {
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
            endLine: lineCount + ((stringValue.split('\n').length || 1) - 1),
            endColumn: columnCount + match[0].length,
            stringValue
        };
    }


    private isIgnored(text: string): boolean {
        const sanitizedText = this.removeQuotes(text);
        return this.ignoredTexts[sanitizedText] || this.ignoredRegexps.some((pattern) => this.toRegexPattern(pattern).test(sanitizedText));
    }


    private toRegexPattern(globPattern: string) {
        const escapedPattern = globPattern.replace(/[.+^$()|{}]/g, '\\$&');

        // Replace '*' with '.*' and '?' with '.' for regex
        const regexPattern = escapedPattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');

        return new RegExp('^' + regexPattern + '$');
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


    private removeQuotes(text: string) {
        const result = text.replace(/^['"`]|['"`]$/g, '');

        return result.endsWith('`;') ? result.substring(0, result.length - 2) : result;
    }
}
