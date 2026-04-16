/**
 * HEIMDALL Phase 2 — Dictionary Service
 * Handles ASCM Dictionary PDF parsing and search
 */

const fs = require('fs');

let dictionaryCache = null;

/**
 * Verified parsing logic for ASCM Supply Chain Dictionary 19th Edition
 */
function parseDictionaryText(rawText) {
    const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = text.split('\n').map(l => l.trimEnd());

    const entries = [];
    let currentTerm = null;
    let currentDef = [];

    // Verified: Term [en-dash] Definition
    const dashPat = /^(.{1,80})\u2013(.+)$/;

    const skipLine = (l) => {
        const t = l.trim();
        if (!t || /^\d+$/.test(t) || /^\d+ASCM Supply Chain Dictionary/i.test(t)) return true;
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

            if (termPart.length <= 80 && termWords.length <= 8 && defPart.length >= 3) {
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

    const seen = new Set();
    return entries.filter(e => {
        const k = e.term.toLowerCase().trim();
        if (seen.has(k) || !k || e.term.length > 120) return false;
        seen.add(k);
        return true;
    }).sort((a, b) => a.term.localeCompare(b.term));
}

async function loadDictionary(pdfPath, pdfParse) {
    if (dictionaryCache) return dictionaryCache;
    if (!pdfParse || !fs.existsSync(pdfPath)) return [];

    try {
        const buffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(buffer, { max: 0 });
        dictionaryCache = parseDictionaryText(data.text);
        return dictionaryCache;
    } catch (e) {
        console.error('[Dictionary] Parse error:', e.message);
        return [];
    }
}

module.exports = {
    loadDictionary
};
