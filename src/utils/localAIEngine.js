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
    'is', 'it', 'in', 'of', 'to', 'a', 'an', 'be', 'by', 'do', 'on', 'as', 'at',
    'up', 'if', 'so', 'or', 'my', 'we', 'us', 'me', 'no',
]);

// ─────────────────────────────────────────────
// CORE UTILITY FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Extract meaningful keywords from a text string
 */
function extractKeywords(text) {
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    return new Set(words.filter(w => !STOP_WORDS.has(w)));
}

/**
 * Score a single chunk of knowledge against a set of query keywords and a phrase
 */
function scoreChunk(chunkText, qWords, qPhrase) {
    const lower = chunkText.toLowerCase();
    const cWords = new Set(lower.match(/\b\w{3,}\b/g) || []);
    let score = 0;

    for (const w of qWords) {
        if (cWords.has(w)) score += 2;
    }
    // Bonus for a phrase match in the chunk
    if (qPhrase && lower.includes(qPhrase)) score += 15;
    // Bonus for longer, denser content
    score += Math.min(chunkText.length / 500, 1.5);

    return score;
}

/**
 * Score how well a specific MCQ option text is supported by a chunk of text.
 * This uses word overlap + exact phrase bonus.
 */
function scoreOption(optionText, chunkText) {
    const optLower = optionText.toLowerCase();
    const chunkLower = chunkText.toLowerCase();
    const optWords = new Set(optLower.match(/\b\w{3,}\b/g) || []);
    const chunkWords = new Set(chunkLower.match(/\b\w{3,}\b/g) || []);

    let score = 0;
    for (const w of optWords) {
        if (!STOP_WORDS.has(w) && chunkWords.has(w)) score += 3;
    }
    // High bonus for exact phrase or sub-phrase match
    if (optLower.length > 5 && chunkLower.includes(optLower)) score += 25;

    // Check for key term fragments (e.g., "lead time" found in "lead time variability")
    const optPhraseWords = optLower.match(/\b\w{4,}\b/g) || [];
    for (const pw of optPhraseWords) {
        if (!STOP_WORDS.has(pw) && chunkLower.includes(pw)) score += 2;
    }

    return score;
}

/**
 * Retrieve the top N most relevant chunks for a query from the knowledge base.
 * Searches ALL modules — no module filtering.
 */
function searchChunks(query, allChunks, topN = 8) {
    if (!allChunks || allChunks.length === 0) return [];
    const qWords = extractKeywords(query);
    const qPhrase = query.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (qWords.size === 0) return [];

    const scored = allChunks.map(c => ({
        ...c,
        score: scoreChunk(c.t, qWords, qPhrase)
    })).filter(c => c.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN);
}

/**
 * Find the most relevant sentences in a chunk of text, ranked by keyword overlap
 */
function extractBestSentences(chunkText, qWords, maxSentences = 3) {
    const sents = chunkText
        .replace(/(\w)\.\s+([A-Z])/g, '$1.\n$2')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 40 && s.length < 500);

    const scored = sents.map(s => ({
        text: s,
        score: [...qWords].filter(w => s.toLowerCase().includes(w)).length
    })).sort((a, b) => b.score - a.score);

    return scored.slice(0, maxSentences).map(s => s.text);
}

// ─────────────────────────────────────────────
// MCQ DETECTION & PARSING
// ─────────────────────────────────────────────

/**
 * Detect and parse a Multiple Choice Question from user input.
 * Handles:
 *   1. Multiline labeled  — A) / A. / (A) / Option A:
 *   2. Inline labeled     — "What is X? a) foo b) bar c) baz"
 *   3. Unlabeled lists    — after cue phrases like "select one from",
 *                           "choose one", "which of the following"
 *                           options are split on known delimiters or
 *                           inferred by short capitalized phrases.
 */
