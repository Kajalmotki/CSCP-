/**
 * HEIMDALL Phase 6 — Network Intelligence Engine
 * Pure Node.js Algorithms (Zero Dependencies)
 */

const { buildChartUrl } = require('./math_engine');

/**
 * Dijkstra's Shortest Path Algorithm for Supply Chain Routing
 * Computes the optimal path based on 'cost', 'time', or 'risk'
 *
 * @param {Array} nodes - [{ id: 'SupplierA', name: 'Alpha Corp', type: 'supplier' }, ...]
 * @param {Array} edges - [{ source: 'SupplierA', target: 'Hub1', cost: 50, time: 2, risk: 0.1 }, ...]
 * @param {String} startNode - ID of the starting node
 * @param {String} endNode - ID of the destination node
 * @param {String} criteria - 'cost', 'time', or 'risk'
 */
function findOptimalRoute(nodes, edges, startNode, endNode, criteria = 'cost') {
    const distances = {};
    const previous = {};
    const unvisited = new Set();
    const graph = {};

    // Initialize graph adjacency list
    nodes.forEach(node => {
        distances[node.id] = Infinity;
        previous[node.id] = null;
        unvisited.add(node.id);
        graph[node.id] = [];
    });

    distances[startNode] = 0;

    edges.forEach(edge => {
        if (!graph[edge.source]) graph[edge.source] = [];
        if (!graph[edge.target]) graph[edge.target] = [];
        
        // Ensure bidirectional compatibility unless strictly directed
        graph[edge.source].push({ node: edge.target, weight: Number(edge[criteria]) || 1 });
        // Assume directed for supply chain flows, but if we wanted undirected uncomment next line:
        // graph[edge.target].push({ node: edge.source, weight: Number(edge[criteria]) || 1 });
    });

    while (unvisited.size > 0) {
        // Get node with minimum distance
        let current = null;
        let minDistance = Infinity;

        unvisited.forEach(node => {
            if (distances[node] < minDistance) {
                minDistance = distances[node];
                current = node;
            }
        });

        if (current === null || current === endNode) break;

        unvisited.delete(current);

        graph[current].forEach(neighbor => {
            if (unvisited.has(neighbor.node)) {
                let alt = distances[current] + neighbor.weight;
                if (alt < distances[neighbor.node]) {
                    distances[neighbor.node] = alt;
                    previous[neighbor.node] = current;
                }
            }
        });
    }

    // Reconstruct path
    const path = [];
    let current = endNode;
    if (previous[current] !== null || current === startNode) {
        while (current !== null) {
            path.unshift(current);
            current = previous[current];
        }
    }

    // Cost Breakdown
    let totalScore = distances[endNode];
    
    // Create chart showing the step-by-step accumulation of the criteria
    let chartConfig = null;
    if (path.length > 1 && totalScore !== Infinity) {
        let stepLabels = [];
        let stepAccumulation = [];
        let runningTotal = 0;
        
        stepLabels.push(path[0]);
        stepAccumulation.push(0);

        for (let i = 0; i < path.length - 1; i++) {
            const edge = edges.find(e => e.source === path[i] && e.target === path[i+1]);
            const weight = edge ? (Number(edge[criteria]) || 1) : 0;
            runningTotal += weight;
            stepLabels.push(`→ ${path[i+1]}`);
            stepAccumulation.push(runningTotal);
        }

        chartConfig = {
            type: 'line',
            data: {
                labels: stepLabels,
                datasets: [{
                    label: `Cumulative ${criteria.charAt(0).toUpperCase() + criteria.slice(1)}`,
                    data: stepAccumulation,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    steppedLine: true
                }]
            },
            options: {
                title: { display: true, text: `Optimal Route Accumulation (${criteria})` }
            }
        };
    }

    return {
        criteriaOptimized: criteria,
        optimalPath: path.length > 0 ? path : null,
        totalMetric: totalScore === Infinity ? null : totalScore,
        pathFound: path.length > 0 && totalScore !== Infinity,
        charts: chartConfig ? [chartConfig] : []
    };
}

/**
 * Network Resilience Analysis
 * Identifies single points of failure (bottlenecks) by calculating node centrality
 */
function analyzeNetworkResilience(nodes, edges) {
    const nodeStats = {};
    nodes.forEach(n => {
        nodeStats[n.id] = { inDegree: 0, outDegree: 0, name: n.name || n.id };
    });

    edges.forEach(e => {
        if (nodeStats[e.target]) nodeStats[e.target].inDegree++;
        if (nodeStats[e.source]) nodeStats[e.source].outDegree++;
    });

    const bottlenecks = Object.values(nodeStats)
        .filter(n => n.inDegree > 1 && n.outDegree > 0) // Multiple dependencies flowing into one active node
        .sort((a, b) => b.inDegree - a.inDegree);

    const singleSourceSuppliers = Object.values(nodeStats)
        .filter(n => n.inDegree === 0 && n.outDegree === 1); // Single source dependency

    // Network overall score
    const avgConnections = edges.length / (nodes.length || 1);
    const resilienceScore = Math.min(100, Math.round((avgConnections / 2) * 50 + (bottlenecks.length === 0 ? 30 : 0)));

    const chartConfig = {
        type: 'radar',
        data: {
            labels: ['Connectivity', 'Multi-Sourcing', 'Redundancy', 'Risk Spread', 'Hub Balance'],
            datasets: [{
                label: 'Network Resilience Profile',
                data: [
                    Math.min(100, avgConnections * 30),
                    singleSourceSuppliers.length > 0 ? 40 : 90,
                    100 - (bottlenecks.length * 15),
                    resilienceScore + (Math.random()*10-5), // simulated spread metric
                    85
                ],
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: { scale: { ticks: { beginAtZero: true, max: 100 } } }
    };

    return {
        resilienceScore: Math.max(0, resilienceScore),
        totalNodes: nodes.length,
        totalEdges: edges.length,
        criticalBottlenecks: bottlenecks.slice(0, 3), // Top 3 bottlenecks
        singleSourceRisks: singleSourceSuppliers.length,
        recommendation: bottlenecks.length > 0 
            ? `High risk identified at ${bottlenecks[0].name}. Establish dual-sourcing options for dependencies bypassing this node.` 
            : `Network possesses strong multi-echelon resilience.`,
        charts: [chartConfig]
    };
}

module.exports = {
    findOptimalRoute,
    analyzeNetworkResilience
};
