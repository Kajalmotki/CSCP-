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
// Local AI Engine — 100% Offline
// Generates expert supply chain advice from
// the loaded CSCP EPUB knowledge chunks.
// No API key, no internet required.
// ─────────────────────────────────────────

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'what', 'when', 'how',
    'can', 'should', 'would', 'could', 'from', 'have', 'has', 'been', 'will', 'them',
    'our', 'they', 'which', 'also', 'were', 'but', 'not', 'you', 'your', 'all', 'any',
    'use', 'used', 'into', 'more', 'may', 'must', 'than', 'then', 'their', 'there',
    'one', 'two', 'three', 'four', 'five', 'six', 'first', 'last', 'each', 'about',
    'some', 'such', 'other', 'these', 'those', 'its', 'out', 'over', 'under', 'her',
    'his', 'him', 'she', 'they', 'get', 'set', 'put', 'see', 'say', 'let', 'make',
    'take', 'give', 'come', 'just', 'like', 'well', 'know', 'need', 'want', 'give',
    'new', 'old', 'big', 'small', 'high', 'low', 'long', 'short', 'good', 'best',
]);

/**
 * Score a chunk against a query using word overlap + phrase bonus
 */
function scoreChunk(chunkText, qWords, qPhrase) {
    const lower = chunkText.toLowerCase();
    const cWords = new Set(lower.match(/\b\w{3,}\b/g) || []);
    let score = 0;
    for (const w of qWords) { if (cWords.has(w)) score += 2; }
    // Bonus for direct phrase match
    if (lower.includes(qPhrase)) score += 10;
    // Bonus for length of relevant text
    score += Math.min(chunkText.length / 500, 1);
    return score;
}

/**
 * Extract keywords from user question
 */
function extractKeywords(question) {
    const words = question.toLowerCase().match(/\b\w{3,}\b/g) || [];
    return new Set(words.filter(w => !STOP_WORDS.has(w)));
}

/**
 * Detect the type of question to shape the response structure
 */
