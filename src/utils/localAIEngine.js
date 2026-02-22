const STOP_WORDS = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'what', 'when', 'how',
    'can', 'should', 'would', 'could', 'from', 'have', 'has', 'been', 'will', 'them',
    'our', 'they', 'which', 'also', 'were', 'but', 'not', 'you', 'your', 'all', 'any',
    'use', 'used', 'into', 'more', 'may', 'must', 'than', 'then', 'their', 'there',
    'one', 'two', 'three', 'four', 'five', 'six', 'first', 'last', 'each', 'about',
    'some', 'such', 'other', 'these', 'those', 'its', 'out', 'over', 'under', 'her',
    'his', 'him', 'she', 'they', 'get', 'set', 'put', 'see', 'say', 'let', 'make',
    'take', 'give', 'come', 'just', 'like', 'well', 'know', 'need', 'want',
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
 * Perform a keyword search against the local EPUB chunks
 */
function searchChunks(question, chunksAll, topN = 5) {
    const qWords = extractKeywords(question);
    const qPhrase = question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (qWords.size === 0) return [];

    const scored = chunksAll.map(c => ({
        ...c,
        score: scoreChunk(c.t, qWords, qPhrase)
    })).filter(c => c.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN);
}

/**
 * Helper to detect if the query is a Multiple Choice Question (MCQ)
 * Matches patterns like "A)", "a.", "1.", "Option A"
 */
function parseMCQ(question) {
    const lines = question.split('\n').map(l => l.trim()).filter(Boolean);
    const options = [];
    let stem = "";

    // Regex for: A) A. (A) 1) 1. Option A:
    const optRegex = /^([A-Ea-e1-5][\.\)]|\([A-Ea-e1-5]\)|Option\s+[A-Ea-e])\s+(.*)/i;

    for (const line of lines) {
        const match = line.match(optRegex);
        if (match) {
            options.push({ label: match[1], text: match[2].trim() });
        } else {
            stem += line + " ";
        }
    }

    if (options.length >= 2) {
        return { isMCQ: true, stem: stem.trim(), options };
    }

    // Sometimes people just paste them inline: "What is X? a) foo b) bar c) baz"
    const inlineSplit = question.split(/(?=\b[A-Da-d]\)|\b[A-Da-d]\.)/);
    if (inlineSplit.length >= 3) {
        return {
            isMCQ: true,
            stem: inlineSplit[0].trim(),
            options: inlineSplit.slice(1).map(opt => {
                const letter = opt.substring(0, 2);
                const text = opt.substring(2).trim();
                return { label: letter, text: text };
            })
        };
    }

    return { isMCQ: false };
}

/**
 * Score a specific MCQ option against a chunk
 */
function scoreOption(optionText, chunkText) {
    const optWords = new Set(optionText.toLowerCase().match(/\b\w{3,}\b/g) || []);
    const cWords = new Set(chunkText.toLowerCase().match(/\b\w{3,}\b/g) || []);
    let score = 0;

    // Check word overlap
    for (const w of optWords) { if (!STOP_WORDS.has(w) && cWords.has(w)) score += 3; }

    // Check exact phrase exact inclusion
    if (optionText.length > 5 && chunkText.toLowerCase().includes(optionText.toLowerCase())) {
        score += 20;
    }

    return score;
}

/**
 * Generate a professional structured answer from retrieved chunks entirely in-browser
 */
