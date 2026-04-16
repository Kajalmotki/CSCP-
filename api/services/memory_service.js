/**
 * HEIMDALL Phase 2 — Infinite RAG Memory Service
 * Handles conversational persistence and semantic retrieval using Embeddings
 */

const axios = require('axios'); // Assuming axios is available, or use node-fetch logic
const fs = require('fs');
const path = require('path');

// Simple Local Vector Store (JSON-based for SaaS starting point)
const MEMORY_DB_PATH = path.join(__dirname, '../data/memory_store.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}

// Initial load
let vectorStore = [];
if (fs.existsSync(MEMORY_DB_PATH)) {
    try {
        vectorStore = JSON.parse(fs.readFileSync(MEMORY_DB_PATH, 'utf8'));
    } catch (e) {
        vectorStore = [];
    }
}

/**
 * Cosine Similarity calculation between two vectors
 */
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Fetches embeddings from Gemini API
 */
async function getGeminiEmbedding(text, apiKey) {
    try {
        // Using Node's native fetch (Node 18+) or we can polyfill if needed
        // For server.js we likely have access to a clean fetch or we can use http.request
        // But for this service, we'll assume a standard fetch-like interface exists in the environment
        const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "models/text-embedding-004",
                content: { parts: [{ text: text }] }
            })
        });
        const json = await response.json();
        return json.embedding.values;
    } catch (e) {
        console.error('Embedding Error:', e.message);
        return null;
    }
}

/**
 * Stores a new memory block (e.g. user question + answer)
 */
async function storeMemory(text, metadata, apiKey) {
    const vector = await getGeminiEmbedding(text, apiKey);
    if (!vector) return false;

    const memoryBlock = {
        id: Date.now(),
        text,
        vector,
        metadata,
        timestamp: new Date().toISOString()
    };

    vectorStore.push(memoryBlock);
    
    // Persist to disk
    fs.writeFileSync(MEMORY_DB_PATH, JSON.stringify(vectorStore, null, 2));
    return true;
}

/**
 * Retrieves top-K relevant memories for a query
 */
async function retrieveMemories(queryText, apiKey, k = 5) {
    const queryVector = await getGeminiEmbedding(queryText, apiKey);
    if (!queryVector || vectorStore.length === 0) return [];

    const results = vectorStore.map(item => ({
        ...item,
        similarity: cosineSimilarity(queryVector, item.vector)
    }));

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    // Return top K
    return results.slice(0, k).map(r => ({
        text: r.text,
        metadata: r.metadata,
        similarity: r.similarity
    }));
}

module.exports = {
    storeMemory,
    retrieveMemories
};
