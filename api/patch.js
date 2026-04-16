const fs = require('fs');

// Patch SituationalAI.jsx
const uiFile = 'd:\\REVOS-CM-AI\\src\\components\\SituationalAI.jsx';
let uiContent = fs.readFileSync(uiFile, 'utf8');
uiContent = uiContent.replace(
    'async function callAria(question) {\n    try {\n        const result = await generateLocalAnswer(question);',
    'async function callAria(question, history) {\n    try {\n        const result = await generateLocalAnswer(question, history);'
);
fs.writeFileSync(uiFile, uiContent, 'utf8');
console.log("SituationalAI.jsx patched.");

// Patch localAIEngine.js
const file = 'd:\\REVOS-CM-AI\\src\\utils\\localAIEngine.js';
let content = fs.readFileSync(file, 'utf8');
const anchor = 'export async function generateLocalAnswer(question)';
const idx = content.indexOf(anchor);

if (idx !== -1) {
    const keep = content.substring(0, idx);
    const newFunc = `export async function generateLocalAnswer(question, history = []) {
    let allChunks = [];
    try {
        const res = await fetch('/ai_knowledge.json');
        if (res.ok) {
            allChunks = await res.json();
        } else {
            console.warn(\`Failed to load CSCP Knowledge Base (\${res.status})\`);
        }
    } catch (e) {
        console.warn('Could not load the CSCP AI Knowledge Base.', e);
    }

    const { isMCQ, stem, options } = parseMCQ(question);
    const searchQuery = isMCQ ? \`\${stem} \${(options||[]).map(o=>o.text).join(' ')}\` : question;
    const relevantChunks = searchChunks(searchQuery, allChunks, 30);
    const modulesConsulted = [...new Set(relevantChunks.map(c => \`Module \${c.m}\`))];

    let contextText = relevantChunks.map((c, i) => \`[Source \${i+1} | Module \${c.m}]: \${c.t}\`).join('\\n\\n');
    if (!contextText) contextText = "No direct excerpts retrieved.";

    let historyContent = "";
    if (history && history.length > 0) {
        historyContent = "Conversation History:\\n" + history.map(m => \`\${m.role === 'user' ? 'User' : 'Aria'}: \${m.content}\`).join('\\n') + "\\n\\n";
    }

    const promptText = \`
You are Aria, a world-class supply chain expert advisor with deep expertise in ASCM CSCP frameworks, logistics, procurement, inventory management, demand planning, and global operations strategy.
You are speaking with a supply chain professional facing a real-world challenge. Provide immediate, practical, actionable guidance grounded in ASCM CSCP standards. Be calm, authoritative, empathetic, and professional — like a senior consultant. Structure your response clearly with bold headers. Focus on what can be done RIGHT NOW and what to plan for the near and long term.

\${historyContent}
RELEVANT CSCP CONTEXT EXCERPTS:
---
\${contextText}
---

USER QUESTION:
\${question}

Answer the user directly and expertly, utilizing the context provided. Provide a deeply reasoned, well-structured answer.
\`;

    const API_KEY = "AIzaSyDEA2_bez1gz2zVa-3SXa36SDLc6JtLRvg";
    const modelsToTry = [
        "gemini-3-flash-preview"
    ];
    
    try {
        const requestBody = {
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        };

        let response = null;
        let lastErrorMsg = "Unknown error";

        for (const model of modelsToTry) {
            console.log(\`[localAIEngine] 🚀 Calling Gemini API (\${model})...\`);
            const url = \`https://generativelanguage.googleapis.com/v1beta/models/\${model}:generateContent?key=\${API_KEY}\`;
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
                    console.warn(\`Model \${model} returned status \${status}. Falling back to next model...\`);
                    lastErrorMsg = \`Status \${status}\`;
                    response = null; // Clear response to throw error if last one fails
                }
            } catch (err) {
                console.warn(\`Network error fetching \${model}: \${err.message}. Falling back...\`);
                lastErrorMsg = err.message;
                response = null;
            }
        }
        
        if (!response || !response.ok) {
            throw new Error(\`All models failed. Last error: \${lastErrorMsg}\`);
        }
        
        const data = await response.json();
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";
        
        return { answer, sources: modulesConsulted };
    } catch (err) {
        throw new Error(\`AI Engine Error: \${err.message}\`);
    }
}
`;
    fs.writeFileSync(file, keep + newFunc, 'utf8');
    console.log("localAIEngine.js patched successfully.");
} else {
    console.log("function not found.");
}
