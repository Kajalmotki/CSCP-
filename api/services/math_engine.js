/**
 * math_engine.js — Project HEIMDALL Phase 2
 * Pure Node.js Math Engine for Supply Chain Calculations
 * No external dependencies — just math.
 */

// ─────────────────────────────────────────────
// BREAK-EVEN POINT (BEP)
// ─────────────────────────────────────────────

/**
 * Calculate Break-Even Point
 * @param {number} fixedCost - Total fixed costs
 * @param {number} variableCost - Variable cost per unit
 * @param {number} sellingPrice - Selling price per unit
 * @returns {object} BEP analysis with chart data
 */
function calculateBEP(fixedCost, variableCost, sellingPrice) {
    if (sellingPrice <= variableCost) {
        return {
            analysis_type: 'break_even',
            error: 'Selling price must be greater than variable cost',
            inputs: { fixedCost, variableCost, sellingPrice }
        };
    }

    const contributionMargin = sellingPrice - variableCost;
    const bepUnits = Math.ceil(fixedCost / contributionMargin);
    const bepRevenue = bepUnits * sellingPrice;
    const contributionMarginRatio = (contributionMargin / sellingPrice * 100).toFixed(1);

    // Generate chart data points (0 to 2x BEP)
    const maxUnits = Math.ceil(bepUnits * 2);
    const step = Math.max(1, Math.floor(maxUnits / 8));
    const labels = [];
    const totalCostData = [];
    const revenueData = [];

    for (let u = 0; u <= maxUnits; u += step) {
        labels.push(u.toString());
        totalCostData.push(fixedCost + (variableCost * u));
        revenueData.push(sellingPrice * u);
    }

    return {
        analysis_type: 'break_even',
        timestamp: new Date().toISOString(),
        inputs: { fixedCost, variableCost, sellingPrice },
        calculations: {
            contributionMargin,
            contributionMarginRatio: parseFloat(contributionMarginRatio)
        },
        results: {
            bepUnits,
            bepRevenue,
            profitAtDoubleVolume: (bepUnits * 2 * contributionMargin) - fixedCost
        },
        tables: [{
            name: 'Break-Even Analysis',
            columns: ['Parameter', 'Value'],
            rows: [
                ['Fixed Cost', `$${fixedCost.toLocaleString()}`],
                ['Variable Cost/Unit', `$${variableCost.toLocaleString()}`],
                ['Selling Price/Unit', `$${sellingPrice.toLocaleString()}`],
                ['Contribution Margin/Unit', `$${contributionMargin.toLocaleString()}`],
                ['CM Ratio', `${contributionMarginRatio}%`],
                ['Break-Even Units', bepUnits.toLocaleString()],
                ['Break-Even Revenue', `$${bepRevenue.toLocaleString()}`]
            ]
        }],
        charts: [{
            type: 'line',
            labels,
            datasets: [
                { label: 'Total Cost', data: totalCostData },
                { label: 'Revenue', data: revenueData }
            ]
        }],
        insights: [
            `Break-even occurs at ${bepUnits.toLocaleString()} units ($${bepRevenue.toLocaleString()} revenue).`,
            `Each additional unit beyond BEP generates $${contributionMargin.toLocaleString()} profit.`,
            `At double BEP volume (${(bepUnits * 2).toLocaleString()} units), profit = $${((bepUnits * 2 * contributionMargin) - fixedCost).toLocaleString()}.`
        ]
    };
}

// ─────────────────────────────────────────────
// EXPECTED MONETARY VALUE (EMV)
// ─────────────────────────────────────────────

/**
 * Calculate Expected Monetary Value for risk scenarios
 * @param {Array<{name: string, probability: number, impact: number}>} scenarios
 * @param {number} investmentCost - Cost of risk mitigation
 * @returns {object} EMV analysis
 */