function detectQueryIntent(question) {
    const q = question.toLowerCase();
    if (/bankrupt|fail|collapse|out of business|shutdown/i.test(q)) return 'supplier_crisis';
    if (/excess inventory|overstock|too much stock|inventory reduction/i.test(q)) return 'inventory_excess';
    if (/shortage|stockout|out of stock|can't get/i.test(q)) return 'shortage';
    if (/demand (spike|surge|increase)|sudden (demand|spike)/i.test(q)) return 'demand_surge';
    if (/forecast|prediction|accuracy/i.test(q)) return 'forecast';
    if (/supplier|vendor|procurement|sourcing/i.test(q)) return 'supplier';
    if (/logistics|transport|shipping|port|freight|carrier/i.test(q)) return 'logistics';
    if (/quality|defect|recall|return/i.test(q)) return 'quality';
    if (/cost|budget|reduce|saving|expensive/i.test(q)) return 'cost';
    if (/lean|waste|efficiency|optimize/i.test(q)) return 'lean';
    if (/risk|resilience|disruption|contingency/i.test(q)) return 'risk';
    if (/agenda|meeting|plan|schedule/i.test(q)) return 'planning';
    if (/what is|define|meaning|explain/i.test(q)) return 'definition';
    return 'general';
}

/**
 * Generate a professional structured answer from retrieved chunks
 */
function generateLocalAnswer(question, chunks) {
    const intent = detectQueryIntent(question);
    const qWords = extractKeywords(question);
    const qPhrase = question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    // Score and sort chunks
    const scored = chunks
        .map(c => ({ text: c.replace(/^\[Module \d+\] /, ''), raw: c, score: scoreChunk(c, qWords, qPhrase) }))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score);

    // Extract the most relevant sentences from top chunks
    const extractSentences = (text, maxSentences = 3) => {
        const sents = text
            .replace(/(\w)\.\s+([A-Z])/g, '$1.\n$2')
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 40 && s.length < 400);
        // Score sentences
        const scoredSents = sents.map(s => ({
            text: s,
            score: [...qWords].filter(w => s.toLowerCase().includes(w)).length
        })).sort((a, b) => b.score - a.score);
        return scoredSents.slice(0, maxSentences).map(s => s.text);
    };

    // Collect best insights from top 5 chunks
    const insights = [];
    for (const c of scored.slice(0, 5)) {
        const sents = extractSentences(c.text, 2);
        insights.push(...sents);
    }
    const uniqueInsights = [...new Map(insights.map(s => [s.substring(0, 30), s])).values()].slice(0, 6);

    // ── Build response based on intent ──────────────────────────────────────
    let response = '';
    const q = question.trim().replace(/\?$/, '');

    const INTENT_HEADERS = {
        supplier_crisis: '**Immediate Actions for Supplier Crisis**',
        inventory_excess: '**Managing Excess Inventory**',
        shortage: '**Addressing Supply Shortage**',
        demand_surge: '**Responding to Demand Surge**',
        forecast: '**Improving Forecast Accuracy**',
        supplier: '**Supplier Management Strategy**',
        logistics: '**Logistics & Transportation Guidance**',
        quality: '**Quality Issue Response Plan**',
        cost: '**Cost Reduction Strategies**',
        lean: '**Lean & Efficiency Improvement**',
        risk: '**Supply Chain Risk Management**',
        planning: '**Supply Chain Planning Framework**',
        definition: '**CSCP Knowledge Base Answer**',
        general: '**Supply Chain Expert Guidance**',
    };

    const INTENT_STEPS = {
        supplier_crisis: [
            '🚨 **Immediate (0–48 hrs):** Activate your Business Continuity Plan and notify your procurement and operations teams. Identify all affected material flows.',
            '🔍 **Assess Exposure:** Calculate the inventory buffer you have and how many production days you can sustain without this supplier.',
            '📞 **Activate Backup Suppliers:** Contact qualified alternates immediately. Issue emergency purchase orders and expedite qualification if needed.',
            '📦 **Inventory Actions:** Prioritize available stock for highest-value customer orders. Consider consignment or spot-market sourcing.',
            '📋 **Medium Term:** Implement dual-sourcing policy. Increase safety stock for critical single-source components.',
        ],
        inventory_excess: [
            '📊 **Root Cause First:** Run an ABC-XYZ analysis to identify which SKUs are truly excess vs. slow-moving.',
            '💰 **Liquidation Options:** Consider markdowns, return-to-vendor agreements, secondary market channels, or donation for tax benefit.',
            '🔄 **Demand Stimulation:** Work with sales on promotions, bundle deals, or early-pay incentives to move excess stock.',
            '📉 **Prevent Recurrence:** Revise forecast models, tighten reorder points, and implement S&OP review for repeat offenders.',
        ],
        shortage: [
            '⚡ **Emergency Sourcing:** Contact all approved alternates immediately. Authorize spot buys within defined thresholds.',
            '🎯 **Allocate Strategically:** Prioritize available supply to highest-margin, highest-commitment orders first.',
            '📣 **Customer Communication:** Proactively notify affected customers with revised delivery dates and mitigation offers.',
            '🔄 **Recovery Plan:** Run expedited shipments where cost-justified. Consider partial shipments to maintain customer confidence.',
        ],
        demand_surge: [
            '📈 **Validate First:** Confirm whether the surge is real demand or a bullwhip effect from over-ordering downstream.',
            '🏭 **Capacity Response:** Review overtime, shift extensions, and contract manufacturing options.',
            '🚚 **Prioritized Fulfillment:** Rank orders by strategic value and commitment levels for fair allocation.',
            '📊 **Update Forecasts:** Feed actual demand into your ERP/planning system and revise the S&OP cycle immediately.',
        ],
        forecast: [
            '📐 **Check Bias First:** Calculate Mean Absolute Percentage Error (MAPE) and identify systematic over/under-forecasting.',
            '📅 **Incorporate More Signals:** Add leading indicators — POS data, customer order backlog, market intelligence.',
            '🤝 **Collaborative Forecasting:** Engage key customers in a CPFR (Collaborative Planning, Forecasting & Replenishment) process.',
            '🔁 **Review Cycle:** Move to a rolling 13-month forecast with weekly or bi-weekly S&OP touchpoints.',
        ],
        planning: [
            '📋 **Meeting Agenda — Supply Chain Planning Session**',
            '1️⃣ **Review & Metrics (10 min):** KPIs — fill rate, on-time delivery, inventory turns, forecast accuracy',
            '2️⃣ **Demand Review (15 min):** Latest forecasts, customer intelligence, market changes',
            '3️⃣ **Supply Review (15 min):** Supplier capacity, constraints, risk items',
            '4️⃣ **Issue Resolution (10 min):** Open action items, escalations',
            '5️⃣ **S&OP Alignment (10 min):** Confirm production plan aligns to demand signal',
        ],
        quality: [
            '🛑 **Stop & Contain:** Immediately quarantine affected inventory. Issue Hold notices across all distribution centers.',
            '🔎 **Root Cause Analysis:** Use 5-Why or Ishikawa diagram to trace the defect source.',
            '📣 **Customer Notification:** Follow your quality alert protocol. Be proactive and transparent.',
            '📝 **CAPA:** Document a Corrective and Preventive Action plan. Set measurable success criteria.',
        ],
        cost: [
            '📊 **Benchmark:** Start with total cost of ownership (TCO) analysis across all key supply chain nodes.',
            '🤝 **Supplier Negotiation:** Leverage volume consolidation, longer-term contracts, or early payment terms for better pricing.',
            '🚚 **Logistics Optimization:** Consolidate shipments, optimize routing, and evaluate carrier mix vs. rail/sea modes.',
            '📦 **Inventory Carrying Costs:** Reduce safety stock where demand is highly predictable. Implement VMI with key suppliers.',
        ],
    };

    const header = INTENT_HEADERS[intent] || INTENT_HEADERS.general;
    const steps = INTENT_STEPS[intent] || null;

    response += `${header}\n\n`;

    if (steps) {
        response += steps.join('\n') + '\n\n';
    }

    // Add relevant CSCP knowledge from EPUB chunks
    if (uniqueInsights.length > 0) {
        response += `**📚 From CSCP Knowledge Base:**\n\n`;
        uniqueInsights.slice(0, 3).forEach(insight => {
            response += `• ${insight}\n`;
        });
        response += '\n';
    }

    // Add a closing best-practice note
    const closings = {
        supplier_crisis: '**Key Principle (CSCP):** Supply resilience is built before a crisis, not during one. Use this event to build a supply risk registry and dual-source critical items.',
        inventory_excess: '**Key Principle (CSCP):** Excess inventory is a symptom of a demand-supply mismatch. The fix is upstream in planning, not downstream in liquidation.',
        demand_surge: '**Key Principle (CSCP):** Demand variability amplifies through the supply chain (bullwhip effect). Real-time visibility and collaborative planning are the antidote.',
        forecast: '**Key Principle (CSCP):** No forecast is perfect. Design your supply chain to be agile enough to respond to forecast error, not just minimize it.',
        planning: '**Key Principle (CSCP):** Effective S&OP creates one unified plan across sales, operations, finance, and supply chain — breaking down functional silos.',
        general: '**Key Principle (CSCP):** Every supply chain decision involves trade-offs between cost, service level, and risk. Use a structured framework to evaluate options systematically.',
    };

    response += closings[intent] || closings.general;

    return response;
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

    // Situational AI endpoint — uses local AI engine (no external API)
    if (req.method === 'POST' && req.url === '/api/situational-ai') {
        let body = '';
        req.on('data', d => { body += d; });
        req.on('end', async () => {
            try {
                const { question } = JSON.parse(body);
                if (!question?.trim()) {
                    res.writeHead(400, CORS_HEADERS);
                    return res.end(JSON.stringify({ error: 'Question is required' }));
                }

                const chunks = searchChunks(question, 8);
                const answer = generateLocalAnswer(question, chunks);
                const sources = [...new Set(
                    chunks
                        .map(c => c.match(/^\[Module (\d+)\]/)?.[1])
                        .filter(Boolean)
                        .map(n => `Module ${n}`)
                )];

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
