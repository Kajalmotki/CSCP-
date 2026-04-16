import React, { useMemo, useState, useEffect } from 'react';
import ScenarioSimulator from './ScenarioSimulator';
import './Dashboard.css';

const Dashboard = ({ quizStats = [], gamification = {}, flashcardProgress = {} }) => {

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Compute LIVE KPIs from real user data
    const liveKPIs = useMemo(() => {
        const totalAnswered = quizStats.reduce((sum, s) => sum + s.total, 0);
        const totalCorrect = quizStats.reduce((sum, s) => sum + s.correct, 0);
        const accuracy = totalAnswered > 0 ? ((totalCorrect / totalAnswered) * 100).toFixed(1) : '0.0';

        const progressEntries = Object.values(flashcardProgress);
        const termsMastered = progressEntries.filter(p => p.interval >= 6).length;
        const termsLearning = progressEntries.filter(p => p.interval > 0 && p.interval < 6).length;
        const termsTotal = progressEntries.length;

        // Find weakest and strongest chapters
        const chaptersWithData = quizStats.filter(s => s.total > 0);
        let weakestChapter = null;
        let strongestChapter = null;
        if (chaptersWithData.length > 0) {
            weakestChapter = chaptersWithData.reduce((min, s) => {
                const acc = s.correct / s.total;
                const minAcc = min.correct / min.total;
                return acc < minAcc ? s : min;
            });
            strongestChapter = chaptersWithData.reduce((max, s) => {
                const acc = s.correct / s.total;
                const maxAcc = max.correct / max.total;
                return acc > maxAcc ? s : max;
            });
        }

        return {
            totalAnswered,
            totalCorrect,
            accuracy,
            termsMastered,
            termsLearning,
            termsTotal,
            xp: gamification.xp || 0,
            level: gamification.level || 1,
            streak: gamification.streak || 0,
            weakestChapter,
            strongestChapter,
            chaptersAttempted: chaptersWithData.length
        };
    }, [quizStats, gamification, flashcardProgress]);

    const getAccuracyStatus = (acc) => {
        const val = parseFloat(acc);
        if (val >= 80) return 'success';
        if (val >= 50) return 'warning';
        if (val > 0) return 'error';
        return 'standard';
    };

    const getAccuracyTrend = (acc) => {
        const val = parseFloat(acc);
        if (val >= 80) return '🎯 Strong';
        if (val >= 50) return '📈 Building';
        if (val > 0) return '⚠️ Needs Work';
        return '—';
    };

    // Calculate XP ring dynamics (assuming 100 XP per level)
    const xpProgress = liveKPIs.xp % 100;
    const ringRadius = 22;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - (xpProgress / 100) * ringCircumference;

    return (
        <div className={`heimdall-dashboard ${mounted ? 'mounted' : ''}`}>
            <header className="dash-header staggered-1">
                <div>
                    <h1>System Command Center</h1>
                    <p>Real-time analytics & intelligence for your CSCP study deployment</p>
                </div>
                <div className="dash-auth-status premium-glow">
                    <div className="xp-ring-container">
                        <svg width="50" height="50" viewBox="0 0 50 50">
                            <circle cx="25" cy="25" r={ringRadius} fill="none" stroke="var(--glass-border)" strokeWidth="4" />
                            <circle 
                                cx="25" cy="25" r={ringRadius} 
                                fill="none" stroke="url(#xp-gradient)" 
                                strokeWidth="4" 
                                strokeDasharray={ringCircumference} 
                                strokeDashoffset={ringOffset} 
                                strokeLinecap="round" 
                                transform="rotate(-90 25 25)"
                                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                            />
                            <defs>
                                <linearGradient id="xp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="xp-ring-text">{liveKPIs.level}</div>
                    </div>
                    <div className="xp-info">
                        <strong>Level {liveKPIs.level} Agent</strong>
                        <span>{liveKPIs.xp} Total XP</span>
                    </div>
                </div>
            </header>

            <div className="kpi-grid staggered-2">
                <div className={`kpi-card ${getAccuracyStatus(liveKPIs.accuracy)} glass-panel`}>
                    <div className="kpi-header">
                        <span className="kpi-label">Precision Rate</span>
                        <span className="kpi-trend">{getAccuracyTrend(liveKPIs.accuracy)}</span>
                    </div>
                    <div className="kpi-value">{liveKPIs.accuracy}%</div>
                    <div className="kpi-sub">{liveKPIs.totalCorrect} / {liveKPIs.totalAnswered} accurate executions</div>
                    <div className="kpi-visual-bar">
                        <div className="fill glow-fill" style={{ width: `${liveKPIs.accuracy}%` }}></div>
                    </div>
                </div>

                <div className={`kpi-card ${liveKPIs.streak >= 3 ? 'success' : liveKPIs.streak >= 1 ? 'warning' : 'standard'} glass-panel`}>
                    <div className="kpi-header">
                        <span className="kpi-label">Active Streak</span>
                        <span className="kpi-trend">{liveKPIs.streak >= 3 ? '🔥 Dominating' : liveKPIs.streak >= 1 ? '✨ Online' : '—'}</span>
                    </div>
                    <div className="kpi-value">{liveKPIs.streak} {liveKPIs.streak === 1 ? 'Cycle' : 'Cycles'}</div>
                    <div className="kpi-sub">Consecutive deployments</div>
                    <div className="kpi-visual-bar">
                        <div className="fill glow-fill" style={{ width: `${Math.min(liveKPIs.streak * 14, 100)}%` }}></div>
                    </div>
                </div>

                <div className={`kpi-card ${liveKPIs.termsMastered > 10 ? 'success' : liveKPIs.termsMastered > 0 ? 'warning' : 'standard'} glass-panel`}>
                    <div className="kpi-header">
                        <span className="kpi-label">Terms Secured</span>
                        <span className="kpi-trend">{liveKPIs.termsLearning > 0 ? `${liveKPIs.termsLearning} acquiring` : '—'}</span>
                    </div>
                    <div className="kpi-value">{liveKPIs.termsMastered}</div>
                    <div className="kpi-sub">{liveKPIs.termsTotal} vocabulary terms isolated</div>
                    <div className="kpi-visual-bar">
                        <div className="fill glow-fill" style={{ width: liveKPIs.termsTotal > 0 ? `${(liveKPIs.termsMastered / liveKPIs.termsTotal) * 100}%` : '0%' }}></div>
                    </div>
                </div>

                <div className={`kpi-card ${liveKPIs.chaptersAttempted >= 6 ? 'success' : liveKPIs.chaptersAttempted >= 3 ? 'warning' : 'standard'} glass-panel`}>
                    <div className="kpi-header">
                        <span className="kpi-label">Network Coverage</span>
                        <span className="kpi-trend">{liveKPIs.chaptersAttempted}/8 Nodes</span>
                    </div>
                    <div className="kpi-value">{liveKPIs.chaptersAttempted}</div>
                    <div className="kpi-sub">of 8 Core CSCP architectures online</div>
                    <div className="kpi-visual-bar">
                        <div className="fill glow-fill" style={{ width: `${(liveKPIs.chaptersAttempted / 8) * 100}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="dash-main-content staggered-3">
                <div className="dash-column left-col">
                    <div className="dash-panel glass-panel native-chart-panel">
                        <h3><span className="icon">📊</span> Dynamic Module Distribution</h3>
                        <p className="panel-subtitle">Accuracy topography across all active CSCP nodes</p>
                        
                        <div className="svg-chart-container">
                            <svg width="100%" height="240" viewBox="0 0 800 240" preserveAspectRatio="none">
                                {/* Grid Lines */}
                                {[0, 25, 50, 75, 100].map((pct, i) => (
                                    <g key={`grid-${i}`}>
                                        <line x1="40" y1={200 - (pct * 1.6)} x2="780" y2={200 - (pct * 1.6)} stroke="var(--glass-border)" strokeWidth="1" strokeDasharray="4,4" />
                                        <text x="30" y={205 - (pct * 1.6)} fill="var(--text-secondary)" fontSize="12" textAnchor="end">{pct}%</text>
                                    </g>
                                ))}
                                
                                {/* Bars */}
                                {quizStats.map((stat, i) => {
                                    const acc = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0;
                                    const barHeight = mounted ? acc * 1.6 : 0;
                                    const xOffset = 80 + (i * 90);
                                    
                                    let barColor = "url(#bar-weak)";
                                    if (acc >= 80) barColor = "url(#bar-strong)";
                                    else if (acc >= 50) barColor = "url(#bar-moderate)";
                                    else if (stat.total === 0) barColor = "var(--bg-tertiary)";
                                    
                                    return (
                                        <g key={`bar-${stat.chapter}`} className="chart-bar-group">
                                            <rect 
                                                x={xOffset} y={200 - barHeight} 
                                                width="40" height={barHeight} 
                                                fill={barColor} rx="4" ry="4" 
                                                className="animated-bar"
                                            />
                                            {/* Tooltip Target */}
                                            <rect x={xOffset} y="40" width="40" height="160" fill="transparent" className="tooltip-trigger" />
                                            {/* Labels */}
                                            <text x={xOffset + 20} y="225" fill="var(--text-primary)" fontSize="14" fontWeight="600" textAnchor="middle">M{stat.chapter}</text>
                                        </g>
                                    );
                                })}

                                <defs>
                                    <linearGradient id="bar-strong" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="rgba(16,185,129,0.3)" />
                                    </linearGradient>
                                    <linearGradient id="bar-moderate" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f59e0b" />
                                        <stop offset="100%" stopColor="rgba(245,158,11,0.3)" />
                                    </linearGradient>
                                    <linearGradient id="bar-weak" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" />
                                        <stop offset="100%" stopColor="rgba(239,68,68,0.3)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </div>

                    <div className="dash-panel simulator-panel glass-panel">
                        <h3><span className="icon">⚡</span> Predictive Scenario Engine</h3>
                        <p className="panel-subtitle">Forecast margin risk based on live demand variables</p>
                        <ScenarioSimulator />
                    </div>
                </div>

                <div className="dash-column right-col">
                    {/* Action Engine */}
                    <div className="dash-panel glass-panel action-panel">
                        <h3><span className="icon">🧠</span> Autonomous Action Directives</h3>
                        <p className="panel-subtitle">AI-generated study protocols</p>
                        
                        <div className="action-cards">
                            {liveKPIs.weakestChapter && liveKPIs.weakestChapter.total > 0 ? (
                                <div className="smart-action-card critical-action">
                                    <div className="action-glow"></div>
                                    <div className="action-content">
                                        <span className="action-tag">High Priority</span>
                                        <h4>Vulnerability Detected: Module {liveKPIs.weakestChapter.chapter}</h4>
                                        <p>Accuracy dropped to {((liveKPIs.weakestChapter.correct / liveKPIs.weakestChapter.total) * 100).toFixed(0)}%. Immediate reinforcement required.</p>
                                        <button className="premium-btn error-btn">Execute Rescue Protocol →</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="smart-action-card active-action">
                                    <div className="action-glow"></div>
                                    <div className="action-content">
                                        <span className="action-tag">Systems Nominal</span>
                                        <h4>Awaiting Initial Telemetry</h4>
                                        <p>Run diagnostic quizzes in the Chat Engine to populate vulnerability heatmaps.</p>
                                        <button className="premium-btn primary-btn">Launch Chat Engine →</button>
                                    </div>
                                </div>
                            )}

                            {liveKPIs.termsLearning > 0 && (
                                <div className="smart-action-card warning-action">
                                    <div className="action-content">
                                        <span className="action-tag">Memory Decay</span>
                                        <h4>{liveKPIs.termsLearning} Terms Pending Review</h4>
                                        <p>Spaced repetition algorithms demand immediate review of vulnerable vocabulary.</p>
                                        <button className="premium-btn warning-btn">Initialize SRS Cycle →</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="dash-panel glass-panel insights-panel">
                        <h3><span className="icon">📡</span> System Telemetry</h3>
                        <div className="signal-list">
                            {liveKPIs.strongestChapter && liveKPIs.strongestChapter.total > 0 && (
                                <div className="signal-item success">
                                    <div className="signal-indicator"></div>
                                    <div className="signal-text">
                                        <strong>Peak Efficiency: Module {liveKPIs.strongestChapter.chapter}</strong>
                                        <p>Maintaining {((liveKPIs.strongestChapter.correct / liveKPIs.strongestChapter.total) * 100).toFixed(0)}% stability.</p>
                                    </div>
                                </div>
                            )}
                            {liveKPIs.streak >= 3 && (
                                <div className="signal-item success">
                                    <div className="signal-indicator"></div>
                                    <div className="signal-text">
                                        <strong>{liveKPIs.streak}-Cycle Chain Secured</strong>
                                        <p>Network resonance increasing. Maintain daily protocols.</p>
                                    </div>
                                </div>
                            )}
                            {liveKPIs.chaptersAttempted > 0 && liveKPIs.chaptersAttempted < 8 && (
                                <div className="signal-item standard">
                                    <div className="signal-indicator"></div>
                                    <div className="signal-text">
                                        <strong>{8 - liveKPIs.chaptersAttempted} Nodes Offline</strong>
                                        <p>Significant portions of the CSCP map remain unexplored.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
