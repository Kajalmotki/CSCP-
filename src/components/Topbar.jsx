import React from 'react';
import './Topbar.css';

const Topbar = ({ onThemeToggle, theme }) => {
  return (
    <header className="topbar-enterprise glass-panel">
      <div className="topbar-left">
        <div className="search-command-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search projects or Ask Aria..." 
            className="search-command-input"
            onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
          />
          <div className="command-hint">⌘K</div>
        </div>
      </div>

      <div className="topbar-right">
        <button className="topbar-action-btn" title="View Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
        <button className="topbar-action-btn" onClick={onThemeToggle} title="Toggle Theme">
           {theme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
           ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
           )}
        </button>
        <div className="v-divider"></div>
        <div className="user-profile-badge">
          <div className="user-avatar text-gradient">SV</div>
          <div className="user-meta">
            <span className="user-name">Siddharth</span>
            <span className="user-role">Supply Chain Lead</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
