import React, { useState } from 'react';
import ScenarioSimulator from './ScenarioSimulator';
import './Dashboard.css';

const Dashboard = () => {
    // Simulated KPI Data (In later phases, these pull from the /api/v1/health and specialized endpoints)
    const [kpis, setKpis] = useState([
        { id: 'fill-rate', label: 'Order Fill Rate', value: '94.2%', trend: '+1.5%', status: 'success' },
        { id: 'lead-time', label: 'Avg Lead Time', value: '22 Days', trend: '-2 Days', status: 'success' },
        { id: 'risk-level', label: 'Network Risk Score', value: '62/100', trend: '+12%', status: 'warning' },
        { id: 'forecast-acc', label: 'Forecast Accuracy', value: '88.1%', trend: '-0.4%', status: 'standard' }
    ]);

    return (
        <div className="heimdall-dashboard">
            <header className="dash-header">
                <div>
                    <h1>Decision Intelligence Command</h1>
                    <p>Heimdall Global Intelligence Network • Live Signals</p>
                </div>
                <div className="dash-auth-status">
                    <span className="status-dot pulse"></span>
                    System Operational • v3.1.0
                </div>
            </header>

            <div className="kpi-grid">
                {kpis.map(kpi => (
                    <div key={kpi.id} className={`kpi-card ${kpi.status}`}>
                        <div className="kpi-header">
                            <span className="kpi-label">{kpi.label}</span>
                            <span className="kpi-trend">{kpi.trend}</span>
                        </div>
                        <div className="kpi-value">{kpi.value}</div>
                        <div className="kpi-visual-bar">
                            <div className="fill" style={{ width: kpi.value.includes('%') ? kpi.value : '70%' }}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dash-main-content">
                <div className="dash-panel viz-panel">
                    <h3>Supply Chain Network Map</h3>
                    <div className="viz-placeholder">
                        <div className="radar-circle"></div>
                        <div className="radar-scanner"></div>
                        <p>Scanning Global Nodes...</p>
                    </div>
                </div>

                <div className="dash-panel simulator-panel">
                    <h3>What-If Scenario Simulator</h3>
                    <ScenarioSimulator />
                </div>

                <div className="dash-panel risk-summary">
                    <h3>Intelligence Signals</h3>
                    <div className="signal-list">
                        <div className="signal-item critical">
                            <div className="signal-icon">⚠️</div>
                            <div className="signal-text">
                                <strong>Port Disruption</strong>
                                <p>Rotterdam experiencing 48hr delay in berth availability.</p>
                            </div>
                        </div>
                        <div className="signal-item warning">
                            <div className="signal-icon">📉</div>
                            <div className="signal-text">
                                <strong>Demand Anomaly</strong>
                                <p>Unusual 15% spike in Western Region SKU-402.</p>
                            </div>
                        </div>
                        <div className="signal-item info">
                            <div className="signal-icon">✅</div>
                            <div className="signal-text">
                                <strong>Alpha Corp Validated</strong>
                                <p>Primary supplier re-certification complete.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
