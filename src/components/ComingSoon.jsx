import React from 'react';
import './ComingSoon.css';

const ComingSoon = ({ moduleName }) => {
    return (
        <div className="coming-soon-container">
            <div className="glass-panel coming-soon-card">
                <div className="construction-icon glow-pulse">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                </div>
                <h2 className="text-gradient">Module Access Restricted</h2>
                <p>
                    The <strong>{moduleName || "Requested"}</strong> module is currently under development for Phase 12. 
                    <br/>It requires advanced integration with the REVOS simulation core before deployment.
                </p>
                <div className="status-badge">
                    <span className="status-dot"></span>
                    <span>Status: Engineering Offline</span>
                </div>
            </div>
        </div>
    );
};

export default ComingSoon;
