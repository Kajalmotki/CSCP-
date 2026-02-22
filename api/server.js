/**
 * server.js — Pure Node.js Situational AI API
 * NO npm packages needed — uses only Node.js built-in modules.
 * Start with: node server.js
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// pdf-parse is installed as a devDependency — used for ASCM Dictionary
let pdfParse;
try { pdfParse = require('../node_modules/pdf-parse/index.js'); } catch (e) {
    try { pdfParse = require('pdf-parse'); } catch (e2) { pdfParse = null; }
}

const PORT = 8000;
const OPENROUTER_API_KEY = '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';

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

const SYSTEM_PROMPT = `You are Aria, a world-class supply chain expert advisor with deep expertise in ASCM CSCP frameworks, logistics, procurement, inventory management, demand planning, and global operations strategy.

You are speaking with a supply chain professional who is facing a real-world operational challenge. Your role is to provide:
- Immediate, practical, actionable guidance
- Best practices grounded in ASCM CSCP standards and frameworks
- Clear step-by-step recommendations
- Industry-standard professional advice

Your tone is calm, authoritative, empathetic, and professional — like a senior consultant at a Fortune 500 company. Always structure your response clearly with bold headers when appropriate. Focus on what can be DONE RIGHT NOW and what to plan for the near and long term.

Base your advice on the CSCP module content provided in the context. If the context is not fully relevant, still provide professional supply chain guidance based on your expert knowledge.`;

// ─────────────────────────────────────────
// EPUB Parser (pure Node.js — no packages)
// EPUBs are ZIP files. We parse them manually.
// ─────────────────────────────────────────

const PDF_PATH = 'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules\\ASCM Dictionary- Updated - 19th Edition - English.pdf';

let knowledgeChunks = []; // { module: int, text: string }
let dictionaryCache = null; // Cached parsed dictionary entries

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
    const sig = 0x04034b50; // Local file header signature
    const texts = [];
    let pos = 0;

    while (pos < buffer.length - 4) {
        // Find next local file header
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

        if (filename.match(/\.(html|xhtml|htm)$/i) && compressedSize > 0) {
            try {
                const compressedData = buffer.slice(dataStart, dataEnd);
                let rawData;
                if (compression === 0) {
                    rawData = compressedData; // Stored
                } else if (compression === 8) {
                    rawData = zlib.inflateRawSync(compressedData); // Deflate
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
                // Skip corrupt entries
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

function loadAllModules() {
    knowledgeChunks = [];
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
                    knowledgeChunks.push({ module: moduleNum, text: c });
                    count++;
                }
            }
            console.log(`[Module ${moduleNum}] Loaded ${count} chunks`);
        } catch (e) {
            console.log(`[Module ${moduleNum}] Error: ${e.message}`);
        }
    }
    console.log(`Total chunks: ${knowledgeChunks.length}`);
}

// ─────────────────────────────────────────
// PDF Dictionary Parser
// ─────────────────────────────────────────

function parseDictionaryText(rawText) {
    // Verified: ASCM Dictionary PDF uses en-dash U+2013 as term–definition separator.
    // 5,283 such entries exist in the full PDF. Each entry is on ONE line:
    // e.g. "100 percent inspection–The act of inspecting or testing every item..."
    // Definitions that are too long may wrap to a continuation line (no dash).

    const text = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

    // Remove page headers but preserve the en-dash characters
    const lines = text.split('\n').map(l => l.trimEnd()); // keep leading spaces for detection

    const entries = [];
    let currentTerm = null;
    let currentDef = [];

    // Only match the ACTUAL en-dash character (U+2013)
    // Term part: up to 80 chars, max 8 words
    const dashPat = /^(.{1,80})\u2013(.+)$/;

    // Patterns to skip
    const skipLine = (l) => {
        const t = l.trim();
        if (!t) return true;
        if (/^\d+$/.test(t)) return true; // page number
        if (/^\d+ASCM Supply Chain Dictionary/i.test(t)) return true; // page header
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

            const isValidTerm =
                termPart.length >= 1 &&
                termPart.length <= 80 &&
                termWords.length <= 8 &&
                !termPart.endsWith(',') &&
                defPart.length >= 3;

            if (isValidTerm) {
                // Save previous entry
                if (currentTerm) {
                    const def = currentDef.join(' ').replace(/\s{2,}/g, ' ').trim();
                    if (def.length >= 5) entries.push({ term: currentTerm, definition: def });
                }
                currentTerm = termPart;
                currentDef = [defPart];
                continue;
            }
        }

        // Continuation of current definition
        if (currentTerm && line.length > 0) {
            currentDef.push(line);
        }
    }

    // Save last
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

    console.log(`[Dictionary] Extracted ${result.length} entries`);
    return result;
}

async function loadDictionary() {
    if (dictionaryCache) return dictionaryCache;
    if (!pdfParse) {
        console.log('[Dictionary] pdf-parse not available');
        return [];
    }
    if (!fs.existsSync(PDF_PATH)) {
        console.log('[Dictionary] PDF not found at:', PDF_PATH);
        return [];
    }
    console.log('[Dictionary] Parsing PDF...');
    try {
        const buffer = fs.readFileSync(PDF_PATH);
        const data = await pdfParse(buffer, { max: 0 }); // max:0 = all pages
        const entries = parseDictionaryText(data.text);
        dictionaryCache = entries;
        return entries;
    } catch (e) {
        console.error('[Dictionary] Parse error:', e.message);
        return [];
    }
}

function searchChunks(query, topN = 5) {
    if (knowledgeChunks.length === 0) return [];
    const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'what', 'when', 'how', 'can', 'should', 'would', 'could', 'from', 'have', 'has', 'been', 'will', 'them', 'our', 'they', 'which', 'also', 'were', 'but', 'not', 'you', 'your']);
    const qWords = new Set(
        query.toLowerCase().match(/\b\w{3,}\b/g)?.filter(w => !stopWords.has(w)) || []
    );
    if (qWords.size === 0) return knowledgeChunks.slice(0, topN).map(c => c.text);

    const scored = knowledgeChunks.map(chunk => {
        const cWords = new Set(chunk.text.toLowerCase().match(/\b\w{3,}\b/g) || []);
        let score = 0;
        for (const w of qWords) { if (cWords.has(w)) score++; }
        return { score, chunk };
    }).filter(x => x.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN).map(x => `[Module ${x.chunk.module}] ${x.chunk.text}`);
}

// ─────────────────────────────────────────
// OpenRouter API Call
// ─────────────────────────────────────────

function callOpenRouter(messages) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages,
            max_tokens: 1024,
            temperature: 0.7
        });

        const options = {
            hostname: 'openrouter.ai',
            path: '/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'HTTP-Referer': 'http://localhost:5050',
                'X-Title': 'CSCP Situational AI'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) return reject(new Error(parsed.error.message || 'OpenRouter error'));
                    resolve(parsed.choices[0].message.content);
                } catch (e) {
                    reject(new Error('Failed to parse AI response'));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ─────────────────────────────────────────
// HTTP Server
// ─────────────────────────────────────────

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

const server = http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        return res.end();
    }

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, CORS_HEADERS);
        return res.end(JSON.stringify({ status: 'ok', chunks: knowledgeChunks.length, dictionary: dictionaryCache ? dictionaryCache.length : 0 }));
    }

    // ── ASCM Dictionary endpoint ──
    if (req.method === 'GET' && req.url === '/api/dictionary') {
        try {
            const entries = await loadDictionary();
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ entries, total: entries.length }));
        } catch (e) {
            res.writeHead(500, CORS_HEADERS);
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // ── Dictionary search endpoint ──
    if (req.method === 'GET' && req.url.startsWith('/api/dictionary/search')) {
        const url = new URL(req.url, 'http://localhost');
        const q = (url.searchParams.get('q') || '').toLowerCase();
        try {
            const entries = await loadDictionary();
            const results = q
                ? entries.filter(e =>
                    e.term.toLowerCase().includes(q) ||
                    e.definition.toLowerCase().includes(q)
                )
                : entries;
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ entries: results, total: results.length }));
        } catch (e) {
            res.writeHead(500, CORS_HEADERS);
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // Situational AI endpoint
    if (req.method === 'POST' && req.url === '/api/situational-ai') {
        let body = '';
        req.on('data', d => { body += d; });
        req.on('end', async () => {
            try {
                const { question, history = [] } = JSON.parse(body);
                if (!question?.trim()) {
                    res.writeHead(400, CORS_HEADERS);
                    return res.end(JSON.stringify({ error: 'Question is required' }));
                }

                const chunks = searchChunks(question, 5);
                const context = chunks.length > 0 ? chunks.join('\n\n---\n\n') : 'CSCP supply chain knowledge base.';

                const messages = [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...history.slice(-8),
                    {
                        role: 'user',
                        content: `## CSCP Module Context:\n${context}\n\n---\n\n## Situation:\n${question}\n\nProvide expert, actionable supply chain guidance.`
                    }
                ];

                const answer = await callOpenRouter(messages);
                const sources = [...new Set(chunks.map(c => c.match(/^\[Module (\d+)\]/)?.[1]).filter(Boolean).map(n => `Module ${n}`))];

                res.writeHead(200, CORS_HEADERS);
                res.end(JSON.stringify({ answer, sources }));
            } catch (e) {
                console.error('[API Error]', e.message);
                res.writeHead(500, CORS_HEADERS);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    res.writeHead(404, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Not found' }));
});

// Startup
console.log('Loading EPUB modules...');
loadAllModules();
// Pre-load dictionary in background so first user request is instant
loadDictionary().then(e => console.log(`[Dictionary] Ready with ${e.length} entries`)).catch(() => { });
server.listen(PORT, () => {
    console.log(`\n✅ CSCP API running at http://localhost:${PORT}`);
    console.log('   Endpoints: /api/situational-ai  /api/dictionary  /api/dictionary/search\n');
});
