/**
 * forecast_engine.js — Project HEIMDALL Phase 3
 * Pure Node.js Demand Forecasting Engine
 * Algorithms: SMA, WMA, Exponential Smoothing, Holt-Winters, Linear Regression
 * Zero external dependencies.
 */

// ─────────────────────────────────────────────
// SIMPLE MOVING AVERAGE (SMA)
// ─────────────────────────────────────────────

/**
 * Simple Moving Average forecast
 * @param {number[]} data - Historical demand data
 * @param {number} window - Moving average window size
 * @param {number} periods - Number of periods to forecast
 * @returns {object} Structured forecast result
 */
function forecastSMA(data, window = 3, periods = 6) {
    if (data.length < window) {
        return { error: `Need at least ${window} data points for SMA-${window}` };
    }

    // Calculate historical SMAs for accuracy measurement
    const historicalSMA = [];
    for (let i = window - 1; i < data.length; i++) {
        const slice = data.slice(i - window + 1, i + 1);
        historicalSMA.push(parseFloat((slice.reduce((a, b) => a + b, 0) / window).toFixed(2)));
    }

    // Forecast: use last 'window' values
    const lastValues = data.slice(-window);
    const forecastValue = parseFloat((lastValues.reduce((a, b) => a + b, 0) / window).toFixed(2));
    const forecasts = Array(periods).fill(forecastValue);

    // Calculate accuracy (MAPE on historical)
    let totalError = 0;
    const actualForFit = data.slice(window);
    for (let i = 0; i < Math.min(historicalSMA.length - 1, actualForFit.length); i++) {
        if (actualForFit[i] !== 0) {
            totalError += Math.abs((actualForFit[i] - historicalSMA[i]) / actualForFit[i]);
        }
    }
    const mape = actualForFit.length > 0 ? parseFloat((totalError / actualForFit.length * 100).toFixed(1)) : null;

    return buildForecastResult('sma', `Simple Moving Average (${window}-period)`, data, forecasts, mape, {
        window,
        method: 'Equal weight on last N periods'
    });
}

// ─────────────────────────────────────────────
// WEIGHTED MOVING AVERAGE (WMA)
// ─────────────────────────────────────────────

/**
 * Weighted Moving Average forecast (more recent data = higher weight)
 * @param {number[]} data - Historical demand data
 * @param {number} window - Window size
 * @param {number} periods - Forecast periods
 * @returns {object} Structured forecast result
 */
function forecastWMA(data, window = 3, periods = 6) {
    if (data.length < window) {
        return { error: `Need at least ${window} data points for WMA-${window}` };
    }

    // Generate linearly increasing weights: [1, 2, 3, ..., window]
    const weights = Array.from({ length: window }, (_, i) => i + 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);

    const lastValues = data.slice(-window);
    let wma = 0;
    for (let i = 0; i < window; i++) {
        wma += lastValues[i] * weights[i];
    }
    wma = parseFloat((wma / weightSum).toFixed(2));
    const forecasts = Array(periods).fill(wma);

    return buildForecastResult('wma', `Weighted Moving Average (${window}-period)`, data, forecasts, null, {
        window,
        weights: weights.map((w, i) => `Period -${window - i}: weight ${w}`),
        method: 'Linear increasing weights (recent data weighted more)'
    });
}

// ─────────────────────────────────────────────
// EXPONENTIAL SMOOTHING (SES)
// ─────────────────────────────────────────────

/**
 * Single Exponential Smoothing
 * @param {number[]} data - Historical demand data
 * @param {number} alpha - Smoothing factor (0.0 - 1.0)
 * @param {number} periods - Forecast periods
 * @returns {object} Structured forecast result
 */
function forecastSES(data, alpha = 0.3, periods = 6) {
    if (data.length < 2) {
        return { error: 'Need at least 2 data points for Exponential Smoothing' };
    }

    // Initialize with first value
    let forecast = data[0];
    const fitted = [forecast];

    // Walk through historical data
    for (let i = 1; i < data.length; i++) {
        forecast = alpha * data[i] + (1 - alpha) * forecast;
        fitted.push(parseFloat(forecast.toFixed(2)));
    }

    const lastForecast = parseFloat(forecast.toFixed(2));
    const forecasts = Array(periods).fill(lastForecast);

    // Calculate MAPE
    let totalError = 0;
    let count = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i] !== 0) {
            totalError += Math.abs((data[i] - fitted[i]) / data[i]);
            count++;
        }
    }
    const mape = count > 0 ? parseFloat((totalError / count * 100).toFixed(1)) : null;

    return buildForecastResult('ses', `Exponential Smoothing (α=${alpha})`, data, forecasts, mape, {
        alpha,
        method: `Exponential decay with alpha=${alpha}. Higher alpha = more responsive to recent changes.`
    });
}

