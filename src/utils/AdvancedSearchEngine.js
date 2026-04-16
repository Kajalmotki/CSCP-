// AdvancedSearchEngine.js
// State-of-the-art purely local semantic & BM25 search engine for CSCP contexts

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'what', 'when', 'how',
    'can', 'should', 'would', 'could', 'from', 'have', 'has', 'been', 'will', 'them',
    'our', 'they', 'which', 'also', 'were', 'but', 'not', 'you', 'your', 'all', 'any',
    'use', 'used', 'into', 'more', 'may', 'must', 'than', 'then', 'their', 'there',
    'one', 'two', 'three', 'four', 'five', 'six', 'first', 'last', 'each', 'about',
    'some', 'such', 'other', 'these', 'those', 'its', 'out', 'over', 'under', 'her',
    'his', 'him', 'she', 'get', 'set', 'put', 'see', 'say', 'let', 'make',
    'take', 'give', 'come', 'just', 'like', 'well', 'know', 'need', 'want',
    'is', 'it', 'in', 'of', 'to', 'a', 'an', 'be', 'by', 'do', 'on', 'as', 'at',
    'up', 'if', 'so', 'or', 'my', 'we', 'us', 'me', 'no'
]);

// Very basic English Porter stemmer simplified rules
function stemWord(word) {
    if (word.length < 4) return word;
    let w = word;
    if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.endsWith('es')) w = w.slice(0, -2);
    else if (w.endsWith('s')) w = w.slice(0, -1);
    
    if (w.endsWith('ing')) w = w.slice(0, -3);
    else if (w.endsWith('ed')) w = w.slice(0, -2);
    else if (w.endsWith('er')) w = w.slice(0, -2);
    else if (w.endsWith('ion')) w = w.slice(0, -3);
    
    return w;
}

// CSCP specific conceptual synonym expansion
// CSCP & Modern Real-World Heuristic Synonym Expansion
const SYNONYM_MAP = {
    '3pl': ['third', 'party', 'logistics', 'vendor', 'outsource', 'carrier', 'partner'],
    'supplier': ['vendor', 'source', 'procurement', 'purchasing', 'tier', 'subcontractor', 'ariba'],
    'inventory': ['stock', 'sku', 'replenishment', 'safety', 'buffer', 'just-in-case', 'storage', 'ewm', 'wm'],
    'forecast': ['demand', 'predict', 'plan', 'future', 'volatility', 'analytics', 'ibp', 'apo'],
    'lean': ['waste', 'efficiency', 'jit', 'bottleneck', 'muda', 'six sigma', 'toyota', 'pp'],
    'risk': ['disruption', 'resilience', 'mitigation', 'bcp', 'disaster', 'visibility', 'stress-test', 'vulnerability', 'grm'],
    's&op': ['sales', 'operations', 'planning', 'consensus', 'executive', 'integration', 'alignment', 'ibp', 'sd'],
    'erp': ['system', 'software', 'enterprise', 'resource', 'digital', 'twin', 'cloud', 'data', 'sap', 's/4hana'],
    'resilience': ['agility', 'flexibility', 'diversification', 'redundancy', 'friend-shoring', 'nearshoring', 'localization'],
    'bullwhip': ['whiplash', 'amplification', 'over-order', 'distortion', 'phantom'],
    'sustainability': ['esg', 'green', 'emissions', 'ethical', 'circular', 'compliance', 'shift-left'],
    'sap': ['erp', 's/4hana', 'mm', 'sd', 'pp', 'ewm', 'ibp', 'ariba', 'tm']
};

// Global index cache to avoid recalculating stats per search
let bm25_index = null;

function tokenize(text) {
    const rawWords = text.toLowerCase().match(/\b[a-z0-9]{3,}\b/g) || [];
    return rawWords.filter(w => !STOP_WORDS.has(w));
}

function expandQuery(queryTokens) {
    const expanded = new Set(queryTokens);
    for (const token of queryTokens) {
        if (SYNONYM_MAP[token]) {
            SYNONYM_MAP[token].forEach(syn => expanded.add(syn));
        }
    }
    return Array.from(expanded);
}