export async function generateLocalAnswer(question) {
    // 1. Fetch the static knowledge JSON
    let knowledgeChunks = [];
    try {
        const res = await fetch('/ai_knowledge.json');
        if (res.ok) {
            knowledgeChunks = await res.json();
        } else {
            throw new Error(`Failed to load knowledge block (${res.status})`);
        }
    } catch (e) {
        throw new Error('Connection error. Could not load AI Knowledge Base over network.');
    }

    const { isMCQ, stem, options } = parseMCQ(question);

    // ── MCQ SOLVING LOGIC ──
    if (isMCQ) {
        // Search chunks based on the question stem
        const relevantChunks = searchChunks(stem || question, knowledgeChunks, 15);

        let bestOption = null;
        let highestScore = -1;
        let bestJustification = "";
        let bestSource = "";

        // Evaluate each option against the top context chunks
        for (const opt of options) {
            let optScore = 0;
            let optJustification = "";
            let chunkSource = "";

            for (const chunk of relevantChunks) {
                const matchScore = scoreOption(opt.text, chunk.t);
                if (matchScore > optScore) {
                    optScore = matchScore;
                    optJustification = chunk.t;
                    chunkSource = `Module ${chunk.m}`;
                }
            }

            if (optScore > highestScore) {
                highestScore = optScore;
                bestOption = opt;
                bestJustification = optJustification;
                bestSource = chunkSource;
            }
        }

        if (bestOption && highestScore > 0) {
            // Find the precise sentence in the chunk that justifies it
            const sentences = bestJustification.split(/(?<=[.!?])\s+/);
            const justificationSentences = sentences.filter(s =>
                scoreOption(bestOption.text, s) > 0 || scoreOption(stem, s) > 0
            ).slice(0, 2).join(' ');

            let response = `🎯 **Recommended Answer: ${bestOption.label} ${bestOption.text}**\n\n`;
            response += `**Why? (Based on CSCP Text)**\n`;
            response += `> *"${justificationSentences || bestJustification.substring(0, 250) + '...'}"*\n\n`;

            return {
                answer: response.trim(),
                sources: [bestSource]
            };
        } else {
            // Fallback if we can't definitively score it
            let response = `🤔 **I analyzed this MCQ, but couldn't find a definitive match in the CSCP materials.**\n\n`;
            response += `**Relevant Context Found:**\n`;
            if (relevantChunks.length > 0) {
                response += `> *"${relevantChunks[0].t.substring(0, 300)}..."*\n`;
            }
            return { answer: response.trim(), sources: relevantChunks.slice(0, 2).map(c => `Module ${c.m}`) };
        }
    }


    // ── STANDARD QUESTION LOGIC ──

    const relevantChunks = searchChunks(question, knowledgeChunks, 8);

    // Fallback if nothing found
    if (relevantChunks.length === 0) {
        return {
            answer: "**Guidance Needed**\n\nI couldn't find specific CSCP context for your query. Could you add more supply chain keywords? Otherwise, focus on basic principles of mitigating risk and collaborating with partners.",
            sources: []
        };
    }

    const intent = detectQueryIntent(question);
    const qWords = extractKeywords(question);

    // Extract the most relevant sentences
    const extractSentences = (text, maxSentences = 3) => {
        const sents = text
            .replace(/(\w)\.\s+([A-Z])/g, '$1.\n$2')
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 40 && s.length < 400);

        const scoredSents = sents.map(s => ({
            text: s,
            score: [...qWords].filter(w => s.toLowerCase().includes(w)).length
        })).sort((a, b) => b.score - a.score);

        return scoredSents.slice(0, maxSentences).map(s => s.text);
    };

    const insights = [];
    for (const c of relevantChunks.slice(0, 5)) {
        const sents = extractSentences(c.t, 2);
        insights.push(...sents);
    }
    const uniqueInsights = [...new Map(insights.map(s => [s.substring(0, 30), s])).values()].slice(0, 4);

    let response = '';

    const INTENT_HEADERS = {
        supplier_crisis: '🚨 **Supplier Crisis Response Strategy**',
        inventory_excess: '📦 **Excess Inventory Management**',
        shortage: '📉 **Supply Shortage Mitigation**',
        demand_surge: '📈 **Demand Surge Action Plan**',
        forecast: '🎯 **Forecast Accuracy Strategy**',
        supplier: '🤝 **Supplier Management & Alignment**',
        logistics: '🚛 **Logistics & Distribution Strategy**',
        quality: '🛑 **Quality Management & Control**',
        cost: '💰 **Total Cost & Optimization**',
        lean: '⚡ **Lean Operations Strategy**',
        risk: '🛡️ **Supply Chain Risk Management**',
        planning: '📅 **S&OP and Planning Workflow**',
        definition: '📖 **CSCP Professional Definition**',
        general: '⚙️ **Supply Chain Expert Guidance**',
    };

    const INTENT_STEPS = {
        supplier_crisis: [
            '**1. Immediate Containment:** Assess the buffer inventory currently on-hand and in-transit. Determine the exact "run-out" date for production.',
            '**2. Urgent Sourcing:** Immediately issue spot-buy POs to secondary or alternative suppliers, even at a premium.',
            '**3. Demand Shaping:** Work with Sales/Marketing to steer customers toward alternative products that do not rely on the constrained components.',
        ],
        inventory_excess: [
            '**1. Categorize & Identify Root Cause:** Segment the excess into Obsolete, Slow-Moving, and Overstock. Was the cause a bad forecast, a canceled order, or a delayed shipment?',
            '**2. Liquidation Strategy:** Evaluate return-to-vendor (RTV) policies, secondary market sales, or bundling with high-velocity items.',
            '**3. Process Change:** Adjust reorder points and safety stock levels. Implement stricter S&OP reviews to detect mismatches earlier.',
        ],
        shortage: [
            '**1. Strategic Allocation:** Prioritize available inventory for A-tier customers or highest margin products to protect core revenue.',
            '**2. Expediting:** Authorize premium freight (air vs ocean) if the cost of the stockout exceeds the transportation premium.',
            '**3. Communication:** Transparently notify affected downstream partners and customers with revised ETAs.',
        ],
        demand_surge: [
            '**1. Validate the Signal:** Determine if the surge is real end-user demand or artificial "phantom" ordering caused by the bullwhip effect.',
            '**2. Capacity Triage:** Maximize current throughput via overtime. Explore third-party contract manufacturers if the surge is sustained.',
            '**3. Allocation Strategy:** Place customers on "fair-share" allocation based on historical volume rather than fulfilling giant new orders completely.',
        ],
        planning: [
            '**1. Demand Review:** Consolidate statistical forecasts with promotional and sales intelligence.',
            '**2. Supply Review:** Identify capacity constraints, material shortages, and labor gaps over the planning horizon.',
            '**3. S&OP Alignment:** Executive leadership must sign off on a single, synchronized operating plan that balances supply capability with demand generation.',
        ]
    };

    const header = INTENT_HEADERS[intent] || INTENT_HEADERS.general;
    const steps = INTENT_STEPS[intent] || null;

    response += `${header}\n\n`;

    if (steps) {
        response += steps.join('\n\n') + '\n\n';
    }

    // Add relevant CSCP knowledge directly mapped from EPUB text
    if (uniqueInsights.length > 0) {
        response += `📚 **From CSCP Knowledge Base:**\n\n`;
        uniqueInsights.forEach(insight => {
            response += `• ${insight}\n`;
        });
    }

    const sources = [...new Set(relevantChunks.map(c => `Module ${c.m}`))];

    return { answer: response.trim(), sources };
}
