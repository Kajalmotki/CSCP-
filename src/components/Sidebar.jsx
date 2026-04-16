import React from 'react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, activeView, onOpenDashboard, onOpenSituationalAI, onOpenDictionary, onOpenChat, onReset, gamification }) => {
  
  const NavItem = ({ id, label, icon, onClick, active }) => (
    <button 
      className={`nav-item ${active === id ? 'active' : ''}`} 
      onClick={() => { onClick(); if (window.innerWidth <= 768) onClose(); }}
    >
      <span className="icon-wrapper">{icon}</span>
      <span className="label-text">{label}</span>
      {active === id && <span className="active-glow" />}
    </button>
  );

  const GroupLabel = ({ label }) => <div className="group-label">{label}</div>;

  return (
    <aside className={`sidebar-enterprise ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <span className="brand-name text-gradient">HEIMDALL</span>
      </div>

      <nav className="sidebar-nav">
        <GroupLabel label="CORE" />
        <NavItem 
          id="dashboard" label="Dashboard" onClick={onOpenDashboard} active={activeView}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>}
        />

        <GroupLabel label="INTELLIGENCE" />
        <NavItem 
          id="analyze" label="Aria Analyze" onClick={onOpenSituationalAI} active={activeView}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path></svg>}
        />
        <NavItem 
          id="forecast" label="Forecasting" onClick={() => {}} active={activeView}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>}
        />
        <NavItem 
          id="optimize" label="Optimization" onClick={() => {}} active={activeView}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>}
        />

        <GroupLabel label="KNOWLEDGE" />
        <NavItem 
          id="dictionary" label="Dictionary" onClick={onOpenDictionary} active={activeView}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>}
        />
        <NavItem 
          id="chat" label="CSCP Prep Chat" onClick={onOpenChat} active={activeView}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
        />

        <GroupLabel label="SYSTEM" />
        <NavItem 
          id="history" label="Recent Analyses" onClick={() => {}} active={activeView}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
        />
        <NavItem 
          id="settings" label="Settings" onClick={() => {}} active={activeView}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>}
        />
      </nav>

      {gamification && (
        <div className="sidebar-footer-stats">
          <div className="mini-xp-card glass-panel">
            <div className="xp-info">
              <span className="level">Lvl {gamification.level}</span>
              <span className="xp">{gamification.xp} XP</span>
            </div>
            <div className="xp-progress-bg">
              <div className="xp-progress-fill" style={{ width: `${gamification.xp % 100}%` }}></div>
            </div>
          </div>
          <button className="reset-btn" onClick={onReset} title="Reset All Progress">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