function parseMCQ(question) {
    const lines = question.split('\n').map(l => l.trim()).filter(Boolean);
    const options = [];
    let stem = '';

    // ── Strategy 1: Multiline labeled options (A) B) C) D) etc.) ──
    const optRegex = /^([A-Ea-e][\.\)]|\([A-Ea-e]\)|Option\s+[A-Ea-e]|\d[\.\)])\s*(.*)/i;
    for (const line of lines) {
        const match = line.match(optRegex);
        if (match) {
            const rawLabel = match[1].replace(/[().\s]/g, '').toUpperCase();
            const letter = rawLabel.match(/[A-E]/) ? rawLabel.match(/[A-E]/)[0] : rawLabel;
            options.push({ label: letter, text: match[2].trim() });
        } else {
            stem += line + ' ';
        }
    }
    if (options.length >= 2) return { isMCQ: true, stem: stem.trim(), options };

    // ── Strategy 2: Inline labeled "a) foo b) bar" ──
    const inlineRegex = /\b([A-Da-d])\)\s*([^A-Da-d\)]{3,}?)(?=\s[A-Da-d]\)|\s*$)/g;
    const inlineMatches = [...question.matchAll(inlineRegex)];
    if (inlineMatches.length >= 2) {
        const firstMatch = inlineMatches[0];
        const stemPart = question.slice(0, firstMatch.index).trim();
        return {
            isMCQ: true,
            stem: stemPart || question,
            options: inlineMatches.map(m => ({ label: m[1].toUpperCase(), text: m[2].trim() }))
        };
    }

    // ── Strategy 3: Unlabeled option list after known cue phrases ──
    // Matches: "select one from", "select one of the following", "choose one",
    // "which of the following", "pick one", "select the correct"
    const cuePhraseRegex = /(?:select\s+(?:one\s+)?(?:from|of|the)?(?:\s+following)?:?|choose\s+(?:one|the\s+correct):?|which\s+of\s+the\s+following[^?]*\?|pick\s+one:?|select\s+the\s+correct[^:]*:?)\s*/i;
    const cueMatch = question.match(cuePhraseRegex);
    if (cueMatch) {
        const cueEnd = (cueMatch.index ?? 0) + cueMatch[0].length;
        const stemPart = question.slice(0, cueMatch.index).trim();
        const optionsPart = question.slice(cueEnd).trim()
            // Remove trailing words like "Submit", "Next", "OK"
            .replace(/\b(submit|next|ok|done|answer|btn)\b/gi, '')
            .trim();

        // Split unlabeled options:
        // Try pipe/slash/comma separators first
        let rawOpts = [];
        if (/[|/]/.test(optionsPart)) {
            rawOpts = optionsPart.split(/[|/]/).map(s => s.trim()).filter(s => s.length > 1);
        } else if (optionsPart.includes(',')) {
            rawOpts = optionsPart.split(',').map(s => s.trim()).filter(s => s.length > 1);
        } else {
            // Heuristic: split on capital letters that start new words (TitleCase boundary)
            // e.g. "Supplier pricing Supplier quality Customs delays Supplier lead time"
            // Split at a capital letter preceded by a lowercase letter or digit
            rawOpts = optionsPart
                .split(/(?<=[a-z0-9])(?=\s+[A-Z])/)
                .map(s => s.trim())
                .filter(s => s.length > 2);

            // If we still got only 1, try splitting into roughly equal chunks by sentence pattern
            if (rawOpts.length < 2) {
                rawOpts = optionsPart.split(/\s{2,}/).map(s => s.trim()).filter(s => s.length > 1);
            }
        }

        if (rawOpts.length >= 2) {
            const labels = ['A', 'B', 'C', 'D', 'E'];
            return {
                isMCQ: true,
                stem: stemPart || question.slice(0, cueMatch.index).trim() || question,
                options: rawOpts.slice(0, 5).map((t, i) => ({ label: labels[i], text: t }))
            };
        }
    }

    // ── Strategy 4: "Answers" / "Options" / "Choices" separator keyword ──
    // Handles formats like:
    //   Q: [question text]
    //   Answers
    //   Set safety stock using statistical forecasting.
    //   Adopt processes and shared systems.
    //   Audit quality processes.
    //   Promote supply chain visibility and data sharing.
    //
    // Also handles inline "Answers" embedded in one long string.
    const separatorRegex = /(?:^|\n)\s*(?:answers?|options?|choices?)\s*(?:\n|:|\s*$)/i;
    const sepMatch = question.match(separatorRegex);
    if (sepMatch) {
        const sepEnd = sepMatch.index + sepMatch[0].length;
        const stemPart = question.slice(0, sepMatch.index).trim();
        const afterSep = question.slice(sepEnd).trim();

        // Each non-empty line after the separator is one option
        const rawOpts = afterSep
            .split('\n')
            .map(l => l.trim())
            // Strip leading A) B) labels if present
            .map(l => l.replace(/^[A-Ea-e][\.\)]\s*/, ''))
            // Remove trailing "Submit", "Next" UI buttons
            .filter(l => l.length > 3 && !/^(submit|next|ok|done|back|btn)$/i.test(l));

        if (rawOpts.length >= 2) {
            const labels = ['A', 'B', 'C', 'D', 'E'];
            return {
                isMCQ: true,
                stem: stemPart || question,
                options: rawOpts.slice(0, 5).map((t, i) => ({ label: labels[i], text: t }))
            };
        }

        // Fallback: if options were all on one line after the separator word
        // e.g. "Answers: Option X Option Y Option Z" (TitleCase split)
        if (afterSep && !afterSep.includes('\n')) {
            const inlineOpts = afterSep
                .split(/(?<=[a-z\.])(?=\s+[A-Z])/)
                .map(s => s.trim())
                .filter(s => s.length > 2);
            if (inlineOpts.length >= 2) {
                const labels = ['A', 'B', 'C', 'D', 'E'];
                return {
                    isMCQ: true,
                    stem: stemPart || question,
                    options: inlineOpts.slice(0, 5).map((t, i) => ({ label: labels[i], text: t }))
                };
            }
        }
    }

    return { isMCQ: false };
}

