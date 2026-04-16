const fs = require('fs');
const zlib = require('zlib');

const MODULE_PATHS = [
    'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules\\cscp2025_module1.epub',
    'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules\\cscp2025_module2.epub',
    'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules\\cscp2025_module3.epub',
    'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules\\cscp2025_module4.epub',
    'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules\\cscp2025_module5.epub',
    'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules\\cscp2025_module6.epub',
    'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules\\cscp2025_module7.epub',
    'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules\\cscp2025_module8.epub',
];

function readUint32LE(buf, offset) {
    return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24);
}

function readUint16LE(buf, offset) {
    return buf[offset] | (buf[offset + 1] << 8);
}

function extractHtmlFromEpub(buffer) {
    const sig = 0x04034b50; // Local file header signature
    const texts = [];
    let pos = 0;

    let totalRead = 0;

    while (pos < buffer.length - 30) {
        if (readUint32LE(buffer, pos) !== sig) {
            pos++;
            continue;
        }

        const compression = readUint16LE(buffer, pos + 8);
        const compressedSize = readUint32LE(buffer, pos + 18);
        const filenameLength = readUint16LE(buffer, pos + 26);
        const extraLength = readUint16LE(buffer, pos + 28);

        if (pos + 30 + filenameLength > buffer.length) break;

        const filename = buffer.slice(pos + 30, pos + 30 + filenameLength).toString('utf8');
        const dataStart = pos + 30 + filenameLength + extraLength;
        const dataEnd = dataStart + compressedSize;

        if (filename.match(/\.(html|xhtml|htm)$/i) && compressedSize > 0 && dataEnd <= buffer.length) {
            try {
                const compressedData = buffer.slice(dataStart, dataEnd);
                let rawData;
                if (compression === 0) {
                    rawData = compressedData; // Stored
                } else if (compression === 8) {
                    try {
                        rawData = zlib.inflateRawSync(compressedData); // Deflate
                    } catch (e) { }
                }

                if (rawData) {
                    const html = rawData.toString('utf8');
                    // Strip HTML tags
                    const text = html
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#\d+;/g, ' ')
                        .replace(/\s{3,}/g, ' ')
                        .trim();
                    if (text.length > 100) {
                        texts.push(text);
                    }
                }
            } catch (e) {
                // Skip errors
            }
        }
        pos = dataEnd;
    }
    return texts;
}

function chunkText(text, chunkSize = 600) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let current = '';
    for (const s of sentences) {
        if ((current + ' ' + s).length > chunkSize && current.length > 0) {
            chunks.push(current.trim());
            current = s;
        } else {
            current += ' ' + s;
        }
    }
    if (current.trim().length > 80) chunks.push(current.trim());
    return chunks;
}

let knowledgeChunks = [];
let totalChunks = 0;

console.log("Generating ai_knowledge.json...");

for (let i = 0; i < MODULE_PATHS.length; i++) {
    const p = MODULE_PATHS[i];
    const moduleNum = i + 1;
    if (!fs.existsSync(p)) {
        console.log(`[Module ${moduleNum}] Not found: ${p}`);
        continue;
    }
    try {
        const buffer = fs.readFileSync(p);
        const htmlTexts = extractHtmlFromEpub(buffer);
        let count = 0;
        for (const html of htmlTexts) {
            const chunks = chunkText(html);
            for (const c of chunks) {
                knowledgeChunks.push({ m: moduleNum, t: c });
                count++;
            }
        }
        totalChunks += count;
        console.log(`[Module ${moduleNum}] Loaded ${count} chunks`);
    } catch (e) {
        console.error(`[Module ${moduleNum}] Failed to load: ${e.message}`);
    }
}

fs.writeFileSync('public/ai_knowledge.json', JSON.stringify(knowledgeChunks));
console.log(`Done! Exported ${totalChunks} chunks to public/ai_knowledge.json`);
const stat = fs.statSync('public/ai_knowledge.json');
console.log(`File Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
