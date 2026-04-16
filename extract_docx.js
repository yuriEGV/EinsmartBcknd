const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function extractDocx(filePath) {
    const tempDir = path.join(process.env.TEMP || '/tmp', 'docx_extract_' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    
    try {
        // Use powershell to expand archive (Windows native)
        execSync(`powershell -Command "Expand-Archive -Path '${filePath}' -DestinationPath '${tempDir}'"`);
        
        const xmlPath = path.join(tempDir, 'word', 'document.xml');
        if (fs.existsSync(xmlPath)) {
            const xml = fs.readFileSync(xmlPath, 'utf8');
            // Basic regex to strip tags and get text
            const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            console.log(text);
        } else {
            console.error('word/document.xml not found');
        }
    } catch (err) {
        console.error('Error extracting docx:', err.message);
    } finally {
        // Cleanup would go here, but I'll skip for now to ensure I can read it
    }
}

const target = process.argv[2];
if (target) {
    extractDocx(target);
} else {
    console.error('No file provided');
}