// ─────────────────────────────────────────────
// STRUCTURED MCQ REASONING ENGINE
// ─────────────────────────────────────────────

/**
 * Step 1: Read the scenario and identify the ROOT PROBLEM TYPE.
 * Returns a structured object describing what went wrong.
 */
function extractScenarioProblem(stem) {
    const s = stem.toLowerCase();

    // Each entry: { type, label, keywords[], directFixes[] }
    // directFixes = terms that appear in the CORRECT answer for THIS problem type
    const PROBLEM_PATTERNS = [
        {
            type: 'demand_uncertainty',
            label: 'Demand Uncertainty / Forecast Error',
            riskClass: 'Demand Risk',
            keywords: ['forecast', 'inaccurate', 'demand', 'stockout', 'lack of inventory',
                'could not meet', 'underestimate', 'demand variability', 'actual demand',
                'demand exceeded', 'ran out', 'excess demand'],
            directFixes: ['safety stock', 'statistical forecast', 'buffer', 'buffer stock',
                'reorder point', 'demand sensing', 'safety level'],
            indirectFixes: ['data sharing', 'visibility', 'shared systems', 'audit', 'quality'],
        },
        {
            type: 'tariff_political_risk',
            label: 'Tariff / Political / Trade Risk',
            riskClass: 'Political Risk',
            keywords: ['tariff', 'political instability', 'political', 'import duty', 'trade war',
                'sanction', 'trade restriction', 'government policy', 'duty', 'customs duty',
                'higher tariff', 'threatened tariff', 'political risk', 'trade disruption'],
            directFixes: [
                // Preventive: build inventory BEFORE the tariff hits
                'increase inventory', 'inventory holdings', 'stockpile', 'buffer stock',
                'increase its inventory', 'build up inventory', 'build stock',
                // Alternative sourcing away from affected regions
                'source supplier', 'source in other', 'alternative source', 'other countries',
                'countries that', 'unaffected', 'diversify source',
            ],
            indirectFixes: [
                // Reactive / corrective actions — wrong for a PREVENTIVE question
                'increase the price', 'offset any losses', 'after the tariff',
                'public statement', 'highlight the impact', 'raise price',
            ],
        },
        {
            type: 'supply_disruption',
            label: 'Supply Disruption / Supplier Risk',
            riskClass: 'Supply Risk',
            keywords: ['supplier', 'bankrupt', 'single source', 'disruption', 'lead time',
                'supplier failure', 'procurement', 'raw material shortage',
                'supply chain disruption', 'supplier went out'],
            directFixes: ['multiple suppliers', 'dual source', 'alternative supplier',
                'safety stock', 'near-shore', 'backup supplier', 'supplier diversif'],
            indirectFixes: ['forecast', 'quality audit', 'data sharing'],
        },
        {
            type: 'quality_issue',
            label: 'Quality / Defect Problem',
            riskClass: 'Process Risk',
            keywords: ['defect', 'quality', 'recall', 'return', 'warranty', 'inspection',
                'non-conforming', 'rework', 'scrap', 'reject', 'faulty', 'complaint'],
            directFixes: ['quality audit', 'inspection', 'corrective action', 'root cause',
                'iso', 'quality control', 'six sigma', 'incoming inspection'],
            indirectFixes: ['safety stock', 'data sharing', 'shared systems'],
        },
        {
            type: 'coordination_issue',
            label: 'Poor Coordination / Collaboration',
            riskClass: 'Process Risk',
            keywords: ['coordination', 'collaboration', 'misalignment', 'silo', 'department',
                'communication', 'handoff', 'disconnect', 'not aligned', 'cross-functional'],
            directFixes: ['shared systems', 'integrated process', 's&op', 'collaboration',
                'cross-functional', 'process integration', 'joint planning'],
            indirectFixes: ['safety stock', 'quality audit', 'forecast'],
        },
        {
            type: 'visibility_gap',
            label: 'Lack of Visibility / Information',
            riskClass: 'Information Risk',
            keywords: ['visibility', 'data sharing', 'transparency', 'information', 'real-time',
                'blind', 'no data', 'lack of visibility', 'lack of information',
                'tracking', 'traceability', 'monitor'],
            directFixes: ['supply chain visibility', 'data sharing', 'iot', 'tracking',
                'erp', 'shared system', 'real-time data', 'transparency'],
            indirectFixes: ['safety stock', 'quality audit'],
        },
        {
            type: 'cost_overrun',
            label: 'Cost / Financial Performance',
            riskClass: 'Financial Risk',
            keywords: ['cost', 'expensive', 'budget', 'overhead', 'margin', 'tco',
                'total cost', 'savings', 'reduce cost', 'profitability'],
            directFixes: ['total cost', 'tco', 'cost reduction', 'value engineering',
                'lean', 'waste elimination', 'process efficiency'],
            indirectFixes: ['safety stock', 'quality audit', 'visibility'],
        },
        {
            type: 'logistics_delay',
            label: 'Logistics / Transport Delay',
            riskClass: 'Logistics Risk',
            keywords: ['delay', 'transit', 'shipping', 'freight', 'port', 'customs',
                'logistics', 'carrier', 'delivery', 'transport', 'on-time'],
            directFixes: ['carrier', 'freight', 'logistics partner', 'premium freight',
                'expedite', 'routing', 'distribution', 'lead time buffer'],
            indirectFixes: ['quality audit', 'forecast', 'safety stock'],
        },
    ];

    let bestProblem = null;
    let bestScore = 0;

    for (const p of PROBLEM_PATTERNS) {
        let score = 0;
        for (const kw of p.keywords) {
            if (s.includes(kw)) score += (kw.length > 8 ? 3 : 2); // longer = more specific
        }
        if (score > bestScore) {
            bestScore = score;
            bestProblem = p;
        }
    }

    return bestProblem || {
        type: 'general',
        label: 'General Supply Chain Problem',
        riskClass: 'General Risk',
        directFixes: [],
        indirectFixes: [],
    };
}