function calculateEMV(scenarios, investmentCost = 0) {
    const results = scenarios.map(s => ({
        name: s.name,
        probability: s.probability,
        impact: s.impact,
        emv: parseFloat((s.probability * s.impact).toFixed(2))
    }));

    const totalEMV = parseFloat(results.reduce((sum, r) => sum + r.emv, 0).toFixed(2));
    const emvNotInvesting = totalEMV;
    const emvInvesting = investmentCost;
    const recommendation = emvNotInvesting > emvInvesting ? 'INVEST (Mitigate)' : 'ACCEPT (Do Not Invest)';
    const breakEvenInvestment = totalEMV;

    // Determine CSCP risk response
    let riskResponse;
    if (emvNotInvesting < 1000) riskResponse = 'Accept';
    else if (emvNotInvesting > investmentCost * 3) riskResponse = 'Avoid';
    else if (investmentCost > 0 && emvInvesting < emvNotInvesting) riskResponse = 'Mitigate';
    else riskResponse = 'Transfer';

    return {
        analysis_type: 'emv',
        timestamp: new Date().toISOString(),
        inputs: { scenarios, investmentCost },
        results: {
            scenarioEMVs: results,
            totalEMV,
            emvNotInvesting,
            emvInvesting,
            recommendation,
            breakEvenInvestment,
            riskResponse
        },
        tables: [{
            name: 'EMV Analysis',
            columns: ['Scenario', 'Probability', 'Impact ($)', 'EMV ($)'],
            rows: results.map(r => [r.name, `${(r.probability * 100).toFixed(0)}%`, `$${r.impact.toLocaleString()}`, `$${r.emv.toLocaleString()}`])
        }, {
            name: 'Decision Matrix',
            columns: ['Option', 'Cost ($)', 'Recommendation'],
            rows: [
                ['Do Not Invest', `$${emvNotInvesting.toLocaleString()}`, emvNotInvesting <= emvInvesting ? '✅ Better' : '❌ Riskier'],
                ['Invest in Mitigation', `$${emvInvesting.toLocaleString()}`, emvInvesting < emvNotInvesting ? '✅ Better' : '❌ Costlier'],
                ['Break-Even Point', `$${breakEvenInvestment.toLocaleString()}`, 'Max investment justified']
            ]
        }],
        insights: [
            `Total Expected Monetary Value of risk = $${totalEMV.toLocaleString()}.`,
            `Recommendation: ${recommendation}.`,
            `CSCP Risk Response: ${riskResponse}.`,
            `Maximum justified investment: $${breakEvenInvestment.toLocaleString()}.`
        ]
    };
}

// ─────────────────────────────────────────────
// ECONOMIC ORDER QUANTITY (EOQ)
// ─────────────────────────────────────────────

/**
 * Calculate Economic Order Quantity
 * @param {number} annualDemand - Annual demand (units)
 * @param {number} orderCost - Cost per order ($)
 * @param {number} holdingCost - Annual holding cost per unit ($)
 * @returns {object} EOQ analysis with chart data
 */
