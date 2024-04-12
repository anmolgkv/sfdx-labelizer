const fileContent = `({
    var1: 'Sample static text from Aura js2',
    helperMethod : function() {
        const var1 = 'Sample static text from Aura js3';
    }
})
`;

const functionRegex = /(?:function\s*\(.*\)\s*{(?:[^"'$A]*|(["'])(?:(?!\1).|\\[\s\S])*?\1)*\s*})/g;
const matches = functionRegex.exec(fileContent) || []; //fileContent.match(functionRegex) || [];
console.log(matches.index);
debugger;
const content = matches[0];

debugger

const staticStringRegex = /(['"])(?:(?!\$A\.get\(".*?"\)).)*?\1/g;
const match = "function() {\n        const var1 = 'Sample static text from Aura js3';\n    }\n}";
staticStringRegex.exec(match)