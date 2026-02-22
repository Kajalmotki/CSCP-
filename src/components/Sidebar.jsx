import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, quizStats = [], gamification, onChapterClick, onReset, theme, toggleTheme, onOpenDictionary, onOpenSituationalAI }) => {
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  return (
    <aside className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="logo flex-center"
            onClick={onReset}
            title="Reset Progress"
            style={{ cursor: 'pointer', color: 'var(--text-primary)', background: 'transparent', border: 'none', padding: '0.25rem' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </button>

          <button onClick={toggleTheme} title="Toggle Theme" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.25rem' }}>
            {theme === 'light' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>
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

        <button
          className="progress-accordion-toggle hover-glow"
          onClick={() => setIsProgressOpen(!isProgressOpen)}
        >
          <div className="flex-center" style={{ gap: '0.6rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <span>Chapter Progress</span>
          </div>
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: isProgressOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {isProgressOpen && (
          <div className="tracker-container slide-down">
            <div className="info-box">
              <p>Track your accuracy across all 8 CSCP modules. Click for details.</p>
            </div>
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
                  <div className="stat-details" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span>{stat.correct} / {stat.total} correct</span>
                    <button
                      className="read-flashcards-btn hover-glow"
                      title={`Read Chapter ${stat.chapter} Flashcards`}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('triggerChat', { detail: `read chapter ${stat.chapter} topics` }));
                        if (window.innerWidth <= 768 && typeof onClose === 'function') {
                          onClose(); // Auto-close sidebar on mobile
                        }
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                      </svg>
                      Read
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        {/* Feature Buttons */}
        <div className="sidebar-feature-btns">
          <button
            className="sidebar-feature-btn dict-btn hover-glow"
            onClick={() => { onOpenDictionary?.(); onClose?.(); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            ASCM Dictionary
          </button>
          <button
            className="sidebar-feature-btn sai-btn hover-glow"
            onClick={() => { onOpenSituationalAI?.(); onClose?.(); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path>
            </svg>
            Situational AI
          </button>
        </div>

        <div className="status-badge">
          <span className="status-dot pulse"></span>
          AI Ready
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
