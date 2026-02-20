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

// Detect intent
const isListQuestion = (query) => {
    const norm = normalize(query);
    return /list|show|all|what are|give me|examples|types of|topics/.test(norm);
};

const isDefinitionQuestion = (query) => {
    const norm = normalize(query);
    return /what is|define|definition|explain|describe|meaning of/.test(norm);
};

// Quiz intent detection
const isOpenEndedQuiz = (query) => {
    const norm = normalize(query);
    return /ask me any|guess the word|guess the term|paragraph/.test(norm) && !norm.includes('multiple choice');
};

const isMultipleChoiceQuiz = (query) => {
    const norm = normalize(query);
    return /start.*quiz|quiz|multiple choice|options|test me/.test(norm);
};

export const generateQuizQuestion = (type) => {
    const randomIndex = Math.floor(Math.random() * CSCP_PERMANENT_KNOWLEDGE.length);
    const correctItem = CSCP_PERMANENT_KNOWLEDGE[randomIndex];

    let responseText = '';

    if (type === 'guess') {
        responseText = `🎲 **Guess the Term!**\n\nRead the following definition and tell me the correct CSCP term:\n\n> _"${correctItem.definition}"_\n\n_(Type your guess below, or type "stop" to exit the quiz.)_`;

        return {
            text: responseText,
            state: {
                active: true,
                type: 'guess',
                correctTerm: correctItem.term
            }
        };
    }

    if (type === 'mcq') {
        // Get 3 random wrong options
        const options = [correctItem.term];
        while (options.length < 4) {
            const wrongIndex = Math.floor(Math.random() * CSCP_PERMANENT_KNOWLEDGE.length);
            const wrongTerm = CSCP_PERMANENT_KNOWLEDGE[wrongIndex].term;
            if (!options.includes(wrongTerm)) {
                options.push(wrongTerm);
            }
        }

        // Shuffle options
        options.sort(() => Math.random() - 0.5);

        const labels = ['A', 'B', 'C', 'D'];
        let correctLabel = '';
        const formattedOptions = options.map((opt, i) => {
            if (opt === correctItem.term) correctLabel = labels[i];
            return `**${labels[i]})** ${opt}`;
        }).join('\n');

        responseText = `📋 **Multiple Choice Quiz!**\n\n**Definition:**\n> _"${correctItem.definition}"_\n\n**Which term does this describe?**\n${formattedOptions}\n\n_(Reply with A, B, C, D, or the full term. Type "stop" to end.)_`;

        return {
            text: responseText,
            state: {
                active: true,
                type: 'mcq',
                correctTerm: correctItem.term,
                correctLetter: correctLabel
            }
        };
    }
};

export const evaluateQuizAnswer = (query, quizState) => {
    const normUser = normalize(query);
    const normCorrect = normalize(quizState.correctTerm);

    if (normUser === 'stop' || normUser === 'exit' || normUser === 'quit') {
        return {
            text: "🛑 Quiz stopped. You can ask me questions normally or start another quiz anytime!",
            newState: null
        };
    }

    let isCorrect = false;

    if (quizState.type === 'guess') {
        isCorrect = (normUser === normCorrect);
    } else if (quizState.type === 'mcq') {
        const normLetter = quizState.correctLetter.toLowerCase();
        // Check if user replied with just the letter or the full term
        isCorrect = (normUser === normLetter || normUser === normCorrect);
    }

    if (isCorrect) {
        return {
            text: `✅ **Correct!** The answer was **${quizState.correctTerm}**.\n\nLet's do another one!`,
            newState: 'continue' // Signal front-end to auto-generate next
        };
    } else {
        return {
            text: `❌ **Not quite.** The correct answer was **${quizState.correctTerm}**.\n\nHere is the next question:`,
            newState: 'continue'
        };
    }
};

// Generate a smart, formatted response from the knowledge base (Standard mode)
export const generateLocalResponse = (query, additionalContext = '') => {
    const norm = normalize(query);

    // Handle greetings
    if (/^(hi|hey|hello|howdy|good morning|good evening)[\s!.]*$/.test(norm)) {
        return "👋 Hello! I'm your CSCP Exam Prep AI. I have " + CSCP_PERMANENT_KNOWLEDGE.length + " flashcard terms loaded from all 8 Modules.\n\nTry asking me to:\n• **Define a term** (e.g., \"What is Keiretsu?\")\n• **Ask me any flashcard** (Open-ended guess)\n• **Start a quiz** (Multiple choice)\n• **List all topics**";
    }

    // Handle quiz starting requests
    if (isOpenEndedQuiz(query)) {
        return generateQuizQuestion('guess');
    }

    if (isMultipleChoiceQuiz(query)) {
        return generateQuizQuestion('mcq');
    }

    // Handle list request
    if (isListQuestion(query) && /topic|term|concept|know|cover/.test(norm)) {
        const terms = CSCP_PERMANENT_KNOWLEDGE.map(k => `• **${k.term}**`).join('\n');
        return `📚 **Here are all ${CSCP_PERMANENT_KNOWLEDGE.length} topics I know:**\n\n${terms}\n\nAsk me to define any of these!`;
    }

    // Standard Search Flow
    const matches = findMatches(query, 3);

    if (matches.length === 0) {
        return `❓ I couldn't find a match for **"${query}"** in my CSCP knowledge base.\n\nType **"list all topics"** to see everything I know, or try starting a quiz!`;
    }

    if (matches.length === 1) {
        const m = matches[0];
        if (isDefinitionQuestion(query)) {
            return `📖 **${m.term}**\n\n${m.definition}`;
        }
        return `📖 **${m.term}**\n\n${m.definition}\n\n---\n_Source: CSCP Flashcards_`;
    }

    // Multiple matches — show all
    const result = matches.map((m, i) =>
        `**${i + 1}. ${m.term}**\n${m.definition}`
    ).join('\n\n---\n\n');

    return `🔍 Found **${matches.length} related terms** for "${query}":\n\n${result}\n\n---\n_Source: CSCP Flashcards_`;
};
