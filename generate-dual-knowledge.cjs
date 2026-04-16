const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const TXT_DIR = 'C:\\Users\\Siddharth\\Downloads';
const EPUB_DIR = 'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules';
const OUTPUT_DIR = path.join(__dirname, 'public', 'knowledge');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function readUint32LE(buf, offset) {
    return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24);
}

function readUint16LE(buf, offset) {
    return buf[offset] | (buf[offset + 1] << 8);
}

function extractHtmlFromEpub(buffer) {
    const sig = 0x04034b50;
    const texts = [];
    let pos = 0;
    while (pos < buffer.length - 30) {
        if (readUint32LE(buffer, pos) !== sig) { pos++; continue; }
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
                if (compression === 0) rawData = compressedData;
                else if (compression === 8) {
                    try { rawData = zlib.inflateRawSync(compressedData); } catch (e) { }
                }
                if (rawData) {
                    const html = rawData.toString('utf8');
                    const text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, ' ').trim();
                    if (text.length > 50) texts.push(text);
                }
            } catch (e) {}
        }
        pos = dataEnd;
    }
    return texts;
}

function chunkText(text, chunkSize = 800) {
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
    if (current.trim().length > 50) chunks.push(current.trim());
    return chunks;
}

async function processModules() {
    console.log("🚀 Starting Dual-Source Knowledge Generation (TXT + EPUB)...");

    for (let i = 1; i <= 8; i++) {
        let moduleChunks = [];
        const txtPath = path.join(TXT_DIR, `cscp2025_module${i}.txt`);
        const epubPath = path.join(EPUB_DIR, `cscp2025_module${i}.epub`);

        console.log(`\n[Module ${i}] Processing...`);

        // 1. Process TXT (Primary for 2025 formulas)
        if (fs.existsSync(txtPath)) {
            const content = fs.readFileSync(txtPath, 'utf8');
            const paragraphs = content.split(/\n\s*\n/);
            paragraphs.forEach(p => {
                if (p.trim().length > 50) {
                    const chunks = chunkText(p);
                    chunks.forEach(c => moduleChunks.push({ m: i, t: c, source: 'txt' }));
                }
            });
            console.log(`   ✅ Read TXT source: ${moduleChunks.length} chunks added.`);
        } else {
            console.log(`   ⚠️ TXT source not found: ${txtPath}`);
        }

        // 2. Process EPUB (Secondary / Comparison)
        if (fs.existsSync(epubPath)) {
            const beforeCount = moduleChunks.length;
            const buffer = fs.readFileSync(epubPath);
            const htmlTexts = extractHtmlFromEpub(buffer);
            htmlTexts.forEach(html => {
                const chunks = chunkText(html);
                chunks.forEach(c => moduleChunks.push({ m: i, t: c, source: 'epub' }));
            });
            console.log(`   ✅ Read EPUB source: ${moduleChunks.length - beforeCount} chunks added.`);
        } else {
            console.log(`   ⚠️ EPUB source not found: ${epubPath}`);
        }

        // Write individual module JSON
        const outputPath = path.join(OUTPUT_DIR, `module${i}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(moduleChunks, null, 2));
        console.log(`   💾 Saved ${moduleChunks.length} total chunks to: public/knowledge/module${i}.json`);
    }

    console.log("\n✨ All 8 modules processed successfully!");
}

processModules();
