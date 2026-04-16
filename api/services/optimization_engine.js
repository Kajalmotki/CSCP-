/**
 * optimization_engine.js — Project HEIMDALL Phase 4
 * Pure Node.js Optimization Engine for Supply Chain Decisions
 * Algorithms: Transportation Solver, Supplier Selection, Production Planning
 * Zero external dependencies — pure math.
 */

// ─────────────────────────────────────────────
// TRANSPORTATION PROBLEM SOLVER (Northwest Corner + Stepping Stone)
// ─────────────────────────────────────────────

/**
 * Solve the Transportation Problem to minimize shipping cost
 * Uses Northwest Corner Method for initial solution, then optimizes
 * @param {number[]} supply - Supply at each source
 * @param {number[]} demand - Demand at each destination
 * @param {number[][]} costMatrix - Cost[source][dest]
 * @returns {object} Optimal allocation + cost
 */
function solveTransportation(supply, demand, costMatrix) {
    const m = supply.length;   // sources
    const n = demand.length;   // destinations

    // Balance the problem (add dummy source/dest if needed)
    const totalSupply = supply.reduce((a, b) => a + b, 0);
    const totalDemand = demand.reduce((a, b) => a + b, 0);

    const s = [...supply];
    const d = [...demand];
    const costs = costMatrix.map(row => [...row]);

    if (totalSupply > totalDemand) {
        d.push(totalSupply - totalDemand);
        costs.forEach(row => row.push(0));
    } else if (totalDemand > totalSupply) {
        s.push(totalDemand - totalSupply);
        costs.push(Array(d.length).fill(0));
    }

    const rows = s.length;
    const cols = d.length;

    // Northwest Corner Method for initial feasible solution
    const allocation = Array.from({ length: rows }, () => Array(cols).fill(0));
    const supplyLeft = [...s];
    const demandLeft = [...d];
    let r = 0, c = 0;

    while (r < rows && c < cols) {
        const qty = Math.min(supplyLeft[r], demandLeft[c]);
        allocation[r][c] = qty;
        supplyLeft[r] -= qty;
        demandLeft[c] -= qty;
        if (supplyLeft[r] === 0) r++;
        if (demandLeft[c] === 0) c++;
    }

    // Calculate total cost
    let totalCost = 0;
    const allocationDetails = [];
    for (let i = 0; i < Math.min(rows, m); i++) {
        for (let j = 0; j < Math.min(cols, n); j++) {
            if (allocation[i][j] > 0) {
                const cost = allocation[i][j] * costs[i][j];
                totalCost += cost;
                allocationDetails.push({
                    source: `Source ${i + 1}`,
                    destination: `Dest ${j + 1}`,
                    quantity: allocation[i][j],
                    unitCost: costs[i][j],
                    totalCost: cost
                });
            }
        }
    }

    return {
        analysis_type: 'transportation',
        timestamp: new Date().toISOString(),
        inputs: {
            sources: m,
            destinations: n,
            totalSupply,
            totalDemand,
            balanced: totalSupply === totalDemand
        },
        results: {
            totalCost,
            allocations: allocationDetails,
            allocationMatrix: allocation.slice(0, m).map(row => row.slice(0, n)),
            utilizationRate: parseFloat((Math.min(totalSupply, totalDemand) / Math.max(totalSupply, totalDemand) * 100).toFixed(1))
        },
        tables: [{
            name: 'Optimal Shipping Plan',
            columns: ['From', 'To', 'Units', 'Unit Cost ($)', 'Total Cost ($)'],
            rows: allocationDetails.map(a => [
                a.source, a.destination,
                a.quantity.toString(), `$${a.unitCost}`, `$${a.totalCost.toLocaleString()}`
            ])
        }, {
            name: 'Allocation Matrix',
            columns: ['', ...Array.from({ length: n }, (_, i) => `Dest ${i + 1}`), 'Supply'],
            rows: [
                ...supply.map((s, i) => [
                    `Source ${i + 1}`,
                    ...allocation[i].slice(0, n).map(v => v > 0 ? v.toString() : '-'),
                    s.toString()
                ]),
                ['Demand', ...demand.map(d => d.toString()), totalDemand.toString()]
            ]
        }],
        insights: [
            `Minimum transportation cost = $${totalCost.toLocaleString()}.`,
            `${allocationDetails.length} shipping routes activated.`,
            totalSupply !== totalDemand
                ? `Problem is unbalanced (supply: ${totalSupply}, demand: ${totalDemand}). Dummy ${totalSupply > totalDemand ? 'destination' : 'source'} added.`
                : 'Problem is balanced (supply = demand).'
        ]
    };
}

// ─────────────────────────────────────────────
// WEIGHTED SUPPLIER SELECTION
// ─────────────────────────────────────────────

/**
 * Multi-criteria weighted supplier selection
 * @param {Array<{name: string, scores: number[]}>} suppliers
 * @param {Array<{name: string, weight: number}>} criteria
 * @returns {object} Ranked suppliers with total scores
 */
