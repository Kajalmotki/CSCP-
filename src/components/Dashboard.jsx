import React, { useMemo } from 'react';
import ScenarioSimulator from './ScenarioSimulator';
import './Dashboard.css';

const Dashboard = ({ quizStats = [], gamification = {}, flashcardProgress = {} }) => {

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

    return (
        <div className="heimdall-dashboard">
            <header className="dash-header">
                <div>
                    <h1>Your Study Command Center</h1>
                    <p>Live performance data from your CSCP study sessions</p>
                </div>
                <div className="dash-auth-status">
                    <span className="status-dot pulse"></span>
                    Level {liveKPIs.level} • {liveKPIs.xp} XP
                </div>
            </header>

            <div className="kpi-grid">
                <div className={`kpi-card ${getAccuracyStatus(liveKPIs.accuracy)}`}>
                    <div className="kpi-header">
                        <span className="kpi-label">Quiz Accuracy</span>
                        <span className="kpi-trend">{getAccuracyTrend(liveKPIs.accuracy)}</span>
                    </div>
                    <div className="kpi-value">{liveKPIs.accuracy}%</div>
                    <div className="kpi-sub">{liveKPIs.totalCorrect} / {liveKPIs.totalAnswered} correct</div>
                    <div className="kpi-visual-bar">
                        <div className="fill" style={{ width: `${liveKPIs.accuracy}%` }}></div>
                    </div>
                </div>

                <div className={`kpi-card ${liveKPIs.streak >= 3 ? 'success' : liveKPIs.streak >= 1 ? 'warning' : 'standard'}`}>
                    <div className="kpi-header">
                        <span className="kpi-label">Study Streak</span>
                        <span className="kpi-trend">{liveKPIs.streak >= 3 ? '🔥 On Fire' : liveKPIs.streak >= 1 ? '✨ Active' : '—'}</span>
                    </div>
                    <div className="kpi-value">{liveKPIs.streak} {liveKPIs.streak === 1 ? 'Day' : 'Days'}</div>
                    <div className="kpi-sub">Consecutive days studied</div>
                    <div className="kpi-visual-bar">
                        <div className="fill" style={{ width: `${Math.min(liveKPIs.streak * 14, 100)}%` }}></div>
                    </div>
                </div>

                <div className={`kpi-card ${liveKPIs.termsMastered > 10 ? 'success' : liveKPIs.termsMastered > 0 ? 'warning' : 'standard'}`}>
                    <div className="kpi-header">
                        <span className="kpi-label">Terms Mastered</span>
                        <span className="kpi-trend">{liveKPIs.termsLearning > 0 ? `${liveKPIs.termsLearning} learning` : '—'}</span>
                    </div>
                    <div className="kpi-value">{liveKPIs.termsMastered}</div>
                    <div className="kpi-sub">{liveKPIs.termsTotal} terms reviewed total</div>
                    <div className="kpi-visual-bar">
                        <div className="fill" style={{ width: liveKPIs.termsTotal > 0 ? `${(liveKPIs.termsMastered / liveKPIs.termsTotal) * 100}%` : '0%' }}></div>
                    </div>
                </div>

                <div className={`kpi-card ${liveKPIs.chaptersAttempted >= 6 ? 'success' : liveKPIs.chaptersAttempted >= 3 ? 'warning' : 'standard'}`}>
                    <div className="kpi-header">
                        <span className="kpi-label">Chapters Covered</span>
                        <span className="kpi-trend">{liveKPIs.chaptersAttempted}/8</span>
                    </div>
                    <div className="kpi-value">{liveKPIs.chaptersAttempted}</div>
                    <div className="kpi-sub">of 8 CSCP modules attempted</div>
                    <div className="kpi-visual-bar">
                        <div className="fill" style={{ width: `${(liveKPIs.chaptersAttempted / 8) * 100}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="dash-main-content">
                <div className="dash-panel">
                    <h3>📊 Chapter Performance Breakdown</h3>
                    <div className="chapter-perf-grid">
                        {quizStats.map(stat => {
                            const acc = stat.total > 0 ? ((stat.correct / stat.total) * 100).toFixed(0) : null;
                            const status = acc === null ? 'not-started' : parseFloat(acc) >= 80 ? 'strong' : parseFloat(acc) >= 50 ? 'moderate' : 'weak';
                            return (
                                <div key={stat.chapter} className={`chapter-perf-item ${status}`}>
                                    <div className="chapter-perf-label">Module {stat.chapter}</div>
                                    <div className="chapter-perf-bar-wrap">
                                        <div className="chapter-perf-bar">
                                            <div className="chapter-perf-fill" style={{ width: acc !== null ? `${acc}%` : '0%' }}></div>
                                        </div>
                                        <span className="chapter-perf-pct">{acc !== null ? `${acc}%` : '—'}</span>
                                    </div>
                                    <div className="chapter-perf-detail">
                                        {stat.total > 0 ? `${stat.correct}/${stat.total} correct` : 'Not started'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="dash-panel simulator-panel">
                    <h3>⚡ What-If Scenario Simulator</h3>
                    <ScenarioSimulator />
                </div>

                {/* Live Insights based on real data */}
                <div className="dash-panel">
                    <h3>🧠 Study Insights</h3>
                    <div className="signal-list">
                        {liveKPIs.weakestChapter && liveKPIs.weakestChapter.total > 0 && (
                            <div className="signal-item critical">
                                <div className="signal-icon">⚠️</div>
                                <div className="signal-text">
                                    <strong>Weakest Area: Module {liveKPIs.weakestChapter.chapter}</strong>
                                    <p>Accuracy at {((liveKPIs.weakestChapter.correct / liveKPIs.weakestChapter.total) * 100).toFixed(0)}% — Focus your next study session here.</p>
                                </div>
                            </div>
                        )}
                        {liveKPIs.strongestChapter && liveKPIs.strongestChapter.total > 0 && (
                            <div className="signal-item success">
                                <div className="signal-icon">✅</div>
                                <div className="signal-text">
                                    <strong>Strongest Area: Module {liveKPIs.strongestChapter.chapter}</strong>
                                    <p>Accuracy at {((liveKPIs.strongestChapter.correct / liveKPIs.strongestChapter.total) * 100).toFixed(0)}% — Great mastery!</p>
                                </div>
                            </div>
                        )}
                        {liveKPIs.streak >= 3 && (
                            <div className="signal-item success">
                                <div className="signal-icon">🔥</div>
                                <div className="signal-text">
                                    <strong>{liveKPIs.streak}-Day Streak!</strong>
                                    <p>Consistency is the key to passing the CSCP exam. Keep it going!</p>
                                </div>
                            </div>
                        )}
                        {liveKPIs.totalAnswered === 0 && (
                            <div className="signal-item warning">
                                <div className="signal-icon">📝</div>
                                <div className="signal-text">
                                    <strong>No quizzes taken yet</strong>
                                    <p>Head to CSCP Prep Chat and start a chapter quiz to see your stats here!</p>
                                </div>
                            </div>
                        )}
                        {liveKPIs.chaptersAttempted > 0 && liveKPIs.chaptersAttempted < 8 && (
                            <div className="signal-item warning">
                                <div className="signal-icon">📚</div>
                                <div className="signal-text">
                                    <strong>{8 - liveKPIs.chaptersAttempted} Modules Untouched</strong>
                                    <p>You've covered {liveKPIs.chaptersAttempted} of 8 modules. Branch out for full exam coverage.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
