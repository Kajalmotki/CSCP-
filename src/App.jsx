import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ChapterModal from './components/ChapterModal';
import { CSCP_PERMANENT_KNOWLEDGE } from './data/csc_permanent_data.js';
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
      return { ...prev, xp: newXp, level: newLevel };
    });
  };

  return (
    <div className="app-container">
      <header className="mobile-header glass-panel">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 className="header-title text-gradient">CSCP Master</h1>
        <div style={{ width: 24 }}></div> {/* Spacer */}
      </header>

      <Sidebar
        onDataSave={setCscpContext}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        quizStats={quizStats}
        gamification={gamification}
        onChapterClick={setActiveChapter}
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
