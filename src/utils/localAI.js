import { CSCP_PERMANENT_KNOWLEDGE } from '../data/csc_permanent_data';

// Normalize text for comparison
const normalize = (text) => text?.toLowerCase().replace(/[^a-z0-9\s]/g, '') || '';

// Score a knowledge item against the user's query
const scoreItem = (item, query) => {
    const normQuery = normalize(query);
    const normTerm = normalize(item.term);
    const normDef = normalize(item.definition);
    const queryWords = normQuery.split(/\s+/).filter(w => w.length > 2);

    let score = 0;

    // Exact term match: highest priority
    if (normTerm === normQuery) score += 100;
    // Term contains query
    if (normTerm.includes(normQuery)) score += 50;
    // Query contains the term
    if (normQuery.includes(normTerm)) score += 40;

    // Word match in term
    queryWords.forEach(word => {
        if (normTerm.includes(word)) score += 15;
        if (normDef.includes(word)) score += 5;
    });

    return score;
};

// Find the best matching knowledge items
const findMatches = (query, topN = 3) => {
    const scored = CSCP_PERMANENT_KNOWLEDGE.map(item => ({
        item,
        score: scoreItem(item, query)
    }));
    return scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map(s => s.item);
};

// Detect if question is asking to list/quiz something
const isListQuestion = (query) => {
    const norm = normalize(query);
    return /list|show|all|what are|give me|examples|types of|tell me/.test(norm);
};

const isDefinitionQuestion = (query) => {
    const norm = normalize(query);
    return /what is|define|definition|explain|describe|meaning of|what does/.test(norm);
};

const isQuizQuestion = (query) => {
    const norm = normalize(query);
    return /quiz|test me|question|can you ask|practice|flashcard/.test(norm);
};

let lastQuizIndex = -1;

// Generate a smart, formatted response from the knowledge base
export const generateLocalResponse = (query, additionalContext = '') => {
    const norm = normalize(query);

    // Handle greetings
    if (/^(hi|hey|hello|howdy|good morning|good evening)[\s!.]*$/.test(norm)) {
        return "👋 Hello! I'm your CSCP Exam Prep AI. I have " + CSCP_PERMANENT_KNOWLEDGE.length + " flashcard terms loaded from Module 1. Ask me to **define a term**, **quiz me**, or **list available topics**!";
    }

    // Handle quiz request
    if (isQuizQuestion(query)) {
        lastQuizIndex = (lastQuizIndex + 1) % CSCP_PERMANENT_KNOWLEDGE.length;
        const item = CSCP_PERMANENT_KNOWLEDGE[lastQuizIndex];
        return `🎯 **Quiz Time!**\n\nWhat is the definition of:\n\n> **${item.term}**\n\n_(Type your answer, then ask me "show answer" to check.)_`;
    }

    // Handle "show answer" / check answer
    if (/show answer|reveal|what was|correct answer/.test(norm)) {
        if (lastQuizIndex >= 0) {
            const item = CSCP_PERMANENT_KNOWLEDGE[lastQuizIndex];
            return `✅ **Answer:**\n\n**${item.term}**: ${item.definition}`;
        }
        return "Start a quiz first by asking me to **quiz me** on a topic!";
    }

    // Handle list request
    if (isListQuestion(query) && /topic|term|concept|know|cover/.test(norm)) {
        const terms = CSCP_PERMANENT_KNOWLEDGE.map(k => `• **${k.term}**`).join('\n');
        return `📚 **Here are all ${CSCP_PERMANENT_KNOWLEDGE.length} topics I know:**\n\n${terms}\n\nAsk me to define any of these!`;
    }

    // Look for matches
    const matches = findMatches(query, 3);

    if (matches.length === 0) {
        return `❓ I couldn't find a match for **"${query}"** in my CSCP Module 1 knowledge base.\n\nTry asking about topics like:\n• **Demand Management**, **Keiretsu**, **PDCA**, **Forecasting**, **S&OP**, **Echelon**, **Order Winners**, **Four Ps**, and more.\n\nOr type **"list all topics"** to see everything I know.`;
    }

    if (matches.length === 1) {
        const m = matches[0];
        if (isDefinitionQuestion(query)) {
            return `📖 **${m.term}**\n\n${m.definition}`;
        }
        return `📖 **${m.term}**\n\n${m.definition}\n\n---\n_Source: CSCP Module 1 Flashcards_`;
    }

    // Multiple matches — show all
    const result = matches.map((m, i) =>
        `**${i + 1}. ${m.term}**\n${m.definition}`
    ).join('\n\n---\n\n');

    return `🔍 Found **${matches.length} related terms** for "${query}":\n\n${result}\n\n---\n_Source: CSCP Module 1 Flashcards_`;
};