// ─────────────────────────────────────────────
// DOUBLE EXPONENTIAL SMOOTHING (HOLT'S METHOD)
// ─────────────────────────────────────────────

/**
 * Double Exponential Smoothing for data with trend
 * @param {number[]} data - Historical demand data
 * @param {number} alpha - Level smoothing (0.0 - 1.0)
 * @param {number} beta - Trend smoothing (0.0 - 1.0)
 * @param {number} periods - Forecast periods
 * @returns {object} Structured forecast result
 */
function forecastHolt(data, alpha = 0.3, beta = 0.1, periods = 6) {
    if (data.length < 3) {
        return { error: 'Need at least 3 data points for Holt\'s method' };
    }

    // Initialize
    let level = data[0];
    let trend = data[1] - data[0];
    const fitted = [level];

    for (let i = 1; i < data.length; i++) {
        const prevLevel = level;
        level = alpha * data[i] + (1 - alpha) * (prevLevel + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
        fitted.push(parseFloat((level + trend).toFixed(2)));
    }

    // Generate multi-step forecasts (trend continues)
    const forecasts = [];
    for (let h = 1; h <= periods; h++) {
        forecasts.push(parseFloat((level + h * trend).toFixed(2)));
    }

    // MAPE
    let totalError = 0;
    let count = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i] !== 0) {
            totalError += Math.abs((data[i] - fitted[i]) / data[i]);
            count++;
        }
    }
    const mape = count > 0 ? parseFloat((totalError / count * 100).toFixed(1)) : null;

    const trendDirection = trend > 0 ? 'upward' : trend < 0 ? 'downward' : 'flat';

    return buildForecastResult('holt', `Holt's Double Exponential (α=${alpha}, β=${beta})`, data, forecasts, mape, {
        alpha,
        beta,
        trendPerPeriod: parseFloat(trend.toFixed(2)),
        trendDirection,
        method: `Captures level + trend. Trend is ${trendDirection} at ${Math.abs(trend).toFixed(2)} units/period.`
    });
}

// ─────────────────────────────────────────────
// LINEAR REGRESSION TREND
// ─────────────────────────────────────────────

/**
 * Linear Regression for trend-based forecasting
 * @param {number[]} data - Historical demand data
 * @param {number} periods - Forecast periods
 * @returns {object} Structured forecast result
 */
function forecastLinearRegression(data, periods = 6) {
    if (data.length < 3) {
        return { error: 'Need at least 3 data points for Linear Regression' };
    }

    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
        const x = i + 1;
        sumX += x;
        sumY += data[i];
        sumXY += x * data[i];
        sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const mean = sumY / n;
    let ssTot = 0, ssRes = 0;
    const fitted = [];
    for (let i = 0; i < n; i++) {
        const predicted = intercept + slope * (i + 1);
        fitted.push(parseFloat(predicted.toFixed(2)));
        ssTot += Math.pow(data[i] - mean, 2);
        ssRes += Math.pow(data[i] - predicted, 2);
    }
    const rSquared = ssTot > 0 ? parseFloat((1 - ssRes / ssTot).toFixed(4)) : 0;

    // Forecast
    const forecasts = [];
    for (let h = 1; h <= periods; h++) {
        forecasts.push(parseFloat((intercept + slope * (n + h)).toFixed(2)));
    }

    // MAPE
    let totalError = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
        if (data[i] !== 0) {
            totalError += Math.abs((data[i] - fitted[i]) / data[i]);
            count++;
        }
    }
    const mape = count > 0 ? parseFloat((totalError / count * 100).toFixed(1)) : null;

    const trendDirection = slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'flat';

    return buildForecastResult('linear_regression', 'Linear Regression', data, forecasts, mape, {
        slope: parseFloat(slope.toFixed(4)),
        intercept: parseFloat(intercept.toFixed(2)),
        rSquared,
        trendDirection,
        equation: `y = ${intercept.toFixed(2)} + ${slope.toFixed(4)}x`,
        method: `Linear trend: ${trendDirection} at ${Math.abs(slope).toFixed(2)} units/period. R² = ${rSquared} (${rSquared > 0.8 ? 'strong' : rSquared > 0.5 ? 'moderate' : 'weak'} fit).`
    });
}

// ─────────────────────────────────────────────
// MULTI-MODEL COMPARISON
// ─────────────────────────────────────────────

/**
 * Run all forecasting models and compare their results
 * @param {number[]} data - Historical demand data
 * @param {number} periods - Forecast periods
 * @returns {object} Comparison of all models
 */
