import React, { useState, useRef, useEffect } from 'react';
import { generateLocalResponse, evaluateQuizAnswer, generateQuizQuestion } from '../utils/localAI';
import './ChatArea.css';

const ChatArea = ({ cscpContext }) => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'ai',
            text: "👋 Hello! I'm your CSCP Exam Prep AI — fully offline, no internet needed!\n\n📚 I have 462 flashcard terms permanently loaded.\n\nTry asking:\n• **\"What is Keiretsu?\"**\n• **\"Ask me any flashcard\"** (Guess the term)\n• **\"Start a quiz\"** (Multiple choice)\n• **\"List all topics\"**",
        }
    ]);
    const [inputVal, setInputVal] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [quizState, setQuizState] = useState(null); // Tracks active quiz
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputVal.trim()) return;

        const userText = inputVal.trim();
        const userMessage = { id: Date.now(), role: 'user', text: userText };
        setMessages((prev) => [...prev, userMessage]);
        setInputVal('');
        setIsTyping(true);

        setTimeout(() => {
            let nextState = quizState;
            let responseText = '';

            // If a quiz is active, evaluate the answer
            if (quizState?.active) {
                const evalResult = evaluateQuizAnswer(userText, quizState);
                responseText = evalResult.text;

                if (evalResult.newState === 'continue') {
                    // Generate the next question immediately after providing the answer feedback
                    const nextQ = generateQuizQuestion(quizState.type);
                    responseText += '\n\n---\n\n' + nextQ.text;
                    nextState = nextQ.state;
                } else {
                    nextState = evalResult.newState;
                }
            } else {
                // Standard flow or start a new quiz
                const result = generateLocalResponse(userText, cscpContext);

                if (typeof result === 'object' && result !== null) {
                    responseText = result.text;
                    nextState = result.state;
                } else {
                    responseText = result;
                }
            }

            setQuizState(nextState);
            const aiMessage = { id: Date.now() + 1, role: 'ai', text: responseText };
            setMessages((prev) => [...prev, aiMessage]);
            setIsTyping(false);
        }, 400);
    };

    // Render markdown-like bold formatting
    const renderText = (text) => {
        return text.split('\n').map((line, i) => {
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
                <p key={i} style={{ margin: line === '' ? '0.4rem 0' : '0.15rem 0' }}>
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j}>{part.slice(2, -2)}</strong>;
                        }
                        if (part.startsWith('> ')) {
                            return <em key={j} style={{ borderLeft: '3px solid #6366f1', paddingLeft: '0.5rem', display: 'block' }}>{part.slice(2)}</em>;
                        }
                        return part;
                    })}
                </p>
            );
        });
    };

    return (
        <main className="chat-area">
            <div className="messages-container">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                        <div className={`message-bubble ${msg.role === 'ai' ? 'glass-panel' : ''}`}>
                            {msg.role === 'ai' ? renderText(msg.text) : msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="message-wrapper ai">
                        <div className="message-bubble glass-panel typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-area glass-panel">
                <form onSubmit={handleSend} className="input-form">
                    <input
                        type="text"
                        className="chat-input"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder={quizState?.active ? `Type your answer or "stop" to exit quiz...` : "Ask about CSCP terms, quiz me, or list topics..."}
                    />
                    <button type="submit" className="send-btn hover-glow" disabled={!inputVal.trim()}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </form>
            </div>
        </main>
    );
};

export default ChatArea;

