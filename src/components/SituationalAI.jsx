import React, { useState, useRef, useEffect, useCallback } from 'react';
import './SituationalAI.css';
import { generateLocalAnswer } from '../utils/localAIEngine';

const SYSTEM_PROMPT = `You are Aria, a world-class supply chain expert advisor with deep expertise in ASCM CSCP frameworks, logistics, procurement, inventory management, demand planning, and global operations strategy. You are speaking with a supply chain professional facing a real-world challenge. Provide immediate, practical, actionable guidance grounded in ASCM CSCP standards. Be calm, authoritative, empathetic, and professional — like a senior consultant. Structure your response clearly with bold headers. Focus on what can be done RIGHT NOW and what to plan for the near and long term.`;

// Call the local completely-offline AI engine using pre-generated CSCP EPUB chunks
async function callAria(question) {
    try {
        const result = await generateLocalAnswer(question);
        return result; // { answer, sources }
    } catch (err) {
        throw new Error(err.message || 'AI Engine Error');
    }
}


const ARIA_INTRO = `Hello! I'm **Aria**, your dedicated Supply Chain AI Advisor.

I'm here to help you navigate any supply chain challenge — from supplier disruptions and inventory crises to demand volatility and logistics optimization.

    ** How can I assist you today ?** You can type your situation below or tap the microphone to speak directly with me.

* Try asking:*
• "My key supplier just went bankrupt — what do I do?"
• "How should I handle a sudden spike in demand?"
• "What strategies reduce lead time variability?"`;

const SUGGESTIONS = [
    "My key supplier just went bankrupt. What should I do?",
    "We have excess inventory that's tying up cash. What are our options?",
    "How do I handle a port strike disrupting our supply chain?",
    "Our demand forecast is off by 40%. How do we respond?",
    "A major quality defect was found in shipped goods. What now?"
];

