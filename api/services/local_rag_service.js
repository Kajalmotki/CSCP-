/**
 * HEIMDALL Phase 2 — Local RAG Service
 * Handles text chunking, semantic search, and local answer generation
 */

const fs = require('fs');

/**
 * Split text into semantic chunks for retrieval
 */
function chunkText(text, size = 1200) {
    const chunks = [];
    let current = "";
    const sentences = text.split(/(?<=[.?!])\s+/);
    for (const s of sentences) {
        if (current.length + s.length > size) {
            chunks.push(current.trim());
            current = s;
        } else {
            current += (current ? " " : "") + s;
        }
    }
    if (current.trim().length > 80) chunks.push(current.trim());
    return chunks;
}

/**
 * Scoring function for BM25-lite keyword similarity
 */
function scoreChunk(chunk, words, phrase) {
    let score = 0;
    const lower = chunk.toLowerCase();
    
    // Exact phrase bonus
    if (lower.includes(phrase)) score += 50;
    
    // Keyword matches
    words.forEach(word => {
        if (lower.includes(word)) score += 10;
    });

    // Proximity bonus (if two keywords are close)
    const wordArray = [...words];
    for (let i = 0; i < wordArray.length - 1; i++) {
        const first = lower.indexOf(wordArray[i]);
        const second = lower.indexOf(wordArray[i+1]);
        if (first !== -1 && second !== -1 && Math.abs(first - second) < 50) {
            score += 15;
        }
    }
    
    return score;
}

/**
 * Extracts keywords for search
 */
function extractKeywords(query) {
    const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'what', 'when', 'how', 'can', 'should', 'would', 'could', 'from', 'have', 'has', 'been', 'will', 'them', 'our', 'they', 'which', 'also', 'were', 'but', 'not', 'you', 'your']);
    return new Set(
        query.toLowerCase().match(/\b\w{3,}\b/g)?.filter(w => !stopWords.has(w)) || []
    );
}

/**
 * Searches chunks using keyword scoring
 */
function searchChunks(knowledgeChunks, query, topN = 5) {
    if (!knowledgeChunks || knowledgeChunks.length === 0) return [];
    
    const qWords = extractKeywords(query);
    const qPhrase = query.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    if (qWords.size === 0) return knowledgeChunks.slice(0, topN).map(c => c.text);

    return knowledgeChunks
        .map(c => ({ 
            text: c.text, 
            score: scoreChunk(c.text, qWords, qPhrase),
            module: c.module
        }))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);
}

/**
 * Generates local reasoning based on retrieved chunks
 */
function generateLocalAnswer(question, chunks) {
    if (chunks.length === 0) return "I couldn't find specific details on this in the CSCP modules. However, from a general supply chain perspective...";

    // Simple sentence extraction logic
    const extractSentences = (text, qWords, max = 2) => {
        return text.split(/(?<=[.?!])\s+/)
            .map(s => ({ 
                text: s.trim(), 
                score: [...qWords].filter(w => s.toLowerCase().includes(w)).length 
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, max)
            .map(s => s.text);
    };

    const qWords = extractKeywords(question);
    let insights = [];
    chunks.slice(0, 3).forEach(c => {
        insights.push(...extractSentences(c.text, qWords));
    });

    const uniqueInsights = [...new Set(insights)].slice(0, 5);
    
    let answer = `Based on the CSCP Module context:\n\n`;
    uniqueInsights.forEach(insight => {
        answer += `• ${insight}\n`;
    });
    
    answer += `\n**Strategic Recommendation:** In this situation, the primary focus should be on stabilizing the immediate demand-supply gap while preparing a long-term risk mitigation strategy.`;
    
    return answer;
}

module.exports = {
    chunkText,
    searchChunks,
    generateLocalAnswer
};
