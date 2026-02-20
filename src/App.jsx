import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ChapterModal from './components/ChapterModal';
import { CSCP_PERMANENT_KNOWLEDGE } from './data/csc_permanent_data.js';
import confetti from 'canvas-confetti';
import { playSound, triggerHaptic } from './utils/haptics.js';
import './App.css';

const INITIAL_STATS = Array.from({ length: 8 }, (_, i) => ({
  chapter: i + 1,
  total: 0,
  correct: 0
}));

function App() {
  const [cscpContext, setCscpContext] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeChapter, setActiveChapter] = useState(null);

  // Persistent Quiz Stats tracking
  const [quizStats, setQuizStats] = useState(() => {
    const saved = localStorage.getItem('cscp_quiz_stats');
    return saved ? JSON.parse(saved) : INITIAL_STATS;
  });

  const [gamification, setGamification] = useState(() => {
    const saved = localStorage.getItem('cscp_gamification');
    const today = new Date().toISOString().split('T')[0];

    if (saved) {
      const parsed = JSON.parse(saved);
      let newStreak = parsed.streak || 1;

      if (parsed.lastLoginDate !== today) {
        const lastLogin = new Date(parsed.lastLoginDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastLogin.toDateString() === yesterday.toDateString()) {
          newStreak += 1;
        } else if (lastLogin.toDateString() !== new Date().toDateString()) {
          newStreak = 1;
        }
      }
      return { ...parsed, streak: newStreak, lastLoginDate: today };
    }

    return { xp: 0, level: 1, streak: 1, lastLoginDate: today };
  });

  useEffect(() => {
    localStorage.setItem('cscp_quiz_stats', JSON.stringify(quizStats));
  }, [quizStats]);

  useEffect(() => {
    localStorage.setItem('cscp_gamification', JSON.stringify(gamification));
  }, [gamification]);

  // Flashcard SRS and Mistake Tracking
  const [flashcardProgress, setFlashcardProgress] = useState(() => {
    const saved = localStorage.getItem('cscp_srs_progress');
    return saved ? JSON.parse(saved) : {};
  });

  // Dark/Light Theme
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('cscp_theme') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('cscp_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    localStorage.setItem('cscp_srs_progress', JSON.stringify(flashcardProgress));
  }, [flashcardProgress]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleQuizResult = (chapter, isCorrect) => {
    if (!chapter || chapter < 1 || chapter > 8) return;

    setQuizStats(prevStats => prevStats.map(stat => {
      if (stat.chapter === chapter) {
        return {
          ...stat,
          total: stat.total + 1,
          correct: stat.correct + (isCorrect ? 1 : 0)
        };
      }
      return stat;
    }));
  };

  const handleFlashcardReview = (term, isCorrect) => {
    setFlashcardProgress(prev => {
      const current = prev[term] || { mistakeCount: 0, easeFactor: 2.5, interval: 0, lastSeen: 0 };
      let { mistakeCount, easeFactor, interval } = current;

      if (isCorrect) {
        if (interval === 0) interval = 1;
        else if (interval === 1) interval = 6;
        else interval = Math.round(interval * easeFactor);
        easeFactor = Math.max(1.3, easeFactor + 0.1);
      } else {
        mistakeCount += 1;
        interval = 0; // Reset interval
        easeFactor = Math.max(1.3, easeFactor - 0.2);
      }

      return {
        ...prev,
        [term]: { mistakeCount, interval, easeFactor, lastSeen: Date.now() }
      };
    });
  };

  const addXP = (amount) => {
    setGamification(prev => {
      const newXp = prev.xp + amount;
      const newLevel = Math.floor(newXp / 100) + 1;

      if (newLevel > prev.level) {
        // Level Up Celebration!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b']
        });
        playSound('ding');
        triggerHaptic('success');
      }

      return { ...prev, xp: newXp, level: newLevel };
    });
  };

  const resetProgress = () => {
    if (window.confirm("Are you sure you want to completely erase your Chapter Analysis and Flashcard progress?")) {
      localStorage.removeItem('cscp_quiz_stats');
      localStorage.removeItem('cscp_srs_progress');
      window.location.reload();
    }
  };

  return (
    <div className="app-container" data-theme={theme}>
      <header className="mobile-header glass-panel">
        <button className="menu-toggle hover-glow" onClick={toggleSidebar} style={{ gap: '0.4rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          Progress
        </button>
        <h1 className="header-title text-gradient">CSCP Master</h1>

        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
          {theme === 'light' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      </header>

      <Sidebar
        onDataSave={setCscpContext}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        quizStats={quizStats}
        gamification={gamification}
        onChapterClick={setActiveChapter}
        onReset={resetProgress}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <ChatArea
        cscpContext={cscpContext}
        permanentKnowledge={CSCP_PERMANENT_KNOWLEDGE}
        onQuizResult={handleQuizResult}
        addXP={addXP}
        flashcardProgress={flashcardProgress}
        onFlashcardReview={handleFlashcardReview}
      />

      <ChapterModal
        isOpen={activeChapter !== null}
        onClose={() => setActiveChapter(null)}
        chapter={activeChapter}
        stat={activeChapter ? quizStats.find(s => s.chapter === activeChapter) : null}
      />

      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
    </div>
  );
}

export default App;
