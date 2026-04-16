/**
 * HEIMDALL Phase 7 — ML Intelligence Service
 * Pure Node.js Algorithms (Zero Dependencies)
 */

/**
 * 7.1 — Predictive Risk & Delay Model
 * Simplified version of XGBoost/Random Forest logic in JS
 * Predicts delay probability based on historical factors
 */
function predictEntityRisk(features, modelType = 'xgboost') {
    // Standard feature extraction
    const { leadTime, historicalDelay, volume, volatility } = features;
    
    // Weighted logic mimics a decision tree outcome
    let riskScore = 0;
    riskScore += (leadTime > 30 ? 25 : 10);
    riskScore += (historicalDelay > 5 ? 35 : 5);
    riskScore += (volatility > 0.2 ? 20 : 5);
    riskScore += (volume > 1000 ? 10 : 5); // Larger volume = more complexity risk

    // Normalize 0-100
    riskScore = Math.min(100, riskScore);

    let category = 'Low';
    if (riskScore >= 75) category = 'Critical';
    else if (riskScore >= 50) category = 'High';
    else if (riskScore >= 25) category = 'Medium';

    return {
        model: modelType,
        predictedRiskScore: riskScore,
        category,
        confidenceInterval: [riskScore - 5, riskScore + 5],
        timestamp: new Date().toISOString()
    };
}

/**
 * 7.2 — Anomaly Detection (Z-Score + Isolation Pattern)
 */
function detectAnomalies(data, threshold = 2.0) {
    if (!data || data.length === 0) return { error: "No data provided" };
    
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const stdDev = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);

    const anomalies = data.map((val, i) => {
        const zScore = stdDev === 0 ? 0 : Math.abs((val - mean) / stdDev);
        if (zScore > threshold) {
            return { index: i, value: val, zScore: zScore.toFixed(2), type: val > mean ? 'Spike' : 'Drop' };
        }
        return null;
    }).filter(a => a !== null);

    return {
        anomalies,
        mean: Number(mean.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2)),
        thresholdUsed: threshold,
        recommendation: anomalies.length > 0 ? "Potential disruption detected. Review logistics logs." : "Stable operation window."
    };
}

/**
 * 7.3 — NLP Entity Extraction
 * Parses natural language to pull out SCM entities
 */
function extractSCMEntities(text) {
    const suppliers = text.match(/\b(Supplier [A-Z]|Alpha Corp|Beta Logistics|OmniGlobal)\b/gi) || [];
    const locations = text.match(/\b(Shanghai|Rotterdam|Los Angeles|Port of Mumbai|Suez Canal)\b/gi) || [];
    const dates = text.match(/\b(Monday|Tuesday|Q[1-4]|202[5-6]|Next Week)\b/gi) || [];
    
    return {
        suppliers,
        locations,
        dates,
        entitiesCount: suppliers.length + locations.length + dates.length
    };
}

module.exports = {
    predictEntityRisk,
    detectAnomalies,
    extractSCMEntities
};