/**
 * Score an MCQ option using the conceptual problem-solution map.
 * Direct fixes score highest, indirect fixes score negatively.
 * Also applies Preventive vs Reactive penalty when the stem asks for preventive action.
 */
function scoreOptionConceptually(optText, problem, stem = '') {
    const lower = optText.toLowerCase();
    const stemLower = stem.toLowerCase();
    let score = 0;

    // ── Preventive action detection ──
    // If the question asks for PREVENTIVE action, options that explicitly say
    // "after the event" are REACTIVE and should be penalized heavily.
    const questionAskPreventive = /prevent|proactive|before.*occur|mitigate.*future|in advance|ahead of/i.test(stemLower);
    if (questionAskPreventive) {
        // Big penalty: option explicitly describes action AFTER the event
        if (/after the tariff|after it goes|after the event|once the.*(takes? effect|happens|occurs)/i.test(lower)) {
            score -= 60;
        }
        // Big penalty: PR/communication options (never a preventive supply chain fix)
        if (/public statement|press release|announcement|highlight the impact/i.test(lower)) {
            score -= 50;
        }
        // Bonus: options that say "immediately" or "now" or "increase inventory" = proactive
        if (/immediately|now|in advance|build up|increase.*inventor|stockpile|buffer/i.test(lower)) {
            score += 35;
        }
    }

    // ── Direct fix scoring ──
    for (const fix of problem.directFixes) {
        if (lower.includes(fix)) {
            score += 40; // strong direct fix bonus
        }
        // Partial word match
        const fixWords = fix.split(/\s+/);
        for (const fw of fixWords) {
            if (fw.length > 4 && lower.includes(fw)) score += 8;
        }
    }

    // ── Indirect / distractor penalty ──
    for (const distractor of problem.indirectFixes) {
        if (lower.includes(distractor)) {
            score -= 20; // stronger penalty for known reactive distractors
        }
    }

    return score;
}

/**
 * Generate a human-readable "why" explanation for each option's status.
 */
function explainOption(optText, problem, isCorrect) {
    const lower = optText.toLowerCase();

    if (isCorrect) {
        const matchedFix = problem.directFixes.find(f => lower.includes(f));
        if (matchedFix) {
            return `✅ This **directly addresses** the identified problem (${problem.label}). "${matchedFix}" is the standard CSCP mitigation for ${problem.riskClass}.`;
        }
        return `✅ This option provides the most direct mitigation for the identified problem type (${problem.riskClass}).`;
    }

    // Reactive option in a preventive question — the most common trap
    if (/after the tariff|after it goes|after the event|once the.*(takes? effect|happens|occurs)/i.test(lower)) {
        return `❌ This describes a **reactive (corrective) action** taken *after* the event has already occurred. The question specifically asks for a **preventive** action taken *before* the impact materializes.`;
    }
    // PR/communication options
    if (/public statement|press release|announcement|highlight the impact/i.test(lower)) {
        return `❌ A public statement is a **communication response**, not a supply chain mitigation. It does not protect the manufacturer from the cost or supply impact of the tariff.`;
    }
    // Explain other wrong options
    if (/quality|audit|inspect|defect/i.test(lower)) {
        return `❌ Focuses on **product quality and defects** — not relevant when the root problem is ${problem.label}.`;
    }
    if (/visib|data shar|transparent|real.?time/i.test(lower)) {
        return `❌ Improves **information flow between partners** — useful for collaboration, but does not shield the operation from the identified risk.`;
    }
    if (/shared system|process|adopt|integrat/i.test(lower)) {
        return `❌ Targets **process coordination** — helps alignment but does not directly protect against ${problem.label}.`;
    }
    if (/forecast|predict/i.test(lower) && problem.type !== 'demand_uncertainty') {
        return `❌ Improves **demand prediction** — but does not mitigate the specific risk in this scenario.`;
    }
    return `❌ This option addresses a different dimension of supply chain management, not the specific root cause in this scenario (${problem.label}).`;
}

