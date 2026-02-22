/**
 * generate-dictionary.js
 * Run ONCE to create public/dictionary_data.json from the ASCM PDF.
 * Usage: node generate-dictionary.js
 * 
 * This pre-generates the dictionary so it works on Netlify (no backend needed).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const PDF_PATH = 'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules\\ASCM Dictionary- Updated - 19th Edition - English.pdf';
const OUTPUT = 'public/dictionary_data.json';

if (!existsSync(PDF_PATH)) {
    console.error('PDF not found at:', PDF_PATH);
    process.exit(1);
}

let pdfParse;
try {
    pdfParse = require('./node_modules/pdf-parse/index.js');
} catch (e) {
    pdfParse = require('pdf-parse');
}

console.log('Reading PDF...');
const buffer = readFileSync(PDF_PATH);

pdfParse(buffer, { max: 0 }).then(data => {
    console.log('Parsing entries...');

    const text = data.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = text.split('\n').map(l => l.trimEnd());
    const entries = [];
    let currentTerm = null;
    let currentDef = [];

    const dashPat = /^(.{1,80})\u2013(.+)$/;

    const skipLine = (l) => {
        const t = l.trim();
        if (!t) return true;
        if (/^\d+$/.test(t)) return true;
        if (/^\d+ASCM Supply Chain Dictionary/i.test(t)) return true;
        return false;
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (skipLine(line)) continue;

        const match = line.match(dashPat);
        if (match) {
            const termPart = match[1].trim();
            const defPart = match[2].trim();
            const termWords = termPart.split(/\s+/);
            const isValid = termPart.length >= 1 && termPart.length <= 80 &&
                termWords.length <= 8 && !termPart.endsWith(',') &&
                defPart.length >= 3;
            if (isValid) {
                if (currentTerm) {
                    const def = currentDef.join(' ').replace(/\s{2,}/g, ' ').trim();
                    if (def.length >= 5) entries.push({ term: currentTerm, definition: def });
                }
                currentTerm = termPart;
                currentDef = [defPart];
                continue;
            }
        }
        if (currentTerm && line.length > 0) currentDef.push(line);
    }

    if (currentTerm && currentDef.length > 0) {
        const def = currentDef.join(' ').replace(/\s{2,}/g, ' ').trim();
        if (def.length >= 5) entries.push({ term: currentTerm, definition: def });
    }

    // Deduplicate + sort
    const seen = new Set();
    const result = entries.filter(e => {
        const k = e.term.toLowerCase().trim();
        if (seen.has(k) || !k || e.term.length > 120) return false;
        seen.add(k);
        return true;
    }).sort((a, b) => a.term.localeCompare(b.term));

    writeFileSync(OUTPUT, JSON.stringify({ entries: result, total: result.length, generated: new Date().toISOString() }));
    console.log(`✅ Generated ${result.length} entries → ${OUTPUT}`);
}).catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