const SituationalAI = ({ isOpen, onClose }) => {
    const [mode, setMode] = useState('chat'); // 'chat' | 'voice'
    const [messages, setMessages] = useState([
        { id: 1, role: 'aria', text: ARIA_INTRO }
    ]);
    const [inputVal, setInputVal] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [voiceStatus, setVoiceStatus] = useState('idle'); // idle | listening | thinking | speaking

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const historyRef = useRef([]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen && mode === 'chat') {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, mode]);

    // Cleanup speech on unmount/close
    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
            synthRef.current?.cancel();
        };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            recognitionRef.current?.stop();
            synthRef.current?.cancel();
            setIsListening(false);
            setIsSpeaking(false);
            setVoiceStatus('idle');
        }
    }, [isOpen]);

    const speak = useCallback((text) => {
        if (!synthRef.current) return;
        synthRef.current.cancel();

        // Strip markdown
        const clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/#+\s/g, '').trim();
        const sentences = clean.split(/(?<=[.!?])\s+/);

        let i = 0;
        const speakNext = () => {
            if (i >= sentences.length) {
                setIsSpeaking(false);
                setVoiceStatus('idle');
                return;
            }
            const utt = new SpeechSynthesisUtterance(sentences[i++]);
            const voices = synthRef.current.getVoices();
            const femaleVoice = voices.find(v =>
                (v.name.toLowerCase().includes('female') ||
                    v.name.toLowerCase().includes('samantha') ||
                    v.name.toLowerCase().includes('karen') ||
                    v.name.toLowerCase().includes('victoria') ||
                    v.name.toLowerCase().includes('zira') ||
                    v.name.toLowerCase().includes('hazel') ||
                    v.name.toLowerCase().includes('susan') ||
                    v.name.toLowerCase().includes('google us english') ||
                    v.name.toLowerCase().includes('microsoft zira')) &&
                v.lang.startsWith('en')
            ) || voices.find(v => v.lang === 'en-US') || voices[0];

            utt.voice = femaleVoice;
            utt.rate = 1.0;
            utt.pitch = 1.05;
            utt.volume = 1.0;
            utt.onend = speakNext;
            synthRef.current.speak(utt);
        };

        setIsSpeaking(true);
        setVoiceStatus('speaking');
        speakNext();
    }, []);

    const sendQuestion = useCallback(async (question) => {
        if (!question.trim() || isLoading) return;

        const userMsg = { id: Date.now(), role: 'user', text: question.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInputVal('');
        setIsLoading(true);
        setApiError(null);

        historyRef.current.push({ role: 'user', content: question.trim() });

        try {
            const data = await callAria(question.trim(), historyRef.current);
            const ariaMsg = { id: Date.now() + 1, role: 'aria', text: data.answer, sources: data.sources };
            setMessages(prev => [...prev, ariaMsg]);
            historyRef.current.push({ role: 'assistant', content: data.answer });

            if (mode === 'voice') {
                speak(data.answer);
            }
        } catch (err) {
            const errMsg = err.message || 'Something went wrong. Please try again.';
            setApiError(errMsg);
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'aria', text: `⚠️ ${errMsg} `, isError: true }]);
        } finally {
            setIsLoading(false);
            if (mode === 'voice') setVoiceStatus('idle');
        }
    }, [isLoading, mode, speak]);

    const handleSubmit = (e) => {
        e.preventDefault();
        sendQuestion(inputVal);
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in this browser. Please use Chrome.');
            return;
        }

        synthRef.current?.cancel();
        setIsSpeaking(false);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsListening(true);
            setVoiceStatus('listening');
            setVoiceTranscript('');
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript).join('');
            setVoiceTranscript(transcript);
            if (event.results[event.results.length - 1].isFinal) {
                setIsListening(false);
                setVoiceStatus('thinking');
                sendQuestion(transcript);
                setVoiceTranscript('');
            }
        };

        recognition.onerror = (e) => {
            console.warn('Speech error:', e.error);
            setIsListening(false);
            setVoiceStatus('idle');
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const stopListening = () => {
        recognitionRef.current?.stop();
        setIsListening(false);
        setVoiceStatus('idle');
    };

    const renderText = (text) => {
        return text.split('\n').map((line, i) => {
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
                <p key={i} style={{ margin: line === '' ? '0.3rem 0' : '0.12rem 0' }}>
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j}>{part.slice(2, -2)}</strong>;
                        }
                        if (part.startsWith('• ') || part.startsWith('- ')) {
                            return <span key={j} style={{ display: 'block', paddingLeft: '0.8rem' }}>{part}</span>;
                        }
                        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                            return <em key={j} style={{ color: 'rgba(196,181,253,0.8)' }}>{part.slice(1, -1)}</em>;
                        }
                        return part;
                    })}
                </p>
            );
        });
    };

    if (!isOpen) return null;

    return (
        <div className="sai-overlay" onClick={onClose}>
            <div className="sai-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="sai-header">
                    <div className="sai-avatar-wrap">
                        <div className="sai-avatar">
                            <span className="sai-avatar-emoji">🤖</span>
                            <div className={`sai - avatar - pulse ${isSpeaking ? 'speaking' : isListening ? 'listening' : ''} `}></div>
                        </div>
                        <div>
                            <h2 className="sai-name">Aria</h2>
                            <p className="sai-status">
                                {voiceStatus === 'listening' && <><span className="sai-dot listening"></span> Listening...</>}
                                {voiceStatus === 'thinking' && <><span className="sai-dot thinking"></span> Thinking...</>}
                                {voiceStatus === 'speaking' && <><span className="sai-dot speaking"></span> Speaking...</>}
                                {voiceStatus === 'idle' && <><span className="sai-dot idle"></span> Supply Chain AI Advisor</>}
                            </p>
                        </div>
                    </div>

                    {/* Mode Tabs */}
                    <div className="sai-tabs">
                        <button className={`sai - tab ${mode === 'chat' ? 'active' : ''} `} onClick={() => { setMode('chat'); synthRef.current?.cancel(); }}>
                            💬 Chat
                        </button>
                        <button className={`sai - tab ${mode === 'voice' ? 'active' : ''} `} onClick={() => { setMode('voice'); }}>
                            🎙️ Voice
                        </button>
                    </div>

                    <button className="sai-close" onClick={onClose}>✕</button>
                </div>

                {/* Messages */}
                <div className="sai-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`sai - msg - wrap ${msg.role} `}>
                            {msg.role === 'aria' && (
                                <div className="sai-msg-avatar">A</div>
                            )}
                            <div className={`sai - bubble ${msg.role} ${msg.isError ? 'error' : ''} `}>
                                {msg.role === 'aria' ? renderText(msg.text) : msg.text}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="sai-sources">
                                        📚 From: {msg.sources.join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="sai-msg-wrap aria">
                            <div className="sai-msg-avatar">A</div>
                            <div className="sai-bubble aria sai-typing">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Suggestions (show when only 1 message) */}
                {messages.length === 1 && !isLoading && (
                    <div className="sai-suggestions">
                        {SUGGESTIONS.map((s, i) => (
                            <button key={i} className="sai-suggestion" onClick={() => sendQuestion(s)}>
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input Area */}
                {mode === 'chat' ? (
                    <div className="sai-input-area">
                        <form onSubmit={handleSubmit} className="sai-form">
                            <input
                                ref={inputRef}
                                type="text"
                                className="sai-input"
                                value={inputVal}
                                onChange={e => setInputVal(e.target.value)}
                                placeholder="Describe your supply chain situation..."
                                disabled={isLoading}
                            />
                            <button type="submit" className="sai-send" disabled={!inputVal.trim() || isLoading}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </form>
                    </div>
                ) : (
                    /* Voice Interface */
                    <div className="sai-voice-area">
                        {voiceTranscript && (
                            <div className="sai-transcript">{voiceTranscript}</div>
                        )}

                        <div className="sai-voice-controls">
                            {isSpeaking ? (
                                <button className="sai-mic-btn speaking" onClick={() => { synthRef.current?.cancel(); setIsSpeaking(false); setVoiceStatus('idle'); }}>
                                    <div className="voice-wave">
                                        {[...Array(5)].map((_, i) => <span key={i}></span>)}
                                    </div>
                                    <span className="sai-mic-label">Tap to stop</span>
                                </button>
                            ) : isListening ? (
                                <button className="sai-mic-btn listening" onClick={stopListening}>
                                    <div className="voice-wave active">
                                        {[...Array(5)].map((_, i) => <span key={i}></span>)}
                                    </div>
                                    <span className="sai-mic-label">Tap to stop</span>
                                </button>
                            ) : (
                                <button className="sai-mic-btn idle" onClick={startListening} disabled={isLoading}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                        <line x1="12" y1="19" x2="12" y2="23"></line>
                                        <line x1="8" y1="23" x2="16" y2="23"></line>
                                    </svg>
                                    <span className="sai-mic-label">
                                        {isLoading ? 'Processing...' : 'Tap to speak'}
                                    </span>
                                </button>
                            )}
                        </div>

                        <p className="sai-voice-hint">Ask Aria about any supply chain situation out loud</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SituationalAI;
