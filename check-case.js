const fs = require('fs');
const path = require('path');

function checkRequireCases(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory() && file !== 'node_modules' && file !== '.git') {
            checkRequireCases(fullPath);
        } else if (fullPath.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const requireRegex = /require\(['"](\..*?)['"]\)/g;
            let match;
            while ((match = requireRegex.exec(content)) !== null) {
                const reqPath = match[1];
                let targetPath = path.resolve(dir, reqPath);
                
                if (!targetPath.endsWith('.js')) {
                    if (fs.existsSync(targetPath + '.js')) {
                        targetPath += '.js';
                    } else if (fs.existsSync(path.join(targetPath, 'index.js'))) {
                        targetPath = path.join(targetPath, 'index.js');
                    }
                }

                if (fs.existsSync(targetPath)) {
                    const dirName = path.dirname(targetPath);
                    const baseName = path.basename(targetPath);
                    const exactFiles = fs.readdirSync(dirName);
                    if (!exactFiles.includes(baseName)) {
                        console.error(`Case mismatch in ${fullPath}: required '${reqPath}' but actual file is in [${exactFiles.join(', ')}]`);
                    }
                } else {
                    console.error(`Missing file in ${fullPath}: required '${reqPath}'`);
                }
            }
        }
    }
}

try {
    checkRequireCases(__dirname);
    console.log("Check complete.");
} catch (e) {
    console.error(e);
}
