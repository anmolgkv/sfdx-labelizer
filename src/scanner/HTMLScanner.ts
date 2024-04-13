import * as fs from 'fs';
import * as vscode from 'vscode';
import Violation from "./schema/Violation";
import { getAllIgnoredText } from '../services/IgnoreList';

export default class HTMLScanner {
    private readonly REGEX = /(?<=>)\s*([^<>{}\s]+(?:\s+[^<>{}\s]+)*)\s*(?=<)/gm;
    private readonly ignoredTexts = getAllIgnoredText();
    private readonly ignoredRegexps: string[] = vscode.workspace.getConfiguration('labelizer').get('ignoreList') || [];

    scan(filePath: string, _category: string): Violation[] {
        const fileContent = this.readFile(filePath);
        if (!fileContent) {
            return [];
        }

        const staticStrings: Violation[] = [];
        let match;
        let position = 0;
        while ((match = this.REGEX.exec(fileContent)) !== null && !this.isIgnored(match[0])) {
            const stringValue = match[0].trim();
            const startPosition = fileContent.indexOf(stringValue, position);

            const { lineCount, columnCount } = this.getPositionInfo(fileContent, startPosition);

            staticStrings.push({
                filePath,
                startLine: lineCount,
                startColumn: columnCount,
                endLine: lineCount + ((stringValue.split('\n').length || 1) - 1),
                endColumn: columnCount + match[0].length,
                stringValue
            });
        }

        return staticStrings;
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
        return text.replace(/^['"]|['"]$/g, '');
    }
}