// ─────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────

function detectQueryIntent(question) {
    const q = question.toLowerCase();
    if (/bankrupt|fail|collapse|out of business|shutdown|supplier.*gone|no longer supply/i.test(q)) return 'supplier_crisis';
    if (/excess inventory|overstock|too much (stock|inventory)|inventory.*reduc|dead stock/i.test(q)) return 'inventory_excess';
    if (/shortage|stockout|out of stock|can.?t get|supply.*gap|material.*short/i.test(q)) return 'shortage';
    if (/demand (spike|surge|increase|jump|soar)|sudden (demand|spike|increase)/i.test(q)) return 'demand_surge';
    if (/forecast|prediction|accuracy|demand plan|predict/i.test(q)) return 'forecast';
    if (/supplier|vendor|procurement|sourcing|contract|rfq|rfp/i.test(q)) return 'supplier';
    if (/logistics|transport|shipping|port|freight|carrier|3pl|last.?mile|customs/i.test(q)) return 'logistics';
    if (/quality|defect|recall|return|warranty|inspection|ncr/i.test(q)) return 'quality';
    if (/cost|budget|reduce|saving|expensive|overhead|tco|total cost/i.test(q)) return 'cost';
    if (/lean|waste|muda|kaizen|5s|efficiency|optimize|throughput/i.test(q)) return 'lean';
    if (/risk|resilience|disruption|contingency|mitigation|bcp|bcm|blackswan/i.test(q)) return 'risk';
    if (/s&op|sop|meeting|agenda|plan|schedule|operations planning/i.test(q)) return 'planning';
    if (/what is|define|meaning of|explain|describe|difference between|compare/i.test(q)) return 'definition';
    if (/sustainability|green|esg|carbon|emission|environment/i.test(q)) return 'sustainability';
    if (/technology|digital|erp|ai|blockchain|iot|automation|track/i.test(q)) return 'technology';
    if (/warehouse|distribution|dc|fulfilment|pick|pack|slotting/i.test(q)) return 'warehouse';
    return 'general';
}

// ─────────────────────────────────────────────
// STRUCTURED RESPONSE TEMPLATES
// ─────────────────────────────────────────────

const INTENT_HEADERS = {
    supplier_crisis: '🚨 **Supplier Crisis — Emergency Response Playbook**',
    inventory_excess: '📦 **Excess Inventory — Liquidation & Recovery Strategy**',
    shortage: '📉 **Supply Shortage — Containment & Mitigation Plan**',
    demand_surge: '📈 **Demand Surge — Rapid Capacity & Allocation Response**',
    forecast: '🎯 **Forecast Accuracy — Diagnosis & Improvement Plan**',
    supplier: '🤝 **Supplier Management — Relationship & Performance**',
    logistics: '🚛 **Logistics & Distribution — Optimization Framework**',
    quality: '🛑 **Quality Control — Root Cause & Corrective Action**',
    cost: '💰 **Total Cost Management — Value Engineering**',
    lean: '⚡ **Lean Operations — Waste Elimination & Flow**',
    risk: '🛡️ **Supply Chain Risk — Resilience & Continuity**',
    planning: '📅 **S&OP — Integrated Business Planning**',
    definition: '📖 **CSCP Expert Definition**',
    sustainability: '🌱 **Sustainability & Responsible Sourcing**',
    technology: '💻 **Supply Chain Technology & Digital Tools**',
    warehouse: '🏭 **Warehouse & Distribution Operations**',
    general: '⚙️ **Supply Chain Expert Analysis**',
};

