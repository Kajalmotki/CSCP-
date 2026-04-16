/**
 * simulation_engine.js — Project HEIMDALL Phase 5
 * Pure Node.js Monte Carlo Simulation Engine
 * Risk analysis, what-if scenarios, probability distributions
 * Zero external dependencies.
 */

// ─────────────────────────────────────────────
// RANDOM NUMBER GENERATORS
// ─────────────────────────────────────────────

/** Uniform random between min and max */
function randomUniform(min, max) {
    return min + Math.random() * (max - min);
}

/** Normal distribution using Box-Muller transform */
function randomNormal(mean, stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
}

/** Triangular distribution (min, mode, max) */
function randomTriangular(min, mode, max) {
    const u = Math.random();
    const fc = (mode - min) / (max - min);
    if (u < fc) {
        return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
}

// ─────────────────────────────────────────────
// STATISTICS HELPERS
// ─────────────────────────────────────────────

function calcMean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function calcStdDev(arr) {
    const mean = calcMean(arr);
    return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length);
}
function calcPercentile(sorted, p) {
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

// ─────────────────────────────────────────────
// MONTE CARLO RISK SIMULATION
// ─────────────────────────────────────────────

/**
 * Monte Carlo simulation for profit/loss risk analysis
 * @param {object} params
 * @param {object} params.revenue - { type: 'normal'|'uniform'|'triangular', ...params }
 * @param {object} params.cost - { type: 'normal'|'uniform'|'triangular', ...params }
 * @param {number} params.iterations - Number of simulation runs (default 10000)
 * @returns {object} Structured simulation results
 */
function simulateRisk(params) {
    const iterations = params.iterations || 10000;
    const results = [];

    const sampleDist = (dist) => {
        switch (dist.type) {
            case 'uniform':  return randomUniform(dist.min, dist.max);
            case 'normal':   return randomNormal(dist.mean, dist.stdDev);
            case 'triangular': return randomTriangular(dist.min, dist.mode, dist.max);
            default: return dist.value || 0;
        }
    };

    for (let i = 0; i < iterations; i++) {
        const revenue = sampleDist(params.revenue);
        const cost = sampleDist(params.cost);
        const profit = revenue - cost;
        results.push(parseFloat(profit.toFixed(2)));
    }

    results.sort((a, b) => a - b);

    const mean = calcMean(results);
    const stdDev = calcStdDev(results);
    const profitCount = results.filter(r => r > 0).length;
    const lossCount = results.filter(r => r <= 0).length;
    const probProfit = parseFloat((profitCount / iterations * 100).toFixed(1));
    const probLoss = parseFloat((lossCount / iterations * 100).toFixed(1));

    const p5 = calcPercentile(results, 5);
    const p25 = calcPercentile(results, 25);
    const p50 = calcPercentile(results, 50);
    const p75 = calcPercentile(results, 75);
    const p95 = calcPercentile(results, 95);
    const VaR_95 = -calcPercentile(results, 5); // Value at Risk at 95% confidence

    // Build histogram data (20 buckets)
    const min = results[0];
    const max = results[results.length - 1];
    const bucketSize = (max - min) / 20 || 1;
    const histogram = { labels: [], frequencies: [] };
    for (let b = 0; b < 20; b++) {
        const low = min + b * bucketSize;
        const high = low + bucketSize;
        histogram.labels.push(`$${Math.round(low / 1000)}k`);
        histogram.frequencies.push(results.filter(r => r >= low && r < high).length);
    }

    return {
        analysis_type: 'monte_carlo_risk',
        timestamp: new Date().toISOString(),
        inputs: {
            revenue: params.revenue,
            cost: params.cost,
            iterations
        },
        results: {
            mean: parseFloat(mean.toFixed(2)),
            stdDev: parseFloat(stdDev.toFixed(2)),
            median: parseFloat(p50.toFixed(2)),
            probProfit,
            probLoss,
            percentiles: {
                p5: parseFloat(p5.toFixed(2)),
                p25: parseFloat(p25.toFixed(2)),
                p50: parseFloat(p50.toFixed(2)),
                p75: parseFloat(p75.toFixed(2)),
                p95: parseFloat(p95.toFixed(2))
            },
            valueAtRisk95: parseFloat(VaR_95.toFixed(2)),
            bestCase: parseFloat(max.toFixed(2)),
            worstCase: parseFloat(min.toFixed(2))
        },
        tables: [{
            name: 'Risk Analysis Summary',
            columns: ['Metric', 'Value'],
            rows: [
                ['Iterations', iterations.toLocaleString()],
                ['Mean Profit', `$${mean.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`],
                ['Std Deviation', `$${stdDev.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`],
                ['Probability of Profit', `${probProfit}%`],
                ['Probability of Loss', `${probLoss}%`],
                ['Value at Risk (95%)', `$${VaR_95.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`],
                ['Best Case (P95)', `$${p95.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`],
                ['Worst Case (P5)', `$${p5.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`]
            ]
        }, {
            name: 'Percentile Distribution',
            columns: ['Percentile', 'Profit ($)'],
            rows: [
                ['5th (Worst Case)', `$${p5.toFixed(0)}`],
                ['25th', `$${p25.toFixed(0)}`],
                ['50th (Median)', `$${p50.toFixed(0)}`],
                ['75th', `$${p75.toFixed(0)}`],
                ['95th (Best Case)', `$${p95.toFixed(0)}`]
            ]
        }],
        charts: [{
            type: 'bar',
            labels: histogram.labels,
            datasets: [{ label: 'Frequency', data: histogram.frequencies }]
        }],
        insights: [
            `📊 After ${iterations.toLocaleString()} simulations:`,
            `✅ ${probProfit}% probability of **profit** (avg: $${mean.toFixed(0)}).`,
            probLoss > 0 ? `⚠️ ${probLoss}% probability of **loss**.` : '🎯 Zero risk of loss detected!',
            `💰 Value at Risk (95% confidence): $${VaR_95.toFixed(0)}.`,
            `Range: $${min.toFixed(0)} (worst) to $${max.toFixed(0)} (best).`
        ]
    };
}

// ─────────────────────────────────────────────
// WHAT-IF SCENARIO ANALYSIS
// ─────────────────────────────────────────────

/**
 * What-if analysis: compare multiple scenarios with defined parameters
 * @param {Array<{name: string, revenue: object, cost: object}>} scenarios
 * @param {number} iterations - Simulations per scenario
 * @returns {object} Comparison of scenarios
 */
function simulateScenarios(scenarios, iterations = 5000) {
    const results = scenarios.map(scenario => {
        const sim = simulateRisk({
            revenue: scenario.revenue,
            cost: scenario.cost,
            iterations
        });

        return {
            name: scenario.name,
            meanProfit: sim.results.mean,
            stdDev: sim.results.stdDev,
            probProfit: sim.results.probProfit,
            probLoss: sim.results.probLoss,
            VaR95: sim.results.valueAtRisk95,
            bestCase: sim.results.bestCase,
            worstCase: sim.results.worstCase
        };
    });

    // Rank scenarios by expected profit
    results.sort((a, b) => b.meanProfit - a.meanProfit);

    // Risk-adjusted ranking (Sharpe-like ratio)
    const riskAdjusted = results.map(r => ({
        ...r,
        riskAdjustedScore: r.stdDev > 0 ? parseFloat((r.meanProfit / r.stdDev).toFixed(3)) : 0
    })).sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);

    return {
        analysis_type: 'scenario_comparison',
        timestamp: new Date().toISOString(),
        inputs: { scenarioCount: scenarios.length, iterationsPerScenario: iterations },
        results: {
            bestByProfit: results[0]?.name,
            bestByRiskAdjusted: riskAdjusted[0]?.name,
            scenarios: results
        },
        tables: [{
            name: 'Scenario Comparison',
            columns: ['Scenario', 'Avg Profit', 'Std Dev', 'P(Profit)', 'P(Loss)', 'VaR (95%)'],
            rows: results.map(r => [
                r.name,
                `$${r.meanProfit.toFixed(0)}`,
                `$${r.stdDev.toFixed(0)}`,
                `${r.probProfit}%`,
                `${r.probLoss}%`,
                `$${r.VaR95.toFixed(0)}`
            ])
        }, {
            name: 'Risk-Adjusted Ranking',
            columns: ['Rank', 'Scenario', 'Risk-Adjusted Score', 'Recommendation'],
            rows: riskAdjusted.map((r, i) => [
                `#${i + 1}`,
                r.name,
                r.riskAdjustedScore.toFixed(3),
                i === 0 ? '✅ Best Risk/Reward' : '—'
            ])
        }],
        charts: [{
            type: 'bar',
            labels: results.map(r => r.name),
            datasets: [
                { label: 'Avg Profit ($)', data: results.map(r => Math.round(r.meanProfit)) },
                { label: 'Risk (Std Dev)', data: results.map(r => Math.round(r.stdDev)) }
            ]
        }],
        insights: [
            `Best scenario by profit: **${results[0]?.name}** ($${results[0]?.meanProfit.toFixed(0)} avg).`,
            `Best scenario risk-adjusted: **${riskAdjusted[0]?.name}** (score: ${riskAdjusted[0]?.riskAdjustedScore.toFixed(3)}).`,
            `⚠️ Highest risk scenario: ${[...results].sort((a, b) => b.stdDev - a.stdDev)[0]?.name}.`,
            `${scenarios.length} scenarios evaluated with ${iterations.toLocaleString()} iterations each.`
        ]
    };
}

module.exports = {
    simulateRisk,
    simulateScenarios
};