function forecastCompare(data, periods = 6) {
    const models = [
        forecastSMA(data, 3, periods),
        forecastWMA(data, 3, periods),
        forecastSES(data, 0.3, periods),
        forecastHolt(data, 0.3, 0.1, periods),
        forecastLinearRegression(data, periods)
    ].filter(m => !m.error);

    // Sort by accuracy (lowest MAPE first)
    models.sort((a, b) => (a.accuracy?.mape ?? 999) - (b.accuracy?.mape ?? 999));

    const bestModel = models[0];

    return {
        analysis_type: 'forecast_comparison',
        timestamp: new Date().toISOString(),
        inputs: { dataPoints: data.length, forecastPeriods: periods },
        results: {
            bestModel: bestModel?.modelName || 'N/A',
            bestMAPE: bestModel?.accuracy?.mape ?? null,
            models: models.map(m => ({
                model: m.modelName,
                mape: m.accuracy?.mape ?? null,
                nextPeriodForecast: m.forecasts?.[0] ?? null,
                forecasts: m.forecasts
            }))
        },
        tables: [{
            name: 'Model Comparison',
            columns: ['Model', 'MAPE (%)', 'Next Period Forecast', 'Trend'],
            rows: models.map(m => [
                m.modelName,
                m.accuracy?.mape != null ? `${m.accuracy.mape}%` : 'N/A',
                m.forecasts?.[0]?.toString() ?? 'N/A',
                m.parameters?.trendDirection || 'N/A'
            ])
        }, {
            name: 'Forecast Values',
            columns: ['Period', ...models.map(m => m.modelName.split(' ')[0])],
            rows: Array.from({ length: periods }, (_, i) => [
                `Period ${data.length + i + 1}`,
                ...models.map(m => m.forecasts?.[i]?.toString() ?? 'N/A')
            ])
        }],
        charts: [{
            type: 'line',
            labels: [
                ...data.map((_, i) => `P${i + 1}`),
                ...Array.from({ length: periods }, (_, i) => `F${i + 1}`)
            ],
            datasets: [
                { label: 'Actual', data: [...data, ...Array(periods).fill(null)] },
                ...models.slice(0, 3).map(m => ({
                    label: m.modelName.split('(')[0].trim(),
                    data: [...Array(data.length).fill(null), ...m.forecasts]
                }))
            ]
        }],
        insights: [
            `Best model: ${bestModel?.modelName} (MAPE: ${bestModel?.accuracy?.mape ?? 'N/A'}%).`,
            `${models.length} models evaluated on ${data.length} historical data points.`,
            bestModel?.parameters?.trendDirection
                ? `Detected trend: ${bestModel.parameters.trendDirection}.`
                : 'No clear trend detected.',
            `Next period forecast (best model): ${bestModel?.forecasts?.[0] ?? 'N/A'} units.`
        ],
        recommendation: bestModel?.modelName || 'Insufficient data'
    };
}

// ─────────────────────────────────────────────
// HELPER: Build standard forecast result
// ─────────────────────────────────────────────

function buildForecastResult(type, modelName, historicalData, forecasts, mape, parameters) {
    const allLabels = [
        ...historicalData.map((_, i) => `P${i + 1}`),
        ...forecasts.map((_, i) => `F${i + 1}`)
    ];

    return {
        analysis_type: `forecast_${type}`,
        timestamp: new Date().toISOString(),
        modelName,
        inputs: { dataPoints: historicalData.length, forecastPeriods: forecasts.length },
        accuracy: { mape },
        forecasts,
        parameters,
        tables: [{
            name: `${modelName} Forecast`,
            columns: ['Period', 'Value', 'Type'],
            rows: [
                ...historicalData.map((v, i) => [`Period ${i + 1}`, v.toString(), 'Actual']),
                ...forecasts.map((v, i) => [`Period ${historicalData.length + i + 1}`, v.toString(), 'Forecast'])
            ]
        }],
        charts: [{
            type: 'line',
            labels: allLabels,
            datasets: [
                { label: 'Actual', data: [...historicalData, ...Array(forecasts.length).fill(null)] },
                { label: 'Forecast', data: [...Array(historicalData.length).fill(null), ...forecasts] }
            ]
        }],
        insights: [
            `Model: ${modelName}.`,
            mape != null ? `Accuracy (MAPE): ${mape}% — ${mape < 10 ? 'Excellent' : mape < 20 ? 'Good' : mape < 30 ? 'Fair' : 'Needs improvement'}.` : 'Accuracy: Not enough data for MAPE calculation.',
            `Next period forecast: ${forecasts[0]} units.`
        ]
    };
}


module.exports = {
    forecastSMA,
    forecastWMA,
    forecastSES,
    forecastHolt,
    forecastLinearRegression,
    forecastCompare
};
