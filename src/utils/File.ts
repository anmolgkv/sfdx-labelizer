export function getCategory(currentFilePath: string): string {
    if(currentFilePath.includes('lwc')) {
        return 'LightningComponentBundle';
    } else if(currentFilePath.includes('aura')) {
        return 'AuraDefinitionBundle';
    } else if(currentFilePath.includes('class')) {
        return 'ApexClass';
    }

    return '';
}

export function getFileExtension(filePath: string): string {
    const lastIndex = filePath.lastIndexOf('.');
    if (lastIndex === -1) {
        return ''; // No extension found
    }
    return filePath.slice(lastIndex + 1).toLowerCase();
}