function buildIndex(chunks) {
    console.log("[AdvancedSearch] Building BM25 Index...");
    const index = {
        docCount: chunks.length,
        avgDocLength: 0,
        docFrequencies: {}, // term -> number of docs containing term
        docs: [] // { m, t, tokens: [], length }
    };

    let totalLength = 0;

    for (const chunk of chunks) {
        const tokens = tokenize(chunk.t);
        const uniqueTokens = new Set(tokens);
        
        // Stem unique tokens to count DF
        const stemmedSet = new Set([...uniqueTokens].map(stemWord));

        for (const term of stemmedSet) {
            index.docFrequencies[term] = (index.docFrequencies[term] || 0) + 1;
        }

        index.docs.push({
            module: chunk.m,
            text: chunk.t,
            tokens: tokens,
            length: tokens.length
        });
        totalLength += tokens.length;
    }

    index.avgDocLength = index.docCount > 0 ? totalLength / index.docCount : 1;
    console.log(`[AdvancedSearch] Built index over ${index.docCount} docs. Avg Length: ${index.avgDocLength.toFixed(2)}`);
    return index;
}

function calculateBM25Score(doc, queryTokens, index) {
    const k1 = 1.2;
    const b = 0.75;
    let score = 0;
    const N = index.docCount;

    // Stem query
    const terms = queryTokens.map(stemWord);

    for (const term of terms) {
        // Document frequency
        const df = index.docFrequencies[term] || 0;
        if (df === 0) continue;

        // IDF
        const idf = Math.log(((N - df + 0.5) / (df + 0.5)) + 1);

        // Term frequency in this doc (need to check stems)
        let tf = 0;
        for (const docToken of doc.tokens) {
            if (stemWord(docToken) === term) tf++;
        }

        if (tf === 0) continue;

        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * (doc.length / index.avgDocLength));
        
        score += idf * (numerator / denominator);
    }

    return score;
}

function calculateProximityBonus(doc, queryTokens) {
    let bonus = 0;
    const originalTokens = queryTokens; // unstemmed

    if (originalTokens.length < 2) return 0;
    
    const docTokenStr = doc.tokens.join(' ');
    const queryStr = originalTokens.join(' ');
    
    // Direct exact sub-phrase match
    if (docTokenStr.includes(queryStr)) {
        bonus += 15;
    }

    // Bi-gram checks (are any two sequential query words adjacent in doc?)
    for(let i=0; i<originalTokens.length-1; i++) {
        const bigram = originalTokens[i] + ' ' + originalTokens[i+1];
        if (docTokenStr.includes(bigram)) bonus += 5;
    }

    return bonus;
}

export function advancedLogicalSearch(query, chunks, topN = 8) {
    if (!chunks || chunks.length === 0) return [];
    
    if (!bm25_index) {
        bm25_index = buildIndex(chunks);
    }

    const rawTokens = tokenize(query);
    const expandedTokens = expandQuery(rawTokens);

    if (expandedTokens.length === 0) return [];

    const scoredDocs = bm25_index.docs.map(doc => {
        const bm25 = calculateBM25Score(doc, expandedTokens, bm25_index);
        const prox = calculateProximityBonus(doc, rawTokens);
        return {
            m: doc.module,
            t: doc.text,
            score: bm25 + prox,
            bm25: bm25,
            prox: prox
        };
    }).filter(d => d.score > 0.5); // Minimal threshold

    scoredDocs.sort((a, b) => b.score - a.score);
    return scoredDocs.slice(0, topN);
}

/**
 * Advanced Answer Generator - Drop in replacement for generateLocalAnswer
 */
