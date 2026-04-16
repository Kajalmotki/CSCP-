import React, { useState, useMemo } from 'react';
import './Optimization.css';

const Optimization = () => {
    const [annualDemand, setAnnualDemand] = useState(10000);
    const [orderingCost, setOrderingCost] = useState(500);
    const [holdingCostPercentage, setHoldingCostPercentage] = useState(20);
    const [unitCost, setUnitCost] = useState(50);

    // EOQ Formula: sqrt((2 * D * S) / H)
    const optimizationMetrics = useMemo(() => {
        const holdingCostPerUnit = unitCost * (holdingCostPercentage / 100);
        const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
        if(!eoq || eoq === Infinity) return null; // Safe guard

        const optimalOrdersPerYear = annualDemand / eoq;
        const totalHoldingCost = (eoq / 2) * holdingCostPerUnit;
        const totalOrderingCost = optimalOrdersPerYear * orderingCost;
        const totalCost = totalHoldingCost + totalOrderingCost;

        // Generate 50 precise data points for a smooth, perfect parabola
        const curveData = [];
        const maxQ = eoq * 2.5; 
        const minQ = Math.max(10, eoq * 0.1); // Start slightly above 0 to avoid infinite order costs
        const step = (maxQ - minQ) / 50;
        
        for (let q = minQ; q <= maxQ; q += step) {
             const hCost = (q / 2) * holdingCostPerUnit;
             const oCost = (annualDemand / q) * orderingCost;
             curveData.push({
                 q: q,
                 hCost: hCost,
                 oCost: oCost,
                 tCost: hCost + oCost
             });
        }

        const maxTCost = Math.max(...curveData.map(d => d.tCost));

        return {
            eoq: Math.round(eoq),
            holdingCostPerUnit: holdingCostPerUnit.toFixed(2),
            optimalOrders: optimalOrdersPerYear.toFixed(1),
            totalCost: Math.round(totalCost),
            totalHolding: Math.round(totalHoldingCost),
            totalOrdering: Math.round(totalOrderingCost),
            curveData,
            maxTCost,
            maxQ
        };
    }, [annualDemand, orderingCost, holdingCostPercentage, unitCost]);

    if (!optimizationMetrics) return null;

    // SVG Projection Helpers
    const mapX = (q) => 40 + ((q / optimizationMetrics.maxQ) * 700);
    const mapY = (cost) => 230 - ((cost / optimizationMetrics.maxTCost) * 200);

    return (
        <div className="module-view-container optimization-module">
            <header className="module-header staggered-1">
                <div>
                    <h1 className="text-gradient">Supply Network Optimization</h1>
                    <p>Live EOQ (Economic Order Quantity) Cost Balancing Engine</p>
                </div>
            </header>

            <div className="optimization-grid staggered-2">
                <div className="glass-panel optimize-controls">
                    <h3><span className="icon">⚖️</span> Cost Variables</h3>
                    
                    <div className="slider-group">
                        <label>Annual Demand (D): {annualDemand.toLocaleString()} units</label>
                        <input type="range" min="1000" max="100000" step="1000" value={annualDemand} onChange={(e) => setAnnualDemand(Number(e.target.value))} />
                    </div>
                    
                    <div className="slider-group">
                        <label>Ordering Cost (S): ${orderingCost} per order</label>
                        <input type="range" min="50" max="2500" step="50" value={orderingCost} onChange={(e) => setOrderingCost(Number(e.target.value))} />
                    </div>

                    <div className="slider-group">
                        <label>Unit Cost (C): ${unitCost}</label>
                        <input type="range" min="10" max="500" step="10" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
                    </div>

                    <div className="slider-group">
                        <label>Holding Cost % (i): {holdingCostPercentage}%</label>
                        <input type="range" min="5" max="50" step="5" value={holdingCostPercentage} onChange={(e) => setHoldingCostPercentage(Number(e.target.value))} />
                    </div>
                </div>

                <div className="glass-panel optimize-results">
                    <h3><span className="icon">🎯</span> Optimal Delivery Architecture</h3>
                    <div className="eoq-hero">
                        <div className="eoq-value">
                            <span className="label">Optimal Order Quantity (EOQ)</span>
                            <strong>{optimizationMetrics.eoq.toLocaleString()}</strong> <span>units/order</span>
                        </div>
                    </div>
                    
                    <div className="cost-breakdown">
                        <div className="cost-item">
                            <span className="dot holding-dot"></span>
                            <span>Annual Holding Cost: </span>
                            <strong>${optimizationMetrics.totalHolding.toLocaleString()}</strong>
                        </div>
                        <div className="cost-item">
                            <span className="dot ordering-dot"></span>
                            <span>Annual Ordering Cost: </span>
                            <strong>${optimizationMetrics.totalOrdering.toLocaleString()}</strong>
                        </div>
                    </div>

                    <div className="balance-scale-container">
                        <div className="balance-bar">
                            <div className="holding-fill" style={{ width: `${(optimizationMetrics.totalHolding / optimizationMetrics.totalCost) * 100}%` }}></div>
                            <div className="ordering-fill" style={{ width: `${(optimizationMetrics.totalOrdering / optimizationMetrics.totalCost) * 100}%` }}></div>
                        </div>
                        <div className="balance-labels">
                            <span>Inventory Focus</span>
                            <span className="center-mark">Perfect Harmony Achieved</span>
                            <span>Logistics Focus</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Optimization;