const INTENT_PLAYBOOKS = {
    supplier_crisis: [
        '**Step 1 — Immediate Triage (Hours 0–24):**\nContact your internal procurement and planning teams NOW. Pull all open POs, outstanding invoices, and any goods in-transit from the affected supplier. Calculate your exact "run-out date" for every affected SKU. This is your clock — everything else is planned around it.',
        '**Step 2 — Activate Alternative Sourcing (Day 1–3):**\nIssue emergency RFQs to pre-qualified alternative suppliers (even if they are typically higher cost). Simultaneously, check spot market availability. A premium freight or premium price hit now is far less costly than a production stoppage or a missed customer shipment.',
        '**Step 3 — Demand Shaping & Customer Communication (Day 2–5):**\nWork with Sales to identify which customers hold the highest margin or strategic value. Allocate constrained supply to them first. Proactively communicate to other customers — do NOT wait until you miss a shipment. A call in advance always preserves relationships better than silence followed by a surprise.',
        '**Step 4 — Internal Process & Cross-Functional War Room:**\nEstablish a daily crisis stand-up with Procurement, Planning, Operations, and Sales. Use a shared tracker for all open actions, owners, and deadlines. This is a situation where information velocity is critical.',
        '**Step 5 — Long-Term Resilience (Week 2+):**\nConduct a full supplier risk review. Update your supplier segmentation. Consider dual-sourcing or near-shoring for any single-source critical components going forward. Implement a supplier financial health monitoring process.',
    ],
    inventory_excess: [
        '**Step 1 — Segment & Classify (Immediately):**\nSeparate your excess inventory into three buckets: (A) Obsolete — no foreseeable demand, (B) Slow-moving — demand exists but is very low, (C) Overstock — good demand, just over-projected. Each bucket needs a different treatment. Don\'t treat all excess the same way.',
        '**Step 2 — Root Cause Analysis:**\nDid this come from a forecast error? A cancelled customer order? A promotional miss? An NPD phase-in/phase-out mismanagement? Understanding the root cause is the only way to prevent recurrence. Without this step, you\'re just mopping the floor with the tap still running.',
        '**Step 3 — Monetization & Liquidation Options:**\nFor Obsolete stock: explore Return-to-Vendor (RTV) within contract terms, secondary market sales, donation (tax deductions), or responsible disposal. For Slow-movers: promotional pricing, product bundling, or cross-selling with high-velocity items. For Overstock: simply slow or stop replenishment and let demand naturally draw it down.',
        '**Step 4 — Financial Provisioning:**\nWork with Finance immediately to take appropriate write-down provisions. Holding overvalued inventory on the books creates misleading financial health signals. Getting ahead of provisioning is far better than surprises at year-end.',
        '**Step 5 — Fix the Process (Root Cure):**\nReview reorder points, safety stock levels, and demand signal quality. Implement tighter S&OP checkpoints. Consider improving demand sensing via POS data feeds or customer collaboration (VMI, CPFR).',
    ],
    shortage: [
        '**Step 1 — Strategic Demand Triage:**\nRank all unfulfilled demand by: customer tier (A/B/C), revenue margin, strategic contract penalties, and relationship value. Create a formal allocation plan — don\'t let just the loudest customer win. Gut-feel allocation is where supply chain managers lose trust fast.',
        '**Step 2 — Expedite with Eyes Open:**\nAuthorize premium freight (air instead of ocean) if and only if the cost of the premium is less than the cost of the stockout (including penalties, chargebacks, and revenue loss). Run the numbers first. Emergency sourcing from spot markets may also be necessary even at a price premium.',
        '**Step 3 — Transparent, Proactive Communication:**\nNotify all impacted customers with realistic ETAs before they call you. Provide weekly updates. Offer alternatives where possible. Transparency is supply chain credibility.',
        '**Step 4 — Real-Time Inventory Visibility:**\nAudit all DC and warehouse locations. It is not uncommon to find misallocated or forgotten inventory that can bridge the gap before new supply arrives.',
        '**Step 5 — Safety Stock Review:**\nPost-crisis, recalculate safety stock levels for all affected items using updated lead time data and demand variability. The shortage probably exposed a structural gap in your inventory policy.',
    ],
    demand_surge: [
        '**Step 1 — Validate the Signal (Critical First Move):**\nBefore you do anything, determine: is this real end-user consumption or is it phantom demand amplified by the bullwhip effect? If your customers all doubled their orders simultaneously, there is a good chance they are all panic-ordering. React to real demand, not to fear-based ordering.',
        '**Step 2 — Capacity Triage:**\nMaximize throughput in your current footprint first — authorize overtime, reduce changeover downtime, and deprioritize lower-margin SKUs. Only then explore third-party contract manufacturing if the surge appears sustained (3+ months).',
        '**Step 3 — Fair-Share Allocation:**\nDon\'t fulfill giant orders from new customers first and leave loyal customers short. Implement a fair-share allocation policy based on historical shipping patterns. This protects your most important relationships and discourages speculative ordering.',
        '**Step 4 — Demand Shaping to Manage the Surge:**\nOffer longer lead time options with pricing incentives. Nudge customers toward less-constrained product variants. Use delayed delivery programs to smooth out the demand spike.',
        '**Step 5 — Communicate Up and Down the Chain:**\nShare your demand signal with Tier 1 and Tier 2 suppliers NOW so they can begin capacity buildup. The bullwhip effect gets worse the longer you wait to share information.',
    ],
    risk: [
        '**Step 1 — Categorize & Score Risks:**\nUse a Risk x Impact matrix. Common supply chain risk categories: supplier, logistics/transport, geopolitical, natural disaster, demand volatility, cyber/IT, and regulatory. Score each on likelihood (1–5) and impact (1–5). Prioritize anything scoring above 15.',
        '**Step 2 — Identify Mitigation Strategies:**\nFor high-likelihood/high-impact risks: build redundancy (dual-source, buffer stock). For low-likelihood/high-impact: build contingency plans and detection tripwires. For high-likelihood/low-impact: build process efficiencies to reduce cost of occurrence.',
        '**Step 3 — Supply Chain Mapping:**\nYou cannot manage what you cannot see. Map your supply chain to at least Tier 2 suppliers for all A-class components. Many companies discovered COVID-19 disruptions originated at Tier 3 or Tier 4 suppliers they didn\'t even know they had.',
        '**Step 4 — Business Continuity Plan (BCP):**\nDocument clear response plans: Who calls whom? What authority levels exist? What pre-negotiated agreements with logistics providers are in place? Test the plan at least annually.',
        '**Step 5 — Resilience over Efficiency (The Strategic Lesson):**\nThe relentless drive to eliminate all slack and inventory to maximize efficiency is exactly what made supply chains brittle. Smart supply chains maintain strategic buffers and invest in agility — the ability to reshape quickly when conditions change.',
    ],
    forecast: [
        '**Step 1 — Baseline Error Measurement:**\nCalculate your current MAPE (Mean Absolute Percentage Error) and bias by product family and by planning horizon. Baseline is everything. You cannot improve what you have not measured. A MAPE below 10–15% is world-class; above 30% signals a broken process.',
        '**Step 2 — Identify Root Causes of Error:**\nPoor forecast accuracy usually comes from: (a) wrong statistical model for the demand pattern, (b) unmodelled seasonality or promotions, (c) organizational bias (sales inflates, operations deflates), or (d) poor data quality.',
        '**Step 3 — Model Selection:**\nSimple exponential smoothing for volatile, low-volume items. Holt-Winters for trend + seasonality. Regression for causal/associative drivers. Don\'t over-engineer: sometimes a 12-week moving average outperforms a complex algorithm if the data is noisy.',
        '**Step 4 — Collaborative Forecasting (S&OP Integration):**\nStatistical forecasts are the starting point, not the final word. Layer in market intelligence from Sales, marketing promotion plans, and customer commitments. The consensus number from a structured S&OP process is almost always more accurate than any single input.',
        '**Step 5 — Track, Learn, Improve (Closed-Loop):**\nAfter every forecast period, run a post-mortem. What caused the miss? Update your assumptions. Replace static models with dynamic ones. Forecast accuracy improvement is a journey, not a one-time project.',
    ],
    planning: [
        '**Step 1 — Demand Review:**\nConsolidate all statistical forecasts with promotional plans, sales intelligence, and new-product introduction schedules. Challenge outliers. Align on a single, consensus demand number by product family.',
        '**Step 2 — Supply Review:**\nAssess capacity, material availability, supplier lead times, and labor constraints against the consensus demand plan over the planning horizon. Surface all gaps and surpluses.',
        '**Step 3 — Pre-S&OP / Reconciliation Meeting:**\nFinance, Supply, and Demand teams meet to identify scenarios, risks, and options for closing gaps. Financial impact of each scenario is quantified.',
        '**Step 4 — Executive S&OP Meeting:**\nSenior leadership reviews reconciled scenarios and approves one integrated operating plan. Decisions made here override departmental preferences. The whole point is a SINGLE agreed plan that the whole business executes against.',
        '**Step 5 — Performance Management:**\nTrack plan vs. actual for demand, supply, inventory, and financial metrics. Feed learnings back into the next cycle. S&OP is a 30-day closed loop, not a once-a-year event.',
    ],
};