function calculateEOQ(annualDemand, orderCost, holdingCost) {
    const eoq = Math.round(Math.sqrt((2 * annualDemand * orderCost) / holdingCost));
    const ordersPerYear = Math.round(annualDemand / eoq);
    const totalOrderCost = ordersPerYear * orderCost;
    const totalHoldingCost = (eoq / 2) * holdingCost;
    const totalCost = totalOrderCost + totalHoldingCost;
    const cycleTime = parseFloat((365 / ordersPerYear).toFixed(1));

    // Generate chart data for total cost curve
    const labels = [];
    const orderCostData = [];
    const holdingCostData = [];
    const totalCostData = [];
    const minQ = Math.max(1, Math.floor(eoq * 0.2));
    const maxQ = Math.ceil(eoq * 3);
    const step = Math.max(1, Math.floor((maxQ - minQ) / 10));

    for (let q = minQ; q <= maxQ; q += step) {
        labels.push(q.toString());
        const oc = (annualDemand / q) * orderCost;
        const hc = (q / 2) * holdingCost;
        orderCostData.push(Math.round(oc));
        holdingCostData.push(Math.round(hc));
        totalCostData.push(Math.round(oc + hc));
    }

    return {
        analysis_type: 'eoq',
        timestamp: new Date().toISOString(),
        inputs: { annualDemand, orderCost, holdingCost },
        results: {
            eoq,
            ordersPerYear,
            totalOrderCost: Math.round(totalOrderCost),
            totalHoldingCost: Math.round(totalHoldingCost),
            totalCost: Math.round(totalCost),
            cycleTimeDays: cycleTime
        },
        tables: [{
            name: 'EOQ Analysis',
            columns: ['Parameter', 'Value'],
            rows: [
                ['Annual Demand', `${annualDemand.toLocaleString()} units`],
                ['Order Cost', `$${orderCost.toLocaleString()}`],
                ['Holding Cost/Unit/Year', `$${holdingCost.toLocaleString()}`],
                ['**EOQ (Optimal Order Qty)**', `**${eoq.toLocaleString()} units**`],
                ['Orders Per Year', ordersPerYear.toString()],
                ['Cycle Time', `${cycleTime} days`],
                ['Total Order Cost/Year', `$${Math.round(totalOrderCost).toLocaleString()}`],
                ['Total Holding Cost/Year', `$${Math.round(totalHoldingCost).toLocaleString()}`],
                ['**Total Cost/Year**', `**$${Math.round(totalCost).toLocaleString()}**`]
            ]
        }],
        charts: [{
            type: 'line',
            labels,
            datasets: [
                { label: 'Order Cost', data: orderCostData },
                { label: 'Holding Cost', data: holdingCostData },
                { label: 'Total Cost', data: totalCostData }
            ]
        }],
        insights: [
            `Optimal order quantity (EOQ) = ${eoq.toLocaleString()} units.`,
            `This results in ${ordersPerYear} orders per year (every ${cycleTime} days).`,
            `Minimum total inventory cost = $${Math.round(totalCost).toLocaleString()}/year.`,
            `At EOQ, ordering cost ($${Math.round(totalOrderCost).toLocaleString()}) ≈ holding cost ($${Math.round(totalHoldingCost).toLocaleString()}).`
        ]
    };
}

// ─────────────────────────────────────────────
// REORDER POINT (ROP)
// ─────────────────────────────────────────────

/**
 * Calculate Reorder Point with Safety Stock
 * @param {number} dailyDemand - Average daily demand
 * @param {number} leadTimeDays - Supplier lead time in days
 * @param {number} demandStdDev - Standard deviation of daily demand
 * @param {number} serviceLevel - Desired service level (0.90 to 0.99)
 * @returns {object} ROP analysis
 */
function calculateROP(dailyDemand, leadTimeDays, demandStdDev = 0, serviceLevel = 0.95) {
    // Z-scores for common service levels
    const zScores = {
        0.90: 1.28, 0.91: 1.34, 0.92: 1.41, 0.93: 1.48, 0.94: 1.55,
        0.95: 1.65, 0.96: 1.75, 0.97: 1.88, 0.98: 2.05, 0.99: 2.33
    };

    const z = zScores[serviceLevel] || 1.65;
    const avgDemandDuringLT = dailyDemand * leadTimeDays;
    const safetyStock = Math.ceil(z * demandStdDev * Math.sqrt(leadTimeDays));
    const rop = Math.ceil(avgDemandDuringLT + safetyStock);

    return {
        analysis_type: 'reorder_point',
        timestamp: new Date().toISOString(),
        inputs: { dailyDemand, leadTimeDays, demandStdDev, serviceLevel },
        results: {
            rop,
            safetyStock,
            avgDemandDuringLeadTime: Math.round(avgDemandDuringLT),
            zScore: z
        },
        tables: [{
            name: 'Reorder Point Analysis',
            columns: ['Parameter', 'Value'],
            rows: [
                ['Daily Demand', `${dailyDemand} units`],
                ['Lead Time', `${leadTimeDays} days`],
                ['Demand Std Dev', `${demandStdDev} units`],
                ['Service Level', `${(serviceLevel * 100).toFixed(0)}%`],
                ['Z-Score', z.toString()],
                ['Avg Demand During LT', `${Math.round(avgDemandDuringLT)} units`],
                ['Safety Stock', `${safetyStock} units`],
                ['**Reorder Point (ROP)**', `**${rop} units**`]
            ]
        }],
        insights: [
            `Reorder when inventory reaches ${rop} units.`,
            `Safety stock buffer = ${safetyStock} units (${(serviceLevel * 100).toFixed(0)}% service level).`,
            `Expected demand during lead time = ${Math.round(avgDemandDuringLT)} units.`
        ]
    };
}

