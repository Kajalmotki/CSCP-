import React, { useState, useRef, useEffect, useCallback } from 'react';
import './SituationalAI.css';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { generateAdvancedAnswer } from '../utils/AdvancedSearchEngine';
import {
    parseMarkdownTable,
    extractAllTables,
    extractChartUrls,
    downloadCSV,
    downloadJSON,
    downloadChartImage,
    buildExportData,
    buildSessionExport
} from '../utils/AnalysisSchema';

const SYSTEM_PROMPT = `You are Aria, a world-class supply chain expert advisor...`;

// Call the new advanced semantic BM25 search engine
async function callAria(question, history, base64Image) {
    try {
        const result = await generateAdvancedAnswer(question, history, base64Image);
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

const SUGGESTIONS = [];
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
    const [attachedImage, setAttachedImage] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const historyRef = useRef([]);
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachedImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setAttachedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

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

        const userMsg = { id: Date.now(), role: 'user', text: question.trim(), image: attachedImage };
        setMessages(prev => [...prev, userMsg]);
        setInputVal('');
        setIsLoading(true);
        setApiError(null);
        setAttachedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        historyRef.current.push({ role: 'user', content: question.trim() });

        try {
            const data = await callAria(question.trim(), historyRef.current, attachedImage);
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
    }, [isLoading, mode, speak, attachedImage]);

    const textareaRef = useRef(null);

    // Auto-resize the textarea as content grows
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
    }, [inputVal]);

    const handleSubmit = (e) => {
        e.preventDefault();
        sendQuestion(inputVal);
        // Reset textarea height after send
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    // Enter = submit, Shift+Enter = newline
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputVal.trim() && !isLoading) sendQuestion(inputVal);
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        }
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

    const renderInline = (text) => {
        // Split on **bold**, *italic*, `code` markers, and $math$
        const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\$[^$]+\$)/g);
        return parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>;
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={j} style={{ color: '#000' }}>{part.slice(1, -1)}</em>;
            if (part.startsWith('`') && part.endsWith('`')) return <code key={j} style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '3px', padding: '0 4px', fontSize: '0.88em', color: '#000' }}>{part.slice(1, -1)}</code>;
            if (part.startsWith('$') && part.endsWith('$')) return <InlineMath key={j} math={part.slice(1, -1)} />;
            return part;
        });
    };

    const renderTable = (tableLines, startKey) => {
        const parsed = parseMarkdownTable(tableLines.join('\n'));
        if (!parsed || !parsed.headers.length) return null;
        return (
            <div key={`table-${startKey}`} className="sai-table-wrap">
                <table className="sai-table">
                    <thead>
                        <tr>
                            {parsed.headers.map((h, hi) => <th key={hi}>{renderInline(h)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {parsed.rows.map((row, ri) => (
                            <tr key={ri}>
                                {row.map((cell, ci) => <td key={ci}>{renderInline(cell)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderText = (text) => {
        const lines = text.split('\n');
        const elements = [];
        let i = 0;

        while (i < lines.length) {
            const trimmed = lines[i].trim();

            // Detect markdown table block (consecutive lines starting/ending with |)
            if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
                const tableLines = [];
                while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                    tableLines.push(lines[i].trim());
                    i++;
                }
                if (tableLines.length >= 2) {
                    const tableEl = renderTable(tableLines, elements.length);
                    if (tableEl) {
                        elements.push(tableEl);
                        continue;
                    }
                }
                // Fallback: render as normal lines if table parse failed
                tableLines.forEach(tl => {
                    elements.push(<p key={elements.length} style={{ margin: '0.12rem 0', lineHeight: '1.55', color: '#000' }}>{renderInline(tl)}</p>);
                });
                continue;
            }

            // Detect Multi-line Block Math ($$)
            if (trimmed === '$$') {
                const mathLines = [];
                i++;
                while (i < lines.length && lines[i].trim() !== '$$') {
                    mathLines.push(lines[i]);
                    i++;
                }
                elements.push(<div key={`math-${i}`} style={{ margin: '1rem 0', overflowX: 'auto' }}><BlockMath math={mathLines.join('\n')} /></div>);
                i++; // Skip closing $$
                continue;
            }
            
            // Detect Single-line Block Math ($$ ... $$)
            if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 2) {
                elements.push(<div key={`math-${i}`} style={{ margin: '1rem 0', overflowX: 'auto' }}><BlockMath math={trimmed.slice(2, -2)} /></div>);
                i++; continue;
            }

            // H2 header (##)
            if (trimmed.startsWith('## ')) {
                elements.push(<h3 key={i} style={{ margin: '1rem 0 0.3rem', fontSize: '1.05rem', color: '#000', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.2rem' }}>{renderInline(trimmed.slice(3))}</h3>);
                i++; continue;
            }
            // H3 sub-header (###)
            if (trimmed.startsWith('### ')) {
                elements.push(<h4 key={i} style={{ margin: '0.8rem 0 0.2rem', fontSize: '0.95rem', color: '#000', fontWeight: 700 }}>{renderInline(trimmed.slice(4))}</h4>);
                i++; continue;
            }
            // Blockquote line (> text)
            if (trimmed.startsWith('> ')) {
                elements.push(<blockquote key={i} style={{ borderLeft: '3px solid rgba(0,0,0,0.3)', margin: '0.25rem 0', padding: '0.2rem 0.7rem', color: '#000', fontStyle: 'italic', fontSize: '0.9em' }}>{renderInline(trimmed.slice(2))}</blockquote>);
                i++; continue;
            }
            // Horizontal rule
            if (trimmed === '---' || trimmed === '___') {
                elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)', margin: '0.5rem 0' }} />);
                i++; continue;
            }
            // Bullet point (• or -)
            if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const content = trimmed.slice(2);
                elements.push(<div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.15rem', paddingLeft: '0.4rem' }}><span style={{ color: '#000', flexShrink: 0 }}>•</span><span style={{ color: '#000' }}>{renderInline(content)}</span></div>);
                i++; continue;
            }
            // Empty line — spacer
            if (trimmed === '') {
                elements.push(<div key={i} style={{ height: '0.35rem' }} />);
                i++; continue;
            }
            // Image link ![alt](url) with chart download overlay
            const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
            if (imgMatch) {
                const isChart = imgMatch[2].includes('quickchart.io');
                elements.push(
                    <div key={i} className={`sai-img-wrap ${isChart ? 'sai-chart' : ''}`}>
                        <img src={imgMatch[2]} alt={imgMatch[1]} style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)' }} />
                        {isChart && (
                            <button
                                className="sai-chart-dl"
                                onClick={() => downloadChartImage(imgMatch[2], 'aria_chart.png')}
                                title="Download Chart"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                        )}
                    </div>
                );
                i++; continue;
            }
            // Normal paragraph line
            elements.push(<p key={i} style={{ margin: '0.12rem 0', lineHeight: '1.55', color: '#000' }}>{renderInline(trimmed)}</p>);
            i++;
        }
        return elements;
    };

    // Export handlers
    const handleExportJSON = (msg) => {
        const data = buildExportData(msg);
        downloadJSON(data, `aria_analysis_${Date.now()}.json`);
    };

    const handleExportCSV = (msg) => {
        const tables = extractAllTables(msg.text);
        if (tables.length === 0) {
            alert('No tables found in this response to export as CSV.');
            return;
        }
        // Export the first (or largest) table
        const biggest = tables.reduce((a, b) => a.rows.length >= b.rows.length ? a : b);
        downloadCSV(biggest.headers, biggest.rows, `aria_table_${Date.now()}.csv`);
    };

    const handleExportSession = () => {
        const data = buildSessionExport(messages);
        downloadJSON(data, `aria_session_${Date.now()}.json`);
    };

    if (!isOpen) return null;

    return (
        <div className="aria-analyze-workspace">
            {/* Header */}
            <div className="aria-header glass-panel">
                <div className="sai-avatar-wrap">
                    <div className="sai-avatar">
                        <span className="sai-avatar-emoji">🤖</span>
                        <div className={`sai-avatar-pulse ${isSpeaking ? 'speaking' : isListening ? 'listening' : ''}`}></div>
                    </div>
                    <div>
                        <h2 className="sai-name">Aria Analyze</h2>
                        <p className="sai-status">
                            {voiceStatus === 'listening' && <><span className="sai-dot listening"></span> Listening...</>}
                            {voiceStatus === 'thinking' && <><span className="sai-dot thinking"></span> Thinking...</>}
                            {voiceStatus === 'speaking' && <><span className="sai-dot speaking"></span> Speaking...</>}
                            {voiceStatus === 'idle' && <><span className="sai-dot idle"></span> Supply Chain Decision Intelligence</>}
                        </p>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className="sai-tabs">
                    <button className={`sai-tab ${mode === 'chat' ? 'active' : ''}`} onClick={() => { setMode('chat'); synthRef.current?.cancel(); }}>
                        💬 Chat
                    </button>
                    <button className={`sai-tab ${mode === 'voice' ? 'active' : ''}`} onClick={() => { setMode('voice'); }}>
                        🎙️ Voice
                    </button>
                </div>
            </div>

                {/* Messages */}
                <div className="sai-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`sai-msg-wrap ${msg.role}`}>
                            {msg.role === 'aria' && (
                                <div className="sai-msg-avatar">A</div>
                            )}
                            <div className={`sai-bubble ${msg.role} ${msg.isError ? 'error' : ''}`}>
                                {msg.image && <div style={{ marginBottom: '0.8rem', textAlign: 'right' }}><img src={msg.image} alt="User Upload" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)' }} /></div>}
                                {msg.role === 'aria' ? renderText(msg.text) : msg.text}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="sai-sources">
                                        📚 From: {msg.sources.join(', ')}
                                    </div>
                                )}
                            </div>
                            {/* HEIMDALL Export Toolbar */}
                            {msg.role === 'aria' && !msg.isError && msg.id !== 1 && (
                                <div className="sai-export-bar">
                                    <button className="sai-export-btn" onClick={() => handleExportJSON(msg)} title="Export as JSON">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                        <span>JSON</span>
                                    </button>
                                    <button className="sai-export-btn" onClick={() => handleExportCSV(msg)} title="Export table as CSV">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                                        <span>CSV</span>
                                    </button>
                                    <button className="sai-export-btn session" onClick={handleExportSession} title="Export full session">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        <span>Session</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="sai-msg-wrap aria">
                            <div className="sai-msg-avatar">A</div>
                            <div className="sai-bubble aria" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div className="sai-typing" style={{ marginBottom: '0.2rem' }}>
                                    <span></span><span></span><span></span>
                                </div>
                                <span style={{ fontSize: '0.78rem', color: '#000', fontStyle: 'italic' }}>
                                    🔍 Cross-referencing all 8 CSCP Modules...
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Suggestions removed */}
                {/* Input Area */}
                {mode === 'chat' ? (
                    <div className="sai-input-area" style={{ position: 'relative' }}>
                        {attachedImage && (
                            <div style={{ position: 'absolute', top: '-75px', left: '15px', background: '#fff', padding: '4px', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center' }}>
                                <img src={attachedImage} alt="preview" style={{ height: '55px', borderRadius: '4px' }} />
                                <button type="button" onClick={removeImage} style={{ background: '#ff4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', marginLeft: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✕</button>
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="sai-form">
                            <input 
                                type="file" 
                                accept="image/*" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                                style={{ display: 'none' }} 
                            />
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()} 
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', color: attachedImage ? '#BFA054' : '#666', transition: '0.2s' }}
                                title="Attach Chart / Image"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                </svg>
                            </button>
                            <textarea
                                ref={textareaRef}
                                className="sai-input"
                                value={inputVal}
                                onChange={e => setInputVal(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe your situation or attach a chart... (Enter to send, Shift+Enter for new line)"
                                disabled={isLoading}
                                rows={1}
                            />
                            <button type="submit" className="sai-send" disabled={!inputVal.trim() || isLoading}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </form>
                        {(() => {
                            const wordCount = inputVal.trim().split(/\s+/).filter(w => w.length > 0).length;
                            let limitStatus = 'safe';
                            let statusText = '(Safe)';
                            if (wordCount >= 2000) { limitStatus = 'danger'; statusText = '(Warning: Too large)'; }
                            else if (wordCount >= 1500) { limitStatus = 'risky'; statusText = '(Caution: Risky size)'; }
                            
                            return (
                                <div className={`sai-word-counter ${limitStatus}`}>
                                    <span>Input words: {wordCount}</span> <span style={{ opacity: 0.8 }}>{statusText}</span>
                                    <span style={{ marginLeft: '10px', paddingLeft: '10px', borderLeft: '1px solid #cbd5e1' }}>Context Health: {messages.length * 100}W (Est)</span>
                                </div>
                            );
                        })()}
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
    );
};

export default SituationalAI;
