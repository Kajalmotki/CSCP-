import React, { useState, useEffect } from 'react';
import './ScenarioSimulator.css';

const ScenarioSimulator = () => {
    const [params, setParams] = useState({
        demandChange: 100, // percentage
        supplyCapacity: 100,
        costFactor: 100
    });

    const [results, setResults] = useState({
        profitImpact: 0,
        riskScore: 62,
        recommendation: "Stable market conditions."
    });

    const [isLoading, setIsLoading] = useState(false);

    // Call the HEIMDALL Simulation Engine API
    const runSimulation = async () => {
        setIsLoading(true);
        try {
            // Mapping UI params to engine schema
            const response = await fetch('http://localhost:8000/api/v1/simulate/risk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    revenue: { mean: 500000 * (params.demandChange / 100), stdDev: 50000 },
                    cost: { mean: 300000 * (params.costFactor / 100), stdDev: 20000 }
                })
            });
            const { data } = await response.json();
            
            // Transform simulation results to UI state
            setResults({
                profitImpact: Math.round(data.expectedProfit - 200000),
                riskScore: Math.round(data.probabilityOfLoss * 100),
                recommendation: data.probabilityOfLoss > 0.3 ? "High risk of margin erosion. Evaluate dual-sourcing." : "Healthy margin window."
            });
        } catch (e) {
            console.warn("Simulation API unavailable, using local calculation fallback.", e.message);
            // Local fallback math
            const revMean = 500000 * (params.demandChange / 100);
            const costMean = 300000 * (params.costFactor / 100);
            const expectedProfit = revMean - costMean;
            const profitImpact = expectedProfit - 200000; // 200k base profit assumption
            
            let probOfLoss = 0;
            if (expectedProfit <= 0) probOfLoss = 0.95;
            else probOfLoss = Math.max(0.01, Math.min(0.95, 1 - (expectedProfit / 150000)));

            setResults({
                profitImpact: Math.round(profitImpact),
                riskScore: Math.round(probOfLoss * 100),
                recommendation: probOfLoss > 0.3 ? "High risk of margin erosion. Evaluate dual-sourcing." : "Healthy margin window."
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-simulate on slider change (debounced)
    useEffect(() => {
        const timer = setTimeout(() => runSimulation(), 500);
        return () => clearTimeout(timer);
    }, [params]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setParams(prev => ({ ...prev, [name]: parseInt(value) }));
    };

    return (
        <div className="scenario-simulator">
            <div className="simulator-controls">
                <div className="slider-group">
                    <label>Demand Forecast ({params.demandChange}%)</label>
                    <input 
                        type="range" name="demandChange" min="50" max="200" 
                        value={params.demandChange} onChange={handleChange} 
                    />
                </div>
                <div className="slider-group">
                    <label>Supply Capacity ({params.supplyCapacity}%)</label>
                    <input 
                        type="range" name="supplyCapacity" min="20" max="150" 
                        value={params.supplyCapacity} onChange={handleChange} 
                    />
                </div>
                <div className="slider-group">
                    <label>Operating Costs ({params.costFactor}%)</label>
                    <input 
                        type="range" name="costFactor" min="80" max="150" 
                        value={params.costFactor} onChange={handleChange} 
                    />
                </div>
            </div>

            <div className="simulator-results">
                <div className="result-metric">
                    <span className="label">Profit Delta</span>
                    <span className={`value ${results.profitImpact >= 0 ? 'positive' : 'negative'}`}>
                        {results.profitImpact >= 0 ? '+' : ''}${results.profitImpact.toLocaleString()}
                    </span>
                </div>
                <div className="result-metric">
                    <span className="label">Risk Probability</span>
                    <span className="value">{results.riskScore}%</span>
                </div>
                <div className="result-insight">
                    <strong>AI Recommendation:</strong>
                    <p>{results.recommendation}</p>
                </div>
                {isLoading && <div className="sim-loading">Calculating Scenario...</div>}
            </div>
        </div>
    );
};

export default ScenarioSimulator;