export async function generateAdvancedAnswer(question, history = [], base64Image = null) {
    let allChunks = [];
    try {
        // Load all 8 specialized module JSONs in parallel for maximum speed
        const moduleNumbers = [1, 2, 3, 4, 5, 6, 7, 8];
        const modulePromises = moduleNumbers.map(n => 
            fetch(`/knowledge/module${n}.json`)
                .then(res => res.ok ? res.json() : [])
                .catch(() => [])
        );
        
        const results = await Promise.all(modulePromises);
        allChunks = results.flat();

        if (allChunks.length === 0) {
            console.warn("No knowledge modules could be loaded. Defaulting to fallback...");
        }
    } catch (e) {
        console.warn('Critical error loading CSCP Knowledge Modules.', e);
    }

    // Run Advanced Logic Search
    const relevantChunks = advancedLogicalSearch(question, allChunks, 35);
    const modulesConsulted = [...new Set(relevantChunks.map(c => `Module ${c.m}`))];

    let contextText = relevantChunks.map((c, i) => `[Match Rank ${i+1} | Score: ${c.score.toFixed(1)} | Module ${c.m}]: ${c.t}`).join('\n\n');
    if (!contextText) contextText = "No direct excerpts retrieved from BM25 analysis.";

    let historyContent = "";
    if (history && history.length > 0) {
        historyContent = "Conversation History:\n" + history.map(m => `${m.role === 'user' ? 'User' : 'Aria'}: ${m.content}`).join('\n') + "\n\n";
    }

    const promptText = `
You are Aria, an incredibly advanced supply chain expert advisor with deep expertise in ASCM CSCP frameworks, logistics, procurement, inventory management, demand planning, and global operations strategy.
You have digested thousands of real-life supply chain case studies, blogs, and heuristics (e.g., friend-shoring, digital twins, shift-left compliance, just-in-case buffering, and agility-first resilience).

Your objective is to seamlessly synthesize the strict, retrieved CSCP textbook context provided below WITH your vast, real-world industry knowledge to solve brutally complex supply chain problems.
If the retrieved textbook context does not perfectly cover the user's situation, aggressively fall back to your real-world heuristic knowledge to solve the problem anyway. 

CRITICAL INSTRUCTION - QUANTITATIVE RISK & EMV:
Whenever a risk or disruption scenario is provided, you MUST calculate the Expected Monetary Value (EMV) using the formula: EMV = Probability * Impact. 
Clearly state the "Not Investing" vs "Investing" EMV breakdown and define the "Break-Even" investment point.
Recommend one of the four CSCP Risk Responses: Accept, Avoid, Transfer, or Mitigate based on the EMV results.

CRITICAL INSTRUCTION - SAP INTEGRATION:
Whenever you propose an operational, data, or planning solution, you MUST strictly specify exactly which SAP Module(s) the company should use to execute that task. For example:
- Procurement/Sourcing -> use SAP Ariba or SAP MM (Materials Management)
- Transportation -> use SAP TM (Transportation Management)
- Warehouse Operations -> use SAP EWM (Extended Warehouse Management)
- Sales & Order Fulfillment -> use SAP SD (Sales and Distribution)
- Demand Forecasting/S&OP -> use SAP IBP (Integrated Business Planning) or SAP APO
- Manufacturing/Production -> use SAP PP (Production Planning)
Make sure the user clearly knows the exact SAP software module needed for the solution.

CRITICAL INSTRUCTION - DYNAMIC DATA VISUALIZATION:
If the user asks a mathematical, financial, or volume-based problem (e.g., Break Even Point (BEP), Economic Order Quantity (EOQ), Inventory Levels, Reorder Point, Cost-Volume-Profit analysis), you MUST:
1. Present all input parameters and calculated results in a markdown table using | Column | Column | format.
2. Include a dynamically generated chart using the QuickChart.io API.
Output the graph exactly like this format on its own line:
![Break Even Chart](https://quickchart.io/chart?c={type:'line',data:{labels:['0','100','200','300'],datasets:[{label:'Fixed+Variable Costs',data:[1000,1500,2000,2500]},{label:'Revenue',data:[0,1000,2000,3000]}]}})
Do NOT use spaces inside the JSON structure of the URL. Keep the code compact. Use 'line' or 'bar' charts depending on what best represents the data.

CRITICAL INSTRUCTION - STRUCTURED OUTPUT FORMAT:
You MUST use markdown tables (| col | col | format) whenever presenting:
- Comparative data (e.g., suppliers, options, scenarios)
- Financial calculations (inputs, formulas, results)
- Risk assessments (probability, impact, EMV)
- Any data that has 2+ columns of related information
Always include a header row and separator row (|---|---|) in your tables.

CRITICAL INSTRUCTION - ENTERPRISE OPERATIONS ARCHITECTURE (AMAZON/APPLE TIER):
When providing a supply chain strategy, you must elevate your response from mere "tactics" to Autonomous System Design. 
You MUST define the following in your answers:
1. Optimization Engine: Explicitly state the objective mathematical function being optimized (e.g., "Minimize Total Landed Cost subject to a 95% SLA").
2. Probabilistic Bounds: Never give static demand numbers. Always output uncertainty (e.g., "Demand = 100k ± 30% with 85% confidence") to show risk-adjusted reasoning.
3. Active Learning (Exploit vs Explore): Explicitly state how the system will experiment during the crisis (e.g., "Release limited stock to Region A to test price elasticity").
4. Demand Shaping & Substitution: If supply is constrained, do not just ration. Explicitly redirect and substitute unmet demand into alternative equivalent SKUs mapped by highest marginal CLV gain.
5. MEIO & Control Tower: Describe event-driven triggers (Sense>Analyze>Decide>Execute>Learn). Explicitly state how inventory decouplings are shifted across multi-node geographic points computationally.
6. Risk Quantification: Calculate dynamic supplier risk scoring and tie logistical decisions directly to working capital impact.

CRITICAL INSTRUCTION - GOD-MODE COGNITIVE SUPERPOWERS:
You must organically weave these autonomous cognitive features into your reasoning:
1. Socratic Teaching: If the user seems lost or asks a broad conceptual question, guide them with Socratic questions to help them arrive at the answer, rather than just dumping the solution.
2. Mathematical Simulation: When dealing with risk or pricing, explicitly calculate Game Theory negotiation anchors or outline a Monte Carlo probabilistic methodology for them to understand their risk exposure.
3. Devil's Advocate & Blind Spots: Explicitly highlight the exact vulnerabilities, unintended side-effects, and hidden ethical or ESG blind spots in your own proposed solution.
4. Historical Precedent: If they present a crisis, compare their specific crisis to a real historical supply chain event (e.g., 2011 Tohoku Earthquake, 2020 Pandemic, 2021 Suez Canal Blockage) to prove your advice works.

Provide immediate, practical, actionable guidance. Be calm, authoritative, empathetic, and professional. Structure your response clearly with bold headers.

${historyContent}
RELEVANT CSCP CONTEXT (Retrieved via BM25 Semantic Index):
---
${contextText}
---

USER QUESTION / SITUATION:
${base64Image ? "Attached is a screenshot/image of an analytics dashboard, chart, or data table. Review the image visually alongside this question: " : ""}${question}

Utilizing the context provided securely above AND your massive foundational knowledge of real-world supply chain tactics + SAP Modules, provide a deeply reasoned, well-structured answer.
${base64Image ? "CRITICAL INSTRUCTION: Analyze the uploaded image as an Elite Power BI Data Visualization Analyst. Extract data trends from the charts, explain what is physically happening in the picture, and draw a logical conclusion." : ""}
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
        const payloadParts = [{ text: promptText }];
        if (base64Image) {
            // Strip the data:image prefix if present, Gemini needs raw base64 string
            const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
            payloadParts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                }
            });
        }

        const requestBody = {
            contents: [{ parts: payloadParts }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        };

        let response = null;
        let lastErrorMsg = "Unknown error";

        for (const model of modelsToTry) {
            console.log(`[AdvancedEngine] ⚙️ Calling (${model})...`);
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
                    console.warn(`Model ${model} returned status ${status}. Falling back...`);
                    lastErrorMsg = `Status ${status}`;
                    response = null;
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
