import React, { useState, useMemo } from 'react';
import './Forecasting.css';

const Forecasting = () => {
    const [baseDemand, setBaseDemand] = useState(1000);
    const [trendNode, setTrendNode] = useState(50);
    const [seasonality, setSeasonality] = useState(20);
    const [noise, setNoise] = useState(10);

    // Generate 12 months of forecast data based on Winter's inspired mock math
    const forecastData = useMemo(() => {
        const data = [];
        let currentDemand = baseDemand;
        
        for (let i = 1; i <= 12; i++) {
            // Add trend
            currentDemand += trendNode;
            
            // Add seasonality (sine wave peaking in summer/winter based on multiplier)
            const seasonEffect = Math.sin((i / 12) * Math.PI * 2) * (seasonality * 10);
            
            // Add noise
            const randomNoise = (Math.random() - 0.5) * 2 * (noise * 5); // random between -1 and 1 * noise scale

            const finalDemand = Math.max(0, currentDemand + seasonEffect + randomNoise);
            
            data.push({
                month: `M${i}`,
                value: Math.round(finalDemand),
                trendBase: currentDemand
            });
        }
        return data;
    }, [baseDemand, trendNode, seasonality, noise]);

    const maxVal = Math.max(...forecastData.map(d => d.value)) * 1.2; // 20% headroom
    const minVal = 0;

    return (
        <div className="module-view-container forecasting-module">
            <header className="module-header staggered-1">
                <div>
                    <h1 className="text-gradient">Demand Forecasting Engine</h1>
                    <p>Interactive algorithmic projection modeling (Holt-Winters inspired)</p>
                </div>
            </header>

            <div className="forecasting-grid staggered-2">
                {/* Control Panel */}
                <div className="glass-panel forecast-controls">
                    <h3><span className="icon">🎛️</span> Engine Parameters</h3>
                    
                    <div className="slider-group">
                        <label>Base Demand ({baseDemand} units)</label>
                        <input type="range" min="100" max="5000" step="100" value={baseDemand} onChange={(e) => setBaseDemand(Number(e.target.value))} />
                    </div>
                    
                    <div className="slider-group">
                        <label>Trend Alpha (+{trendNode} units/mo)</label>
                        <input type="range" min="-100" max="200" step="10" value={trendNode} onChange={(e) => setTrendNode(Number(e.target.value))} />
                    </div>

                    <div className="slider-group">
                        <label>Seasonal Variance Factor (x{seasonality})</label>
                        <input type="range" min="0" max="100" step="5" value={seasonality} onChange={(e) => setSeasonality(Number(e.target.value))} />
                    </div>

                    <div className="slider-group">
                        <label>Market Noise / Volatility ({noise}%)</label>
                        <input type="range" min="0" max="50" step="1" value={noise} onChange={(e) => setNoise(Number(e.target.value))} />
                    </div>

                    <div className="stats-readout">
                        <div className="stat-box">
                            <span className="label">12-Mo Peak</span>
                            <span className="val">{Math.max(...forecastData.map(d => d.value))}</span>
                        </div>
                        <div className="stat-box">
                            <span className="label">12-Mo Floor</span>
                            <span className="val">{Math.min(...forecastData.map(d => d.value))}</span>
                        </div>
                    </div>
                </div>

                {/* SVG Visualizer */}
                <div className="glass-panel forecast-visualizer-container">
                    <h3><span className="icon">📈</span> Predictive Topography</h3>
                    <div className="svg-line-chart-wrapper">
                        <svg viewBox="0 0 800 300" preserveAspectRatio="none" className="forecast-svg">
                            {/* Grid */}
                            {[25, 50, 75, 100].map((pct, i) => {
                                const y = 300 - (pct / 100) * 260 - 20;
                                return (
                                    <g key={`grid-${i}`}>
                                        <line x1="40" y1={y} x2="780" y2={y} stroke="var(--glass-border)" strokeDasharray="4,4" />
                                        <text x="30" y={y + 4} fill="var(--text-secondary)" fontSize="10" textAnchor="end">{Math.round((pct/100) * maxVal)}</text>
                                    </g>
                                );
                            })}
                            
                            {/* SVG Line path builder */}
                            <path 
                                fill="none" 
                                stroke="var(--accent-primary)" 
                                strokeWidth="3"
                                className="forecast-line-path"
                                d={`M ${forecastData.map((d, i) => {
                                    const x = 50 + (i * (730 / 11));
                                    const y = 300 - (d.value / maxVal) * 260 - 20;
                                    return `${x},${y}`;
                                }).join(' L ')}`} 
                            />

                            {/* SVG Data points */}
                            {forecastData.map((d, i) => {
                                const x = 50 + (i * (730 / 11));
                                const y = 300 - (d.value / maxVal) * 260 - 20;
                                return (
                                    <g key={`pt-${i}`} className="forecast-point">
                                        <circle cx={x} cy={y} r="5" fill="var(--bg-primary)" stroke="var(--accent-primary)" strokeWidth="2" />
                                        <text x={x} y={295} fill="var(--text-secondary)" fontSize="12" textAnchor="middle">{d.month}</text>
                                        {/* Point Tooltip */}
                                        <text x={x} y={y - 15} fill="var(--text-primary)" fontSize="12" fontWeight="bold" textAnchor="middle" className="point-tooltip-text">{d.value}</text>
                                    </g>
                                )
                            })}
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Forecasting;