// ─────────────────────────────────────────────
// MCQ DEEP ANALYSIS ENGINE
// ─────────────────────────────────────────────

/**
 * Run a thorough MCQ analysis combining:
 *   1. Conceptual reasoning — extract the root problem, apply the
 *      problem→solution map using direct fix scoring.
 *   2. CSCP keyword scoring — search all 8 modules, score each
 *      option against retrieved passages.
 * Both scores are combined with conceptual reasoning weighted higher.
 */
function solveMCQ(stem, options, allChunks) {
    // ── Layer 1: Conceptual reasoning ──
    const problem = extractScenarioProblem(stem);

    const combinedQuery = `${stem} ${options.map(o => o.text).join(' ')}`;
    const qPhrase = stem.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    // ── Layer 2: CSCP keyword search across all modules ──
    const broadChunks = searchChunks(combinedQuery, allChunks, 40);
    const stemChunks = searchChunks(stem, allChunks, 20);

    const seenKeys = new Set();
    const relevantChunks = [];
    for (const c of [...broadChunks, ...stemChunks]) {
        const key = c.t.substring(0, 50);
        if (!seenKeys.has(key)) { seenKeys.add(key); relevantChunks.push(c); }
    }

    const stemKw = extractKeywords(stem);

    // ── Score each option using both layers ──
    const optionScores = options.map(opt => {
        // Layer 1: conceptual (pass stem so preventive/reactive detection works)
        const conceptScore = scoreOptionConceptually(opt.text, problem, stem);

        // Layer 2: keyword overlap with CSCP chunks
        let kwScore = 0;
        let bestChunk = null;
        let bestChunkScore = 0;
        let bestChunkModule = null;

        for (const chunk of relevantChunks) {
            const stemBoost = scoreChunk(chunk.t, stemKw, qPhrase) * 0.3;
            const s = scoreOption(opt.text, chunk.t) + stemBoost;
            if (s > bestChunkScore) {
                bestChunkScore = s;
                bestChunk = chunk.t;
                bestChunkModule = chunk.m;
            }
            kwScore += s;
        }

        // Combined score: conceptual weighted 60%, keyword 40%
        const totalScore = conceptScore * 0.6 + kwScore * 0.4;

        return { option: opt, totalScore, conceptScore, kwScore, bestChunk, bestChunkScore, bestChunkModule };
    });

    optionScores.sort((a, b) => b.totalScore - a.totalScore);
    return { optionScores, relevantChunks, problem };
}

