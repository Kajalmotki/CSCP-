const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const OUT_FILE = path.join(__dirname, '..', 'public', 'ai_knowledge.json');

const chunks = [];

for (let i = 1; i <= 8; i++) {
    const filePath = path.join(DATA_DIR, `cscp2025_module${i}.json`);
    if (fs.existsSync(filePath)) {
        const target = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        target.sections.forEach(section => {
            // Group paragraphs into slightly larger chunks (e.g. 500-1000 characters)
            let currChunk = "";
            section.paragraphs.forEach(p => {
                if ((currChunk.length + p.length) > 800 && currChunk.length > 0) {
                    chunks.push({ m: i, t: currChunk.trim() });
                    currChunk = "";
                }
                currChunk += p + " ";
            });
            if (currChunk.trim().length > 0) {
                // Prepend section title for better context
                chunks.push({ m: i, t: `[${section.section_title}] ` + currChunk.trim() });
            }
        });
        
    }
}

fs.writeFileSync(OUT_FILE, JSON.stringify(chunks), 'utf8');
console.log(`Compiled ${chunks.length} chunks into public/ai_knowledge.json`);
