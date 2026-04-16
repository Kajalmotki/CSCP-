/**
 * HEIMDALL Phase 2 — EPUB Parsing Service
 * Pure Node.js implementation for extracting text from EPUB files
 */

const fs = require('fs');
const zlib = require('zlib');

function readUint32LE(buf, offset) {
    return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24);
}

function readUint16LE(buf, offset) {
    return buf[offset] | (buf[offset + 1] << 8);
}

/**
 * Minimal ZIP reader — extracts all .html/.xhtml files from an EPUB (ZIP) buffer.
 */
function extractHtmlFromEpub(buffer) {
    const sig = 0x04034b50;
    const texts = [];
    let pos = 0;

    while (pos < buffer.length - 4) {
        if (readUint32LE(buffer, pos) !== sig) {
            pos++;
            continue;
        }

        const compression = readUint16LE(buffer, pos + 8);
        const compressedSize = readUint32LE(buffer, pos + 18);
        const filenameLength = readUint16LE(buffer, pos + 26);
        const extraLength = readUint16LE(buffer, pos + 28);
        const filename = buffer.slice(pos + 30, pos + 30 + filenameLength).toString('utf8');
        const dataStart = pos + 30 + filenameLength + extraLength;
        const dataEnd = dataStart + compressedSize;

        if (filename.endsWith('.html') || filename.endsWith('.xhtml')) {
            const compressedData = buffer.slice(dataStart, dataEnd);
            try {
                let uncompressed;
                if (compression === 8) {
                    uncompressed = zlib.inflateRawSync(compressedData);
                } else {
                    uncompressed = compressedData;
                }
                const text = uncompressed.toString('utf8')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                texts.push(text);
            } catch (e) {
                console.error(`Error decompressing ${filename}:`, e.message);
            }
        }
        pos = dataEnd;
    }
    return texts.join(' ');
}

module.exports = {
    extractHtmlFromEpub
};
