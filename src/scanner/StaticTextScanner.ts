import Violation from './schema/Violation';
import { getCategory, getFileExtension } from '../utils/File';
import JSApexScanner from './JSApexScanner';
import HTMLScanner from './HTMLScanner';



export default class StaticTextScanner {
    scan(filePath: string): Violation[] {
        const category = getCategory(filePath);
        const type = getFileExtension(filePath);

        if(type === 'js' || type === 'cls') {
            return new JSApexScanner().scan(filePath, category);
        } else if(type === 'cmp' || type === 'html') {
            return new HTMLScanner().scan(filePath, category);
        }

        return [];
    }
}