// ─────────────────────────────────────────────
// SAFETY STOCK
// ─────────────────────────────────────────────

/**
 * Calculate Safety Stock levels
 * @param {number} demandStdDev - Standard deviation of demand
 * @param {number} leadTimeDays - Lead time in days
 * @param {number} leadTimeStdDev - Standard deviation of lead time
 * @param {number} avgDailyDemand - Average daily demand
 * @param {number} serviceLevel - Target service level
 * @returns {object} Safety stock analysis
 */
function calculateSafetyStock(demandStdDev, leadTimeDays, leadTimeStdDev = 0, avgDailyDemand = 0, serviceLevel = 0.95) {
    const zScores = {
        0.90: 1.28, 0.95: 1.65, 0.97: 1.88, 0.99: 2.33
    };
    const z = zScores[serviceLevel] || 1.65;

    // Combined variability formula
    const demandVariance = leadTimeDays * Math.pow(demandStdDev, 2);
    const leadTimeVariance = Math.pow(avgDailyDemand, 2) * Math.pow(leadTimeStdDev, 2);
    const combinedStdDev = Math.sqrt(demandVariance + leadTimeVariance);
    const safetyStock = Math.ceil(z * combinedStdDev);

    // Compare service levels
    const comparison = [0.90, 0.95, 0.97, 0.99].map(sl => ({
        level: `${(sl * 100).toFixed(0)}%`,
        stock: Math.ceil((zScores[sl] || 1.65) * combinedStdDev)
    }));

    return {
        analysis_type: 'safety_stock',
        timestamp: new Date().toISOString(),
        inputs: { demandStdDev, leadTimeDays, leadTimeStdDev, avgDailyDemand, serviceLevel },
        results: { safetyStock, combinedStdDev: parseFloat(combinedStdDev.toFixed(2)), zScore: z },
        tables: [{
            name: 'Safety Stock by Service Level',
            columns: ['Service Level', 'Z-Score', 'Safety Stock (units)'],
            rows: comparison.map(c => [c.level, (zScores[parseFloat(c.level) / 100] || 1.65).toString(), c.stock.toString()])
        }],
        insights: [
            `At ${(serviceLevel * 100).toFixed(0)}% service level, safety stock = ${safetyStock} units.`,
            `Combined demand & lead time variability = ${combinedStdDev.toFixed(2)} units.`
        ]
    };
}

// ─────────────────────────────────────────────
// QUICK CHART URL BUILDER
// ─────────────────────────────────────────────

/**
 * Build a QuickChart URL from chart data
 * @param {object} chartData - { type, labels, datasets }
 * @returns {string} QuickChart URL
 */
function buildChartUrl(chartData) {
    const config = {
        type: chartData.type || 'line',
        data: {
            labels: chartData.labels,
            datasets: chartData.datasets.map(ds => ({
                label: ds.label,
                data: ds.data
            }))
        }
    };
    const json = JSON.stringify(config).replace(/\s/g, '');
    return `https://quickchart.io/chart?c=${encodeURIComponent(json)}`;
}


module.exports = {
    calculateBEP,
    calculateEMV,
    calculateEOQ,
    calculateROP,
    calculateSafetyStock,
    buildChartUrl
};
