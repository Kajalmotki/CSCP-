import React from 'react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, quizStats = [], gamification, onChapterClick }) => {
  return (
    <aside className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo flex-center">
          <span className="logo-icon">📈</span>
        </div>
        <h1 className="sidebar-title text-gradient">Your Progress</h1>
        <button className="close-sidebar" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="sidebar-content">
        {gamification && (
          <div className="gamification-dashboard">
            <div className="game-stats">
              <div className="stat-item">
                <span className="stat-icon">🔥</span>
                <div className="stat-text">
                  <span className="stat-value">{gamification.streak}</span>
                  <span className="stat-label">Day Streak</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">⭐</span>
                <div className="stat-text">
                  <span className="stat-value">Lvl {gamification.level}</span>
                  <span className="stat-label">{gamification.xp} XP</span>
                </div>
              </div>
            </div>
            <div className="xp-bar-bg">
              <div className="xp-fill" style={{ width: `${gamification.xp % 100}%` }}></div>
            </div>
          </div>
        )}

        <div className="info-box">
          <p>Track your accuracy across all 8 CSCP modules. Click for details.</p>
        </div>

        <div className="tracker-container">
          {quizStats.map((stat) => {
            const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
            return (
              <div
                key={stat.chapter}
                className="chapter-stat clickable"
                onClick={() => onChapterClick?.(stat.chapter)}
              >
                <div className="stat-header">
                  <span className="chapter-name">Chapter {stat.chapter}</span>
                  <span className="accuracy-text">{stat.total > 0 ? `${accuracy}%` : '-'}</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${stat.total > 0 ? accuracy : 0}%`,
                      backgroundColor: accuracy > 80 ? '#10b981' : accuracy > 50 ? '#f59e0b' : '#ef4444'
                    }}
                  ></div>
                </div>
                <div className="stat-details">
                  {stat.correct} / {stat.total} correct
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="status-badge">
          <span className="status-dot pulse"></span>
          AI Ready
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