// ─────────────────────────────────────────────
// MAIN EXPORT — generateLocalAnswer
// ─────────────────────────────────────────────

/**
 * Generate a deeply reasoned, well-structured answer from the CSCP knowledge base.
 * Handles both MCQ solving (cross-referencing all 8 modules) and open-ended questions
 * with long, street-smart, advisor-level responses.
 */
export async function generateLocalAnswer(question, history = []) {
    let allChunks = [];
    try {
        const res = await fetch('/ai_knowledge.json');
        if (res.ok) {
            allChunks = await res.json();
        } else {
            console.warn(`Failed to load CSCP Knowledge Base (${res.status})`);
        }
    } catch (e) {
        console.warn('Could not load the CSCP AI Knowledge Base.', e);
    }

    const { isMCQ, stem, options } = parseMCQ(question);
    const searchQuery = isMCQ ? `${stem} ${(options||[]).map(o=>o.text).join(' ')}` : question;
    const relevantChunks = searchChunks(searchQuery, allChunks, 30);
    const modulesConsulted = [...new Set(relevantChunks.map(c => `Module ${c.m}`))];

    let contextText = relevantChunks.map((c, i) => `[Source ${i+1} | Module ${c.m}]: ${c.t}`).join('\n\n');
    if (!contextText) contextText = "No direct excerpts retrieved.";

    let historyContent = "";
    if (history && history.length > 0) {
        historyContent = "Conversation History:\n" + history.map(m => `${m.role === 'user' ? 'User' : 'Aria'}: ${m.content}`).join('\n') + "\n\n";
    }

    const promptText = `
You are Aria, a world-class supply chain expert advisor with deep expertise in ASCM CSCP frameworks, logistics, procurement, inventory management, demand planning, and global operations strategy.
You are speaking with a supply chain professional facing a real-world challenge. Provide immediate, practical, actionable guidance grounded in ASCM CSCP standards. Be calm, authoritative, empathetic, and professional — like a senior consultant. Structure your response clearly with bold headers. Focus on what can be done RIGHT NOW and what to plan for the near and long term.

${historyContent}
RELEVANT CSCP CONTEXT EXCERPTS:
---
${contextText}
---

USER QUESTION:
${question}

Answer the user directly and expertly, utilizing the context provided. Provide a deeply reasoned, well-structured answer.
`;

    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    const modelsToTry = [
        "gemini-3.1-flash-lite-preview",
        "gemini-3.0-flash", // Assuming this is Gemini 3 Flash Preview
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-3.1-pro-preview"
    ];
    
    try {
        const requestBody = {
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        };

        let response = null;
        let lastErrorMsg = "Unknown error";

        for (const model of modelsToTry) {
            console.log(`[localAIEngine] 🚀 Calling Gemini API (${model})...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                
                if (response.ok) {
                    break;
                } else {
                    const status = response.status;
                    console.warn(`Model ${model} returned status ${status}. Falling back to next model...`);
                    lastErrorMsg = `Status ${status}`;
                    response = null; // Clear response to throw error if last one fails
                }
            } catch (err) {
                console.warn(`Network error fetching ${model}: ${err.message}. Falling back...`);
                lastErrorMsg = err.message;
                response = null;
            }
        }
        
        if (!response || !response.ok) {
            throw new Error(`All models failed. Last error: ${lastErrorMsg}`);
        }
        
        const data = await response.json();
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";
        
        return { answer, sources: modulesConsulted };
    } catch (err) {
        throw new Error(`AI Engine Error: ${err.message}`);
    }
}
