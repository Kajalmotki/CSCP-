import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ onDataSave, isOpen, onClose }) => {
  const [data, setData] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    if (data.trim()) {
      onDataSave(data);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        if (window.innerWidth <= 768) onClose();
      }, 1500);
    }
  };

  return (
    <aside className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo flex-center">
          <span className="logo-icon">🧠</span>
        </div>
        <h1 className="sidebar-title text-gradient">CSCP Master</h1>
        <button className="close-sidebar" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="sidebar-content">
        <div className="info-box">
          <p>Paste your CSCP study material below to train the session.</p>
        </div>

        <textarea
          className="data-input"
          placeholder="e.g., Supply chain risk management..."
          value={data}
          onChange={(e) => setData(e.target.value)}
        ></textarea>

        <button
          className={`save-btn ${isSaved ? 'saved' : ''} hover-glow`}
          onClick={handleSave}
        >
          {isSaved ? 'Context Loaded ✓' : 'Load Context'}
        </button>
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
