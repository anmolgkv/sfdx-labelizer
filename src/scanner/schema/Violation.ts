export default interface Violation {
    filePath: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    stringValue: string;
};