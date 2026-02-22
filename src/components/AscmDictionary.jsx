import React, { useState, useEffect, useRef } from 'react';
import './AscmDictionary.css';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const API_BASE = 'http://localhost:8000';

const AscmDictionary = ({ isOpen, onClose }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [activeLetter, setActiveLetter] = useState('A');
    const [expandedTerm, setExpandedTerm] = useState(null);
    const searchRef = useRef(null);
    const debounceRef = useRef(null);

    // Load all entries once when opened
    useEffect(() => {
        if (!isOpen || entries.length > 0) return;
        fetchDictionary();
    }, [isOpen]);

    // Auto-focus search when opened
    useEffect(() => {
        if (isOpen) setTimeout(() => searchRef.current?.focus(), 250);
    }, [isOpen]);

    const fetchDictionary = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/dictionary`);
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setEntries(data.entries || []);
        } catch (err) {
            if (err.message.includes('fetch') || err.message.includes('Failed') || err.message.includes('refused')) {
                setError('Cannot connect to the dictionary server.\n\nPlease run: node api\\server.js');
            } else {
                setError('Failed to load dictionary: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Filtered view
    const filtered = entries.filter(e => {
        if (search.trim()) {
            const q = search.toLowerCase();
            return e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q);
        }
        return e.term.toUpperCase().startsWith(activeLetter);
    });

    // Count per letter
    const letterCounts = {};
    ALPHABET.forEach(l => {
        letterCounts[l] = entries.filter(e => e.term.toUpperCase().startsWith(l)).length;
    });

    const handleSearchChange = (val) => {
        setSearch(val);
        setExpandedTerm(null);
    };

    if (!isOpen) return null;

    return (
        <div className="dict-overlay" onClick={onClose}>
            <div className="dict-modal" onClick={e => e.stopPropagation()}>

                {/* ── Header ── */}
                <div className="dict-header">
                    <div className="dict-header-left">
                        <div className="dict-icon">📖</div>
                        <div>
                            <h2 className="dict-title">ASCM Dictionary</h2>
                            <p className="dict-subtitle">
                                {loading ? 'Parsing PDF — please wait...' :
                                    error ? 'Connection error' :
                                        entries.length > 0 ? `19th Edition · ${entries.length} terms` : 'Loading...'}
                            </p>
                        </div>
                    </div>
                    <button className="dict-close" onClick={onClose}>✕</button>
                </div>

                {/* ── Search ── */}
                <div className="dict-search-wrap">
                    <span className="dict-search-icon">🔍</span>
                    <input
                        ref={searchRef}
                        className="dict-search"
                        type="text"
                        placeholder="Search terms or definitions..."
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        disabled={loading || !!error}
                    />
                    {search && (
                        <button className="dict-clear" onClick={() => handleSearchChange('')}>✕</button>
                    )}
                </div>

                {/* ── A-Z Nav (hide during search) ── */}
                {!search && !error && (
                    <div className="dict-az-nav">
                        {ALPHABET.map(letter => (
                            <button
                                key={letter}
                                className={`dict-az-btn ${activeLetter === letter ? 'active' : ''} ${letterCounts[letter] === 0 ? 'empty' : ''}`}
                                onClick={() => { setActiveLetter(letter); setExpandedTerm(null); }}
                                disabled={letterCounts[letter] === 0}
                            >
                                {letter}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Body ── */}
                <div className="dict-body">

                    {/* Loading */}
                    {loading && (
                        <div className="dict-loading">
                            <div className="dict-spinner"></div>
                            <p>Parsing ASCM Dictionary PDF…</p>
                            <p className="dict-loading-sub">This takes ~10 seconds on first load, then it's cached.</p>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <div className="dict-error">
                            <div className="dict-error-icon">⚠️</div>
                            <div>
                                <strong>Cannot load dictionary</strong>
                                <pre className="dict-error-pre">{error}</pre>
                                <button className="dict-retry-btn" onClick={fetchDictionary}>
                                    🔄 Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Results count when searching */}
                    {!loading && !error && search && (
                        <div className="dict-result-count">
                            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "<strong>{search}</strong>"
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !error && filtered.length === 0 && entries.length > 0 && (
                        <div className="dict-empty">
                            <span>📭</span>
                            <p>No terms found{search ? ` for "${search}"` : ` starting with "${activeLetter}"`}</p>
                        </div>
                    )}

                    {/* Entry list */}
                    {!loading && !error && filtered.map((entry, i) => (
                        <div
                            key={i}
                            className={`dict-entry ${expandedTerm === i ? 'expanded' : ''}`}
                            onClick={() => setExpandedTerm(expandedTerm === i ? null : i)}
                        >
                            <div className="dict-entry-header">
                                <span className="dict-term">{entry.term}</span>
                                <span className="dict-chevron">{expandedTerm === i ? '▲' : '▼'}</span>
                            </div>
                            {expandedTerm === i && (
                                <div className="dict-definition">{entry.definition}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AscmDictionary;
