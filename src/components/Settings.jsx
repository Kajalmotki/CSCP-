import React, { useState } from 'react';
import './Settings.css';

const Settings = ({ theme, toggleTheme }) => {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);
    const [srsAggressive, setSrsAggressive] = useState(false);
    const [apiKey, setApiKey] = useState('AIzaSyD-*******HEIMDALL-PROD-KEY');

    return (
        <div className="module-view-container settings-module">
            <header className="module-header staggered-1">
                <div>
                    <h1 className="text-gradient">System Configuration</h1>
                    <p>Global architectural preferences and hardware integrators.</p>
                </div>
            </header>

            <div className="settings-grid staggered-2">
                <div className="glass-panel settings-group">
                    <h3><span className="icon">🖥️</span> Display & Haptics</h3>
                    
                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>Tactical Dark Mode</h4>
                            <p>Switch between light interfaces and tactical dark operating environments.</p>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>Auditory Telemetry</h4>
                            <p>Enable success sounds on XP gain and level ups.</p>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={soundEnabled} onChange={() => setSoundEnabled(!soundEnabled)} />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>Haptic Feedback Engine</h4>
                            <p>Vibrations on mobile devices during critical actions.</p>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={hapticsEnabled} onChange={() => setHapticsEnabled(!hapticsEnabled)} />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <div className="glass-panel settings-group">
                    <h3><span className="icon">🧠</span> Neuro-Engine Settings</h3>
                    
                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>Aggressive SRS Decay</h4>
                            <p>Accelerate the forgetting curve in flashcards for master-level difficulty.</p>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={srsAggressive} onChange={() => setSrsAggressive(!srsAggressive)} />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>Model Endpoint Key</h4>
                            <p>Gemini 3 Flash-Preview API hook (Read-only).</p>
                        </div>
                        <div className="api-key-box">
                            <input type="password" value={apiKey} readOnly className="api-input" />
                        </div>
                    </div>
                </div>
                
                <div className="glass-panel danger-zone staggered-3">
                    <h3><span className="icon">⚠️</span> Critical Systems (Danger Zone)</h3>
                    <p>These actions are irreversible. Executing them will purge system memory.</p>
                    <div className="danger-actions">
                        <button className="premium-btn error-btn">Purge AI Lexicon Memory</button>
                        <button className="premium-btn error-btn">Format Dashboard Analytics</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
