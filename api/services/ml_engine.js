/**
 * HEIMDALL Phase 7 — ML Intelligence Engine
 * Pure Node.js Algorithms (Zero Dependencies)
 */

/**
 * Z-Score Anomaly Detection
 * Detects statistical outliers in a time series (e.g., sudden drop in demand, sudden spike in costs)
 *
 * @param {Array<Number>} data - numeric array of historical data points
 * @param {Number} threshold - Z-score threshold (default 2.0 or 3.0 represents 95-99% confidence interval)
 * @returns {Object} - analysis showing normal range and identifying outliers
 */
function detectAnomalies(data, threshold = 2.0) {
    if (!data || data.length === 0) return { error: "No data provided" };

    // Calculate Mean
    const mean = data.reduce((a, b) => a + b, 0) / data.length;

    // Calculate Standard Deviation
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    const anomalies = [];
    const normalData = [];
    
    // Identify outliers
    data.forEach((val, index) => {
        // Handle edge case where stdDev is 0 (all points identical)
        const zScore = stdDev === 0 ? 0 : Math.abs((val - mean) / stdDev);
        if (zScore > threshold) {
            anomalies.push({ index, value: val, zScore: zScore.toFixed(2), type: val > mean ? 'Spike' : 'Drop' });
        } else {
            normalData.push(val);
        }
    });

    const chartConfig = {
        type: 'scatter',
        data: {
            labels: data.map((_, i) => `T${i+1}`),
            datasets: [
                {
                    type: 'line',
                    label: 'Trend',
                    data: data,
                    borderColor: '#cbd5e1',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    type: 'scatter',
                    label: 'Normal Data',
                    data: data.map((v, i) => anomalies.find(a => a.index === i) ? null : v),
                    backgroundColor: '#3b82f6',
                    pointRadius: 4
                },
                {
                    type: 'scatter',
                    label: 'Anomalies',
                    data: data.map((v, i) => anomalies.find(a => a.index === i) ? v : null),
                    backgroundColor: '#ef4444',
                    pointRadius: 8,
                    pointStyle: 'triangle'
                }
            ]
        },
        options: {
            title: { display: true, text: `Anomaly Detection (Threshold Z>${threshold})` }
        }
    };

    return {
        totalPoints: data.length,
        mean: Number(mean.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2)),
        upperBound: Number((mean + (stdDev * threshold)).toFixed(2)),
        lowerBound: Number((mean - (stdDev * threshold)).toFixed(2)),
        anomalyCount: anomalies.length,
        anomalies: anomalies,
        recommendation: anomalies.length > 0 
            ? `Detected ${anomalies.length} statistical disruptions requiring immediate investigation.`
            : `Process is statistically stable. No significant anomalies detected.`,
        charts: [chartConfig]
    };
}

/**
 * Predictive Risk Scoring Algorithm
 * Uses multiple historical factors to generate a forward-looking risk score (0-100)
 *
 * @param {Object} entities - array of objects (e.g. suppliers) to score
 * @param {Array<Object>} criteria - Array of criteria weighting { name: "DelayHistory", weight: 0.4, type: "negative_impact" }
 */
function predictRiskScores(entities, criteria) {
    if (!entities || !criteria || criteria.length === 0) return { error: "Missing entities or criteria" };

    const scoredEntities = entities.map(entity => {
        let totalScore = 0;
        let riskFactors = [];

        criteria.forEach(crit => {
            let val = Number(entity[crit.name] || 0);
            
            // Normalize impact
            // 'negative_impact': higher number = more risk (e.g., delay days)
            // 'positive_impact': higher number = less risk, so we inverse it
            let impact = crit.type === 'positive_impact' ? (100 - val) : val;
            
            // Cap between 0-100 just in case
            impact = Math.max(0, Math.min(100, impact));
            
            const weightedScore = impact * crit.weight;
            totalScore += weightedScore;

            if (weightedScore > (100 * crit.weight * 0.7)) {
                riskFactors.push(crit.name); // Flags anything driving high risk (>70% of potential weight)
            }
        });

        // Cap final score at 100
        const finalRiskScore = Math.min(100, Math.round(totalScore));

        let riskCategory = "Low";
        if (finalRiskScore >= 75) riskCategory = "Critical";
        else if (finalRiskScore >= 50) riskCategory = "High";
        else if (finalRiskScore >= 25) riskCategory = "Medium";

        return {
            ...entity,
            riskScore: finalRiskScore,
            riskCategory,
            primaryRiskFactors: riskFactors
        };
    });

    // Sort by highest risk
    scoredEntities.sort((a, b) => b.riskScore - a.riskScore);

    const chartConfig = {
        type: 'bar',
        data: {
            labels: scoredEntities.map(e => e.id || e.name),
            datasets: [{
                label: 'Predicted Risk Score',
                data: scoredEntities.map(e => e.riskScore),
                backgroundColor: scoredEntities.map(e => 
                    e.riskScore >= 75 ? '#ef4444' : 
                    e.riskScore >= 50 ? '#f59e0b' : 
                    e.riskScore >= 25 ? '#3b82f6' : '#10b981'
                )
            }]
        },
        options: {
            title: { display: true, text: 'Predictive Entity Risk Profiling' },
            scales: { yAxes: [{ ticks: { min: 0, max: 100 } }] }
        }
    };

    return {
        totalEvaluated: scoredEntities.length,
        criticalRisks: scoredEntities.filter(e => e.riskCategory === 'Critical').length,
        results: scoredEntities,
        charts: [chartConfig]
    };
}

module.exports = {
    detectAnomalies,
    predictRiskScores
};
