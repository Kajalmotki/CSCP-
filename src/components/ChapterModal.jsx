import React, { useEffect, useState } from 'react';
import './ChapterModal.css';

const ChapterModal = ({ isOpen, onClose, chapter, stat }) => {
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Trigger animation after slightly delaying for mount
            setTimeout(() => setAnimate(true), 50);
        } else {
            setAnimate(false);
        }
    }, [isOpen]);

    if (!isOpen || !chapter || !stat) return null;

    const total = stat.total;
    const correct = stat.correct;
    const incorrect = total - correct;

    // Calculate percentages
    const correctPct = total > 0 ? (correct / total) * 100 : 0;
    const incorrectPct = total > 0 ? (incorrect / total) * 100 : 0;

    // Mathematics for SVG circle (Radius = 70, Circumference = 2 * PI * R)
    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    const correctDashOffset = animate ? circumference - (correctPct / 100) * circumference : circumference;
    const incorrectDashOffset = animate ? circumference - (incorrectPct / 100) * circumference : circumference;

    return (
        <div className={`modal-overlay ${isOpen ? 'show' : ''}`} onClick={onClose}>
            <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div className="modal-header">
                    <span className="modal-badge">Module Insights</span>
                    <h2 className="modal-title text-gradient">Chapter {chapter}</h2>
                    <p className="modal-subtitle">Performance Analysis</p>
                </div>

                <div className="chart-container">
                    <svg width="200" height="200" className="radial-chart">
                        {/* Background Circle */}
                        <circle
                            className="chart-bg"
                            cx="100" cy="100" r={radius}
                        ></circle>

                        {/* Incorrect Fill Circle (Red) */}
                        <circle
                            className="chart-incorrect"
                            cx="100" cy="100" r={radius}
                            style={{
                                strokeDasharray: circumference,
                                strokeDashoffset: incorrectDashOffset,
                                transform: `rotate(-90deg)`,
                                transformOrigin: '50% 50%'
                            }}
                        ></circle>

                        {/* Correct Fill Circle (Green) - Rotated to start after incorrect */}
                        <circle
                            className="chart-correct"
                            cx="100" cy="100" r={radius}
                            style={{
                                strokeDasharray: circumference,
                                strokeDashoffset: correctDashOffset,
                                transform: `rotate(${-90 + (incorrectPct / 100) * 360}deg)`,
                                transformOrigin: '50% 50%'
                            }}
                        ></circle>

                        <text x="100" y="95" className="chart-percentage" textAnchor="middle" dominantBaseline="middle">
                            {Math.round(correctPct)}%
                        </text>
                        <text x="100" y="115" className="chart-label" textAnchor="middle" dominantBaseline="middle">
                            Accuracy
                        </text>
                    </svg>
                </div>

                <div className="stats-breakdown">
                    <div className="stat-card">
                        <div className="stat-value">{total}</div>
                        <div className="stat-label">Total Answered</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value correct-text">{correct}</div>
                        <div className="stat-label">Correct</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value incorrect-text">{incorrect}</div>
                        <div className="stat-label">Incorrect</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChapterModal;