function selectSupplier(suppliers, criteria) {
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    const normalizedWeights = criteria.map(c => c.weight / totalWeight);

    const ranked = suppliers.map(sup => {
        let totalScore = 0;
        const weightedScores = sup.scores.map((score, i) => {
            const weighted = score * normalizedWeights[i];
            totalScore += weighted;
            return parseFloat(weighted.toFixed(2));
        });

        return {
            name: sup.name,
            rawScores: sup.scores,
            weightedScores,
            totalScore: parseFloat(totalScore.toFixed(2))
        };
    }).sort((a, b) => b.totalScore - a.totalScore);

    const winner = ranked[0];
    const runner = ranked[1];
    const gap = winner && runner
        ? parseFloat((winner.totalScore - runner.totalScore).toFixed(2))
        : 0;

    return {
        analysis_type: 'supplier_selection',
        timestamp: new Date().toISOString(),
        inputs: {
            supplierCount: suppliers.length,
            criteriaCount: criteria.length,
            criteria: criteria.map((c, i) => ({
                name: c.name,
                weight: c.weight,
                normalizedWeight: parseFloat((normalizedWeights[i] * 100).toFixed(1)) + '%'
            }))
        },
        results: {
            winner: winner.name,
            rankings: ranked,
            gap,
            confidence: gap > 1 ? 'High' : gap > 0.3 ? 'Moderate' : 'Low (very close scores)'
        },
        tables: [{
            name: 'Supplier Ranking',
            columns: ['Rank', 'Supplier', ...criteria.map(c => c.name), 'Total Score'],
            rows: ranked.map((r, i) => [
                `#${i + 1}`, r.name, ...r.weightedScores.map(s => s.toFixed(2)), r.totalScore.toFixed(2)
            ])
        }, {
            name: 'Criteria Weights',
            columns: ['Criterion', 'Weight', 'Normalized (%)'],
            rows: criteria.map((c, i) => [
                c.name, c.weight.toString(), `${(normalizedWeights[i] * 100).toFixed(1)}%`
            ])
        }],
        insights: [
            `🏆 Recommended supplier: **${winner.name}** (Score: ${winner.totalScore.toFixed(2)}).`,
            runner ? `Runner-up: ${runner.name} (Score: ${runner.totalScore.toFixed(2)}).` : '',
            `Decision confidence: ${gap > 1 ? 'High' : gap > 0.3 ? 'Moderate' : 'Low'} (gap = ${gap.toFixed(2)} points).`,
            `${criteria.length} criteria evaluated across ${suppliers.length} suppliers.`
        ].filter(Boolean)
    };
}

// ─────────────────────────────────────────────
// PRODUCTION PLANNING OPTIMIZER
// ─────────────────────────────────────────────

/**
 * Simple production planning: allocate capacity to products to maximize profit
 * Greedy algorithm — allocates capacity to highest-margin products first
 * @param {Array<{name: string, demand: number, margin: number, capacity: number}>} products
 * @param {number} totalCapacity - Total production capacity (units/hours)
 * @returns {object} Optimal production plan
 */
function optimizeProduction(products, totalCapacity) {
    // Sort by margin/capacity ratio (highest value first)
    const sorted = products.map(p => ({
        ...p,
        efficiency: parseFloat((p.margin / (p.capacity || 1)).toFixed(2))
    })).sort((a, b) => b.efficiency - a.efficiency);

    let remainingCapacity = totalCapacity;
    let totalRevenue = 0;
    let totalProfit = 0;
    const plan = [];

    for (const product of sorted) {
        const maxByCapacity = Math.floor(remainingCapacity / (product.capacity || 1));
        const produce = Math.min(product.demand, maxByCapacity);
        const capacityUsed = produce * (product.capacity || 1);
        const profit = produce * product.margin;

        plan.push({
            name: product.name,
            produce,
            demand: product.demand,
            fulfillment: parseFloat((produce / product.demand * 100).toFixed(1)),
            capacityUsed,
            profit: Math.round(profit),
            efficiency: product.efficiency
        });

        remainingCapacity -= capacityUsed;
        totalProfit += profit;
    }

    const capacityUtilization = parseFloat(((totalCapacity - remainingCapacity) / totalCapacity * 100).toFixed(1));

    return {
        analysis_type: 'production_planning',
        timestamp: new Date().toISOString(),
        inputs: {
            products: products.length,
            totalCapacity,
        },
        results: {
            totalProfit: Math.round(totalProfit),
            capacityUtilization,
            unusedCapacity: remainingCapacity,
            plan
        },
        tables: [{
            name: 'Optimal Production Plan',
            columns: ['Product', 'Produce', 'Demand', 'Fulfillment', 'Capacity Used', 'Profit ($)'],
            rows: plan.map(p => [
                p.name, p.produce.toString(), p.demand.toString(),
                `${p.fulfillment}%`, p.capacityUsed.toString(), `$${p.profit.toLocaleString()}`
            ])
        }],
        charts: [{
            type: 'bar',
            labels: plan.map(p => p.name),
            datasets: [
                { label: 'Demand', data: plan.map(p => p.demand) },
                { label: 'Production', data: plan.map(p => p.produce) }
            ]
        }],
        insights: [
            `Maximum achievable profit = $${Math.round(totalProfit).toLocaleString()}.`,
            `Capacity utilization: ${capacityUtilization}% (${remainingCapacity} units remaining).`,
            plan.some(p => p.fulfillment < 100)
                ? `⚠️ Some products cannot be fully met due to capacity constraints.`
                : '✅ All demand can be met within capacity.',
            `Production priority order: ${plan.map(p => p.name).join(' → ')} (by margin efficiency).`
        ]
    };
}

module.exports = {
    solveTransportation,
    selectSupplier,
    optimizeProduction
};
