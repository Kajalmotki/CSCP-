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
 * Generate a professional structured answer from retrieved chunks entirely in-browser
 */
export async function generateLocalAnswer(question) {
    // 1. Fetch the static knowledge JSON (generated from EPUBs)
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

    // 2. Search relevant chunks
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

    // Extract the most relevant sentences from top chunks
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

    // Collect best insights from top 5 chunks
    const insights = [];
    for (const c of relevantChunks.slice(0, 5)) {
        const sents = extractSentences(c.t, 2);
        insights.push(...sents);
    }
    const uniqueInsights = [...new Map(insights.map(s => [s.substring(0, 30), s])).values()].slice(0, 5);

    // ── Build response based on intent ──────────────────────────────────────
    let response = '';

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
            '1️⃣ **Review & Metrics:** KPIs — fill rate, on-time delivery, inventory turns, forecast accuracy',
            '2️⃣ **Demand Review:** Latest forecasts, customer intelligence, market changes',
            '3️⃣ **Supply Review:** Supplier capacity, constraints, risk items',
            '4️⃣ **Issue Resolution:** Open action items, escalations',
            '5️⃣ **S&OP Alignment:** Confirm production plan aligns to demand signal',
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
        response += `📚 **From CSCP Knowledge Base:**\n\n`;
        uniqueInsights.forEach(insight => {
            response += `• ${insight}\n`;
        });
        response += '\n';
    }

    // Add a closing best-practice note
    const closings = {
        supplier_crisis: '> **Key Principle (CSCP):** Supply resilience is built before a crisis, not during one. Use this event to build a supply risk registry and dual-source critical items.',
        inventory_excess: '> **Key Principle (CSCP):** Excess inventory is a symptom of a demand-supply mismatch. The fix is upstream in planning, not downstream in liquidation.',
        demand_surge: '> **Key Principle (CSCP):** Demand variability amplifies through the supply chain (bullwhip effect). Real-time visibility and collaborative planning are the antidote.',
        forecast: '> **Key Principle (CSCP):** No forecast is perfect. Design your supply chain to be agile enough to respond to forecast error, not just minimize it.',
        planning: '> **Key Principle (CSCP):** Effective S&OP creates one unified plan across sales, operations, finance, and supply chain — breaking down functional silos.',
        general: '> **Key Principle (CSCP):** Every supply chain decision involves trade-offs between cost, service level, and risk. Use a structured framework to evaluate options systematically.',
    };

    response += closings[intent] || closings.general;

    const sources = [...new Set(relevantChunks.map(c => `Module ${c.m}`))];

    return { answer: response.trim(), sources };
}
