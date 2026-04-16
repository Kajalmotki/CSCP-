/**
 * HEIMDALL Phase 9 — Global Intelligence Engine
 * Pure Node.js Algorithms (Zero Dependencies)
 */

/**
 * Propagates a disruptive shock through a supply chain dependency network
 * Models the 'ripple effect' (e.g. Bullwhip effect or bankruptcy cascade)
 *
 * @param {Array} nodes - All nodes in the network [{ id: 'SupplierA', bufferStock: 100 }, ...]
 * @param {Array} edges - Dependency links [{ source: 'SupplierA', target: 'AssemblyHub', dependencyFactor: 0.8 }, ...]
 * @param {String} originNodeId - The node where the shock originates
 * @param {Number} shockMagnitude - Scale of the shock (0.0 to 1.0) e.g., 1.0 = total failure
 */
function simulateShockPropagation(nodes, edges, originNodeId, shockMagnitude = 1.0) {
    if (!nodes || !edges || !originNodeId) return { error: "Missing required network parameters" };

    const graph = {};
    const nodeData = {};

    // Build directed graph (source -> target means target DEPENDS ON source)
    nodes.forEach(n => {
        graph[n.id] = [];
        nodeData[n.id] = { ...n, initialRisk: 0, finalRisk: 0, shockImpact: 0 };
    });

    edges.forEach(e => {
        if (!graph[e.source]) graph[e.source] = [];
        // The dependencyFactor determines how much shock passes through. 
        // 1.0 = total dependency, 0.1 = minor alternative options exist
        graph[e.source].push({ target: e.target, factor: e.dependencyFactor || 1.0 });
    });

    // Initialize Shock at Origin
    if (!nodeData[originNodeId]) return { error: "Origin node not found in network" };
    nodeData[originNodeId].shockImpact = shockMagnitude;
    nodeData[originNodeId].initialRisk = shockMagnitude;

    // Breadth-First Propagation
    const queue = [originNodeId];
    const visited = new Set();
    const impactTimeline = [{ level: 0, nodes: [originNodeId] }];
    let maxImpact = shockMagnitude;

    while (queue.length > 0) {
        const currentId = queue.shift();
        const currentImpact = nodeData[currentId].shockImpact;

        visited.add(currentId);

        if (graph[currentId]) {
            graph[currentId].forEach(edge => {
                const targetId = edge.target;
                
                // Buffer capacity mitigates the shock. E.g., high inventory buffer stock reduces the impact 
                const bufferResistance = nodeData[targetId].bufferStock ? (nodeData[targetId].bufferStock / 1000) : 0;
                
                // Calculate transferred shock
                let transferredShock = (currentImpact * edge.factor) - bufferResistance;
                transferredShock = Math.max(0, Math.min(1.0, transferredShock)); // normalize 0-1

                if (transferredShock > 0.05) { // Threshold to continue propagation
                    if (transferredShock > nodeData[targetId].shockImpact) {
                        nodeData[targetId].shockImpact = transferredShock; // Keep highest impact
                        if (!visited.has(targetId)) queue.push(targetId);
                    }
                }
            });
        }
    }

    // Prepare Results
    const impactedNodes = Object.values(nodeData)
        .filter(n => n.shockImpact > 0)
        .sort((a, b) => b.shockImpact - a.shockImpact);

    // Chart logic - showing severity distribution
    let critical = 0, high = 0, medium = 0, low = 0;
    impactedNodes.forEach(n => {
        if (n.shockImpact >= 0.75) critical++;
        else if (n.shockImpact >= 0.50) high++;
        else if (n.shockImpact >= 0.25) medium++;
        else low++;
    });

    const chartConfig = {
        type: 'doughnut',
        data: {
            labels: ['Critical Impact', 'High Impact', 'Medium Impact', 'Low Impact'],
            datasets: [{
                data: [critical, high, medium, low],
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']
            }]
        },
        options: {
            title: { display: true, text: `Shock Ripple Effect Profiling` }
        }
    };

    return {
        origin: originNodeId,
        magnitude: shockMagnitude,
        nodesAffected: impactedNodes.length,
        networkImpactRatio: Number((impactedNodes.length / nodes.length * 100).toFixed(2)) + '%',
        impactMap: impactedNodes.map(n => ({
            id: n.id,
            severity: n.shockImpact.toFixed(2),
            status: n.shockImpact >= 0.75 ? 'Critical' : n.shockImpact >= 0.5 ? 'High' : 'Watch'
        })),
        charts: [chartConfig]
    };
}

module.exports = {
    simulateShockPropagation
};
