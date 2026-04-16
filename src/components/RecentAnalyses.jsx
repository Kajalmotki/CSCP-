import React from 'react';
import './RecentAnalyses.css';

const MOCK_HISTORY = [
    { id: 1, type: 'quiz', module: 'Module 3', score: '85%', date: '2 hours ago', desc: 'Completed Advanced Demand Planning Quiz' },
    { id: 2, type: 'ai', module: 'Situational AI', topic: 'EMV Decision Trees', date: '5 hours ago', desc: 'Ran complex Monte Carlo prediction for Supplier risk.' },
    { id: 3, type: 'flashcard', module: 'Vocabulary', action: 'Mastered 12 terms', date: 'Yesterday', desc: 'Spaced repetition cycle completed with 92% retention rate.' },
    { id: 4, type: 'system', module: 'HEIMDALL Core', action: 'System Update', date: '2 days ago', desc: 'Imported CSCP 2025 Knowledge Base modules.' },
    { id: 5, type: 'ai', module: 'Situational AI', topic: 'Inventory Holds', date: '3 days ago', desc: 'Analyzed dead-stock impact on Q3 fiscal reports.' }
];

const RecentAnalyses = () => {
    return (
        <div className="module-view-container recent-analyses-module">
            <header className="module-header staggered-1">
                <div>
                    <h1 className="text-gradient">Intelligence Logs</h1>
                    <p>Chronological telemetry of your CSCP interactions and system deployments.</p>
                </div>
            </header>

            <div className="timeline-container staggered-2">
                <div className="timeline-line"></div>
                
                {MOCK_HISTORY.map((item, index) => {
                    let icon, iconClass;
                    if (item.type === 'quiz') { icon = '📝'; iconClass = 'quiz-icon'; }
                    else if (item.type === 'ai') { icon = '🧠'; iconClass = 'ai-icon'; }
                    else if (item.type === 'flashcard') { icon = '🗂️'; iconClass = 'flashcard-icon'; }
                    else { icon = '⚙️'; iconClass = 'system-icon'; }

                    return (
                        <div key={item.id} className="timeline-event" style={{ animationDelay: `${0.2 + (index * 0.1)}s` }}>
                            <div className={`timeline-marker ${iconClass}`}>
                                {icon}
                            </div>
                            <div className="timeline-content glass-panel">
                                <div className="timeline-header">
                                    <span className="log-module">{item.module}</span>
                                    <span className="log-date">{item.date}</span>
                                </div>
                                <h4 className="log-title">{item.topic || item.score || item.action}</h4>
                                <p className="log-desc">{item.desc}</p>
                                
                                {item.type === 'ai' && (
                                    <button className="re-run-btn">Execute Re-Analysis →</button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="log-footer staggered-3">
                <button className="premium-btn primary-btn export-log-btn">Export Telemetry Log (.CSV)</button>
            </div>
        </div>
    );
};

export default RecentAnalyses;
